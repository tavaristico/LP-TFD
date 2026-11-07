import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ACEITE_WAITLIST } from '@/lib/aceite-waitlist'

const capturar = vi.fn()
vi.mock('@/lib/crm', () => ({ capturarComSupabase: (...a: unknown[]) => capturar(...a) }))

import { POST as fiorettes } from '@/app/api/fiorettes/route'
import { POST as waitlist } from '@/app/api/waitlist/route'

const gravada = { gravacao: { estado: 'gravada', contato_id: 'c1', criado: true, consentimentos: 0, eventos: 1 }, resultado: { ok: true } }
let n = 0
const ipNovo = () => `10.0.0.${++n}`

function req(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}
const PAGINA = { historia: 'uma pagina de teste', assinatura: 'nome secreto', titulo: '', cidade: '' }

beforeEach(() => {
  capturar.mockReset().mockResolvedValue(gravada)
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_CAPTURA_JWT', 'jwt-de-teste')
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
  vi.stubEnv('BREVO_API_KEY', '')
  vi.stubEnv('EMAIL_ENVIO', 'desligado')
})
afterEach(() => vi.unstubAllEnvs())

describe('/fiorettes e o CRM', () => {
  it('flag ligada com e-mail: grava com origem fiorettes', async () => {
    vi.stubEnv('CRM_ENVIO', 'ligado')
    const r = await fiorettes(req('/api/fiorettes', { ...PAGINA, email: 'Teste+F1@melfiore.invalid', aceite_versao: ACEITE_WAITLIST.versao }, { 'cf-connecting-ip': ipNovo() }))
    expect(r.status).toBe(200)
    expect(capturar).toHaveBeenCalledTimes(1)
    const e = capturar.mock.calls[0][0]
    expect(e).toMatchObject({ origem: 'fiorettes', email: 'teste+f1@melfiore.invalid', nome: 'nome secreto' })
    expect(e.consentimentos[0]).toMatchObject({ forma: 'aviso_e_clique', texto_versao: ACEITE_WAITLIST.versao })
  })
  it('flag ligada sem e-mail: sem identidade, nada grava e a pagina entrega', async () => {
    vi.stubEnv('CRM_ENVIO', 'ligado')
    const r = await fiorettes(req('/api/fiorettes', PAGINA, { 'cf-connecting-ip': ipNovo() }))
    expect(r.status).toBe(200)
    expect(capturar).not.toHaveBeenCalled()
  })
  it('flag desligada: nao grava e responde igual', async () => {
    vi.stubEnv('CRM_ENVIO', 'desligado')
    const r = await fiorettes(req('/api/fiorettes', { ...PAGINA, email: 'a@melfiore.invalid' }, { 'cf-connecting-ip': ipNovo() }))
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ success: true, id: expect.stringMatching(/^\d{4}$/) })
    expect(capturar).not.toHaveBeenCalled()
  })
  it('flag ausente: nao grava', async () => {
    vi.stubEnv('CRM_ENVIO', '')
    await fiorettes(req('/api/fiorettes', { ...PAGINA, email: 'a@melfiore.invalid' }, { 'cf-connecting-ip': ipNovo() }))
    expect(capturar).not.toHaveBeenCalled()
  })
  it('falha do Supabase nao derruba a entrega da pagina', async () => {
    vi.stubEnv('CRM_ENVIO', 'ligado')
    capturar.mockRejectedValue(new Error('fora'))
    const r = await fiorettes(req('/api/fiorettes', { ...PAGINA, email: 'a@melfiore.invalid' }, { 'cf-connecting-ip': ipNovo() }))
    expect(r.status).toBe(200)
  })
  it('validacao igual: historia curta continua 400', async () => {
    const r = await fiorettes(req('/api/fiorettes', { ...PAGINA, historia: 'a' }, { 'cf-connecting-ip': ipNovo() }))
    expect(r.status).toBe(400)
  })
})

describe('rate limit por cf-connecting-ip', () => {
  it('fiorettes: x-forwarded-for trocado a cada pedido nao burla; mesmo cf-connecting-ip bloqueia no 4o', async () => {
    const ip = ipNovo()
    const codigos: number[] = []
    for (let i = 0; i < 4; i++) {
      codigos.push((await fiorettes(req('/api/fiorettes', PAGINA, { 'cf-connecting-ip': ip, 'x-forwarded-for': `9.9.9.${i}` }))).status)
    }
    expect(codigos).toEqual([200, 200, 200, 429])
  })
  it('waitlist: mesmo cf-connecting-ip bloqueia no 6o', async () => {
    const ip = ipNovo()
    const codigos: number[] = []
    for (let i = 0; i < 6; i++) {
      codigos.push((await waitlist(req('/api/waitlist', { name: 'Maria', email: 'm@melfiore.invalid' }, { 'cf-connecting-ip': ip, 'x-forwarded-for': `8.8.8.${i}` }))).status)
    }
    expect(codigos).toEqual([200, 200, 200, 200, 200, 429])
  })
  it('IPs diferentes no cf-connecting-ip nao se bloqueiam, mesmo com o mesmo x-forwarded-for', async () => {
    const codigos: number[] = []
    for (let i = 0; i < 4; i++) {
      codigos.push((await fiorettes(req('/api/fiorettes', PAGINA, { 'cf-connecting-ip': ipNovo(), 'x-forwarded-for': '7.7.7.7' }))).status)
    }
    expect(codigos).toEqual([200, 200, 200, 200])
  })
  it('sem cf-connecting-ip: cai no x-forwarded-for, como hoje', async () => {
    const xff = `6.6.6.${++n}`
    const codigos: number[] = []
    for (let i = 0; i < 4; i++) codigos.push((await fiorettes(req('/api/fiorettes', PAGINA, { 'x-forwarded-for': `${xff}, 1.1.1.1` }))).status)
    expect(codigos).toEqual([200, 200, 200, 429])
  })
})
