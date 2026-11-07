import { NextResponse } from 'next/server'
import { crmLigado } from '@/lib/crm-captura'

export const dynamic = 'force-dynamic'

// So booleanos. Nunca valor, tamanho ou prefixo de chave. Sem chamada de rede.
export async function GET() {
  const tem = (v: string | undefined) => Boolean(v && v.trim())
  return NextResponse.json(
    {
      brevo: tem(process.env.BREVO_API_KEY),
      email_envio: process.env.EMAIL_ENVIO === 'ligado',
      crm_envio: crmLigado(),
      supabase:
        tem(process.env.SUPABASE_URL) &&
        tem(process.env.SUPABASE_CAPTURA_JWT) &&
        tem(process.env.SUPABASE_PUBLISHABLE_KEY),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
