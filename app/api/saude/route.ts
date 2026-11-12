import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Publica: devolve so "ok". O detalhe das integracoes saiu daqui (S10-12): nao se mostra o que esta
// ligado ou desligado de proposito. Estado real: painel da Cloudflare e `wrangler tail`.
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } })
}
