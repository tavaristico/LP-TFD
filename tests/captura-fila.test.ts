import { describe, expect, it, vi } from 'vitest'
import { capturarWaitlistNoCrm } from '@/lib/crm-captura'
import { ACEITE_WAITLIST, registrarAceite } from '@/lib/aceite-waitlist'
import { PREFIXO_FILA, type KvFila } from '@/lib/fila-captura'

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

const ENV = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_CAPTURA_JWT: 'jwt-de-teste', SUPABASE_SERVICE_KEY: 'nao-deve-ser-lida' }
const AGORA = new Date('2026-11-05T15:30:10.000Z')
const GENTE = { name: 'Maria Teste', email: 'maria@exemplo.com', ip: '1.2.3.4', aceite_versao: ACEITE_WAITLIST.versao }

const gravada = { gravacao: { estado: 'gravada', contato_id: 'c1', criado: true, consentimentos: 1, eventos: 2 }, resultado: { ok: true } }
const duplicada = { gravacao: { estado: 'duplicada', contato_id: 'c1' }, resultado: { ok: true } }
const falhou = { gravacao: { estado: 'falhou', codigo: 'http_503', chave_idempotencia: 'k' }, resultado: { ok: true } }

function rodar(capturar: unknown, fila: KvFila | null, extra: Record<string, unknown> = {}) {
  const pend: Promise<unknown>[] = []
  const p = capturarWaitlistNoCrm(GENTE, {
    env: ENV, agora: () => AGORA, fila, aguardar: (x) => pend.push(x),
    capturar: capturar as never, ...extra,
  })
  return { p, esperar: async () => { await p; await Promise.all(pend) } }
}

describe('aceite', () => {
  it('registra forma, versao, texto exato e hora', () => {
    expect(registrarAceite(ACEITE_WAITLIST.versao, AGORA)).toEqual({
      forma: 'aviso_e_clique', versao: 'waitlist-2026-11-04', texto: ACEITE_WAITLIST.texto, aceito_em: '2026-11-05T15:30:10.000Z',
    })
  })
  it('sem campo marcado', () => {
    expect(registrarAceite(ACEITE_WAITLIST.versao, AGORA)).not.toHaveProperty('marcado')
  })
  it('pagina antiga ou versao desconhecida: sem registro', () => {
    expect(registrarAceite(undefined, AGORA)).toBeNull()
    expect(registrarAceite('waitlist-2026-01-01', AGORA)).toBeNull()
  })
})

describe('captura com chave restrita', () => {
  it('usa SUPABASE_CAPTURA_JWT e nunca a service key', async () => {
    const capturar = vi.fn().mockResolvedValue(gravada)
    await rodar(capturar, kvFalso()).esperar()
    expect(capturar.mock.calls[0][1].chave).toBe('jwt-de-teste')
  })
  it('sem JWT: nao captura, nao cai para service key', async () => {
    const capturar = vi.fn()
    await capturarWaitlistNoCrm(GENTE, { env: { SUPABASE_URL: 'u', SUPABASE_SERVICE_KEY: 's' }, capturar: capturar as never, fila: null })
    expect(capturar).not.toHaveBeenCalled()
  })
  it('manda o aceite verdadeiro: texto, versao e hora do clique', async () => {
    const capturar = vi.fn().mockResolvedValue(gravada)
    await rodar(capturar, kvFalso()).esperar()
    const e = capturar.mock.calls[0][0]
    expect(e.ocorrido_em).toBe('2026-11-05T15:30:10.000Z')
    expect(e.consentimentos[0]).toMatchObject({ texto_versao: ACEITE_WAITLIST.versao, texto_aceito: ACEITE_WAITLIST.texto })
  })
  it('sem versao do aviso: entra sem consentimento', async () => {
    const capturar = vi.fn().mockResolvedValue(gravada)
    await capturarWaitlistNoCrm({ ...GENTE, aceite_versao: undefined }, { env: ENV, agora: () => AGORA, fila: kvFalso(), aguardar: () => {}, capturar: capturar as never })
    expect(capturar.mock.calls[0][0].consentimentos).toBeUndefined()
  })
})

describe('fila de reenvio', () => {
  it('falha do Supabase: guarda a inscricao inteira, com aceite, sem IP bruto', async () => {
    const fila = kvFalso()
    await rodar(vi.fn().mockResolvedValue(falhou), fila).esperar()
    expect(fila.dados.size).toBe(1)
    const [chave, bruto] = [...fila.dados.entries()][0]
    expect(chave.startsWith(PREFIXO_FILA)).toBe(true)
    const item = JSON.parse(bruto)
    expect(item).toMatchObject({ email: 'maria@exemplo.com', ultimo_codigo: 'http_503', tentativas: 0 })
    expect(item.aceite).toMatchObject({ forma: 'aviso_e_clique', versao: ACEITE_WAITLIST.versao })
    expect(bruto).not.toContain('1.2.3.4')
  })
  it('estouro de tempo tambem vai para a fila', async () => {
    const fila = kvFalso()
    const lenta = vi.fn().mockReturnValue(new Promise(() => {}))
    await rodar(lenta, fila, { tetoMs: 20 }).esperar()
    expect(fila.dados.size).toBe(1)
  })
  it('excecao inesperada tambem vai para a fila', async () => {
    const fila = kvFalso()
    await rodar(vi.fn().mockRejectedValue(new Error('x')), fila).esperar()
    expect(fila.dados.size).toBe(1)
  })
  it('duplo clique no mesmo minuto: um item so', async () => {
    const fila = kvFalso()
    const c = vi.fn().mockResolvedValue(falhou)
    await rodar(c, fila).esperar()
    await rodar(c, fila).esperar()
    expect(fila.dados.size).toBe(1)
  })
  it('proxima inscricao que entra esvazia a fila, com a hora e o aceite originais', async () => {
    const fila = kvFalso()
    await rodar(vi.fn().mockResolvedValue(falhou), fila).esperar()
    const antes = fila.dados.size
    const capturar = vi.fn().mockResolvedValue(gravada)
    await capturarWaitlistNoCrm({ name: 'Outra', email: 'outra@exemplo.com', ip: 'unknown', aceite_versao: ACEITE_WAITLIST.versao }, {
      env: ENV, agora: () => new Date('2026-11-06T10:00:00.000Z'), fila, capturar: capturar as never,
      aguardar: (p) => { void p },
    })
    await new Promise((r) => setTimeout(r, 20))
    expect(antes).toBe(1)
    expect(fila.dados.size).toBe(0)
    const reenvio = capturar.mock.calls.map((c) => c[0]).find((e) => e.email === 'maria@exemplo.com')
    expect(reenvio.ocorrido_em).toBe('2026-11-05T15:30:10.000Z') // mesma chave de idempotencia do original
  })
  it('reenvio que o banco diz duplicado tambem sai da fila (sem gravar duas vezes)', async () => {
    const fila = kvFalso()
    await rodar(vi.fn().mockResolvedValue(falhou), fila).esperar()
    const capturar = vi.fn().mockResolvedValue(duplicada)
    const { esperar } = rodar(capturar, fila)
    await esperar()
    await new Promise((r) => setTimeout(r, 20))
    expect(fila.dados.size).toBe(0)
  })
  it('reenvio que falha de novo: item fica e conta a tentativa', async () => {
    const fila = kvFalso()
    await rodar(vi.fn().mockResolvedValue(falhou), fila).esperar()
    // inscricao nova responde ok, mas o reenvio da antiga falha: so a antiga fica
    const capturar = vi.fn().mockImplementation(async (e) => (e.email === 'maria@exemplo.com' ? falhou : gravada))
    await capturarWaitlistNoCrm({ name: 'Outra', email: 'outra@exemplo.com', ip: 'unknown', aceite_versao: ACEITE_WAITLIST.versao }, {
      env: ENV, agora: () => new Date('2026-11-06T10:00:00.000Z'), fila, capturar: capturar as never, aguardar: (p) => { void p },
    })
    await new Promise((r) => setTimeout(r, 20))
    expect(fila.dados.size).toBe(1)
    expect(JSON.parse([...fila.dados.values()][0]).tentativas).toBe(1)
  })
})

describe('binding ausente', () => {
  it('falha sem fila: nao lanca e o log nao traz e-mail', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(rodar(vi.fn().mockResolvedValue(falhou), null).p).resolves.toBeUndefined()
    const saida = erro.mock.calls.map((c) => String(c[0])).join('\n')
    expect(saida).toContain('crm.perdido_sem_fila')
    expect(saida).not.toContain('maria@exemplo.com')
    expect(saida).not.toContain('Maria')
    erro.mockRestore()
  })
  it('sucesso sem fila: segue normal', async () => {
    const capturar = vi.fn().mockResolvedValue(gravada)
    await expect(rodar(capturar, null).p).resolves.toBeUndefined()
    expect(capturar).toHaveBeenCalledTimes(1)
  })
})

describe('ponta a ponta com o pacote real e fetch falso', () => {
  const resp = (status: number, corpo: unknown, h: Record<string, string> = {}) =>
    new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json', ...h } })

  it('RPC leva a chave restrita e o consentimento sem campo marcado', async () => {
    const chamadas: { url: string; auth: string | null; corpo: string | null }[] = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      chamadas.push({ url, auth: new Headers(init.headers).get('authorization'), corpo: (init.body as string) ?? null })
      if (url.includes('/rpc/gravar_captura')) return resp(200, { ok: true, duplicada: false, contato_id: 'c1', criado: true, consentimentos: 1, eventos: 2 })
      return resp(200, [], { 'content-range': '*/0' })
    })
    await capturarWaitlistNoCrm(GENTE, { env: ENV, agora: () => AGORA, fila: kvFalso(), aguardar: null })
    vi.unstubAllGlobals()
    const rpc = chamadas.find((c) => c.url.includes('/rpc/gravar_captura'))!
    expect(rpc.auth).toBe('Bearer jwt-de-teste')
    expect(chamadas.every((c) => c.auth === 'Bearer jwt-de-teste')).toBe(true)
    expect(rpc.corpo).not.toContain('marcado')
    expect(rpc.corpo).toContain(ACEITE_WAITLIST.texto)
    expect(rpc.corpo).toContain('"ocorrido_em":"2026-11-05T15:30:10.000Z"')
  })

  it('leitura negada (captura_web nao tem select nas tabelas): nada se perde, vai para a fila', async () => {
    vi.stubGlobal('fetch', async () => resp(403, { code: '42501' }))
    const fila = kvFalso()
    await capturarWaitlistNoCrm(GENTE, { env: ENV, agora: () => AGORA, fila, aguardar: null })
    vi.unstubAllGlobals()
    expect(fila.dados.size).toBe(1)
    expect(JSON.parse([...fila.dados.values()][0]).ultimo_codigo).toBe('http_403_42501')
  })
})
