import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as fiorettes } from '@/app/api/fiorettes/route'
import { POST as waitlist } from '@/app/api/waitlist/route'
import { GET as saude } from '@/app/api/saude/route'
import { foraDeProducao } from '@/lib/ambiente'

let n = 0
const req = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': `10.9.0.${++n}` },
    body: JSON.stringify(body),
  })

const PESSOA = { name: 'Fulana Segredo', email: 'fulana.segredo@melfiore.invalid' }
const PAGINA = { historia: 'historia muito secreta', assinatura: 'assinatura secreta', titulo: 'titulo secreto', cidade: 'cidade secreta' }
const SEGREDOS = ['Segredo', 'segredo', 'secret', 'cidade', 'fulana']

let logs: string[]
let fetchMock: ReturnType<typeof vi.fn>
const tudoLogado = () => logs.join('\n')

beforeEach(() => {
  logs = []
  for (const m of ['log', 'error', 'warn'] as const)
    vi.spyOn(console, m).mockImplementation((...a: unknown[]) => { logs.push(a.map((x) => JSON.stringify(x) ?? String(x)).join(' ')) })
  fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('CRM_ENVIO', 'desligado')
  vi.stubEnv('BREVO_API_KEY', '')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

function semDadoPessoal() {
  const t = tudoLogado()
  for (const s of SEGREDOS) expect(t).not.toContain(s)
}

describe('producao: nunca confirmar sem gravar', () => {
  it('criterio: so development e test sao fora de producao; ausente ou estranho fecha', () => {
    for (const [v, esperado] of [['production', false], ['development', true], ['test', true], ['', false], ['staging', false]] as const) {
      vi.stubEnv('NODE_ENV', v)
      expect(foraDeProducao()).toBe(esperado)
    }
  })
  it('waitlist: sem BREVO_API_KEY em producao devolve 500 e log so com o nome da variavel', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const r = await waitlist(req('/api/waitlist', PESSOA))
    expect(r.status).toBe(500)
    expect((await r.json()).success).toBe(false)
    expect(tudoLogado()).toContain('BREVO_API_KEY')
    semDadoPessoal()
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('fiorettes: sem BREVO_API_KEY em producao devolve 500 e log sem dado', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const r = await fiorettes(req('/api/fiorettes', PAGINA))
    expect(r.status).toBe(500)
    expect((await r.json()).success).toBe(false)
    semDadoPessoal()
  })
  it('desenvolvimento segue: 200 nas duas rotas, log sem dado pessoal', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect((await waitlist(req('/api/waitlist', PESSOA))).status).toBe(200)
    expect((await fiorettes(req('/api/fiorettes', PAGINA))).status).toBe(200)
    semDadoPessoal()
  })
  it('fiorettes: chave presente e trava desligada: 200 sem aviso, log so com id', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('BREVO_API_KEY', 'chave-de-teste')
    vi.stubEnv('EMAIL_ENVIO', 'desligado')
    const r = await fiorettes(req('/api/fiorettes', PAGINA))
    expect(r.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
    semDadoPessoal()
  })
  it('waitlist: chave presente grava no Brevo e confirma', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('BREVO_API_KEY', 'chave-de-teste')
    vi.stubEnv('EMAIL_ENVIO', 'desligado')
    const r = await waitlist(req('/api/waitlist', PESSOA))
    expect(r.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    semDadoPessoal()
  })
  it('waitlist: Brevo recusa (401) vira 500 e log sem dado', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('BREVO_API_KEY', 'chave-de-teste')
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }))
    expect((await waitlist(req('/api/waitlist', PESSOA))).status).toBe(500)
    semDadoPessoal()
  })
})

describe('GET /api/saude', () => {
  it('so booleanos, sem valor de chave, sem rede', async () => {
    vi.stubEnv('BREVO_API_KEY', 'xkeysib-VALOR-SECRETO-123')
    vi.stubEnv('EMAIL_ENVIO', 'ligado')
    vi.stubEnv('CRM_ENVIO', 'desligado')
    vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('SUPABASE_CAPTURA_JWT', 'jwt-secreto')
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_x')
    const r = await saude()
    const corpo = await r.json()
    expect(corpo).toEqual({ brevo: true, email_envio: true, crm_envio: false, supabase: true })
    const txt = JSON.stringify(corpo)
    expect(txt).not.toMatch(/SECRETO|jwt|sb_|supabase\.co|xkeysib/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('tudo ausente: tudo falso', async () => {
    vi.stubEnv('EMAIL_ENVIO', '')
    vi.stubEnv('SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_CAPTURA_JWT', '')
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '')
    expect(await (await saude()).json()).toEqual({ brevo: false, email_envio: false, crm_envio: false, supabase: false })
  })
})
