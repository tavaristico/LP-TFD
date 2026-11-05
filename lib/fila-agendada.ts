// Entrada do cron do Worker (trigger `scheduled`): esvazia a fila de reenvio da captura.
// A fila (KV CAPTURA_FILA) so esvaziava quando entrava outra inscricao; sem trafego, item parado
// ate expirar (30 dias). O cron fecha essa lacuna. Nunca lanca: erro vira log sem e-mail nem nome.
import { esvaziarFilaCaptura } from '@/lib/crm-captura'
import type { KvFila } from '@/lib/fila-captura'

export interface ContextoAgendado {
  waitUntil(p: Promise<unknown>): void
}

export async function aoAgendar(env: Record<string, unknown>, ctx: ContextoAgendado): Promise<void> {
  const fila = (env.CAPTURA_FILA as KvFila | undefined) ?? null
  ctx.waitUntil(
    esvaziarFilaCaptura(env, { fila }).then(
      () => undefined,
      () => {
        console.error(JSON.stringify({ evento: 'crm.fila_agendada_erro' }))
      },
    ),
  )
}
