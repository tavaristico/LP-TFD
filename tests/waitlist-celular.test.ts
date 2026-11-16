import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ACEITE_WAITLIST } from '@/lib/aceite-waitlist'
import { celularPareceValido } from '@/lib/celular-br'
import { normalizarCelularBR } from '@/lib/crm/dadosPessoais'

const capturar = vi.fn()
vi.mock('@/lib/crm', () => ({ capturarComSupabase: (...a: unknown[]) => capturar(...a) }))

import { POST as waitlist } from '@/app/api/waitlist/route'

const gravada = { gravacao: { estado: 'gravada', contato_id: 'c1', criado: true, consentimentos: 1, eventos: 1 }, resultado: { ok: true } }
let n = 100
const ipNovo = () => `10.1.0.${++n}`
const fetchMock = vi.fn()

function req(corpo: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ipNovo() },
    body: JSON.stringify({ name: 'Maria Teste', email: 'maria@melfiore.invalid', aceite_versao: ACEITE_WAITLIST.versao, ...corpo }),
  })
}

beforeEach(() => {
  capturar.mockReset().mockResolvedValue(gravada)
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('CRM_ENVIO', 'ligado')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_CAPTURA_JWT', 'jwt-de-teste')
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
  vi.stubEnv('BREVO_API_KEY', 'chave-de-teste')
  vi.stubEnv('BREVO_LIST_ID', '1')
  vi.stubEnv('EMAIL_ENVIO', 'desligado')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('landing: celular (WhatsApp) opcional', () => {
  it.each(['(11) 98765-4321', '11987654321', '+55 11 98765-4321', '5511987654321'])(
    'celular valido %s vira E.164 e chega a ficha do CRM pela captura da landing',
    async (zap) => {
      const r = await waitlist(req({ whatsapp: zap }))
      expect(r.status).toBe(200)
      expect(capturar).toHaveBeenCalledTimes(1)
      expect(capturar.mock.calls[0][0]).toMatchObject({ origem: 'waitlist', email: 'maria@melfiore.invalid', whatsapp: '+5511987654321' })
    },
  )

  it('sem celular (campo ausente ou vazio): entra como antes, sem erro', async () => {
    for (const corpo of [{}, { whatsapp: '' }, { whatsapp: '   ' }]) {
      capturar.mockClear()
      const r = await waitlist(req(corpo))
      expect(r.status).toBe(200)
      expect(capturar.mock.calls[0][0]).not.toHaveProperty('whatsapp')
    }
  })

  it.each(['1132654321', '9876-5432', '11 8765-4321', '(00) 98765-4321', 'abc', '119876543210', '+1 415 555 2671'])(
    'celular invalido %s e rejeitado (400), nada grava e nada vai ao Brevo',
    async (zap) => {
      const r = await waitlist(req({ whatsapp: zap }))
      expect(r.status).toBe(400)
      expect(await r.json()).toMatchObject({ success: false, message: expect.stringMatching(/celular inválido/) })
      expect(capturar).not.toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it('celular que nao e texto: 400', async () => {
    expect((await waitlist(req({ whatsapp: 11987654321 }))).status).toBe(400)
    expect(capturar).not.toHaveBeenCalled()
  })

  it('o Brevo continua recebendo so e-mail e primeiro nome: o celular nunca sai para ele', async () => {
    const r = await waitlist(req({ whatsapp: '(11) 98765-4321' }))
    expect(r.status).toBe(200)
    expect(fetchMock).toHaveBeenCalled()
    for (const [url, init] of fetchMock.mock.calls) {
      expect(String(url)).toMatch(/^https:\/\/api\.brevo\.com\//)
      expect(String((init as RequestInit).body)).not.toMatch(/987654321|98765|\+55|SMS|WHATSAPP/i)
    }
  })

  it('CRM desligado: o celular nao e gravado em lugar nenhum e a inscricao segue', async () => {
    vi.stubEnv('CRM_ENVIO', 'desligado')
    const r = await waitlist(req({ whatsapp: '(11) 98765-4321' }))
    expect(r.status).toBe(200)
    expect(capturar).not.toHaveBeenCalled()
  })
})

describe('pre-checagem do navegador concorda com o servidor', () => {
  const casos = [
    '11987654321', '(11) 98765-4321', '+55 11 98765-4321', '5511987654321', '011 98765 4321', '+5511987654321', '11 9 8765 4321',
    '1132654321', '9876-5432', '119876543210', '11887654321', '01987654321', '(00) 98765-4321', '11 9876x4321', '+1 415 555 2671', '', '   ', '55', '+',
  ]
  it.each(casos)('%j', (v) => {
    expect(celularPareceValido(v)).toBe(normalizarCelularBR(v) !== null)
  })
})
