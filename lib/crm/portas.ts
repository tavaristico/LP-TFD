// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.
import type { Evento } from './eventos-tipos'

// Portas do pacote crm. Nada aqui fala com rede ou banco: o Worker injeta os adaptadores
// reais (Supabase, Brevo, emissor de eventos); o teste injeta os de memoria.

export type OrigemBase =
  | 'waitlist'
  | 'fiorettes'
  | 'captura'
  | 'avise-me'
  | 'checkout'
  | 'conta'
  | 'newsletter'
  | 'direct'
  | 'crm'

/** `captura` pode vir com a tela: `captura:erro`, `captura:404`. */
export type Origem = OrigemBase | `captura:${string}`

export type Canal = 'email' | 'whatsapp' | 'sms'
export type Finalidade = 'marketing' | 'avise_me' | 'transacional'
export type EstadoContato = 'ativo' | 'descadastrado' | 'suspeito' | 'anonimizado'

export interface Contato {
  id: string
  brand_id: string
  nome: string | null
  email: string | null
  email_norm: string | null
  email_canonico: string | null
  whatsapp_e164: string | null
  estado: EstadoContato
  origem_primeira: string
  criado_em: string
  atualizado_em: string
  customer_id: string | null
  pessoa_id: string | null
}

/** So acrescimo. O estado vigente e o ultimo registro por contato, canal e finalidade. */
export interface Consentimento {
  contato_id: string
  canal: Canal
  finalidade: Finalidade
  estado: 'concedido' | 'revogado'
  texto_versao: string
  texto_aceito: string
  origem: string
  ip_hash: string | null
  ocorrido_em: string
  /** Escopo do aviso 'avise_me' (SPEC 14). Nulo = consentimento geral. So existe com finalidade avise_me. */
  produto_id: string | null
}

export interface Captura {
  brand_id: string
  contato_id: string
  chave_idempotencia: string
  origem: string
  tela: string | null
  utm: Record<string, string> | null
  ocorrido_em: string
  /** true so na primeira captura do contato: e ela que define origem_primeira. */
  primeira: boolean
}

export interface Conflito {
  id: string
  brand_id: string
  contato_email_id: string
  contato_whatsapp_id: string
  email_norm: string | null
  whatsapp_e164: string | null
  origem: string
  ocorrido_em: string
  resolvido: boolean
  /** Aceites de WhatsApp que NAO foram gravados no contato do e-mail: um humano decide. */
  consentimentos_pendentes: ConsentimentoEntrada[]
}

export interface ConsentimentoEntrada {
  canal: Canal
  finalidade: Finalidade
  /** Caixa marcada. Desmarcada nunca gera consentimento. */
  marcado: boolean
  /** Texto exato mostrado e aceito. Obrigatorio quando marcado ou revogar. */
  texto_aceito: string
  texto_versao: string
  /** Revogacao explicita (clique em /conta ou no rodape). Caixa vazia sozinha nao revoga. */
  revogar?: boolean
}

export interface RepositorioContatos {
  buscarPorEmailNorm(brand_id: string, email_norm: string): Promise<Contato | null>
  buscarPorWhatsapp(brand_id: string, whatsapp_e164: string): Promise<Contato | null>
  buscarPorEmailCanonico(brand_id: string, email_canonico: string): Promise<Contato[]>
  criarContato(contato: Contato): Promise<void>
  atualizarContato(
    id: string,
    patch: Partial<Pick<Contato, 'nome' | 'email' | 'email_norm' | 'email_canonico' | 'whatsapp_e164' | 'estado'>>,
    atualizado_em: string,
  ): Promise<void>
  capturaExiste(brand_id: string, chave_idempotencia: string): Promise<boolean>
  registrarCaptura(captura: Captura): Promise<void>
  /** Existe captura anterior deste contato? Define se a proxima e a primeira. */
  contarCapturas(contato_id: string): Promise<number>
  /** Ultimo registro do escopo exato: `produto_id` nulo olha so o consentimento geral. */
  ultimoConsentimento(
    contato_id: string,
    canal: Canal,
    finalidade: Finalidade,
    produto_id: string | null,
  ): Promise<Consentimento | null>
  acrescentarConsentimento(consentimento: Consentimento): Promise<void>
  registrarConflito(conflito: Conflito): Promise<void>
}

/** Idempotente pela chave_idempotencia: reentrega devolve gravado:false e nao duplica. */
export type RegistrarEvento = (evento: Evento) => Promise<{ gravado: boolean }>

export interface PayloadBrevo {
  contato_id: string
  brand_id: string
  email: string
  nome: string | null
  whatsapp_e164: string | null
  estado: EstadoContato
  origem: string
  origem_primeira: string
  /** Vigente no banco. O adaptador do Brevo decide a lista a partir disto. */
  marketing_email: boolean
}

/** Carteiro. Chamado DEPOIS da gravacao; se lancar, o contato fica e volta como pendencia. */
export interface SaidaBrevo {
  sincronizarContato(payload: PayloadBrevo): Promise<void>
}

export interface Portas {
  repositorio: RepositorioContatos
  registrarEvento: RegistrarEvento
  brevo: SaidaBrevo
  relogio?: () => Date
  gerarId?: () => string
}
