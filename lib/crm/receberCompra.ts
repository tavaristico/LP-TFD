// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.
import { CABECALHO_ASSINATURA, conferirAssinatura } from './assinatura'
import { prepararCompra, validarCompra } from './compras'
import { registrarCompraNoBanco } from './comprasSupabase'
import { ErroSupabase, type ConfigSupabase } from './supabase'

// A rota de entrada de compras: `POST` assinado do subscriber do Medusa. Funcao pura sobre Request e Response
// (padrao web): o Worker monta numa rota de poucas linhas (docs/motor/0008). Sem Medusa ligado, sem e-mail, sem Brevo:
// compra nao e marketing e nada aqui envia mensagem.
// Ordem: metodo, tamanho, ASSINATURA (antes de ler o JSON), JSON, forma, banco.
// Corpo de resposta nunca carrega dado pessoal nem texto de erro do servidor: so `motivo`.
// 2xx = gravado ou ja estava gravado (o Medusa nao reenvia). 4xx = a entrega esta errada, reenviar nao ajuda.
// 5xx = tente de novo (o banco e idempotente).

export const LIMITE_CORPO = 64 * 1024

export interface DepsReceberCompra {
  /** Segredos aceitos, o atual primeiro. Dois durante a troca. Vazio ou curto (< 32): a rota fecha (503). */
  segredos: readonly string[]
  supabase: ConfigSupabase
  relogio?: () => Date
  gerarId?: () => string
}

const json = (status: number, corpo: Record<string, unknown>, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  })

export async function receberCompra(req: Request, deps: DepsReceberCompra): Promise<Response> {
  if (req.method !== 'POST') return json(405, { ok: false, motivo: 'metodo' }, { allow: 'POST' })

  const declarado = Number(req.headers.get('content-length') ?? '0')
  if (Number.isFinite(declarado) && declarado > LIMITE_CORPO) return json(413, { ok: false, motivo: 'corpo_grande' })
  const cru = await req.text()
  if (new TextEncoder().encode(cru).length > LIMITE_CORPO) return json(413, { ok: false, motivo: 'corpo_grande' })

  const agora = (deps.relogio ?? (() => new Date()))()
  const ass = await conferirAssinatura({
    corpoCru: cru,
    cabecalho: req.headers.get(CABECALHO_ASSINATURA),
    segredos: deps.segredos,
    agora,
  })
  if (!ass.ok) {
    // Sem segredo configurado a rota esta fechada por nossa culpa: 503, nunca aceitar sem prova.
    if (ass.motivo === 'sem_segredo') return json(503, { ok: false, motivo: 'fechada' })
    return json(401, { ok: false, motivo: 'assinatura' })
  }

  let bruto: unknown
  try {
    bruto = JSON.parse(cru)
  } catch {
    return json(400, { ok: false, motivo: 'json' })
  }
  const v = validarCompra(bruto)
  if (!v.ok) return json(422, { ok: false, motivo: v.motivo })
  const prep = prepararCompra(v.entrada, { agora, ...(deps.gerarId ? { gerarId: deps.gerarId } : {}) })
  if (!prep.ok) return json(422, { ok: false, motivo: prep.motivo })

  try {
    const r = await registrarCompraNoBanco(deps.supabase, prep.corpo)
    return json(200, {
      ok: true,
      duplicada: r.duplicada,
      estado: r.estado,
      criada: r.criada,
      avisos: [...prep.avisos, ...r.avisos],
    })
  } catch (e) {
    const codigo = e instanceof ErroSupabase ? e.codigo : 'inesperado'
    // 22023 = o banco recusou o conteudo (ex.: pedido novo sem itens): reenviar igual nao muda nada.
    if (codigo.endsWith('_22023')) return json(422, { ok: false, motivo: 'recusada_pelo_banco' })
    return json(503, { ok: false, motivo: 'indisponivel' }, { 'retry-after': '30' })
  }
}
