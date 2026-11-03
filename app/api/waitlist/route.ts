import { NextRequest, NextResponse } from 'next/server'
import { podeEnviarEmail } from '@/lib/trava-email'

// In-memory rate limiter (resets on redeploy — adequate for landing page scale)
const attempts = new Map<string, { count: number; reset: number }>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || entry.reset < now) {
    attempts.set(ip, { count: 1, reset: now + 60_000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

async function addBrevoContact(name: string, email: string): Promise<void> {
  const firstName = name.trim().split(' ')[0]

  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'accept':       'application/json',
      'content-type': 'application/json',
      'api-key':      process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      attributes: { NOME: firstName },
      listIds: [Number(process.env.BREVO_LIST_ID)],
      updateEnabled: false, // silently ignores duplicates
    }),
  })

  // 204 = created, 400 with code "duplicate_parameter" = already exists — both are fine
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // Duplicate contact is not an error — we treat it as success
    if (body?.code !== 'duplicate_parameter') {
      throw new Error(`Brevo contact error: ${res.status}`)
    }
  }
}

async function sendBrevoWelcomeEmail(name: string, email: string): Promise<void> {
  const firstName = name.trim().split(' ')[0]

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept':       'application/json',
      'content-type': 'application/json',
      'api-key':      process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      to: [{ email: email.trim().toLowerCase(), name: name.trim() }],
      templateId: Number(process.env.BREVO_TEMPLATE_ID),
      params: { FIRSTNAME: firstName },
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name:  process.env.BREVO_SENDER_NAME ?? 'MELFIORE',
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`Brevo email error: ${res.status}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { success: false, message: 'tente novamente em instantes.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const name: string  = (body?.name  ?? '').trim()
    const email: string = (body?.email ?? '').trim().toLowerCase()

    // Validation
    if (!name || name.length < 2) {
      return NextResponse.json(
        { success: false, message: 'Por favor, insira seu nome.' },
        { status: 400 }
      )
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'E-mail inválido.' },
        { status: 400 }
      )
    }

    // Brevo integration (only runs if env vars are set)
    if (process.env.BREVO_API_KEY) {
      await addBrevoContact(name, email)
      // Boas-vindas falhar não derruba o cadastro: o contato já está na lista.
      if (podeEnviarEmail('waitlist:boas-vindas')) {
        await sendBrevoWelcomeEmail(name, email).catch((e) =>
          console.error('[waitlist] boas-vindas falhou (cadastro mantido):', e))
      }
    } else {
      // Dev mode: log only
      console.log('[waitlist:dev] lead capturado:', { name, email })
    }

    return NextResponse.json({ success: true, message: 'cadastro confirmado.' })
  } catch (err) {
    console.error('[waitlist] error:', err)
    return NextResponse.json(
      { success: false, message: 'algo deu errado. tente novamente.' },
      { status: 500 }
    )
  }
}
