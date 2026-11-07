import { NextRequest, NextResponse } from 'next/server'
import { podeEnviarEmail } from '@/lib/trava-email'
import { capturarFiorettesNoCrm, crmLigado, ipDoCliente } from '@/lib/crm-captura'

const attempts = new Map<string, { count: number; reset: number }>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || entry.reset < now) {
    attempts.set(ip, { count: 1, reset: now + 60_000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

function randomId(): string {
  return Math.floor(Math.random() * 10000).toString().padStart(4, '0')
}

async function sendNotification(payload: {
  id: string
  assinatura: string
  titulo: string
  historia: string
  cidade: string
}): Promise<void> {
  const to = process.env.FIORETTES_NOTIFY_EMAIL ?? process.env.BREVO_SENDER_EMAIL
  if (!to) throw new Error('notify email not configured')

  const html = `
    <div style="font-family:monospace;background:#000;color:#e8e8e8;padding:32px;max-width:600px">
      <p style="color:#CC2020;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 24px">
        nova página recebida — fiorette #${payload.id}
      </p>
      ${payload.assinatura ? `<p style="font-size:12px;color:#7A4848;margin:0 0 4px">assinada: ${payload.assinatura}</p>` : ''}
      ${payload.cidade ? `<p style="font-size:12px;color:#7A4848;margin:0 0 24px">༺${payload.cidade}༻</p>` : '<p style="margin:0 0 24px"></p>'}
      ${payload.titulo ? `<p style="font-size:14px;color:#CC2020;margin:0 0 16px">${payload.titulo}</p>` : ''}
      <p style="font-size:16px;line-height:1.8;white-space:pre-wrap;margin:0">${payload.historia}</p>
    </div>
  `

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept':       'application/json',
      'content-type': 'application/json',
      'api-key':      process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      to: [{ email: to }],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL ?? 'diario@melfiore.com',
        name:  'arquivo fiorettes',
      },
      subject: `fiorette #${payload.id} — nova página`,
      htmlContent: html,
    }),
  })

  if (!res.ok) throw new Error(`Brevo error: ${res.status}`)
}

export async function POST(req: NextRequest) {
  try {
    const ip = ipDoCliente(req.headers)
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { success: false, message: 'tenta de novo em instantes.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const historia: string = (body?.historia ?? '').trim()
    const assinatura: string = (body?.assinatura ?? '').trim()
    const titulo: string = (body?.titulo ?? '').trim()
    const cidade: string = (body?.cidade ?? '').trim()

    if (!historia || historia.length < 3) {
      return NextResponse.json(
        { success: false, message: 'conta algo antes de entregar.' },
        { status: 400 }
      )
    }
    if (historia.length > 2000) {
      return NextResponse.json(
        { success: false, message: 'a página ficou longa demais.' },
        { status: 400 }
      )
    }

    const id = randomId()

    // Contato unico (M12): Supabase antes do Brevo, atras de CRM_ENVIO (desligado = nada muda).
    // A pagina so vira contato se a pessoa deixar e-mail: sem ele nao ha identidade e nada e gravado.
    // Nunca lanca: falha do Supabase vai para a fila e a entrega da pagina segue.
    if (crmLigado()) {
      const email: string = (typeof body?.email === 'string' ? body.email : '').trim().toLowerCase()
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        await capturarFiorettesNoCrm({ name: assinatura, email, ip, aceite_versao: body?.aceite_versao })
      }
    }

    if (process.env.BREVO_API_KEY && podeEnviarEmail('fiorettes:aviso')) {
      await sendNotification({ id, assinatura, titulo, historia, cidade })
    } else {
      console.log('[fiorettes:dev] nova página:', { id, assinatura, titulo, historia, cidade })
    }

    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error('[fiorettes] error:', err)
    return NextResponse.json(
      { success: false, message: 'algo deu errado. tenta de novo?' },
      { status: 500 }
    )
  }
}
