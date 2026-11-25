import type { ReactNode } from 'react'

const forte = { color: '#E8E8E8', fontWeight: 400 } as const
const link = { color: 'var(--mf-color-mauve-lt)' } as const

export const Forte = ({ children }: { children: ReactNode }) => <strong style={forte}>{children}</strong>

export const LinkInterno = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} style={link}>{children}</a>
)

export const EmailPrivacidade = () => (
  <a href="mailto:privacidade@thebrfactory.com" style={link}>privacidade@thebrfactory.com</a>
)

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section style={{ marginBottom: '48px' }}>
    <h2 style={{
      fontSize: 'clamp(0.7rem, 1.6vw, 0.85rem)',
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--mf-color-mauve-lt)',
      marginBottom: '16px',
    }}>
      {title}
    </h2>
    <div style={{
      fontSize: 'clamp(0.82rem, 1.8vw, 0.95rem)',
      fontWeight: 200,
      lineHeight: 1.85,
      letterSpacing: '0.03em',
      color: '#AAAAAA',
    }}>
      {children}
    </div>
  </section>
)

export const Lista = ({ itens }: { itens: ReactNode[] }) => (
  <ul style={{ listStyle: 'none', padding: 0, marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {itens.map((item, i) => (
      <li key={i} style={{ display: 'flex', gap: '12px' }}>
        <span style={{ color: 'var(--mf-color-mauve-lt)', flexShrink: 0 }}>·</span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
)

export const LINKS_LEGAIS = [
  { href: '/privacidade', texto: 'Privacidade' },
  { href: '/termos', texto: 'Termos de Serviço' },
  { href: '/exclusao-de-dados', texto: 'Exclusão de dados' },
]

export function PaginaLegal({ titulo, atualizacao, children }: { titulo: string; atualizacao: string; children: ReactNode }) {
  return (
    <div style={{ background: '#000000', minHeight: '100dvh', color: '#E8E8E8' }}>
      <div aria-hidden className="grain-overlay" style={{ position: 'fixed', zIndex: 1, pointerEvents: 'none' }} />

      <main style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: '680px',
        margin: '0 auto',
        padding: 'clamp(48px, 10vw, 96px) clamp(24px, 6vw, 48px) clamp(64px, 12vw, 120px)',
      }}>
        <header style={{ marginBottom: '64px' }}>
          <a
            href="/"
            style={{
              display: 'inline-block',
              marginBottom: '48px',
              color: 'var(--mf-text-subtle)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 300,
              textDecoration: 'none',
            }}
          >
            ← melfiore.com
          </a>
          <h1 style={{
            fontSize: 'clamp(1rem, 2.8vw, 1.4rem)',
            fontWeight: 900,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: '#E8E8E8',
            marginBottom: '12px',
          }}>
            {titulo}
          </h1>
          <p style={{ color: 'var(--mf-text-subtle)', fontSize: '12px', fontWeight: 200, letterSpacing: '0.06em' }}>
            Última atualização: {atualizacao}
          </p>
        </header>

        {children}

        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '32px',
          marginTop: '16px',
          textAlign: 'center',
        }}>
          <nav aria-label="Documentos legais" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 20px', marginBottom: '20px' }}>
            {LINKS_LEGAIS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{
                  color: 'var(--mf-text-subtle)',
                  fontSize: '11px',
                  fontWeight: 300,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  padding: '12px 0',
                }}
              >
                {l.texto}
              </a>
            ))}
          </nav>
          <p style={{ color: 'var(--mf-text-subtle)', fontSize: '11px', fontWeight: 200, letterSpacing: '0.06em', lineHeight: 1.7 }}>
            MELFIORE © 2026 .TBF. inc. Todos os direitos reservados.<br />
            .THE FIORE DAILY. intimacy wellness club .TBF.ORIGINAL LABEL
          </p>
        </footer>
      </main>
    </div>
  )
}
