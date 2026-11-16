// Entrada das rotas de captura e cabecalhos de seguranca (S22, S23).

export const TETO_CORPO = 10_000 // bytes
export const TETO = { nome: 100, email: 254, titulo: 120, assinatura: 80, cidade: 80 } as const

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Escapa & < > " ' para texto do usuario entrar em HTML de e-mail. */
export function escaparHtml(v: string): string {
  return v.replace(/[&<>"']/g, (c) => ESCAPES[c])
}

export type CorpoLido = { ok: true; corpo: Record<string, unknown> } | { ok: false; mensagem: string }

/** Le o JSON com teto de bytes. Corpo grande, invalido ou que nao e objeto vira 400 (ok: false). */
export async function lerCorpoJson(req: Request): Promise<CorpoLido> {
  const declarado = Number(req.headers.get('content-length') ?? 0)
  if (declarado > TETO_CORPO) return { ok: false, mensagem: 'pedido grande demais.' }
  const texto = await req.text().catch(() => '')
  if (new TextEncoder().encode(texto).length > TETO_CORPO) return { ok: false, mensagem: 'pedido grande demais.' }
  try {
    const corpo = JSON.parse(texto)
    if (corpo === null || typeof corpo !== 'object' || Array.isArray(corpo)) {
      return { ok: false, mensagem: 'pedido invalido.' }
    }
    return { ok: true, corpo }
  } catch {
    return { ok: false, mensagem: 'pedido invalido.' }
  }
}

/** Campo de texto opcional: ausente vira ''; numero, objeto etc. e invalido (null). */
export function textoOuNulo(v: unknown): string | null {
  if (v === undefined || v === null) return ''
  return typeof v === 'string' ? v : null
}

// ---- cabecalhos ----

export const HSTS = 'max-age=15552000' // 6 meses, sem includeSubDomains, sem preload

export const PERMISSIONS_POLICY =
  'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'

// Report-Only: nada e bloqueado, so aparece no console do navegador. 'unsafe-inline' porque o Next
// (e o GTM, se o GA4 for ligado) injetam script inline; trocar por nonce quando o relatorio sair limpo.
export const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self'",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

/** Borda do Worker: http vira 301 para https; toda resposta leva HSTS; x-powered-by sai. */
export function aplicarBorda(req: Request, resposta: Response): Response {
  const h = new Headers(resposta.headers)
  h.delete('x-powered-by')
  h.set('strict-transport-security', HSTS)
  return new Response(resposta.body, { status: resposta.status, statusText: resposta.statusText, headers: h })
}

export function redirecionarParaHttps(req: Request): Response | null {
  const url = new URL(req.url)
  if (url.protocol !== 'http:') return null
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return null
  url.protocol = 'https:'
  return new Response(null, { status: 301, headers: { location: url.toString() } })
}
