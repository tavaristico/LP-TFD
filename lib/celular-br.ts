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
