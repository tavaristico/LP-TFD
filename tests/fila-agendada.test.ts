import { describe, expect, it, vi } from 'vitest'
import { esvaziarFilaCaptura } from '@/lib/crm-captura'
import { aoAgendar } from '@/lib/fila-agendada'
import { ACEITE_WAITLIST, registrarAceite } from '@/lib/aceite-waitlist'
import { guardar, type ItemFila, type KvFila } from '@/lib/fila-captura'

function kvFalso(): KvFila & { dados: Map<string, string> } {
  const dados = new Map<string, string>()
  return {
    dados,
    async get(k) { const v = dados.get(k); return v ? JSON.parse(v) : null },
    async put(k, v) { dados.set(k, v) },
    async delete(k) { dados.delete(k) },
    async list({ prefix, limit }) { return { keys: [...dados.keys()].filter((k) => k.startsWith(prefix)).slice(0, limit).map((name) => ({ name })) } },
  }
}

const ENV = { CRM_ENVIO: 'ligado', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_CAPTURA_JWT: 'jwt', SUPABASE_PUBLISHABLE_KEY: 'pub' }
const gravada = { gravacao: { estado: 'gravada', contato_id: 'c1', criado: true, consentimentos: 1, eventos: 2 }, resultado: { ok: true } }
const falhou = { gravacao: { estado: 'falhou', codigo: 'http_503', chave_idempotencia: 'k' }, resultado: null }

async function item(email: string, hora: string): Promise<ItemFila> {
  return { v: 1, nome: 'Fulana', email, aceite: registrarAceite(ACEITE_WAITLIST.versao, new Date(hora)), criado_em: hora, tentativas: 0, ultimo_codigo: 'http_503' }
}

describe('esvaziarFilaCaptura (cron)', () => {
  it('esvazia a fila sem nova inscricao, com a hora e o aceite originais', async () => {
    const fila = kvFalso()
    await guardar(fila, await item('a@exemplo.com', '2026-11-05T10:00:00.000Z'))
    await guardar(fila, await item('b@exemplo.com', '2026-11-05T11:00:00.000Z'))
    const capturar = vi.fn().mockResolvedValue(gravada)
    const r = await esvaziarFilaCaptura(ENV, { fila, capturar: capturar as never })
    expect(r).toEqual({ estado: 'ok', reenviados: 2, restantes: 0 })
    expect(fila.dados.size).toBe(0)
    const e = capturar.mock.calls.map((c) => c[0]).find((x) => x.email === 'a@exemplo.com')
    expect(e.ocorrido_em).toBe('2026-11-05T10:00:00.000Z')
    expect(e.consentimentos[0]).toMatchObject({ forma: 'aviso_e_clique', texto_versao: ACEITE_WAITLIST.versao })
    expect(capturar.mock.calls[0][1]).toMatchObject({ url: 'https://x.supabase.co', chave: 'jwt', apikey: 'pub' })
  })

  it('banco ainda fora: item fica e conta a tentativa; nao lanca', async () => {
    const fila = kvFalso()
    await guardar(fila, await item('a@exemplo.com', '2026-11-05T10:00:00.000Z'))
    const r = await esvaziarFilaCaptura(ENV, { fila, capturar: vi.fn().mockResolvedValue(falhou) as never })
    expect(r).toEqual({ estado: 'ok', reenviados: 0, restantes: 1 })
    expect(JSON.parse([...fila.dados.values()][0]).tentativas).toBe(1)
  })

  it('reenvio que o banco diz duplicado sai da fila', async () => {
    const fila = kvFalso()
    await guardar(fila, await item('a@exemplo.com', '2026-11-05T10:00:00.000Z'))
    const dup = { gravacao: { estado: 'duplicada', contato_id: 'c1' }, resultado: { ok: true } }
    await esvaziarFilaCaptura(ENV, { fila, capturar: vi.fn().mockResolvedValue(dup) as never })
    expect(fila.dados.size).toBe(0)
  })

  it('respeita o teto por rodada', async () => {
    const fila = kvFalso()
    for (let i = 0; i < 5; i++) await guardar(fila, await item(`p${i}@exemplo.com`, `2026-11-05T1${i}:00:00.000Z`))
    const r = await esvaziarFilaCaptura(ENV, { fila, capturar: vi.fn().mockResolvedValue(gravada) as never, max: 2 })
    expect(r.reenviados).toBe(2)
    expect(fila.dados.size).toBe(3)
  })

  it('flag desligada: nao toca na fila nem no banco', async () => {
    const fila = kvFalso()
    await guardar(fila, await item('a@exemplo.com', '2026-11-05T10:00:00.000Z'))
    const capturar = vi.fn()
    for (const env of [{ ...ENV, CRM_ENVIO: 'desligado' }, { ...ENV, CRM_ENVIO: undefined }]) {
      expect(await esvaziarFilaCaptura(env, { fila, capturar: capturar as never })).toMatchObject({ estado: 'desligado' })
    }
    expect(capturar).not.toHaveBeenCalled()
    expect(fila.dados.size).toBe(1)
  })

  it('sem JWT, sem publishable ou sem binding: registra e sai, sem service_role', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const capturar = vi.fn()
    const fila = kvFalso()
    expect(await esvaziarFilaCaptura({ ...ENV, SUPABASE_CAPTURA_JWT: undefined, SUPABASE_SERVICE_KEY: 's' }, { fila, capturar: capturar as never })).toMatchObject({ estado: 'sem_config' })
    expect(await esvaziarFilaCaptura({ ...ENV, SUPABASE_PUBLISHABLE_KEY: undefined }, { fila, capturar: capturar as never })).toMatchObject({ estado: 'sem_config' })
    expect(await esvaziarFilaCaptura(ENV, { fila: null, capturar: capturar as never })).toMatchObject({ estado: 'sem_fila' })
    expect(capturar).not.toHaveBeenCalled()
    erro.mockRestore()
  })

  it('log do cron nao traz e-mail nem nome', async () => {
    const info = vi.spyOn(console, 'log').mockImplementation(() => {})
    const fila = kvFalso()
    await guardar(fila, await item('segredo@exemplo.com', '2026-11-05T10:00:00.000Z'))
    await esvaziarFilaCaptura(ENV, { fila, capturar: vi.fn().mockResolvedValue(gravada) as never })
    const saida = info.mock.calls.map((c) => String(c[0])).join('\n')
    expect(saida).toContain('crm.fila_agendada')
    expect(saida).not.toContain('segredo@')
    expect(saida).not.toContain('Fulana')
    info.mockRestore()
  })
})

describe('aoAgendar (scheduled do Worker)', () => {
  it('le o binding CAPTURA_FILA do env e segura o trabalho em waitUntil', async () => {
    const fila = kvFalso()
    await guardar(fila, await item('a@exemplo.com', '2026-11-05T10:00:00.000Z'))
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ ok: true, duplicada: false, criado: true, contato_id: 'c1', estado: 'ativo', suspeito: false, conflito_id: null, consentimentos: 1, eventos: 2, avisos: [], contato: { email: 'a@exemplo.com', nome: 'Fulana', whatsapp_e164: null, origem_primeira: 'waitlist' }, marketing_email: true }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const pend: Promise<unknown>[] = []
    await aoAgendar({ ...ENV, CAPTURA_FILA: fila }, { waitUntil: (p) => pend.push(p) })
    expect(pend).toHaveLength(1)
    await Promise.all(pend)
    vi.unstubAllGlobals()
    expect(fila.dados.size).toBe(0)
  })

  it('erro inesperado nao lanca', async () => {
    const quebrada = { ...kvFalso(), list: async () => { throw new Error('kv fora') } } as KvFila
    const pend: Promise<unknown>[] = []
    await expect(aoAgendar({ ...ENV, CAPTURA_FILA: quebrada }, { waitUntil: (p) => pend.push(p) })).resolves.toBeUndefined()
    await expect(Promise.all(pend)).resolves.toBeDefined()
  })
})
