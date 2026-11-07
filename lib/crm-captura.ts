// 2A.3: contato unico. Grava no Supabase (crm) ANTES do Brevo. SPEC 14 em ../_DOCS/SITE-OFICIAL/MEDUSA-VPS.
// Atras da flag CRM_ENVIO: so roda com o valor exato "ligado". Ausente ou outro valor: nada acontece.
// Nunca lanca. Falha do Supabase guarda a inscricao inteira na fila (lib/fila-captura.ts) e a inscricao
// segue para o Brevo. Chave: papel restrito captura_web (migration 009), nunca service_role.
import { capturarComSupabase } from '@/lib/crm'
import type { ConsentimentoEntrada } from '@/lib/crm/portas'
import type { EntradaCaptura } from '@/lib/crm'
import { registrarAceite, type RegistroAceite } from '@/lib/aceite-waitlist'
import { drenar, filaDoAmbiente, guardar, type ItemFila, type KvFila, type Reenvio } from '@/lib/fila-captura'

export function crmLigado(): boolean {
  return process.env.CRM_ENVIO === 'ligado'
}

const TETO_MS = 7000

/**
 * IP do visitante para o rate limit. O site roda atras da Cloudflare, que escreve `cf-connecting-ip`
 * e sobrescreve o que o cliente mandar. `x-forwarded-for` o cliente falsifica. Sem o header (dev local):
 * cai no comportamento antigo.
 */
export function ipDoCliente(headers: { get(nome: string): string | null }): string {
  const cf = headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  return headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
}

async function hashIp(ip: string, sal: string | undefined): Promise<string | undefined> {
  if (!sal || ip === 'unknown') return undefined // sem sal, IP nao vira hash: melhor nao guardar
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sal}|${ip}`))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function log(nivel: 'info' | 'error', evento: string, campos: Record<string, unknown>) {
  // Sem e-mail, nome nem corpo de resposta: so o que permite achar o item.
  console[nivel === 'error' ? 'error' : 'log'](JSON.stringify({ evento, ...campos }))
}

// O aceite chega ao pacote com a FORMA em que aconteceu (`aviso_e_clique`: aviso a vista, clique no botao).
// Nao ha caixa. O banco grava forma, texto, versao e hora; a data nunca e inventada aqui.
function consentimentoDoPacote(a: RegistroAceite): ConsentimentoEntrada[] {
  return [{ canal: 'email', finalidade: 'marketing', forma: a.forma, texto_versao: a.versao, texto_aceito: a.texto }]
}

function entradaDe(item: ItemFila): EntradaCaptura {
  return {
    origem: item.origem ?? 'waitlist',
    nome: item.nome,
    email: item.email,
    // A hora do clique fixa a chave de idempotencia: reenvio horas depois cai na mesma captura.
    ocorrido_em: item.aceite?.aceito_em ?? item.criado_em,
    ...(item.aceite ? { consentimentos: consentimentoDoPacote(item.aceite) } : {}),
    ...(item.ip_hash ? { ip_hash: item.ip_hash } : {}),
  }
}

export interface Dependencias {
  env?: Record<string, string | undefined>
  capturar?: typeof capturarComSupabase
  agora?: () => Date
  /** undefined = busca o binding da Cloudflare; null = sem fila. */
  fila?: KvFila | null
  aguardar?: ((p: Promise<unknown>) => void) | null
  tetoMs?: number
}

type Desfecho = { estado: 'ok' } | { estado: 'falhou'; codigo: string }

interface Acesso { url: string; chave: string; apikey: string }

async function tentar(item: ItemFila, d: Required<Pick<Dependencias, 'capturar' | 'tetoMs'>>, acesso: Acesso): Promise<Desfecho> {
  try {
    // Teto: estourou, o Brevo segue e a pendencia vai para a fila. O banco ainda pode concluir; reenvio e idempotente.
    let relogio: ReturnType<typeof setTimeout> | undefined
    const limite = new Promise<'tempo'>((ok) => { relogio = setTimeout(() => ok('tempo'), d.tetoMs) })
    const r = await Promise.race([d.capturar(entradaDe(item), { ...acesso, timeoutMs: 3000 }), limite])
    clearTimeout(relogio)
    if (r === 'tempo') return { estado: 'falhou', codigo: 'tempo' }
    const { gravacao, resultado } = r
    if (gravacao.estado === 'falhou' || resultado === null) {
      return { estado: 'falhou', codigo: gravacao.estado === 'falhou' ? gravacao.codigo : 'leitura' }
    }
    if (!resultado.ok) {
      log('error', 'crm.recusada', { origem: item.origem ?? 'waitlist', motivo: resultado.motivo })
      return { estado: 'ok' } // recusa nao melhora com o tempo: nao reenfileirar
    }
    log('info', 'crm.capturado', { origem: item.origem ?? 'waitlist', gravacao: gravacao.estado })
    return { estado: 'ok' }
  } catch {
    return { estado: 'falhou', codigo: 'inesperado' }
  }
}

export type OrigemCaptura = 'waitlist' | 'fiorettes'

export function capturarWaitlistNoCrm(
  dados: { name: string; email: string; ip: string; aceite_versao?: unknown },
  deps: Dependencias = {},
): Promise<void> {
  return capturarNoCrm('waitlist', dados, deps)
}

/** M12: mesma captura, origem `fiorettes`. Sem e-mail nao ha identidade: o chamador nem chega aqui. */
export function capturarFiorettesNoCrm(
  dados: { name: string; email: string; ip: string; aceite_versao?: unknown },
  deps: Dependencias = {},
): Promise<void> {
  return capturarNoCrm('fiorettes', dados, deps)
}

async function capturarNoCrm(
  origem: OrigemCaptura,
  dados: { name: string; email: string; ip: string; aceite_versao?: unknown },
  deps: Dependencias,
): Promise<void> {
  const env = deps.env ?? process.env
  const url = env.SUPABASE_URL
  const chave = env.SUPABASE_CAPTURA_JWT // JWT role=captura_web. A service_role nao e lida em lugar nenhum.
  // O gateway recusa JWT customizado no header apikey (401, testado no staging): a chave publishable vai la.
  const apikey = env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !chave || !apikey) {
    log('error', 'crm.sem_config', { origem })
    return
  }
  const acesso: Acesso = { url, chave, apikey }
  const d = { capturar: deps.capturar ?? capturarComSupabase, tetoMs: deps.tetoMs ?? TETO_MS }
  const agora = (deps.agora ?? (() => new Date()))()
  let fila: KvFila | null
  let aguardar: ((p: Promise<unknown>) => void) | null
  if (deps.fila !== undefined) {
    fila = deps.fila
    aguardar = deps.aguardar ?? null
  } else {
    ;({ fila, aguardar } = await filaDoAmbiente())
  }

  try {
    const aceite = registrarAceite(dados.aceite_versao, agora)
    if (!aceite) log('error', 'crm.aceite_ausente', { origem })
    const ip_hash = await hashIp(dados.ip, env.CRM_IP_SALT)
    const item: ItemFila = {
      v: 1,
      origem,
      nome: dados.name,
      email: dados.email,
      ...(ip_hash ? { ip_hash } : {}),
      aceite,
      criado_em: agora.toISOString(),
      tentativas: 0,
      ultimo_codigo: '',
    }
    const r = await tentar(item, d, acesso)
    if (r.estado === 'falhou') {
      if (!fila) {
        log('error', 'crm.perdido_sem_fila', { origem, codigo: r.codigo })
        return
      }
      const id = await guardar(fila, { ...item, ultimo_codigo: r.codigo })
      log('error', 'crm.na_fila', { origem, codigo: r.codigo, fila_chave: id })
      return
    }
    // Supabase respondeu: aproveita para esvaziar a fila (sem segurar a inscricao).
    if (fila && aguardar) {
      const reenviar = async (it: ItemFila): Promise<Reenvio> => ((await tentar(it, d, acesso)).estado === 'ok' ? 'ok' : 'falhou')
      aguardar(drenar(fila, reenviar))
    }
  } catch {
    log('error', 'crm.pendente', { origem, codigo: 'inesperado' })
  }
}

export interface ResultadoEsvaziar {
  estado: 'desligado' | 'sem_config' | 'sem_fila' | 'ok'
  reenviados: number
  restantes: number
}

/**
 * Esvazia a fila de reenvio sem depender de nova inscricao (chamada pelo cron do Worker).
 * Mesmas regras da captura: so roda com CRM_ENVIO=ligado, com o JWT captura_web, nunca com service_role.
 * Item que entrou (gravado, duplicado ou recusado de vez) sai; o que falhou volta com a contagem.
 */
export async function esvaziarFilaCaptura(
  env: Record<string, unknown>,
  deps: { fila: KvFila | null; capturar?: typeof capturarComSupabase; tetoMs?: number; max?: number },
): Promise<ResultadoEsvaziar> {
  const texto = (k: string): string | undefined => (typeof env[k] === 'string' ? (env[k] as string) : undefined)
  if (texto('CRM_ENVIO') !== 'ligado') return { estado: 'desligado', reenviados: 0, restantes: 0 }
  const url = texto('SUPABASE_URL')
  const chave = texto('SUPABASE_CAPTURA_JWT')
  const apikey = texto('SUPABASE_PUBLISHABLE_KEY')
  if (!url || !chave || !apikey) {
    log('error', 'crm.sem_config', { origem: 'fila_agendada' })
    return { estado: 'sem_config', reenviados: 0, restantes: 0 }
  }
  if (!deps.fila) {
    log('error', 'crm.fila_sem_binding', { origem: 'fila_agendada' })
    return { estado: 'sem_fila', reenviados: 0, restantes: 0 }
  }
  const d = { capturar: deps.capturar ?? capturarComSupabase, tetoMs: deps.tetoMs ?? TETO_MS }
  const acesso: Acesso = { url, chave, apikey }
  const reenviar = async (it: ItemFila): Promise<Reenvio> => ((await tentar(it, d, acesso)).estado === 'ok' ? 'ok' : 'falhou')
  const r = await drenar(deps.fila, reenviar, deps.max ?? 25)
  log('info', 'crm.fila_agendada', { reenviados: r.reenviados, restantes: r.restantes })
  return { estado: 'ok', ...r }
}
