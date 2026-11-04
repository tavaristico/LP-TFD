// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.
// Formato do evento: SPEC.md 21.1 (tabela os.eventos). Sem dependencia de runtime.

/** Catalogo inicial, SPEC 21.1. Nome estavel `dominio.verbo`. */
export const CATALOGO_EVENTOS = [
  "contato.capturado",
  "consentimento.registrado",
  "carrinho.criado",
  "carrinho.item_adicionado",
  "checkout.iniciado",
  "pedido.criado",
  "pagamento.confirmado",
  "pedido.enviado",
  "devolucao.pedida",
  "busca.feita",
  "produto.visto",
  "avise_me.pedido",
  "cliente.descadastrado",
  "canal.bloqueado_consentimento", // porta de canais barrou o envio por falta de consentimento
  "canal.bloqueado_consentimento", // porta de canais barrou o envio por falta de consentimento
  "whatsapp.recebido", // futuro
] as const;
export type TipoEvento = (typeof CATALOGO_EVENTOS)[number];

export const ORIGENS = [
  "waitlist",
  "vitrine",
  "medusa",
  "crm",
  "admin",
  "fornecedor",
  "whatsapp",
] as const;
export type Origem = (typeof ORIGENS)[number];

export const ATORES = ["contato", "pessoa", "sistema", "agente"] as const;
export type AtorTipo = (typeof ATORES)[number];

export type Payload = Record<string, unknown>;

/** Linha de `os.eventos`. Datas em ISO 8601, ids em uuid. */
export interface Evento {
  id: string; // uuid v7, ordenavel no tempo
  ocorrido_em: string; // quando aconteceu na origem
  recebido_em: string; // quando entrou
  brand_id: string; // `melfiore`
  tipo: TipoEvento;
  versao: number; // versao do formato do payload
  origem: Origem;
  ator_tipo: AtorTipo;
  ator_id: string; // uuid
  contato_id: string | null; // uuid, ligacao ao contato unico
  sessao_id: string | null; // agrupa a visita, cookie proprio
  entidade_tipo: string; // `pedido`
  entidade_id: string; // `MF-0001`
  payload: Payload; // fatos sem dado pessoal
  sensivel: boolean; // toca item da linha intima
  chave_idempotencia: string; // `origem:id_na_origem:tipo`, unica
  correlacao_id: string | null; // uuid, liga pedido, pagamento, envio
}

/** O que o emissor entrega. `id`, `recebido_em` e `brand_id` nascem no registro. */
export interface NovoEvento {
  tipo: string; // validado contra o catalogo
  origem: string;
  ocorrido_em: string;
  ator_tipo: string;
  ator_id: string;
  entidade_tipo: string;
  entidade_id: string;
  chave_idempotencia: string;
  payload: Payload;
  versao?: number; // padrao 1
  sensivel?: boolean; // padrao false
  contato_id?: string | null;
  sessao_id?: string | null;
  correlacao_id?: string | null;
  brand_id?: string; // padrao `melfiore`
}

/** Porta de gravacao (Supabase em producao, memoria nos testes). So acrescenta. */
export interface PortaEventos {
  /** true se inseriu; false se a chave de idempotencia ja existia. */
  gravar(evento: Evento): Promise<boolean>;
}

export class ErroEventoInvalido extends Error {
  readonly problemas: string[];
  constructor(problemas: string[]) {
    super(`evento recusado: ${problemas.join("; ")}`);
    this.name = "ErroEventoInvalido";
    this.problemas = problemas;
  }
}
