import { describe, it, expect } from 'vitest'
import { mascararCelular, celularPareceValido } from '@/lib/celular-br'

describe('mascara do celular', () => {
  it('formata enquanto digita', () => {
    expect(mascararCelular('')).toBe('')
    expect(mascararCelular('1')).toBe('+55 (1')
    expect(mascararCelular('119')).toBe('+55 (11) 9')
    expect(mascararCelular('11987654321')).toBe('+55 (11) 98765-4321')
  })
  it('aceita colar com +55 e corta excesso', () => {
    expect(mascararCelular('+55 11 98765-4321')).toBe('+55 (11) 98765-4321')
    expect(mascararCelular('5511987654321')).toBe('+55 (11) 98765-4321')
    expect(mascararCelular('119876543219999')).toBe('+55 (11) 98765-4321')
  })
  it('apagar o ultimo digito nao trava no separador', () => {
    expect(mascararCelular('+55 (11) 98765-')).toBe('+55 (11) 98765')
    expect(mascararCelular('+55 (11) ')).toBe('+55 (11')
  })
  it('saida completa e valida', () => {
    expect(celularPareceValido(mascararCelular('11987654321'))).toBe(true)
  })
})
