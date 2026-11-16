// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.
import { ErroSupabase, postarRpc, type ConfigSupabase } from './supabase'
import type { CorpoRegistrarCompra } from './compras'

// Adaptador Supabase de compras: UMA chamada a crm.registrar_compra. A chave e o JWT do papel
// `compras_ingestao` (so executa essa funcao; nenhum select). Mesmo caminho de gateway da captura:
// publishable em `apikey`, JWT em `Authorization: Bearer` (docs/motor/0003). Erro leva so o codigo.

export interface RespostaCompra {
  ok: true
  duplicada: boolean
  compra_id: string
  contato_id: string
  estado: 'aberta' | 'paga' | 'enviada' | 'cancelada' | 'reembolsada'
  criada: boolean
  avisos: string[]
}

export async function registrarCompraNoBanco(cfg: ConfigSupabase, corpo: CorpoRegistrarCompra): Promise<RespostaCompra> {
  const j = (await postarRpc(cfg, 'registrar_compra', corpo)) as Partial<RespostaCompra> | null
  if (!j || j.ok !== true || typeof j.compra_id !== 'string' || typeof j.contato_id !== 'string' || typeof j.estado !== 'string') {
    throw new ErroSupabase('resposta_invalida')
  }
  return {
    ok: true,
    duplicada: j.duplicada === true,
    compra_id: j.compra_id,
    contato_id: j.contato_id,
    estado: j.estado,
    criada: j.criada === true,
    avisos: Array.isArray(j.avisos) ? j.avisos.filter((a): a is string => typeof a === 'string') : [],
  }
}
