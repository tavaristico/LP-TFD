import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { POST as fiorettes } from '@/app/api/fiorettes/route'
import { POST as waitlist } from '@/app/api/waitlist/route'
import { GET as saude } from '@/app/api/saude/route'
import { aplicarBorda, escaparHtml, HSTS, redirecionarParaHttps } from '@/lib/seguranca'
import nextConfig from '@/next.config'

const raiz = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url))

let n = 0
const bruto = (url: string, corpo: string) =>
  new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': `10.8.0.${++n}` },
    body: corpo,
  })
const req = (url: string, corpo: unknown) => bruto(url, JSON.stringify(corpo))

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('CRM_ENVIO', 'desligado')
  vi.stubEnv('BREVO_API_KEY', 'chave-de-teste')
  vi.stubEnv('EMAIL_ENVIO', 'ligado')
  vi.stubEnv('FIORETTES_NOTIFY_EMAIL', 'aviso@melfiore.invalid')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('S23: escapar HTML no e-mail de aviso', () => {
  it('escapaHtml troca & < > " e aspas simples', () => {
    expect(escaparHtml(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;')
  })
  it('quatro campos do usuario chegam escapados ao Brevo', async () => {
    const evil = '<img src=http://x/p.gif><script>1</script>'
    const r = await fiorettes(req('/api/fiorettes', { historia: evil, assinatura: evil, titulo: evil, cidade: evil }))
    expect(r.status).toBe(200)
    const envio = fetchMock.mock.calls.find((c) => String(c[0]).includes('/smtp/email'))!
    const html: string = JSON.parse(envio[1].body).htmlContent
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script')
    expect(html.match(/&lt;img src=http:\/\/x\/p\.gif&gt;/g)).toHaveLength(4)
  })
})

describe('S23: tetos e 400', () => {
  it('fiorettes: JSON invalido, array e corpo grande dao 400', async () => {
    expect((await fiorettes(bruto('/api/fiorettes', '{nao e json'))).status).toBe(400)
    expect((await fiorettes(bruto('/api/fiorettes', '[1,2]'))).status).toBe(400)
    expect((await fiorettes(bruto('/api/fiorettes', JSON.stringify({ historia: 'a'.repeat(10_500) })))).status).toBe(400)
  })
  it('fiorettes: campo que nao e texto e campo acima do teto dao 400', async () => {
    const base = { historia: 'uma historia' }
    expect((await fiorettes(req('/api/fiorettes', { ...base, titulo: { x: 1 } }))).status).toBe(400)
    expect((await fiorettes(req('/api/fiorettes', { ...base, titulo: 'a'.repeat(121) }))).status).toBe(400)
    expect((await fiorettes(req('/api/fiorettes', { ...base, assinatura: 'a'.repeat(81) }))).status).toBe(400)
    expect((await fiorettes(req('/api/fiorettes', { ...base, cidade: 'a'.repeat(81) }))).status).toBe(400)
    expect((await fiorettes(req('/api/fiorettes', { ...base, titulo: 'a'.repeat(120), assinatura: 'a'.repeat(80), cidade: 'a'.repeat(80) }))).status).toBe(200)
  })
  it('waitlist: JSON invalido, tipo errado, nome e e-mail longos dao 400', async () => {
    expect((await waitlist(bruto('/api/waitlist', 'lixo'))).status).toBe(400)
    expect((await waitlist(bruto('/api/waitlist', 'null'))).status).toBe(400)
    expect((await waitlist(req('/api/waitlist', { name: 123, email: 'a@b.co' }))).status).toBe(400)
    expect((await waitlist(req('/api/waitlist', { name: 'a'.repeat(101), email: 'a@b.co' }))).status).toBe(400)
    expect((await waitlist(req('/api/waitlist', { name: 'Maria', email: `${'a'.repeat(250)}@b.co` }))).status).toBe(400)
    expect((await waitlist(bruto('/api/waitlist', JSON.stringify({ name: 'Maria', email: 'a@b.co', x: 'z'.repeat(10_500) })))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('waitlist: entrada valida segue 200', async () => {
    expect((await waitlist(req('/api/waitlist', { name: 'Maria', email: 'maria@melfiore.invalid' }))).status).toBe(200)
  })
})

describe('S22: cabecalhos, saude, wrangler, security.txt', () => {
  it('next.config: x-powered-by off, CSP Report-Only, Permissions-Policy, frame-ancestors', async () => {
    expect(nextConfig.poweredByHeader).toBe(false)
    const [regra] = await nextConfig.headers!()
    const h = Object.fromEntries(regra.headers.map((x) => [x.key.toLowerCase(), x.value]))
    expect(h['content-security-policy-report-only']).toContain("frame-ancestors 'none'")
    expect(h['content-security-policy']).toBeUndefined()
    expect(h['permissions-policy']).toContain('camera=()')
  })
  it('/api/saude devolve so ok', async () => {
    expect(await (await saude()).json()).toEqual({ status: 'ok' })
  })
  it('wrangler: workers_dev desligado', () => {
    const txt = readFileSync(raiz('wrangler.jsonc'), 'utf8')
    expect(txt).toMatch(/"workers_dev":\s*false/)
    expect(txt).not.toMatch(/"workers_dev":\s*true/)
  })
  it('security.txt tem Contact e Expires no futuro', () => {
    const txt = readFileSync(raiz('public/.well-known/security.txt'), 'utf8')
    expect(txt).toMatch(/^Contact: mailto:\S+@\S+$/m)
    const exp = txt.match(/^Expires: (\S+)$/m)![1]
    expect(new Date(exp).getTime()).toBeGreaterThan(Date.now())
  })
})

describe('Extra: borda do Worker (https e HSTS)', () => {
  it('http vira 301 para https, mantendo caminho e query', () => {
    const r = redirecionarParaHttps(new Request('http://melfiore.com/fiorettes?a=1'))!
    expect(r.status).toBe(301)
    expect(r.headers.get('location')).toBe('https://melfiore.com/fiorettes?a=1')
  })
  it('https nao redireciona; localhost nao redireciona', () => {
    expect(redirecionarParaHttps(new Request('https://melfiore.com/'))).toBeNull()
    expect(redirecionarParaHttps(new Request('http://localhost:8787/'))).toBeNull()
  })
  it('HSTS e max-age de 6 meses, sem includeSubDomains e sem preload', () => {
    expect(HSTS).toBe('max-age=15552000')
    const r = aplicarBorda(new Request('https://melfiore.com/'), new Response('x', { headers: { 'x-powered-by': 'Next.js' } }))
    expect(r.headers.get('strict-transport-security')).toBe('max-age=15552000')
    expect(r.headers.get('x-powered-by')).toBeNull()
    expect(r.headers.get('strict-transport-security')).not.toMatch(/includeSubDomains|preload/i)
  })
})
