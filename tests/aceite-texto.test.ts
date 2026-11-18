import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ACEITE_WAITLIST } from '@/lib/aceite-waitlist'

describe('texto do aceite e da microcopy', () => {
  it('cobre e-mail e celular, sem compra nem cpf', () => {
    const t = ACEITE_WAITLIST.texto
    for (const k of ['e-mail', 'celular', 'sai quando quiser']) expect(t).toContain(k)
    for (const k of ['cpf', 'comprar', 'endereço']) expect(t).not.toContain(k)
    expect(ACEITE_WAITLIST.versao).toBe('waitlist-2026-11-18')
    const proibidos = [8212, 8211, 33].map((c) => String.fromCharCode(c))
    for (const p of proibidos) expect(t.includes(p)).toBe(false)
    expect(t).toBe(t.toLowerCase().replace('melfiore', 'MELFIORE'))
  })
  it('nao afirma criptografia', () => {
    const f = readFileSync('components/WaitlistForm.tsx', 'utf8')
    expect(f).not.toMatch(/criptograf/i)
    expect(f).toContain('seus dados ficam protegidos.')
  })
})
