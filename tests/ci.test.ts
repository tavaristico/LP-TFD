// S26: o workflow de CI existe e cobre testes, auditoria, build e cabecalhos. Nao ativa nada no GitHub.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const raiz = (p: string) => resolve(__dirname, '..', p)

describe('S26 CI minimo', () => {
  const wf = readFileSync(raiz('.github/workflows/ci.yml'), 'utf8')
  it('roda em push para develop e main e em PR para main', () => {
    expect(wf).toMatch(/push:\s*\n\s*branches: \[develop, main\]/)
    expect(wf).toMatch(/pull_request:\s*\n\s*branches: \[main\]/)
  })
  it('tem testes, auditoria de pacote, build e cabecalhos, nessa ordem', () => {
    const ordem = ['npm ci', 'npm test', 'npm audit --omit=dev', 'npm run build', 'checar-cabecalhos.mjs']
    const pos = ordem.map((t) => wf.indexOf(t))
    expect(pos.every((p) => p >= 0)).toBe(true)
    expect([...pos].sort((a, b) => a - b)).toEqual(pos)
  })
  it('so leitura e nenhum segredo nem publicacao', () => {
    expect(wf).toMatch(/permissions:\s*\n\s*contents: read/)
    expect(wf).not.toMatch(/secrets\./)
    expect(wf).not.toMatch(/cf:deploy|vercel|wrangler deploy|git push/)
  })
  it('o script de cabecalhos existe', () => {
    expect(existsSync(raiz('scripts/checar-cabecalhos.mjs'))).toBe(true)
  })
})
