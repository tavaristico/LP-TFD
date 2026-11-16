/**
 * Acha contatos sem e-mail na conta Brevo e, so com --confirmo, apaga os que nao tem telefone.
 *
 * Padrao: ENSAIO. Lista o que apagaria e nao apaga nada.
 *   BREVO_API_KEY=... node scripts/delete-ghost-contact.mjs              ensaio
 *   BREVO_API_KEY=... node scripts/delete-ghost-contact.mjs --confirmo   apaga (num terminal, pede o numero de contatos)
 *
 * Contato que so tem WhatsApp, SMS ou telefone fixo nao e fantasma: fica, e aparece como "poupado".
 * Apagar no Brevo nao volta. S27.
 */
import { createInterface } from 'node:readline/promises'
import { pathToFileURL } from 'node:url'

export const ATRIBUTOS_DE_TELEFONE = ['SMS', 'WHATSAPP', 'LANDLINE_NUMBER']

const tem = (v) => v !== undefined && v !== null && String(v).trim() !== ''

/** Separa os contatos sem e-mail em quem seria apagado e quem tem telefone (poupado). */
export function separarFantasmas(contatos) {
  const apagar = []
  const poupados = []
  for (const c of contatos ?? []) {
    if (tem(c?.email)) continue
    const attrs = c?.attributes ?? {}
    if (ATRIBUTOS_DE_TELEFONE.some((k) => tem(attrs[k]))) poupados.push(c)
    else apagar.push(c)
  }
  return { apagar, poupados }
}

const cabecalhos = (chave) => ({ accept: 'application/json', 'content-type': 'application/json', 'api-key': chave })

async function listar(chave, buscar) {
  const res = await buscar('https://api.brevo.com/v3/contacts?limit=50&sort=desc', { headers: cabecalhos(chave) })
  if (!res.ok) throw new Error(`Brevo contatos: ${res.status}`)
  return (await res.json()).contacts ?? []
}

async function apagar(chave, id, buscar) {
  const res = await buscar(`https://api.brevo.com/v3/contacts/${id}`, { method: 'DELETE', headers: cabecalhos(chave) })
  if (!res.ok && res.status !== 204) throw new Error(`Brevo apagar ${id}: ${res.status}`)
}

/**
 * Roda o script. `argv` sem node e arquivo. Devolve { apagados } (ids). Sem --confirmo nunca chama DELETE.
 * `perguntar` e injetavel para teste; so e usada com --confirmo num terminal.
 * @param {{ chave?: string, argv?: string[], buscar?: typeof fetch, escrever?: (m: string) => void, perguntar?: (n: number) => Promise<string>, interativo?: boolean }} opcoes
 * @returns {Promise<{ apagados: number[] }>}
 */
export async function rodar({ chave, argv = [], buscar = fetch, escrever = console.log, perguntar, interativo = Boolean(process.stdin.isTTY) }) {
  if (!chave) throw new Error('BREVO_API_KEY nao definida.')
  const confirmado = argv.includes('--confirmo')
  const { apagar: alvo, poupados } = separarFantasmas(await listar(chave, buscar))

  for (const c of poupados) escrever(`poupado: id ${c.id} (tem telefone)`)
  if (!alvo.length) {
    escrever('nenhum contato fantasma para apagar.')
    return { apagados: [] }
  }
  for (const c of alvo) escrever(`fantasma: id ${c.id}, criado ${c.createdAt?.slice(0, 10) ?? '?'}, atributos ${JSON.stringify(c.attributes ?? {})}`)

  if (!confirmado) {
    escrever(`ENSAIO: ${alvo.length} contato(s) seriam apagados. Nada foi apagado. Para apagar de verdade: --confirmo`)
    return { apagados: [] }
  }
  if (interativo) {
    const resposta = perguntar
      ? await perguntar(alvo.length)
      : await (async () => {
          const rl = createInterface({ input: process.stdin, output: process.stdout })
          try { return await rl.question(`Apagar ${alvo.length} contato(s) no Brevo, sem volta. Digite ${alvo.length} para confirmar: `) } finally { rl.close() }
        })()
    if (String(resposta).trim() !== String(alvo.length)) {
      escrever('cancelado. Nada foi apagado.')
      return { apagados: [] }
    }
  }
  const apagados = []
  for (const c of alvo) {
    await apagar(chave, c.id, buscar)
    apagados.push(c.id)
    escrever(`apagado: id ${c.id}`)
  }
  return { apagados }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  rodar({ chave: process.env.BREVO_API_KEY, argv: process.argv.slice(2) }).catch((e) => {
    console.error(e instanceof Error ? e.message : 'erro')
    process.exit(1)
  })
}
