// Worker de producao: o handler do OpenNext (fetch) mais o cron da fila de captura (scheduled).
// wrangler.jsonc aponta `main` para este arquivo. O `.open-next/worker.js` e gerado por `npm run cf:build`.
// @ts-ignore gerado no build, nao existe antes dele
import handler from './.open-next/worker.js'
import { aoAgendar } from './lib/fila-agendada'
import { aplicarBorda, redirecionarParaHttps } from './lib/seguranca'

// @ts-ignore gerado no build
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js'

export default {
  // http vira 301 para https; toda resposta leva HSTS (6 meses) e sai sem x-powered-by.
  async fetch(request: Request, ...resto: unknown[]) {
    const redirecao = redirecionarParaHttps(request)
    if (redirecao) return aplicarBorda(request, redirecao)
    const resposta = await (handler as { fetch: (...a: unknown[]) => Promise<Response> }).fetch(request, ...resto)
    return aplicarBorda(request, resposta)
  },
  async scheduled(_evento: unknown, env: Record<string, unknown>, ctx: { waitUntil(p: Promise<unknown>): void }) {
    await aoAgendar(env, ctx)
  },
}
