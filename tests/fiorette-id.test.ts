import { describe, expect, it } from 'vitest'
import { IDS_DO_ARQUIVO, reservarId, type KvIds } from '@/lib/fiorette-id'

function kvEmMemoria(): KvIds & { chaves: Set<string> } {
  const chaves = new Set<string>()
  return {
    chaves,
    get: async (c) => (chaves.has(c) ? { v: 1 } : null),
    put: async (c) => { chaves.add(c) },
  }
}

describe('numero da fiorette', () => {
  it('nunca repete, mesmo quando o sorteio insiste no mesmo numero', async () => {
    const kv = kvEmMemoria()
    // sorteio viciado: 4 digitos sempre devolve 0001; 5 digitos conta de 10000 em diante
    let n = 10000
    const viciado = (d: number) => (d === 4 ? '0001' : String(n++))
    const ids = []
    for (let i = 0; i < 5; i++) ids.push(await reservarId(kv, viciado))
    expect(new Set(ids).size).toBe(5)
    expect(ids[0]).toBe('0001')
  })

  it('100 inscritas em espaco pequeno: zero repeticao', async () => {
    const kv = kvEmMemoria()
    const ids: string[] = []
    for (let i = 0; i < 100; i++) ids.push(await reservarId(kv, (d) => String(Math.floor(Math.random() * 10 ** d)).padStart(d, '0')))
    expect(new Set(ids).size).toBe(100)
  })

  it('nao entrega numero do arquivo publico', async () => {
    const kv = kvEmMemoria()
    const fila = [IDS_DO_ARQUIVO[0], '9999']
    const id = await reservarId(kv, () => fila.shift() ?? '5000')
    expect(id).toBe('9999')
  })

  it('sem KV sorteia direto, com 4 digitos', async () => {
    expect(await reservarId(null)).toMatch(/^\d{4}$/)
  })
})
