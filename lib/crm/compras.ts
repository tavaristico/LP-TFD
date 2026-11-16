// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.
import { randomUUID } from 'node:crypto'
import { origemDoEvento, prepararCaptura } from './capturarContato'
import { emailCanonico } from './normalizar'

// Entrada de compras (SPEC 14 passo 10, 21; docs/motor/0008-compras-no-crm.md).
// O subscriber do Medusa manda UM json por evento. Este modulo valida, normaliza o comprador
// (a mesma regra da captura) e monta o corpo de crm.registrar_compra. Quem decide e grava e o banco.
// A compra NUNCA leva CPF, endereco, cartao nem consentimento: campo desses e recusado, nao ignorado,
// para o erro do subscriber aparecer no dia e nao virar dado guardado sem querer.

export const TIPOS_COMPRA = [
  'pedido.criado',
  'pagamento.confirmado',
  'pedido.enviado',
  'pedido.cancelado',
  'devolucao.pedida',
  'reembolso.registrado',
] as const
export type TipoCompra = (typeof TIPOS_COMPRA)[number]

export interface ItemCompra {
  linha_ref: string
  produto_ref: string
  variante_ref?: string
  sku?: string
  titulo?: string
  quantidade: number
  preco_unit_centavos: number
  /** Ausente = true: o padrao e proteger (SPEC 18). */
  sensivel?: boolean
}

export interface EntradaCompra {
  versao: 1
  evento: { tipo: TipoCompra; ref: string; ocorrido_em: string; valor_centavos?: number }
  pedido: {
    ref: string
    numero?: string
    moeda?: string
    subtotal_centavos: number
    frete_centavos?: number
    desconto_centavos?: number
    total_centavos: number
    criado_em: string
    utm?: Record<string, string>
    itens: ItemCompra[]
  }
  comprador: { email: string; nome?: string; whatsapp?: string; customer_id?: string }
}

export type RecusaCompra =
  | 'corpo_invalido'
  | 'versao'
  | 'tipo_invalido'
  | 'ref_invalida'
  | 'data_invalida'
  | 'valor_invalido'
  | 'itens_invalidos'
  | 'email_invalido'
  | 'campo_proibido'
  | 'comprador_invalido'

const RE_REF = /^[A-Za-z0-9_.:-]{1,80}$/
const RE_SKU = /^[A-Za-z0-9_.:/-]{1,60}$/
const RE_NUMERO = /^[A-Za-z0-9_.-]{1,40}$/
const MAX_ITENS = 100

/** Nome de campo que a compra nao aceita em nenhuma profundidade. Comparacao sem caixa e sem acento. */
const PROIBIDOS = new Set([
  'cpf', 'cnpj', 'rg', 'endereco', 'address', 'cep', 'logradouro', 'rua', 'bairro', 'complemento',
  'cartao', 'card', 'cvv', 'pan', 'senha', 'password', 'consentimento', 'consentimentos',
])

function achaProibido(v: unknown, profundidade = 0): boolean {
  if (profundidade > 6 || v === null || typeof v !== 'object') return false
  if (Array.isArray(v)) return v.some((x) => achaProibido(x, profundidade + 1))
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    const norm = k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_')
    if (norm.split('_').some((parte) => PROIBIDOS.has(parte)) || PROIBIDOS.has(norm)) return true
    if (achaProibido(x, profundidade + 1)) return true
  }
  return false
}

const ehObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const centavos = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 99_999_999_999
const ehData = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v))
const texto = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max

export type ResultadoValidacao = { ok: true; entrada: EntradaCompra } | { ok: false; motivo: RecusaCompra }

/** Valida a forma. Nao normaliza e-mail (isso e `prepararCompra`). Chaves que sobram sao recusadas so se forem proibidas. */
export function validarCompra(bruto: unknown): ResultadoValidacao {
  const no = (motivo: RecusaCompra): ResultadoValidacao => ({ ok: false, motivo })
  if (!ehObj(bruto)) return no('corpo_invalido')
  if (achaProibido(bruto)) return no('campo_proibido')
  if (bruto.versao !== 1) return no('versao')
  const { evento, pedido, comprador } = bruto
  if (!ehObj(evento) || !ehObj(pedido) || !ehObj(comprador)) return no('corpo_invalido')

  if (typeof evento.tipo !== 'string' || !(TIPOS_COMPRA as readonly string[]).includes(evento.tipo)) return no('tipo_invalido')
  if (typeof evento.ref !== 'string' || !RE_REF.test(evento.ref) || typeof pedido.ref !== 'string' || !RE_REF.test(pedido.ref)) {
    return no('ref_invalida')
  }
  if (!ehData(evento.ocorrido_em) || !ehData(pedido.criado_em)) return no('data_invalida')
  if (evento.tipo === 'reembolso.registrado') {
    if (!centavos(evento.valor_centavos) || evento.valor_centavos === 0) return no('valor_invalido')
  } else if (evento.valor_centavos !== undefined) {
    return no('valor_invalido')
  }
  if (!centavos(pedido.subtotal_centavos) || !centavos(pedido.total_centavos)) return no('valor_invalido')
  for (const k of ['frete_centavos', 'desconto_centavos'] as const) {
    if (pedido[k] !== undefined && !centavos(pedido[k])) return no('valor_invalido')
  }
  if (pedido.moeda !== undefined && !(typeof pedido.moeda === 'string' && /^[A-Z]{3}$/.test(pedido.moeda))) return no('valor_invalido')
  if (pedido.numero !== undefined && !(typeof pedido.numero === 'string' && RE_NUMERO.test(pedido.numero))) return no('ref_invalida')

  if (!Array.isArray(pedido.itens) || pedido.itens.length === 0 || pedido.itens.length > MAX_ITENS) return no('itens_invalidos')
  const linhas = new Set<string>()
  for (const i of pedido.itens as unknown[]) {
    if (!ehObj(i)) return no('itens_invalidos')
    if (typeof i.linha_ref !== 'string' || !RE_REF.test(i.linha_ref) || linhas.has(i.linha_ref)) return no('itens_invalidos')
    linhas.add(i.linha_ref)
    if (typeof i.produto_ref !== 'string' || !RE_REF.test(i.produto_ref)) return no('itens_invalidos')
    if (i.variante_ref !== undefined && !(typeof i.variante_ref === 'string' && RE_REF.test(i.variante_ref))) return no('itens_invalidos')
    if (i.sku !== undefined && !(typeof i.sku === 'string' && RE_SKU.test(i.sku))) return no('itens_invalidos')
    if (i.titulo !== undefined && !texto(i.titulo, 160)) return no('itens_invalidos')
    if (!(typeof i.quantidade === 'number' && Number.isInteger(i.quantidade) && i.quantidade >= 1 && i.quantidade <= 999)) return no('itens_invalidos')
    if (!centavos(i.preco_unit_centavos)) return no('itens_invalidos')
    if (i.sensivel !== undefined && typeof i.sensivel !== 'boolean') return no('itens_invalidos')
  }
  if (pedido.utm !== undefined) {
    if (!ehObj(pedido.utm) || Object.keys(pedido.utm).length > 20) return no('valor_invalido')
    for (const [k, v] of Object.entries(pedido.utm)) {
      if (!/^[a-z0-9_]{1,40}$/.test(k) || !texto(v, 200)) return no('valor_invalido')
    }
  }

  if (typeof comprador.email !== 'string') return no('email_invalido')
  for (const k of Object.keys(comprador)) {
    if (!['email', 'nome', 'whatsapp', 'customer_id'].includes(k)) return no('comprador_invalido')
  }
  if (comprador.nome !== undefined && !texto(comprador.nome, 200)) return no('comprador_invalido')
  if (comprador.whatsapp !== undefined && !texto(comprador.whatsapp, 40)) return no('comprador_invalido')
  if (comprador.customer_id !== undefined && !(typeof comprador.customer_id === 'string' && RE_REF.test(comprador.customer_id))) {
    return no('comprador_invalido')
  }
  return { ok: true, entrada: bruto as unknown as EntradaCompra }
}

export interface CorpoRegistrarCompra {
  brand_id: string
  evento: { tipo: TipoCompra; ref: string; ocorrido_em: string; valor_centavos?: number }
  pedido: Record<string, unknown>
  customer_id: string | null
  captura: Record<string, unknown>
}

export type Preparada =
  | { ok: true; corpo: CorpoRegistrarCompra; avisos: string[] }
  | { ok: false; motivo: RecusaCompra }

/**
 * Normaliza o comprador pela regra da captura (e-mail em minusculas, NFC, punycode; telefone em E.164) e monta o
 * corpo da RPC. A chave da captura sai de `prepararCaptura`, a mesma da inscricao: um unico jeito de identificar pessoa.
 * Telefone entra so como identidade (evitar duplicata); sem consentimento, nada sai para ele.
 */
export function prepararCompra(
  entrada: EntradaCompra,
  extras: { agora?: Date; gerarId?: () => string } = {},
): Preparada {
  const agora = extras.agora ?? new Date()
  const gerarId = extras.gerarId ?? randomUUID
  const prep = prepararCaptura(
    {
      origem: 'checkout',
      email: entrada.comprador.email,
      ...(entrada.comprador.nome !== undefined ? { nome: entrada.comprador.nome } : {}),
      ...(entrada.comprador.whatsapp !== undefined ? { whatsapp: entrada.comprador.whatsapp } : {}),
      ocorrido_em: entrada.pedido.criado_em,
    },
    agora,
  )
  if (!prep.ok || prep.emailNorm === null) return { ok: false, motivo: 'email_invalido' }
  const nome = entrada.comprador.nome?.trim() ?? ''
  const captura = {
    brand_id: prep.brand,
    origem: 'checkout',
    tela: null,
    evento_origem: origemDoEvento(prep.origem.base),
    chave_idempotencia: prep.chave,
    ocorrido_em: prep.ocorridoIso,
    nome: nome === '' ? null : nome,
    email: entrada.comprador.email.trim(),
    email_norm: prep.emailNorm,
    email_canonico: emailCanonico(prep.emailNorm),
    whatsapp_e164: prep.zap,
    produto_id: null,
    ip_hash: null,
    utm: {},
    contato_id_novo: gerarId(),
    conflito_id: gerarId(),
  }
  return {
    ok: true,
    avisos: prep.avisos,
    corpo: {
      brand_id: prep.brand,
      evento: entrada.evento,
      pedido: { ...entrada.pedido },
      customer_id: entrada.comprador.customer_id ?? null,
      captura,
    },
  }
}
