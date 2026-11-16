import { podeReceberCompra } from '@/lib/trava-compras'
import { receberCompra } from '@/lib/crm/receberCompra'

// Entrada de compras do Medusa (S25, docs/motor/0008 no MELFIORE-SITE). Desligada por padrao:
// so abre com COMPRAS_ENTRADA=ligado. Assinatura HMAC conferida antes de ler o corpo.
// CPF, endereco e cartao sao recusados (422) no pacote crm. Nunca envia e-mail.
export async function POST(req: Request): Promise<Response> {
  if (!podeReceberCompra('loja/compra')) {
    return new Response(JSON.stringify({ ok: false, motivo: 'desligada' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })
  }
  return receberCompra(req, {
    segredos: [process.env.COMPRAS_ASSINATURA_SEGREDO ?? '', process.env.COMPRAS_ASSINATURA_SEGREDO_ANTERIOR ?? ''],
    supabase: {
      url: process.env.SUPABASE_URL ?? '',
      chave: process.env.SUPABASE_COMPRAS_JWT ?? '',
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
    },
  })
}

export async function GET(): Promise<Response> {
  return new Response(JSON.stringify({ ok: false, motivo: 'metodo' }), {
    status: 405,
    headers: { 'content-type': 'application/json', allow: 'POST' },
  })
}
