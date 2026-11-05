// Fila de reenvio da captura (auditoria P2). Cloudflare KV, binding CAPTURA_FILA.
// Se o Supabase falhar, a inscricao inteira fica aqui e volta pela mesma chave (o banco e idempotente).
// Binding ausente: nada quebra, o site segue como hoje e o log diz que o rastro nao foi guardado.
// O log nunca leva e-mail nem nome. O KV leva (precisa, para reenviar) e expira em 30 dias.
import type { RegistroAceite } from '@/lib/aceite-waitlist'

export const PREFIXO_FILA = 'waitlist:'
export const TTL_FILA_SEGUNDOS = 30 * 24 * 3600

/** O pedaco do KV que usamos. O binding real da Cloudflare cumpre esta forma. */
export interface KvFila {
  get(chave: string, tipo: 'json'): Promise<unknown>
  put(chave: string, valor: string, opcoes: { expirationTtl: number }): Promise<void>
  delete(chave: string): Promise<void>
  list(opcoes: { prefix: string; limit: number }): Promise<{ keys: { name: string }[] }>
}

export interface ItemFila {
  v: 1
  nome: string
  email: string
  /** Hash do IP, nunca o IP. */
  ip_hash?: string
  /** null = a pessoa entra sem consentimento de marketing registrado. */
  aceite: RegistroAceite | null
  criado_em: string
  tentativas: number
  ultimo_codigo: string
}

export async function chaveDoItem(email: string, instante: string): Promise<string> {
  const minuto = Math.floor(new Date(instante).getTime() / 60_000)
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${email}|${minuto}`))
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${PREFIXO_FILA}${hex.slice(0, 40)}`
}

/** Mesmo e-mail no mesmo minuto cai na mesma chave: duplo clique nao vira dois itens. */
export async function guardar(fila: KvFila, item: ItemFila): Promise<string> {
  const chave = await chaveDoItem(item.email, item.aceite?.aceito_em ?? item.criado_em)
  await fila.put(chave, JSON.stringify(item), { expirationTtl: TTL_FILA_SEGUNDOS })
  return chave
}

function ehItem(x: unknown): x is ItemFila {
  const i = x as ItemFila | null
  return !!i && i.v === 1 && typeof i.email === 'string' && typeof i.nome === 'string' && typeof i.tentativas === 'number'
}

export type Reenvio = 'ok' | 'falhou'

/**
 * Reenvia ate `max` itens. Item que entrou (gravado, duplicado ou recusado de vez) sai da fila;
 * o que falhou volta com a contagem. Nunca lanca.
 */
export async function drenar(
  fila: KvFila,
  reenviar: (item: ItemFila) => Promise<Reenvio>,
  max = 3,
): Promise<{ reenviados: number; restantes: number }> {
  let reenviados = 0
  let restantes = 0
  try {
    const { keys } = await fila.list({ prefix: PREFIXO_FILA, limit: max })
    for (const { name } of keys) {
      const item = await fila.get(name, 'json')
      if (!ehItem(item)) {
        await fila.delete(name) // lixo que nao e nosso formato: nao reenviavel
        continue
      }
      if ((await reenviar(item)) === 'ok') {
        await fila.delete(name)
        reenviados++
      } else {
        restantes++
        await fila.put(name, JSON.stringify({ ...item, tentativas: item.tentativas + 1 }), { expirationTtl: TTL_FILA_SEGUNDOS })
      }
    }
  } catch {
    /* KV fora: a fila fica como esta */
  }
  return { reenviados, restantes }
}

/** Binding CAPTURA_FILA do Worker, ou null (dev local, preview sem binding, build). */
export async function filaDoAmbiente(): Promise<{ fila: KvFila | null; aguardar: ((p: Promise<unknown>) => void) | null }> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env, ctx } = await getCloudflareContext({ async: true })
    const kv = (env as unknown as { CAPTURA_FILA?: KvFila }).CAPTURA_FILA ?? null
    return { fila: kv, aguardar: ctx?.waitUntil ? (p) => ctx.waitUntil(p) : null }
  } catch {
    return { fila: null, aguardar: null }
  }
}
