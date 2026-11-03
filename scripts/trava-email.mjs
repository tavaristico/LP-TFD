// Reprova o build se algum arquivo chamar a API de envio do Brevo sem passar pela trava.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
const raiz = ['app', 'components', 'lib']
const ruins = []
const andar = (d) => { for (const n of readdirSync(d)) { const p = join(d, n)
  if (statSync(p).isDirectory()) andar(p)
  else if (/\.(ts|tsx|js|mjs)$/.test(n)) { const s = readFileSync(p, 'utf8')
    if (/smtp\/email|sendTransac|transactionalEmails/i.test(s) && !/podeEnviarEmail\(/.test(s)) ruins.push(p) } } }
for (const r of raiz) { try { andar(r) } catch {} }
if (ruins.length) { console.error('TRAVA DE E-MAIL: envio sem podeEnviarEmail() em:\n  ' + ruins.join('\n  ')); process.exit(1) }
console.log('trava-email: ok, todo envio passa pela trava')
