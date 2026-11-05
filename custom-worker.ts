// Worker de producao: o handler do OpenNext (fetch) mais o cron da fila de captura (scheduled).
// wrangler.jsonc aponta `main` para este arquivo. O `.open-next/worker.js` e gerado por `npm run cf:build`.
// @ts-ignore gerado no build, nao existe antes dele
import handler from './.open-next/worker.js'
import { aoAgendar } from './lib/fila-agendada'

// @ts-ignore gerado no build
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js'

export default {
  fetch: (handler as { fetch: (...a: unknown[]) => Promise<Response> }).fetch,
  async scheduled(_evento: unknown, env: Record<string, unknown>, ctx: { waitUntil(p: Promise<unknown>): void }) {
    await aoAgendar(env, ctx)
  },
}
