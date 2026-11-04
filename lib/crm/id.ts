// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.
import { randomBytes } from 'node:crypto'

/** uuid v7: 48 bits de milissegundos + aleatorio. Ordenavel no tempo (SPEC 21.1). */
export function uuidv7(ms: number): string {
  const b = randomBytes(16)
  // 48 bits cabem em Number (< 2^53): sem BigInt, para compilar em alvo ES2017 (LP-TFD).
  let t = Math.floor(ms)
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256
    t = Math.floor(t / 256)
  }
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x70
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80
  const h = b.toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
