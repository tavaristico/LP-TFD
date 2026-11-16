import { NextRequest, NextResponse } from 'next/server'
import { podeEnviarEmail } from '@/lib/trava-email'
import { foraDeProducao } from '@/lib/ambiente'
import { lerCorpoJson, textoOuNulo, TETO } from '@/lib/seguranca'
import { conferirTurnstile, ehRobo, permitirTentativa, type Memoria } from '@/lib/antirrobo'
import { capturarWaitlistNoCrm, crmLigado, ipDoCliente } from '@/lib/crm-captura'
import { normalizarCelularBR } from '@/lib/crm/dadosPessoais'

// Limite por IP: binding da Cloudflare, com a memoria da instancia como reserva (lib/antirrobo.ts, S11)
const memoria: Memoria = new Map()

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

  // 204 = created, 400 with code "duplicate_parameter" = already exists : both are fine
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // Duplicate contact is not an error : we treat it as success
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
    const ip = ipDoCliente(req.headers)
    if (!(await permitirTentativa('LIMITE_WAITLIST', ip, memoria, 5))) {
      return NextResponse.json(
        { success: false, message: 'tente novamente em instantes.' },
        { status: 429 }
      )
    }

    const lido = await lerCorpoJson(req)
    if (!lido.ok) {
      return NextResponse.json({ success: false, message: lido.mensagem }, { status: 400 })
    }
    const body = lido.corpo
    // Isca preenchida = robo: finge sucesso e nao grava nada.
    if (ehRobo(body)) return NextResponse.json({ success: true, message: 'cadastro confirmado.' })
    const verificacao = await conferirTurnstile(body.turnstile, ip)
    if (!verificacao.ok) {
      console.error(`[waitlist] antirrobo recusou (${verificacao.motivo})`)
      return NextResponse.json({ success: false, message: 'nao deu para confirmar. tente novamente.' }, { status: 403 })
    }
    const nomeBruto = textoOuNulo(body.name)
    const emailBruto = textoOuNulo(body.email)
    if (nomeBruto === null || emailBruto === null) {
      return NextResponse.json({ success: false, message: 'pedido invalido.' }, { status: 400 })
    }
    const name = nomeBruto.trim()
    const email = emailBruto.trim().toLowerCase()
    if (name.length > TETO.nome || email.length > TETO.email) {
      return NextResponse.json({ success: false, message: 'algum campo ficou longo demais.' }, { status: 400 })
    }

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

    // Celular (opcional): vazio segue sem ele; preenchido e invalido e recusado, nunca ignorado em silencio.
    // Vira E.164 e vai SO para o CRM (identidade e dedup). Nunca vai ao Brevo: nenhum envio novo nasce daqui.
    const zapBruto = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : ''
    if (body.whatsapp !== undefined && body.whatsapp !== null && typeof body.whatsapp !== 'string') {
      return NextResponse.json({ success: false, message: 'celular inválido. use DDD + 9 dígitos.' }, { status: 400 })
    }
    if (zapBruto.length > TETO.nome) {
      return NextResponse.json({ success: false, message: 'algum campo ficou longo demais.' }, { status: 400 })
    }
    const whatsapp = zapBruto === '' ? null : normalizarCelularBR(zapBruto)
    if (zapBruto !== '' && whatsapp === null) {
      return NextResponse.json({ success: false, message: 'celular inválido. use DDD + 9 dígitos.' }, { status: 400 })
    }

    // Contato unico (2A.3): Supabase primeiro, Brevo depois. Desligado por padrao (CRM_ENVIO).
    // Nunca lanca: se o Supabase falhar, a inscricao segue para o Brevo e a pendencia vai ao log.
    if (crmLigado()) await capturarWaitlistNoCrm({ name, email, ...(whatsapp ? { whatsapp } : {}), ip, aceite_versao: body?.aceite_versao })

    // Nunca confirmar sem gravar: em producao, sem chave do Brevo a inscricao nao e gravada em lugar nenhum.
    if (!process.env.BREVO_API_KEY) {
      if (foraDeProducao()) {
        // Modo de desenvolvimento: confirma, sem dado pessoal no log.
        console.log('[waitlist:dev] inscricao recebida (1), sem Brevo')
        return NextResponse.json({ success: true, message: 'cadastro confirmado.' })
      }
      console.error('[waitlist] BREVO_API_KEY ausente')
      return NextResponse.json(
        { success: false, message: 'algo deu errado. tente novamente.' },
        { status: 500 }
      )
    }

    await addBrevoContact(name, email)
    // Boas-vindas falhar não derruba o cadastro: o contato já está na lista.
    if (podeEnviarEmail('waitlist:boas-vindas')) {
      await sendBrevoWelcomeEmail(name, email).catch(() =>
        console.error('[waitlist] boas-vindas falhou (cadastro mantido)'))
    }

    return NextResponse.json({ success: true, message: 'cadastro confirmado.' })
  } catch (err) {
    console.error('[waitlist] error:', err instanceof Error ? err.message : 'desconhecido')
    return NextResponse.json(
      { success: false, message: 'algo deu errado. tente novamente.' },
      { status: 500 }
    )
  }
}
