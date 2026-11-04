// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.
import type { Evento, TipoEvento } from './eventos-tipos'
import { createHash, randomUUID } from 'node:crypto'
import { emailCanonico, normalizarEmail, normalizarWhatsapp } from './normalizar'
import { uuidv7 } from './id'
import type {
  Canal,
  Consentimento,
  ConsentimentoEntrada,
  Contato,
  EstadoContato,
  Origem,
  OrigemBase,
  PayloadBrevo,
  Portas,
} from './portas'

export interface EntradaCaptura {
  origem: Origem
  brand_id?: string
  nome?: string
  email?: string
  whatsapp?: string
  consentimentos?: ConsentimentoEntrada[]
  utm?: Record<string, string>
  /** Hash do IP feito por quem chama. Este pacote nunca ve IP puro. */
  ip_hash?: string
  /** Produto do aviso. Obrigatorio na origem `avise-me`; escopo do consentimento `avise_me`. */
  produto_id?: string
  /** Quando aconteceu na origem. Importacao da WAITLIST passa a data de inscricao. */
  ocorrido_em?: string
}

export type Recusa =
  | 'origem_invalida'
  | 'sem_identidade'
  | 'email_invalido'
  | 'whatsapp_invalido'
  | 'consentimento_sem_texto'
  | 'avise_me_sem_produto'

export type Pendencia =
  | { tipo: 'brevo'; contato_id: string; payload: PayloadBrevo; erro: string }
  | { tipo: 'evento'; evento: Evento; erro: string }

export type ResultadoCaptura =
  | { ok: false; motivo: Recusa }
  | {
      ok: true
      contato_id: string
      criado: boolean
      /** Mesma captura (origem, identidade, minuto) ja gravada: nada foi repetido. */
      duplicada: boolean
      estado: EstadoContato
      /** Gemeo provavel de e-mail (email_canonico igual). Nada foi fundido. */
      suspeito: boolean
      conflito_id: string | null
      consentimentos_gravados: number
      brevo: 'enviado' | 'pendente' | 'dispensado'
      /** Para o Worker guardar (fila ou KV) e reenviar. Vazio quando tudo saiu. */
      pendencias: Pendencia[]
      avisos: string[]
    }

const ORIGENS: readonly OrigemBase[] = [
  'waitlist', 'fiorettes', 'captura', 'avise-me', 'checkout', 'conta', 'newsletter', 'direct', 'crm',
]

function validarOrigem(origem: string): { base: OrigemBase; tela: string | null } | null {
  const [base, ...resto] = origem.split(':')
  const tela = resto.join(':').trim()
  if (!ORIGENS.includes(base as OrigemBase)) return null
  if (base !== 'captura' && resto.length > 0) return null
  return { base: base as OrigemBase, tela: tela === '' ? null : tela }
}

function origemDoEvento(base: OrigemBase): Evento['origem'] {
  if (base === 'waitlist') return 'waitlist'
  if (base === 'crm') return 'crm'
  if (base === 'direct') return 'admin'
  if (base === 'checkout') return 'medusa'
  return 'vitrine'
}

function chaveIdempotencia(
  origem: string,
  emailNorm: string | null,
  zap: string | null,
  ocorrido: Date,
  produto: string | null,
): string {
  const minuto = Math.floor(ocorrido.getTime() / 60_000)
  // Produto entra na chave so quando existe: avise-me de dois produtos no mesmo minuto sao duas capturas.
  const sufixo = produto === null ? '' : `|${produto}`
  return createHash('sha256').update(`${origem}|${emailNorm ?? ''}|${zap ?? ''}|${minuto}${sufixo}`).digest('hex')
}

function vazio(v: string | null | undefined): boolean {
  return v === null || v === undefined || v.trim() === ''
}

/**
 * Funcao unica de captura (SPEC 14). Ordem: normaliza, dedupe sem fusao, consentimento,
 * evento, so entao Brevo. Falha de evento ou de Brevo nunca desfaz a gravacao.
 */
export async function capturarContato(entrada: EntradaCaptura, portas: Portas): Promise<ResultadoCaptura> {
  const { repositorio: repo, registrarEvento, brevo } = portas
  const relogio = portas.relogio ?? (() => new Date())
  const gerarId = portas.gerarId ?? randomUUID
  const avisos: string[] = []

  const origem = validarOrigem(entrada.origem)
  if (!origem) return { ok: false, motivo: 'origem_invalida' }
  const brand = entrada.brand_id ?? 'melfiore'
  const produtoId = vazio(entrada.produto_id) ? null : (entrada.produto_id as string).trim()
  if (origem.base === 'avise-me' && produtoId === null) return { ok: false, motivo: 'avise_me_sem_produto' }

  const temEmail = !vazio(entrada.email)
  const temZap = !vazio(entrada.whatsapp)
  const emailNorm = temEmail ? normalizarEmail(entrada.email as string) : null
  const zap = temZap ? normalizarWhatsapp(entrada.whatsapp as string) : null
  if (!temEmail && !temZap) return { ok: false, motivo: 'sem_identidade' }
  if (emailNorm === null && zap === null) {
    return { ok: false, motivo: temEmail ? 'email_invalido' : 'whatsapp_invalido' }
  }
  // Um dado ruim nao derruba o outro: o lead bom entra, o ruim vira aviso.
  if (temEmail && emailNorm === null) avisos.push('email_invalido_ignorado')
  if (temZap && zap === null) avisos.push('whatsapp_invalido_ignorado')

  const consents = entrada.consentimentos ?? []
  for (const c of consents) {
    if ((c.marcado || c.revogar === true) && (vazio(c.texto_aceito) || vazio(c.texto_versao))) {
      return { ok: false, motivo: 'consentimento_sem_texto' }
    }
  }

  const agora = relogio()
  const ocorrido = entrada.ocorrido_em ? new Date(entrada.ocorrido_em) : agora
  const ocorridoIso = Number.isNaN(ocorrido.getTime()) ? agora.toISOString() : ocorrido.toISOString()
  const quando = Number.isNaN(ocorrido.getTime()) ? agora : ocorrido
  const agoraIso = agora.toISOString()
  const chave = chaveIdempotencia(entrada.origem, emailNorm, zap, quando, produtoId)

  // Procura por email_norm, depois por whatsapp_e164.
  const porEmail = emailNorm ? await repo.buscarPorEmailNorm(brand, emailNorm) : null
  const porZap = zap ? await repo.buscarPorWhatsapp(brand, zap) : null

  const conflito = porEmail !== null && porZap !== null && porEmail.id !== porZap.id
  const existente = porEmail ?? porZap

  if (existente && (await repo.capturaExiste(brand, chave))) {
    return {
      ok: true,
      contato_id: existente.id,
      criado: false,
      duplicada: true,
      estado: existente.estado,
      suspeito: existente.estado === 'suspeito',
      conflito_id: null,
      consentimentos_gravados: 0,
      brevo: 'dispensado',
      pendencias: [],
      avisos,
    }
  }

  let contato: Contato
  let criado = false
  let suspeito = false
  let conflitoId: string | null = null

  if (existente) {
    contato = { ...existente }
    // Atualiza so campo vazio. Nome novo nunca sobrescreve.
    const patch: Parameters<typeof repo.atualizarContato>[1] = {}
    if (vazio(contato.nome) && !vazio(entrada.nome)) patch.nome = (entrada.nome as string).trim()
    if (!conflito) {
      if (contato.email_norm === null && emailNorm) {
        patch.email = (entrada.email as string).trim()
        patch.email_norm = emailNorm
        patch.email_canonico = emailCanonico(emailNorm)
      }
      if (contato.whatsapp_e164 === null && zap) patch.whatsapp_e164 = zap
    }
    if (Object.keys(patch).length > 0) {
      await repo.atualizarContato(contato.id, patch, agoraIso)
      contato = { ...contato, ...patch, atualizado_em: agoraIso }
    }
    suspeito = contato.estado === 'suspeito'

    if (conflito && porZap) {
      conflitoId = gerarId()
      await repo.registrarConflito({
        id: conflitoId,
        brand_id: brand,
        contato_email_id: (porEmail as Contato).id,
        contato_whatsapp_id: porZap.id,
        email_norm: emailNorm,
        whatsapp_e164: zap,
        origem: entrada.origem,
        ocorrido_em: ocorridoIso,
        resolvido: false,
        consentimentos_pendentes: consents.filter((c) => c.canal === 'whatsapp'),
      })
    }
  } else {
    const canonico = emailNorm ? emailCanonico(emailNorm) : null
    const gemeos = canonico ? await repo.buscarPorEmailCanonico(brand, canonico) : []
    suspeito = gemeos.length > 0
    contato = {
      id: gerarId(),
      brand_id: brand,
      nome: vazio(entrada.nome) ? null : (entrada.nome as string).trim(),
      email: emailNorm ? (entrada.email as string).trim() : null,
      email_norm: emailNorm,
      email_canonico: canonico,
      whatsapp_e164: zap,
      estado: suspeito ? 'suspeito' : 'ativo',
      origem_primeira: entrada.origem,
      criado_em: agoraIso,
      atualizado_em: agoraIso,
      customer_id: null,
      pessoa_id: null,
    }
    await repo.criarContato(contato)
    criado = true
  }

  const primeira = criado || (await repo.contarCapturas(contato.id)) === 0
  await repo.registrarCaptura({
    brand_id: brand,
    contato_id: contato.id,
    chave_idempotencia: chave,
    origem: entrada.origem,
    tela: origem.tela,
    utm: entrada.utm ?? null,
    ocorrido_em: ocorridoIso,
    primeira,
  })

  // Consentimento por canal e finalidade, so acrescimo.
  const gravados: Consentimento[] = []
  for (const c of consents) {
    if (conflito && c.canal === 'whatsapp') {
      avisos.push('consentimento_whatsapp_em_conflito')
      continue // vai em conflitos.consentimentos_pendentes
    }
    if (!temCanal(contato, c.canal)) {
      avisos.push(`consentimento_${c.canal}_sem_contato_no_canal`)
      continue
    }
    // So o aviso (avise_me) tem escopo de produto; marketing e transacional sao sempre gerais.
    const escopo = c.finalidade === 'avise_me' ? produtoId : null
    const vigente = await repo.ultimoConsentimento(contato.id, c.canal, c.finalidade, escopo)
    let estado: Consentimento['estado'] | null = null
    if (c.revogar === true) {
      if (vigente?.estado === 'concedido') estado = 'revogado'
    } else if (c.marcado) {
      if (!(vigente?.estado === 'concedido' && vigente.texto_versao === c.texto_versao)) estado = 'concedido'
    }
    // Caixa desmarcada sem revogar: nao gera registro nenhum.
    if (estado === null) continue
    const registro: Consentimento = {
      contato_id: contato.id,
      canal: c.canal,
      finalidade: c.finalidade,
      estado,
      texto_versao: c.texto_versao,
      texto_aceito: c.texto_aceito,
      origem: entrada.origem,
      ip_hash: entrada.ip_hash ?? null,
      ocorrido_em: ocorridoIso,
      produto_id: escopo,
    }
    await repo.acrescentarConsentimento(registro)
    gravados.push(registro)
    if (estado === 'concedido' && contato.estado === 'descadastrado') {
      // Opt-in novo e prova, mas voltar a ativo e decisao humana.
      avisos.push('novo_aceite_de_descadastrado')
    }
  }

  // Eventos (SPEC 21). Falha vira pendencia; a gravacao fica.
  const pendencias: Pendencia[] = []
  const oEvento = origemDoEvento(origem.base)
  const base = (tipo: TipoEvento, idNaOrigem: string, entidadeTipo: string, entidadeId: string, payload: Record<string, unknown>): Evento => ({
    id: uuidv7(agora.getTime()),
    ocorrido_em: ocorridoIso,
    recebido_em: agoraIso,
    brand_id: brand,
    tipo,
    versao: 1,
    origem: oEvento,
    ator_tipo: 'contato',
    ator_id: contato.id,
    contato_id: contato.id,
    sessao_id: null,
    entidade_tipo: entidadeTipo,
    entidade_id: entidadeId,
    payload,
    sensivel: false,
    chave_idempotencia: `${oEvento}:${idNaOrigem}:${tipo}`,
    correlacao_id: null,
  })
  const eventos: Evento[] = [
    base('contato.capturado', chave, 'contato', contato.id, {
      origem: entrada.origem,
      tela: origem.tela,
      criado,
      suspeito,
      conflito: conflitoId !== null,
      canais: [emailNorm ? 'email' : null, zap ? 'whatsapp' : null].filter((x) => x !== null),
    }),
    ...gravados.map((g) =>
      base('consentimento.registrado', `${chave}:${g.canal}:${g.finalidade}`, 'consentimento', contato.id, {
        canal: g.canal,
        finalidade: g.finalidade,
        estado: g.estado,
        texto_versao: g.texto_versao,
        produto_id: g.produto_id,
      }),
    ),
  ]
  for (const ev of eventos) {
    try {
      await registrarEvento(ev)
    } catch (e) {
      pendencias.push({ tipo: 'evento', evento: ev, erro: mensagem(e) })
    }
  }

  // Brevo por ultimo. Carteiro, nunca fonte.
  let saida: 'enviado' | 'pendente' | 'dispensado' = 'dispensado'
  if (contato.email !== null && contato.estado !== 'descadastrado' && contato.estado !== 'anonimizado') {
    const marketing = await repo.ultimoConsentimento(contato.id, 'email', 'marketing', null)
    const payload: PayloadBrevo = {
      contato_id: contato.id,
      brand_id: brand,
      email: contato.email,
      nome: contato.nome,
      whatsapp_e164: contato.whatsapp_e164,
      estado: contato.estado,
      origem: entrada.origem,
      origem_primeira: contato.origem_primeira,
      marketing_email: marketing?.estado === 'concedido',
    }
    try {
      await brevo.sincronizarContato(payload)
      saida = 'enviado'
    } catch (e) {
      saida = 'pendente'
      pendencias.push({ tipo: 'brevo', contato_id: contato.id, payload, erro: mensagem(e) })
    }
  }

  return {
    ok: true,
    contato_id: contato.id,
    criado,
    duplicada: false,
    estado: contato.estado,
    suspeito,
    conflito_id: conflitoId,
    consentimentos_gravados: gravados.length,
    brevo: saida,
    pendencias,
    avisos,
  }
}

function temCanal(c: Contato, canal: Canal): boolean {
  if (canal === 'email') return c.email_norm !== null
  if (canal === 'whatsapp') return c.whatsapp_e164 !== null
  return false
}

function mensagem(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
