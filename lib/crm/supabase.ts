// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.
import type { Evento } from './eventos-tipos'
import { capturarContato } from './capturarContato'
import type { EntradaCaptura, ResultadoCaptura } from './capturarContato'
import type {
  Canal,
  Captura,
  Conflito,
  Consentimento,
  Contato,
  Finalidade,
  PayloadBrevo,
  Portas,
  RepositorioContatos,
  SaidaBrevo,
} from './portas'

// Adaptador Supabase das portas (SPEC 14). Zero dependencia: so `fetch`, roda em Cloudflare Worker.
// A decisao (dedupe, consentimento, eventos) continua em capturarContato. Aqui so se persiste:
//  - leitura: GET na Data API (schema crm), com a chave de servico do Worker;
//  - escrita: tudo que capturarContato manda gravar fica retido e sai em UMA chamada
//    a crm.gravar_captura (transacao unica: contato, captura, consentimentos, conflito, eventos).
// Erro nunca carrega corpo de resposta nem texto do servidor: so `codigo`.

export interface ConfigSupabase {
  /** https://<ref>.supabase.co */
  url: string
  /** Chave de servico (secret do Worker). Nunca vai ao navegador. */
  chave: string
  fetch?: typeof fetch
  /** Milissegundos por chamada. Padrao 8000. */
  timeoutMs?: number
}

export class ErroSupabase extends Error {
  readonly codigo: string
  constructor(codigo: string) {
    super(codigo)
    this.name = 'ErroSupabase'
    this.codigo = codigo
  }
}

export type ResultadoGravacao =
  | { estado: 'gravada'; contato_id: string; criado: boolean; consentimentos: number; eventos: number }
  /** A chave ja estava gravada no banco (outra chamada ganhou). Nada foi repetido. */
  | { estado: 'duplicada'; contato_id: string }
  /** capturarContato nao mandou gravar nada (recusa ou captura repetida). */
  | { estado: 'nada' }
  | { estado: 'falhou'; codigo: string; chave_idempotencia: string | null }

export interface CapturaSupabase {
  /** Nulo quando a leitura falhou antes de decidir (Data API fora): nada foi decidido nem gravado. */
  resultado: ResultadoCaptura | null
  gravacao: ResultadoGravacao
}

interface PayloadRpc {
  brand_id: string
  criar: boolean
  contato_id: string | null
  contato: Contato | null
  patch: Record<string, unknown>
  captura: Captura | null
  consentimentos: Consentimento[]
  conflito: { id: string; contato_email_id: string; contato_whatsapp_id: string; nota: string } | null
  eventos: Evento[]
}

function http(cfg: ConfigSupabase) {
  const f = cfg.fetch ?? fetch
  const base = cfg.url.replace(/\/+$/, '')
  return async (caminho: string, init: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = {
      apikey: cfg.chave,
      authorization: `Bearer ${cfg.chave}`,
      'content-type': 'application/json',
      ...(init.method === 'POST' ? { 'content-profile': 'crm' } : { 'accept-profile': 'crm' }),
    }
    const tentar = async (): Promise<Response> => {
      try {
        return await f(`${base}${caminho}`, {
          ...init,
          headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
          signal: AbortSignal.timeout(cfg.timeoutMs ?? 8000),
        })
      } catch {
        throw new ErroSupabase('rede')
      }
    }
    // A RPC e idempotente e as leituras sao puras: uma segunda tentativa em erro de rede ou 5xx e segura.
    let r: Response | null = null
    try {
      r = await tentar()
    } catch {
      r = null
    }
    if (r === null || r.status >= 500) r = await tentar()
    return r
  }
}

async function erroDe(r: Response): Promise<ErroSupabase> {
  // PostgREST devolve {code: "22023"|"PGRST202"|...}. So o codigo sobe; message e details ficam.
  let code = ''
  try {
    const j = (await r.json()) as { code?: unknown }
    if (typeof j?.code === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(j.code)) code = j.code
  } catch {
    /* corpo nao e JSON */
  }
  return new ErroSupabase(code !== '' ? `http_${r.status}_${code}` : `http_${r.status}`)
}

const enc = encodeURIComponent

/** Retem as gravacoes de uma captura e as manda juntas. Uma instancia por captura. */
export class UnidadeDeGravacao {
  private p: PayloadRpc = {
    brand_id: 'melfiore',
    criar: false,
    contato_id: null,
    contato: null,
    patch: {},
    captura: null,
    consentimentos: [],
    conflito: null,
    eventos: [],
  }
  private enviada: Promise<ResultadoGravacao> | null = null

  constructor(private readonly cfg: ConfigSupabase) {}

  criarContato(c: Contato) {
    this.p.criar = true
    this.p.contato = c
    this.p.contato_id = c.id
    this.p.brand_id = c.brand_id
  }
  atualizarContato(id: string, patch: Record<string, unknown>) {
    this.p.contato_id = id
    this.p.patch = { ...this.p.patch, ...patch }
  }
  registrarCaptura(c: Captura) {
    this.p.captura = c
    this.p.contato_id = c.contato_id
    this.p.brand_id = c.brand_id
  }
  acrescentarConsentimento(c: Consentimento) {
    this.p.consentimentos.push(c)
  }
  registrarConflito(c: Conflito) {
    this.p.conflito = {
      id: c.id,
      contato_email_id: c.contato_email_id,
      contato_whatsapp_id: c.contato_whatsapp_id,
      // Aceites de WhatsApp que esperam decisao humana (SPEC 14, passo 4).
      nota: JSON.stringify({ origem: c.origem, consentimentos_pendentes: c.consentimentos_pendentes }),
    }
  }
  registrarEvento(e: Evento) {
    this.p.eventos.push(e)
  }

  get vazia(): boolean {
    return this.p.captura === null
  }

  /** Idempotente na instancia: a segunda chamada devolve o mesmo resultado. Nunca lanca. */
  enviar(): Promise<ResultadoGravacao> {
    if (this.enviada === null) this.enviada = this.enviarUmaVez()
    return this.enviada
  }

  private async enviarUmaVez(): Promise<ResultadoGravacao> {
    const captura = this.p.captura
    if (captura === null) return { estado: 'nada' }
    try {
      const r = await http(this.cfg)('/rest/v1/rpc/gravar_captura', {
        method: 'POST',
        body: JSON.stringify({ p: this.p }),
      })
      if (!r.ok) throw await erroDe(r)
      const j = (await r.json()) as {
        duplicada?: boolean
        contato_id?: string
        criado?: boolean
        consentimentos?: number
        eventos?: number
      }
      if (typeof j?.contato_id !== 'string') throw new ErroSupabase('resposta_invalida')
      if (j.duplicada === true) return { estado: 'duplicada', contato_id: j.contato_id }
      return {
        estado: 'gravada',
        contato_id: j.contato_id,
        criado: j.criado === true,
        consentimentos: j.consentimentos ?? 0,
        eventos: j.eventos ?? 0,
      }
    } catch (e) {
      return {
        estado: 'falhou',
        codigo: e instanceof ErroSupabase ? e.codigo : 'inesperado',
        chave_idempotencia: captura.chave_idempotencia,
      }
    }
  }
}

function contatoDe(r: Record<string, unknown>): Contato {
  const s = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : null)
  return {
    id: r.id as string,
    brand_id: r.brand_id as string,
    nome: s('nome'),
    email: s('email'),
    email_norm: s('email_norm'),
    email_canonico: s('email_canonico'),
    whatsapp_e164: s('whatsapp_e164'),
    estado: r.estado as Contato['estado'],
    origem_primeira: r.origem_primeira as string,
    criado_em: r.criado_em as string,
    atualizado_em: r.atualizado_em as string,
    customer_id: s('customer_id'),
    pessoa_id: s('pessoa_id'),
  }
}

/** Leituras pela Data API; escritas retidas na unidade. */
export class RepositorioSupabase implements RepositorioContatos {
  private readonly req: ReturnType<typeof http>
  constructor(
    cfg: ConfigSupabase,
    private readonly unidade: UnidadeDeGravacao,
  ) {
    this.req = http(cfg)
  }

  private async ler(caminho: string, extra?: Record<string, string>): Promise<{ linhas: Record<string, unknown>[]; r: Response }> {
    const r = await this.req(`/rest/v1/${caminho}`, { method: 'GET', ...(extra ? { headers: extra } : {}) })
    if (!r.ok) throw await erroDe(r)
    return { linhas: (await r.json()) as Record<string, unknown>[], r }
  }

  async buscarPorEmailNorm(brand_id: string, email_norm: string) {
    const { linhas } = await this.ler(`contatos?select=*&brand_id=eq.${enc(brand_id)}&email_norm=eq.${enc(email_norm)}&limit=1`)
    return linhas[0] ? contatoDe(linhas[0]) : null
  }

  async buscarPorWhatsapp(brand_id: string, whatsapp_e164: string) {
    const { linhas } = await this.ler(`contatos?select=*&brand_id=eq.${enc(brand_id)}&whatsapp_e164=eq.${enc(whatsapp_e164)}&limit=1`)
    return linhas[0] ? contatoDe(linhas[0]) : null
  }

  async buscarPorEmailCanonico(brand_id: string, email_canonico: string) {
    const { linhas } = await this.ler(`contatos?select=*&brand_id=eq.${enc(brand_id)}&email_canonico=eq.${enc(email_canonico)}&limit=50`)
    return linhas.map(contatoDe)
  }

  async criarContato(c: Contato) {
    this.unidade.criarContato(c)
  }

  async atualizarContato(id: string, patch: Parameters<RepositorioContatos['atualizarContato']>[1]) {
    this.unidade.atualizarContato(id, patch)
  }

  async capturaExiste(_brand_id: string, chave: string) {
    // capturas.chave_idempotencia e unica no banco inteiro (a chave ja embute a origem).
    const { linhas } = await this.ler(`capturas?select=id&chave_idempotencia=eq.${enc(chave)}&limit=1`)
    return linhas.length > 0
  }

  async registrarCaptura(c: Captura) {
    this.unidade.registrarCaptura(c)
  }

  async contarCapturas(contato_id: string) {
    const { r } = await this.ler(`capturas?select=id&contato_id=eq.${enc(contato_id)}&limit=1`, { prefer: 'count=exact' })
    const total = /\/(\d+)$/.exec(r.headers.get('content-range') ?? '')
    return total ? Number(total[1]) : 0
  }

  async ultimoConsentimento(contato_id: string, canal: Canal, finalidade: Finalidade, produto_id: string | null) {
    const escopo = produto_id === null ? 'produto_id=is.null' : `produto_id=eq.${enc(produto_id)}`
    const { linhas } = await this.ler(
      `consentimentos?select=*&contato_id=eq.${enc(contato_id)}&canal=eq.${canal}&finalidade=eq.${finalidade}&${escopo}&order=ocorrido_em.desc,id.desc&limit=1`,
    )
    const l = linhas[0]
    if (!l) return null
    return {
      contato_id: l.contato_id as string,
      canal: l.canal as Canal,
      finalidade: l.finalidade as Finalidade,
      estado: l.estado as Consentimento['estado'],
      texto_versao: l.texto_versao as string,
      texto_aceito: l.texto_aceito as string,
      origem: l.origem as string,
      ip_hash: typeof l.ip_hash === 'string' ? l.ip_hash : null,
      ocorrido_em: l.ocorrido_em as string,
      produto_id: typeof l.produto_id === 'string' ? l.produto_id : null,
    }
  }

  async acrescentarConsentimento(c: Consentimento) {
    this.unidade.acrescentarConsentimento(c)
  }

  async registrarConflito(c: Conflito) {
    this.unidade.registrarConflito(c)
  }
}

const SEM_BREVO: SaidaBrevo = { async sincronizarContato() {} }

/**
 * Uma captura inteira: decide em capturarContato, grava no Supabase (uma transacao) e SO ENTAO
 * entrega ao Brevo. Falha do Supabase nao impede o Brevo e nunca lanca: volta em `gravacao`.
 * Sem `brevo`, nao ha saida (quem chama cuida do Brevo depois, como a route faz hoje).
 */
export async function capturarComSupabase(
  entrada: EntradaCaptura,
  cfg: ConfigSupabase,
  brevo: SaidaBrevo = SEM_BREVO,
  extras: Pick<Portas, 'relogio' | 'gerarId'> = {},
): Promise<CapturaSupabase> {
  const unidade = new UnidadeDeGravacao(cfg)
  const brevoDepois: SaidaBrevo = {
    async sincronizarContato(payload: PayloadBrevo) {
      await unidade.enviar() // Supabase primeiro, sempre; falha dele nao segura o Brevo
      await brevo.sincronizarContato(payload)
    },
  }
  const portas: Portas = {
    repositorio: new RepositorioSupabase(cfg, unidade),
    registrarEvento: async (e) => {
      unidade.registrarEvento(e)
      return { gravado: true }
    },
    brevo: brevoDepois,
    ...extras,
  }
  let resultado: ResultadoCaptura
  try {
    resultado = await capturarContato(entrada, portas)
  } catch (e) {
    // Leitura falhou antes de decidir (Data API fora): nada foi gravado.
    return {
      resultado: null,
      gravacao: { estado: 'falhou', codigo: e instanceof ErroSupabase ? e.codigo : 'inesperado', chave_idempotencia: null },
    }
  }
  const gravacao = await unidade.enviar()
  return { resultado, gravacao }
}
