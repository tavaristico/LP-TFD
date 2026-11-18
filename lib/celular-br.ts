// Pre-checagem do celular no navegador (components/WaitlistForm.tsx). SO FORMA: DDD + 9 dígitos, com ou sem +55.
// O servidor decide (lib/crm/dadosPessoais.ts, normalizarCelularBR, E.164): este arquivo nao importa nada de Node
// para poder ir ao bundle do cliente. tests/celular.test.ts garante que as duas regras concordam.
export function celularPareceValido(bruto: string): boolean {
  const t = bruto.trim()
  if (t === '' || /[^\d\s()+.\-]/.test(t)) return false
  let d = t.replace(/\D/g, '')
  if (t.startsWith('+') && !d.startsWith('55')) return false
  if (d.startsWith('55') && d.length === 13) d = d.slice(2)
  if (d.startsWith('0') && d.length === 12) d = d.slice(1)
  return /^[1-9][1-9]9\d{8}$/.test(d)
}

/** Mascara enquanto digita: +55 11 98765 4321. So poe o separador quando o digito seguinte existe,
 *  entao apagar funciona sem travar. Aceita colar com ou sem +55. Saida passa em celularPareceValido. */
export function mascararCelular(bruto: string): string {
  let d = bruto.replace(/\D/g, '')
  if (d.startsWith('55') && (bruto.trim().startsWith('+') || d.length > 11)) d = d.slice(2)
  d = d.slice(0, 11)
  if (d === '') return ''
  let s = '+55 ' + d.slice(0, 2)
  if (d.length > 2) s += ' ' + d.slice(2, 7)
  if (d.length > 7) s += ' ' + d.slice(7)
  return s
}
