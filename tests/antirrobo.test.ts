// S11: limite de tentativas, isca e Turnstile nas rotas de captura.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { conferirTurnstile, ehRobo, limiteEmMemoria, permitirTentativa } from '@/lib/antirrobo'

const capturar = vi.fn()
vi.mock('@/lib/crm', () => ({ capturarComSupabase: (...a: unknown[]) => capturar(...a) }))

import { POST as waitlist } from '@/app/api/waitlist/route'
import { POST as fiorettes } from '@/app/api/fiorettes/route'

let n = 0
const ip = () => `10.9.0.${++n}`
const req = (url: string, body: unknown, ipCliente: string) =>
  new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ipCliente },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  capturar.mockReset()
  vi.stubEnv('CRM_ENVIO', 'ligado')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_CAPTURA_JWT', 'jwt-de-teste')
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
  vi.stubEnv('BREVO_API_KEY', '')
  vi.stubEnv('EMAIL_ENVIO', 'desligado')
  vi.stubEnv('TURNSTILE_SECRET_KEY', '')
})
afterEach(() => vi.unstubAllEnvs())

describe('limite de tentativas', () => {
  it('memoria: 5 passam, a 6a nao, e a janela renova', () => {
    const m = new Map()
    for (let i = 0; i < 5; i++) expect(limiteEmMemoria(m, 'a', 5, 1000)).toBe(true)
    expect(limiteEmMemoria(m, 'a', 5, 1000)).toBe(false)
    expect(limiteEmMemoria(m, 'b', 5, 1000)).toBe(true)
    expect(limiteEmMemoria(m, 'a', 5, 1000 + 61_000)).toBe(true)
  })
  it('binding da Cloudflare manda: success false barra mesmo com a memoria livre', async () => {
    const binding = { limit: vi.fn().mockResolvedValue({ success: false }) }
    expect(await permitirTentativa('LIMITE_WAITLIST', '1.1.1.1', new Map(), 5, binding)).toBe(false)
    expect(binding.limit).toHaveBeenCalledWith({ key: 'LIMITE_WAITLIST:1.1.1.1' })
  })
  it('binding que falha nao derruba a inscricao: cai na memoria', async () => {
    const binding = { limit: vi.fn().mockRejectedValue(new Error('cf fora')) }
    expect(await permitirTentativa('LIMITE_WAITLIST', '1.1.1.1', new Map(), 5, binding)).toBe(true)
  })
  it('rota /api/waitlist: a 6a tentativa do mesmo IP leva 429', async () => {
    const meu = ip()
    const corpo = { name: 'ana', email: 'ana@melfiore.invalid' }
    const codigos: number[] = []
    for (let i = 0; i < 6; i++) codigos.push((await waitlist(req('/api/waitlist', corpo, meu))).status)
    expect(codigos.slice(0, 5).every((c) => c !== 429)).toBe(true)
    expect(codigos[5]).toBe(429)
  })
  it('rota /api/fiorettes: a 4a tentativa do mesmo IP leva 429', async () => {
    const meu = ip()
    const codigos: number[] = []
    for (let i = 0; i < 4; i++) codigos.push((await fiorettes(req('/api/fiorettes', { historia: 'uma pagina' }, meu))).status)
    expect(codigos[3]).toBe(429)
    expect(codigos[2]).not.toBe(429)
  })
  it('wrangler.jsonc declara os dois limites com periodo aceito', () => {
    const txt = readFileSync(resolve(__dirname, '../wrangler.jsonc'), 'utf8')
    expect(txt).toMatch(/"name":\s*"LIMITE_WAITLIST".*"limit":\s*5,\s*"period":\s*60/)
    expect(txt).toMatch(/"name":\s*"LIMITE_FIORETTES".*"limit":\s*3,\s*"period":\s*60/)
  })
})

describe('isca', () => {
  it('ehRobo so com a isca preenchida', () => {
    expect(ehRobo({})).toBe(false)
    expect(ehRobo({ empresa_site: '' })).toBe(false)
    expect(ehRobo({ empresa_site: '  ' })).toBe(false)
    expect(ehRobo({ empresa_site: 'http://spam' })).toBe(true)
  })
  it('waitlist com isca: finge sucesso e nao grava', async () => {
    const r = await waitlist(req('/api/waitlist', { name: 'bot', email: 'bot@melfiore.invalid', empresa_site: 'x' }, ip()))
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ success: true })
    expect(capturar).not.toHaveBeenCalled()
  })
  it('fiorettes com isca: finge sucesso e nao grava', async () => {
    const r = await fiorettes(req('/api/fiorettes', { historia: 'spam spam', email: 'bot@melfiore.invalid', empresa_site: 'x' }, ip()))
    expect(r.status).toBe(200)
    expect(capturar).not.toHaveBeenCalled()
  })
  it('sem isca, a inscricao segue e grava', async () => {
    capturar.mockResolvedValue({ gravacao: { estado: 'gravada', contato_id: 'c1', criado: true, consentimentos: 0, eventos: 1 }, resultado: { ok: true } })
    const r = await waitlist(req('/api/waitlist', { name: 'ana', email: 'ana@melfiore.invalid', empresa_site: '' }, ip()))
    expect(r.status).toBe(200)
    expect(capturar).toHaveBeenCalledTimes(1)
  })
})

describe('Turnstile', () => {
  const ok = (success: boolean) => vi.fn().mockResolvedValue(new Response(JSON.stringify({ success }), { status: 200 }))
  it('sem chave no ambiente: dormente, nao exige token', async () => {
    expect(await conferirTurnstile(undefined, '1.1.1.1', '')).toEqual({ ok: true })
  })
  it('com chave: sem token nega, sem chamar a Cloudflare', async () => {
    const f = ok(true)
    expect(await conferirTurnstile(undefined, '1.1.1.1', 'chave-de-teste', f)).toEqual({ ok: false, motivo: 'sem_token' })
    expect(f).not.toHaveBeenCalled()
  })
  it('com chave: token valido passa; recusado nega', async () => {
    expect(await conferirTurnstile('tok', '1.1.1.1', 'chave-de-teste', ok(true))).toEqual({ ok: true })
    expect(await conferirTurnstile('tok', '1.1.1.1', 'chave-de-teste', ok(false))).toEqual({ ok: false, motivo: 'recusado' })
  })
  it('com chave: verificacao fora do ar nega (porta fechada)', async () => {
    const f = vi.fn().mockRejectedValue(new Error('rede'))
    expect(await conferirTurnstile('tok', '1.1.1.1', 'chave-de-teste', f)).toEqual({ ok: false, motivo: 'indisponivel' })
  })
  it('rota com chave ligada e sem token: 403, nada grava', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'chave-de-teste')
    const r = await waitlist(req('/api/waitlist', { name: 'ana', email: 'ana@melfiore.invalid' }, ip()))
    expect(r.status).toBe(403)
    expect(capturar).not.toHaveBeenCalled()
  })
})
