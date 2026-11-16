// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.
// Assinatura HMAC da entrada de compras (card S25). Web Crypto: roda no Worker e no Node.
// Formato do cabecalho `x-melfiore-assinatura`:  t=<segundos unix>,v1=<hex>[,v1=<hex>]
// Assinado: `${t}.${corpo cru}` com HMAC-SHA256. A conferencia e em tempo constante (crypto.subtle.verify)
// e vem ANTES de qualquer leitura do JSON. Mais de um v1 e mais de um segredo permitem girar a chave sem parar.
// Janela de data: 5 min para tras, 1 min para frente. Repeticao dentro da janela nao faz mal: a chave de
// idempotencia do banco (medusa:<ref>:<tipo>) torna a segunda entrega um nada.

export const CABECALHO_ASSINATURA = 'x-melfiore-assinatura'
export const JANELA_PASSADO_S = 300
export const JANELA_FUTURO_S = 60

const enc = new TextEncoder()

function hexParaBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null
  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

function bytesParaHex(b: ArrayBuffer): string {
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

async function chave(segredo: string, usos: Array<'sign' | 'verify'>) {
  return crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, usos)
}

/** Quem envia (o subscriber do Medusa) usa isto. Devolve o valor do cabecalho. */
export async function assinarCorpo(corpoCru: string, segredo: string, t: number): Promise<string> {
  const mac = await crypto.subtle.sign('HMAC', await chave(segredo, ['sign']), enc.encode(`${t}.${corpoCru}`))
  return `t=${t},v1=${bytesParaHex(mac)}`
}

export type ResultadoAssinatura = { ok: true } | { ok: false; motivo: 'sem_cabecalho' | 'formato' | 'fora_da_janela' | 'invalida' | 'sem_segredo' }

export async function conferirAssinatura(opts: {
  corpoCru: string
  cabecalho: string | null
  segredos: readonly string[]
  agora: Date
}): Promise<ResultadoAssinatura> {
  const segredos = opts.segredos.filter((s) => typeof s === 'string' && s.length >= 32)
  if (segredos.length === 0) return { ok: false, motivo: 'sem_segredo' }
  if (opts.cabecalho === null || opts.cabecalho.trim() === '') return { ok: false, motivo: 'sem_cabecalho' }
  if (opts.cabecalho.length > 400) return { ok: false, motivo: 'formato' }

  let t: number | null = null
  const assinaturas: Uint8Array[] = []
  for (const parte of opts.cabecalho.split(',')) {
    const i = parte.indexOf('=')
    if (i < 1) return { ok: false, motivo: 'formato' }
    const k = parte.slice(0, i).trim()
    const v = parte.slice(i + 1).trim()
    if (k === 't') {
      if (!/^[0-9]{9,12}$/.test(v)) return { ok: false, motivo: 'formato' }
      t = Number(v)
    } else if (k === 'v1') {
      const b = hexParaBytes(v)
      if (b === null) return { ok: false, motivo: 'formato' }
      assinaturas.push(b)
    }
  }
  if (t === null || assinaturas.length === 0) return { ok: false, motivo: 'formato' }

  const agoraS = Math.floor(opts.agora.getTime() / 1000)
  if (t < agoraS - JANELA_PASSADO_S || t > agoraS + JANELA_FUTURO_S) return { ok: false, motivo: 'fora_da_janela' }

  const dados = enc.encode(`${t}.${opts.corpoCru}`)
  let achou = false
  // Percorre tudo, sem sair no primeiro acerto, para nao vazar qual segredo ou assinatura casou.
  for (const s of segredos) {
    const k = await chave(s, ['verify'])
    for (const a of assinaturas) {
      if (await crypto.subtle.verify('HMAC', k, a as BufferSource, dados as BufferSource)) achou = true
    }
  }
  return achou ? { ok: true } : { ok: false, motivo: 'invalida' }
}
