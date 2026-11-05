// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.
import { origemDoEvento, prepararCaptura } from './capturarContato'
import type { EntradaCaptura, Pendencia, ResultadoCaptura } from './capturarContato'
import { emailCanonico } from './normalizar'
import type { PayloadBrevo, SaidaBrevo } from './portas'

// Adaptador Supabase (SPEC 14). Zero dependencia: so `fetch`, roda em Cloudflare Worker.
// Este lado NORMALIZA e VALIDA (e-mail, WhatsApp, chave de idempotencia, texto do aceite).
// Quem DECIDE e o banco, em UMA chamada a crm.capturar: contato existente, gemeo provavel,
// conflito, captura repetida e consentimento que muda, tudo numa transacao. Por isso o papel
// captura_web nao precisa de nenhum select.
// Gateway (staging, 05/11/2026): JWT customizado no header `apikey` volta 401. A chave publishable
// vai em `apikey` e o JWT do papel vai em `Authorization: Bearer`.
// Erro nunca carrega corpo de resposta nem texto do servidor: so `codigo`.

export interface ConfigSupabase {
  /** https://<ref>.supabase.co */
  url: string
  /** JWT com role=captura_web (secret do Worker), enviado em `Authorization: Bearer`. Nunca vai ao navegador. */
  chave: string
  /** Chave publishable do projeto, enviada em `apikey`. Ausente: usa `chave` (so serve para chave de servico). */
  apikey?: string
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
  /** Recusada na validacao: nada foi enviado. */
  | { estado: 'nada' }
  | { estado: 'falhou'; codigo: string; chave_idempotencia: string | null }

export interface CapturaSupabase {
  /** Nulo quando a chamada falhou antes de o banco decidir: nada foi decidido nem gravado. */
  resultado: ResultadoCaptura | null
  gravacao: ResultadoGravacao
}

interface RespostaRpc {
  ok: boolean
  duplicada: boolean
  criado: boolean
  contato_id: string
  estado: 'ativo' | 'descadastrado' | 'suspeito' | 'anonimizado'
  suspeito: boolean
  conflito_id: string | null
  consentimentos: number
  eventos: number
  avisos: string[]
  contato: { email: string | null; nome: string | null; whatsapp_e164: string | null; origem_primeira: string }
  marketing_email: boolean
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

async function chamarRpc(cfg: ConfigSupabase, corpo: unknown): Promise<RespostaRpc> {
  const f = cfg.fetch ?? fetch
  const url = `${cfg.url.replace(/\/+$/, '')}/rest/v1/rpc/capturar`
  const init = (): RequestInit => ({
    method: 'POST',
    headers: {
      apikey: cfg.apikey ?? cfg.chave,
      authorization: `Bearer ${cfg.chave}`,
      'content-type': 'application/json',
      'content-profile': 'crm',
    },
    body: JSON.stringify({ p: corpo }),
    signal: AbortSignal.timeout(cfg.timeoutMs ?? 8000),
  })
  const tentar = async (): Promise<Response> => {
    try {
      return await f(url, init())
    } catch {
      throw new ErroSupabase('rede')
    }
  }
  // A RPC e idempotente pela chave: uma segunda tentativa em erro de rede ou 5xx e segura.
  let r: Response | null = null
  try {
    r = await tentar()
  } catch {
    r = null
  }
  if (r === null || r.status >= 500) r = await tentar()
  if (!r.ok) throw await erroDe(r)
  const j = (await r.json()) as Partial<RespostaRpc>
  if (typeof j?.contato_id !== 'string' || typeof j.estado !== 'string') throw new ErroSupabase('resposta_invalida')
  return j as RespostaRpc
}

/**
 * Uma captura inteira: valida aqui, o banco decide e grava (uma transacao) e SO ENTAO entrega ao Brevo.
 * Nunca lanca: falha do Supabase volta em `gravacao` (com a chave, para a fila reenviar).
 * Sem `brevo`, nao ha saida (quem chama cuida do Brevo depois, como a route faz hoje).
 */
export async function capturarComSupabase(
  entrada: EntradaCaptura,
  cfg: ConfigSupabase,
  brevo?: SaidaBrevo,
  extras: { relogio?: () => Date; gerarId?: () => string } = {},
): Promise<CapturaSupabase> {
  const agora = (extras.relogio ?? (() => new Date()))()
  const prep = prepararCaptura(entrada, agora)
  if (!prep.ok) return { resultado: { ok: false, motivo: prep.motivo }, gravacao: { estado: 'nada' } }
  const { origem, brand, produtoId, emailNorm, zap, consents, ocorridoIso, chave, avisos } = prep
  const gerarId = extras.gerarId ?? (() => crypto.randomUUID())
  const email = emailNorm ? (entrada.email as string).trim() : null
  const nome = typeof entrada.nome === 'string' && entrada.nome.trim() !== '' ? entrada.nome.trim() : null

  let r: RespostaRpc
  try {
    r = await chamarRpc(cfg, {
      brand_id: brand,
      origem: entrada.origem,
      tela: origem.tela,
      evento_origem: origemDoEvento(origem.base),
      chave_idempotencia: chave,
      ocorrido_em: ocorridoIso,
      nome,
      email,
      email_norm: emailNorm,
      email_canonico: emailNorm ? emailCanonico(emailNorm) : null,
      whatsapp_e164: zap,
      produto_id: produtoId,
      ip_hash: entrada.ip_hash ?? null,
      utm: entrada.utm ?? {},
      contato_id_novo: gerarId(),
      conflito_id: gerarId(),
      consentimentos: consents,
    })
  } catch (e) {
    return {
      resultado: null,
      gravacao: { estado: 'falhou', codigo: e instanceof ErroSupabase ? e.codigo : 'inesperado', chave_idempotencia: chave },
    }
  }

  const todosAvisos = [...avisos, ...r.avisos]
  const pendencias: Pendencia[] = []
  let saida: 'enviado' | 'pendente' | 'dispensado' = 'dispensado'
  if (brevo && !r.duplicada && r.contato.email !== null && r.estado !== 'descadastrado' && r.estado !== 'anonimizado') {
    const payload: PayloadBrevo = {
      contato_id: r.contato_id,
      brand_id: brand,
      email: r.contato.email,
      nome: r.contato.nome,
      whatsapp_e164: r.contato.whatsapp_e164,
      estado: r.estado,
      origem: entrada.origem,
      origem_primeira: r.contato.origem_primeira,
      marketing_email: r.marketing_email,
    }
    try {
      await brevo.sincronizarContato(payload)
      saida = 'enviado'
    } catch (e) {
      saida = 'pendente'
      pendencias.push({ tipo: 'brevo', contato_id: r.contato_id, payload, erro: e instanceof Error ? e.message : String(e) })
    }
  }
  const resultado: ResultadoCaptura = {
    ok: true,
    contato_id: r.contato_id,
    criado: r.criado,
    duplicada: r.duplicada,
    estado: r.estado,
    suspeito: r.suspeito,
    conflito_id: r.conflito_id,
    consentimentos_gravados: r.consentimentos,
    brevo: saida,
    pendencias,
    avisos: todosAvisos,
  }
  const gravacao: ResultadoGravacao = r.duplicada
    ? { estado: 'duplicada', contato_id: r.contato_id }
    : { estado: 'gravada', contato_id: r.contato_id, criado: r.criado, consentimentos: r.consentimentos, eventos: r.eventos }
  return { resultado, gravacao }
}
