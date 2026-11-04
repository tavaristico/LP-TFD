// Copia vendorizada de packages/crm (MELFIORE-SITE) para lib/crm/. A fonte da verdade e o pacote;
// este repo e deployado sozinho (Cloudflare e Vercel clonam so ele), entao nao pode apontar para fora.
// Uso: node scripts/sincronizar-crm.mjs   (rode de novo a cada mudanca no pacote)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const site = resolve(aqui, '../../MELFIORE-SITE/packages')
const destino = resolve(aqui, '../lib/crm')
mkdirSync(destino, { recursive: true })

const cabecalho = '// GERADO por scripts/sincronizar-crm.mjs a partir de MELFIORE-SITE/packages. Nao edite aqui.\n'
const copias = [
  ['crm/src/capturarContato.ts', 'capturarContato.ts'],
  ['crm/src/id.ts', 'id.ts'],
  ['crm/src/normalizar.ts', 'normalizar.ts'],
  ['crm/src/portas.ts', 'portas.ts'],
  ['crm/src/supabase.ts', 'supabase.ts'],
  ['eventos/src/tipos.ts', 'eventos-tipos.ts'],
]
for (const [de, para] of copias) {
  const src = readFileSync(resolve(site, de), 'utf8')
    .replace(/from '(\.\/[a-zA-Z-]+)\.js'/g, "from '$1'")
    .replace(/from '@melfiore\/eventos'/g, "from './eventos-tipos'")
  writeFileSync(resolve(destino, para), cabecalho + src)
  console.log('ok', para)
}
writeFileSync(
  resolve(destino, 'index.ts'),
  cabecalho +
    "export { capturarContato } from './capturarContato'\n" +
    "export type { EntradaCaptura, ResultadoCaptura } from './capturarContato'\n" +
    "export { capturarComSupabase, ErroSupabase } from './supabase'\n" +
    "export type { CapturaSupabase, ConfigSupabase, ResultadoGravacao } from './supabase'\n",
)
