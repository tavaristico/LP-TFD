// Numero da fiorette: identidade da leitora no arquivo. Nunca pode repetir.
// Cada numero entregue fica reservado no KV (binding CAPTURA_FILA, prefixo proprio, sem expiracao).
// Sorteia, confere, sorteia de novo. Passadas as tentativas, ou com o espaco de 4 digitos cheio, sobe um digito.
// Limite honesto: KV nao e atomico. Duas inscricoes no mesmo milissegundo podem ler "livre" juntas.
// Garantia total pede Supabase (sequencia) ou Durable Object. Sem KV (dev local) sorteia como antes.

/** O pedaco do KV que usamos aqui. Sem expirationTtl, a chave fica para sempre. */
export interface KvIds {
  get(chave: string, tipo: 'json'): Promise<unknown>
  put(chave: string, valor: string, opcoes?: { expirationTtl: number }): Promise<void>
}

export const PREFIXO_ID = 'fiorette-id:'
// Numeros ja exibidos no arquivo publico (app/fiorettes/page.tsx). Nenhuma leitora nova pode receber um deles.
export const IDS_DO_ARQUIVO = ['2847', '0193', '5514', '3302', '7841', '1067', '4429']
const TENTATIVAS_POR_TAMANHO = 25
const TAMANHO_MAXIMO = 8

export type Sorteio = (digitos: number) => string

export const sortearNumero: Sorteio = (digitos) => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] % 10 ** digitos).toString().padStart(digitos, '0')
}

export async function reservarId(
  kv: KvIds | null,
  sorteio: Sorteio = sortearNumero,
): Promise<string> {
  if (!kv) return sorteio(4)
  for (let digitos = 4; digitos <= TAMANHO_MAXIMO; digitos++) {
    for (let i = 0; i < TENTATIVAS_POR_TAMANHO; i++) {
      const id = sorteio(digitos)
      if (IDS_DO_ARQUIVO.includes(id)) continue
      if ((await kv.get(PREFIXO_ID + id, 'json')) !== null) continue
      await kv.put(PREFIXO_ID + id, JSON.stringify({ v: 1 }))
      return id
    }
  }
  throw new Error('sem numero livre')
}
