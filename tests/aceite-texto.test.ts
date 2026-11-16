import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ACEITE_WAITLIST } from '@/lib/aceite-waitlist'

describe('texto do aceite e da microcopy', () => {
  it('cobre e-mail, celular, cpf e endereco, sem venda nem anuncio', () => {
    const t = ACEITE_WAITLIST.texto
    for (const k of ['e-mail', 'celular', 'cpf', 'endereço', 'nunca vendidos', 'anúncio']) expect(t).toContain(k)
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
