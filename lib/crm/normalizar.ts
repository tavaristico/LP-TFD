// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.
import { domainToASCII } from 'node:url'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

/**
 * Chave principal de identidade: trim, NFC, minusculas, dominio em punycode.
 * Nao remove ponto nem +tag (isso e o email_canonico, so para detectar gemeo).
 * Devolve null se nao for um e-mail plausivel.
 */
export function normalizarEmail(bruto: string): string | null {
  const t = bruto.trim().normalize('NFC')
  if (t === '' || /\s/.test(t)) return null
  const arroba = t.indexOf('@')
  if (arroba < 1 || arroba !== t.lastIndexOf('@')) return null
  const local = t.slice(0, arroba).toLowerCase().normalize('NFC')
  const dominioBruto = t.slice(arroba + 1)
  if (local.length === 0 || local.length > 64) return null
  if (dominioBruto === '' || dominioBruto.startsWith('.') || dominioBruto.endsWith('.')) return null
  const dominio = domainToASCII(dominioBruto.toLowerCase())
  if (dominio === '' || !dominio.includes('.') || dominio.includes('..')) return null
  return `${local}@${dominio}`
}

/** So para detectar duplicata provavel. Gmail: sem pontos e sem +tag. Resto: igual ao email_norm. */
export function emailCanonico(emailNorm: string): string {
  const arroba = emailNorm.lastIndexOf('@')
  const local = emailNorm.slice(0, arroba)
  const dominio = emailNorm.slice(arroba + 1)
  if (dominio === 'gmail.com' || dominio === 'googlemail.com') {
    const semTag = local.split('+')[0] ?? local
    return `${semTag.replace(/\./g, '')}@gmail.com`
  }
  return emailNorm
}

/**
 * E.164 com padrao BR. Trata o 9o digito: celular antigo de 8 digitos (DDD + 6 a 9 + 7 digitos)
 * ganha o 9; celular novo fica como esta. Fixo (comeca em 2 a 5) nao muda.
 * Numero estrangeiro precisa vir com +. Devolve null se nao for valido.
 */
export function normalizarWhatsapp(bruto: string): string | null {
  const t = bruto.trim()
  if (t === '') return null
  const p = parsePhoneNumberFromString(t, 'BR')
  if (!p) return null
  if (p.countryCallingCode === '55') {
    let nn = p.nationalNumber as string
    if (nn.length === 10 && /[6-9]/.test(nn.charAt(2))) {
      nn = `${nn.slice(0, 2)}9${nn.slice(2)}`
    }
    if (!/^[1-9][1-9]/.test(nn)) return null
    if (nn.length === 11) {
      if (nn.charAt(2) !== '9') return null
    } else if (nn.length !== 10) {
      return null
    }
    return `+55${nn}`
  }
  return p.isValid() ? p.number : null
}
