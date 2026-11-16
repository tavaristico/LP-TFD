// S11: porta de entrada das rotas de captura. Tres camadas, todas fechando por padrao:
// 1. limite de tentativas por IP: binding de rate limit da Cloudflare (vale entre instancias do Worker);
//    sem o binding, cai na memoria da instancia (o comportamento antigo, melhor que nada).
// 2. isca: campo escondido que gente nao ve e robo preenche. Preenchido, a rota finge sucesso e nao grava.
// 3. Turnstile (antirrobo da Cloudflare): so exigido quando TURNSTILE_SECRET_KEY existe no ambiente.
//    Sem a chave, fica dormente. A chave mora no cofre; nada dela entra no repo.

export const CAMPO_ISCA = 'empresa_site'
export const TURNSTILE_VERIFICAR = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TETO_TOKEN = 2048

export type NomeLimite = 'LIMITE_WAITLIST' | 'LIMITE_FIORETTES'

/** O pedaco do binding de rate limit que usamos. */
export interface LimiteCf {
  limit(opcoes: { key: string }): Promise<{ success: boolean }>
}

export type Memoria = Map<string, { count: number; reset: number }>

/** Janela de 60 s por IP, na memoria da instancia. */
export function limiteEmMemoria(memoria: Memoria, ip: string, max: number, agora: number = Date.now()): boolean {
  const entrada = memoria.get(ip)
  if (!entrada || entrada.reset < agora) {
    memoria.set(ip, { count: 1, reset: agora + 60_000 })
    return true
  }
  if (entrada.count >= max) return false
  entrada.count++
  return true
}

async function limiteDoAmbiente(nome: NomeLimite): Promise<LimiteCf | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    return (env as unknown as Record<string, LimiteCf | undefined>)[nome] ?? null
  } catch {
    return null
  }
}

/** true = pode seguir. Binding com erro nao derruba a inscricao: cai na memoria. */
export async function permitirTentativa(
  nome: NomeLimite,
  ip: string,
  memoria: Memoria,
  max: number,
  binding?: LimiteCf | null,
): Promise<boolean> {
  const cf = binding === undefined ? await limiteDoAmbiente(nome) : binding
  if (cf) {
    try {
      return (await cf.limit({ key: `${nome}:${ip}` })).success
    } catch {
      // cai na memoria
    }
  }
  return limiteEmMemoria(memoria, ip, max)
}

/** Isca preenchida = robo. Pessoa nunca ve o campo. */
export function ehRobo(corpo: Record<string, unknown>): boolean {
  const v = corpo[CAMPO_ISCA]
  return typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null && v !== false
}

export type Verificacao = { ok: true } | { ok: false; motivo: 'sem_token' | 'recusado' | 'indisponivel' }

/**
 * Turnstile: sem TURNSTILE_SECRET_KEY nao exige nada (dormente). Com a chave, token ausente,
 * recusado ou verificacao fora do ar nega: quem liga a chave quer a porta fechada.
 */
export async function conferirTurnstile(
  token: unknown,
  ip: string,
  segredo: string | undefined = process.env.TURNSTILE_SECRET_KEY,
  buscar: typeof fetch = fetch,
): Promise<Verificacao> {
  if (!segredo) return { ok: true }
  if (typeof token !== 'string' || token === '' || token.length > TETO_TOKEN) return { ok: false, motivo: 'sem_token' }
  try {
    const dados = new URLSearchParams({ secret: segredo, response: token })
    if (ip && ip !== 'unknown') dados.set('remoteip', ip)
    const res = await buscar(TURNSTILE_VERIFICAR, { method: 'POST', body: dados })
    if (!res.ok) return { ok: false, motivo: 'indisponivel' }
    const json = (await res.json()) as { success?: boolean }
    return json.success === true ? { ok: true } : { ok: false, motivo: 'recusado' }
  } catch {
    return { ok: false, motivo: 'indisponivel' }
  }
}
