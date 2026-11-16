// S26: confere os cabecalhos de seguranca de um servidor no ar (next start local no CI, ou a producao).
// Uso: node scripts/checar-cabecalhos.mjs http://localhost:3199 [caminho ...]
// Sai com 1 se faltar cabecalho. O mesmo conjunto que tests/seguranca.test.ts le em next.config.ts.
const base = process.argv[2]
if (!base) {
  console.error('uso: node scripts/checar-cabecalhos.mjs <url-base> [caminho ...]')
  process.exit(2)
}
const caminhos = process.argv.length > 3 ? process.argv.slice(3) : ['/', '/fiorettes', '/privacidade']

const exigidos = {
  'x-frame-options': /^DENY$/i,
  'x-content-type-options': /^nosniff$/i,
  'referrer-policy': /\S/,
  'permissions-policy': /camera=\(\)/,
  'content-security-policy-report-only': /frame-ancestors 'none'/,
}
const proibidos = ['x-powered-by']

let falhas = 0
for (const c of caminhos) {
  const res = await fetch(new URL(c, base), { redirect: 'manual' })
  const erros = []
  for (const [nome, re] of Object.entries(exigidos)) {
    const v = res.headers.get(nome)
    if (!v || !re.test(v)) erros.push(`falta ou invalido: ${nome}`)
  }
  for (const nome of proibidos) if (res.headers.has(nome)) erros.push(`nao devia existir: ${nome}`)
  console.log(`${erros.length ? 'FALHA' : 'ok   '} ${c} (${res.status})${erros.length ? ': ' + erros.join('; ') : ''}`)
  falhas += erros.length
}
process.exit(falhas ? 1 : 0)
