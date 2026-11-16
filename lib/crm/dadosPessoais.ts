// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.
// Central de dados do CRM (migration 019): CPF, endereco e celular do comprador entram no CRM do jeito que vierem
// no pedido. Nada aqui pede dado a ninguem. Dado opcional ruim vira aviso, nunca recusa: a venda nao falha por isso.
// Quem ve o dado inteiro e a RLS (dono e operacao). Listagem usa o CPF mascarado.
import { normalizarWhatsapp } from './normalizar'

export interface Endereco {
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  pais?: string
}

/** CPF so com digitos, com os dois digitos verificadores conferidos. Nulo se nao for CPF valido. */
export function normalizarCpf(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null
  const d = bruto.replace(/[.\-\s/]/g, '')
  if (!/^\d{11}$/.test(d)) return null
  if (/^(\d)\1{10}$/.test(d)) return null
  const digito = (n: number): number => {
    let soma = 0
    for (let i = 0; i < n; i++) soma += Number(d.charAt(i)) * (n + 1 - i)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  if (digito(9) !== Number(d.charAt(9)) || digito(10) !== Number(d.charAt(10))) return null
  return d
}

/** ***.***.***-12: so os dois ultimos digitos. Nulo se nao for 11 digitos. */
export function mascararCpf(cpf: string | null | undefined): string | null {
  if (typeof cpf !== 'string' || !/^\d{11}$/.test(cpf)) return null
  return `***.***.***-${cpf.slice(9)}`
}

/**
 * Celular brasileiro: DDD + 9 digitos (com ou sem +55, pontuacao e espacos). E.164 `+55DDNNNNNNNNN`.
 * Mais estrito que `normalizarWhatsapp` (que aceita fixo e numero estrangeiro): a landing so aceita celular BR.
 */
export function normalizarCelularBR(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null
  const t = bruto.trim()
  if (t === '' || /[^\d\s()+.\-]/.test(t)) return null
  let d = t.replace(/\D/g, '')
  if (t.startsWith('+') && !d.startsWith('55')) return null
  if (d.startsWith('55') && d.length === 13) d = d.slice(2)
  if (d.startsWith('0') && d.length === 12) d = d.slice(1) // 0 + DDD + numero
  if (!/^[1-9][1-9]9\d{8}$/.test(d)) return null
  return normalizarWhatsapp(`+55${d}`)
}

const texto = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined
  const t = v.trim().replace(/\s+/g, ' ')
  return t === '' ? undefined : t.slice(0, max)
}
const primeiro = (o: Record<string, unknown>, ...chaves: string[]): unknown => {
  for (const k of chaves) if (o[k] !== undefined && o[k] !== null) return o[k]
  return undefined
}

/**
 * Endereco do pedido, aceitando as chaves em portugues e as do Medusa (address_1, postal_code...).
 * Campo ausente ou ruim some; sobrando ao menos um campo, o endereco entra. Nada e inventado (pais nao tem padrao).
 */
export function normalizarEndereco(bruto: unknown): Endereco | null {
  if (bruto === null || typeof bruto !== 'object' || Array.isArray(bruto)) return null
  const o = bruto as Record<string, unknown>
  const e: Endereco = {}
  const cepBruto = primeiro(o, 'cep', 'postal_code', 'zipcode')
  if (typeof cepBruto === 'string' && /^\d{8}$/.test(cepBruto.replace(/\D/g, ''))) e.cep = cepBruto.replace(/\D/g, '')
  const logradouro = texto(primeiro(o, 'logradouro', 'rua', 'address_1'), 160)
  if (logradouro) e.logradouro = logradouro
  const numeroBruto = primeiro(o, 'numero')
  const numero = texto(typeof numeroBruto === 'number' ? String(numeroBruto) : numeroBruto, 20)
  if (numero) e.numero = numero
  const complemento = texto(primeiro(o, 'complemento', 'address_2'), 80)
  if (complemento) e.complemento = complemento
  const bairro = texto(o.bairro, 80)
  if (bairro) e.bairro = bairro
  const cidade = texto(primeiro(o, 'cidade', 'city'), 80)
  if (cidade) e.cidade = cidade
  const uf = texto(primeiro(o, 'uf', 'province', 'estado'), 40)
  if (uf && /^[A-Za-z]{2}$/.test(uf)) e.uf = uf.toUpperCase()
  const pais = texto(primeiro(o, 'pais', 'country_code'), 2)
  if (pais && /^[A-Za-z]{2}$/.test(pais)) e.pais = pais.toUpperCase()
  return Object.keys(e).length === 0 ? null : e
}

/** Nome do metodo de pagamento (pix, cartao_credito, boleto). Nunca dado de cartao. */
export function normalizarFormaPagamento(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null
  const t = bruto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return /^[a-z0-9_]{1,40}$/.test(t) ? t : null
}
