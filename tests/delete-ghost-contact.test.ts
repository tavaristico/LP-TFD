// S27: o script so apaga com --confirmo, e nunca apaga quem tem telefone.
import { describe, expect, it, vi } from 'vitest'
import { rodar, separarFantasmas } from '../scripts/delete-ghost-contact.mjs'

const CONTATOS = [
  { id: 1, email: 'ana@exemplo.invalid', attributes: {} },
  { id: 2, attributes: { NOME: 'x' }, createdAt: '2026-11-01T00:00:00Z' },
  { id: 3, attributes: { WHATSAPP: '+5511999990000' } },
  { id: 4, email: '', attributes: { SMS: '5511999990001' } },
  { id: 5, email: '  ', attributes: {} },
]

function brevo() {
  const chamadas: { url: string; metodo: string }[] = []
  const buscar = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    chamadas.push({ url: String(url), metodo: init?.method ?? 'GET' })
    if ((init?.method ?? 'GET') === 'DELETE') return new Response(null, { status: 204 })
    return new Response(JSON.stringify({ contacts: CONTATOS }), { status: 200 })
  })
  return { buscar, chamadas }
}
const apagou = (c: { url: string; metodo: string }[]) => c.filter((x) => x.metodo === 'DELETE')

describe('delete-ghost-contact', () => {
  it('separa: sem e-mail e sem telefone apaga; com telefone poupa; com e-mail ignora', () => {
    const { apagar, poupados } = separarFantasmas(CONTATOS)
    expect(apagar.map((c: { id: number }) => c.id)).toEqual([2, 5])
    expect(poupados.map((c: { id: number }) => c.id)).toEqual([3, 4])
  })
  it('sem --confirmo e ENSAIO: lista e nunca chama DELETE', async () => {
    const { buscar, chamadas } = brevo()
    const saida: string[] = []
    const r = await rodar({ chave: 'k', argv: [], buscar, escrever: (m: string) => saida.push(m) })
    expect(r.apagados).toEqual([])
    expect(apagou(chamadas)).toHaveLength(0)
    expect(saida.join('\n')).toMatch(/ENSAIO: 2 contato/)
  })
  it('com --confirmo sem terminal: apaga so os 2 fantasmas, nunca quem tem telefone', async () => {
    const { buscar, chamadas } = brevo()
    const r = await rodar({ chave: 'k', argv: ['--confirmo'], buscar, escrever: () => {}, interativo: false })
    expect(r.apagados).toEqual([2, 5])
    expect(apagou(chamadas).map((c) => c.url)).toEqual(['https://api.brevo.com/v3/contacts/2', 'https://api.brevo.com/v3/contacts/5'])
  })
  it('com --confirmo no terminal: numero errado cancela, numero certo apaga', async () => {
    const a = brevo()
    expect((await rodar({ chave: 'k', argv: ['--confirmo'], buscar: a.buscar, escrever: () => {}, interativo: true, perguntar: async () => 'sim' })).apagados).toEqual([])
    expect(apagou(a.chamadas)).toHaveLength(0)
    const b = brevo()
    expect((await rodar({ chave: 'k', argv: ['--confirmo'], buscar: b.buscar, escrever: () => {}, interativo: true, perguntar: async () => '2' })).apagados).toEqual([2, 5])
  })
  it('sem chave: erro, nenhuma chamada', async () => {
    const { buscar } = brevo()
    await expect(rodar({ chave: '', argv: ['--confirmo'], buscar })).rejects.toThrow(/BREVO_API_KEY/)
    expect(buscar).not.toHaveBeenCalled()
  })
})
