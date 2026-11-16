// S34: sem Vercel Analytics, e GA4 so carrega com chave ligada no build (nenhum cookie antes do aviso).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const ler = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8')
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

describe('S34 cookies antes do aviso', () => {
  it('nao ha pacote nem import da Vercel de analytics', () => {
    const pkg = JSON.parse(ler('package.json'))
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
    expect(deps.filter((d) => d.startsWith('@vercel/'))).toEqual([])
    expect(ler('app/layout.tsx')).not.toMatch(/@vercel\/|va\.vercel-scripts|_vercel\/insights/)
  })
  it('GA4 desligado por padrao', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA4', '')
    expect((await import('@/lib/ga4')).GA4_ATIVO).toBe(false)
  })
  it('GA4 so liga com NEXT_PUBLIC_GA4=ligado', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA4', 'ligado')
    expect((await import('@/lib/ga4')).GA4_ATIVO).toBe(true)
  })
  it('o layout so injeta o gtag dentro de GA4_ATIVO', () => {
    const l = ler('app/layout.tsx')
    expect(l).toMatch(/\{GA4_ATIVO && \(/)
    expect(l.indexOf('googletagmanager.com')).toBeGreaterThan(l.indexOf('GA4_ATIVO &&'))
  })
})
