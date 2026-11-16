import FiorettesForm from '@/components/FiorettesForm'
import { TarjaSvg } from '@/components/TarjaSvg'

const entries = [
  {
    id: '2847',
    text: 'não consigo ter uma conversa normal com ele\ndesde que me peguei pensando em como seria\nele me olhando de verdade.\n\nseis meses de colega.\num segundo de pensamento.',
    signature: '██████',
    city: 'são paulo',
  },
  {
    id: '0193',
    text: 'eu sabia que ia me arrepender.\n\na única coisa que me arrependo\né de não ter ficado mais tempo.',
    signature: 'anônima',
    city: 'porto alegre',
  },
  {
    id: '5514',
    text: 'ela perguntou se eu tinha ficado com alguém no fim de semana.\neu disse que não.\n\ntecnicamente estava mentindo.\nmas não queria compartilhar aquilo ainda.\nera meu.',
    signature: 'n.',
    city: 'rio de janeiro',
  },
  {
    id: '3302',
    text: 'mandei a mensagem para o número errado.\n\na pessoa certa nunca vai saber.\nmas às vezes eu acho que foi de propósito.',
    signature: 'anônima',
    city: '',
  },
  {
    id: '7841',
    text: 'ele aparece no meu pensamento nos momentos mais inconvenientes.\nno meio de uma reunião, lavando o cabelo, saindo do elevador.\n\nnão é amor.\nmas também não é só isso.',
    signature: 'anônima',
    city: 'lisboa',
  },
  {
    id: '1067',
    text: 'a gente nunca falou sobre o que aconteceu naquela noite.\nfaz dois anos.\n\nàs vezes acho que deveríamos ter falado.\nàs vezes acho que não falar foi a decisão mais íntima que tomamos juntas.',
    signature: 'alice',
    city: 'são paulo',
  },
  {
    id: '4429',
    text: 'descobri que sou o tipo de pessoa\nque fica acordada às 2 da manhã\npensando em algo que a outra pessoa provavelmente já esqueceu.\n\nisso me irrita e me encanta ao mesmo tempo.',
    signature: 'anônima',
    city: 'belo horizonte',
  },
]

function TarjaDivider() {
  return (
    <div
      aria-hidden
      style={{ width: '120px', height: '12px', position: 'relative', margin: '48px auto', opacity: 0.4 }}
    >
      <TarjaSvg fill="var(--mf-color-mauve)" />
    </div>
  )
}

export default function FiorettesPage() {
  return (
    <div
      style={{
        height: '100dvh',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        position: 'relative',
        background: '#000000',
        color: '#E8E8E8',
      }}
    >
      {/* Fundo fixo: blobs + grain */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>
      <div aria-hidden className="grain-overlay" style={{ position: 'fixed', zIndex: 1 }} />

      <main
        className="relative font-brand"
        style={{ zIndex: 2, maxWidth: '600px', margin: '0 auto', padding: '0 24px' }}
      >

        {/* ── Hero ── */}
        <section className="text-center" style={{ paddingTop: '72px', paddingBottom: '40px' }}>

          {/* Ticker: título principal, full-bleed */}
          <div
            className="anim-fade-in delay-100"
            style={{
              position: 'relative',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100vw',
              overflow: 'hidden',
              background: '#000000',
              borderTop: '1px solid #FFF004',
              borderBottom: '1px solid #FFF004',
              boxShadow: '0 0 18px rgba(255,240,4,0.25), inset 0 0 18px rgba(255,240,4,0.04)',
              padding: '18px 0',
              marginBottom: '28px',
            }}
          >
            <div className="fio-ticker-track">
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    color: '#FFF004',
                    fontSize: '16px',
                    fontWeight: 900,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    padding: '0 28px',
                  }}
                >
                  fiorettes ༺✦༻ clube da mel ༺✦༻
                </span>
              ))}
            </div>
          </div>

          <p
            className="anim-fade-up delay-200"
            style={{ color: '#E8E8E8', fontSize: '14px', fontWeight: 300, lineHeight: 1.8, letterSpacing: '0.02em', marginBottom: '4px' }}
          >
            o que você sentiu mas não disse.<br />
            o que aconteceu mas não contou.
          </p>
          <p
            className="headline-glow headline-glow-sm anim-fade-up delay-350"
            style={{ fontSize: '14px', fontWeight: 400, letterSpacing: '0.06em' }}
          >
            MELFIORE está lendo.
          </p>
        </section>

        {/* ── Formulário: no topo ── */}
        <section id="formulario" className="anim-fade-up delay-500" style={{ marginBottom: '0' }}>
          <FiorettesForm />
        </section>

        <TarjaDivider />

        {/* ── Ponte ── */}
        <section className="text-center anim-fade-up" style={{ marginBottom: '0' }}>
          <p style={{ color: '#E8E8E8', fontSize: '16px', fontWeight: 300, lineHeight: 1.8 }}>
            você sabe o que guardou.
          </p>
          <p className="headline-glow headline-glow-sm" style={{ fontSize: '16px', fontWeight: 400, letterSpacing: '0.04em', marginTop: '2px' }}>
            MELFIORE também quer saber.
          </p>
        </section>

        <TarjaDivider />

        {/* ── Arquivo: masonry grid ── */}
        <section aria-label="arquivo" className="fiorettes-grid" style={{ paddingBottom: '80px' }}>
          {entries.map((entry, i) => (
            <article
              key={entry.id}
              className="anim-fade-up"
              style={{
                animationDelay: `${0.1 + i * 0.06}s`,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 'var(--mf-radius-card)',
                backdropFilter: 'blur(20px) saturate(160%)',
                WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                overflow: 'hidden',
              }}
            >
              {/* Header do card */}
              <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: 'var(--mf-color-mauve-lt)',
                  margin: 0,
                }}>
                  fiorette #{entry.id}
                </p>
              </div>

              {/* Corpo do card */}
              <div style={{ padding: '16px' }}>
                <p style={{
                  color: '#E8E8E8',
                  fontSize: '15px',
                  fontWeight: 300,
                  lineHeight: 1.8,
                  whiteSpace: 'pre-line',
                  margin: 0,
                }}>
                  {entry.text}
                </p>
              </div>

              {/* Footer do card */}
              <div style={{
                padding: '10px 16px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}>
                <span style={{ color: 'var(--mf-color-mauve-lt)', fontSize: '12px', fontWeight: 200, letterSpacing: '0.04em' }}>
                  assinada: {entry.signature}
                </span>
                {entry.city && (
                  <span style={{ color: 'var(--mf-color-mauve-lt)', fontSize: '12px', fontWeight: 200, letterSpacing: '0.04em' }}>
                    ༺{entry.city}༻
                  </span>
                )}
              </div>
            </article>
          ))}
        </section>

        {/* ── Rodapé ── */}
        <TarjaDivider />
        <footer style={{
          padding: '0 0 calc(40px + env(safe-area-inset-bottom, 0px))',
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--mf-text-subtle)', fontSize: '13px', fontWeight: 200, letterSpacing: '0.04em', marginBottom: '20px' }}>
            o diário continua aceitando novas páginas.
          </p>
          <div className="tarja-field" style={{ maxWidth: '240px', margin: '0 auto 24px' }}>
            <TarjaSvg fill="transparent" stroke="var(--mf-border-tarja)" />
            <a
              href="#formulario"
              className="font-brand"
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--mf-text-subtle)', fontWeight: 400,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                fontSize: '0.75rem', textDecoration: 'none',
              }}
            >
              deixar uma página
            </a>
          </div>
          <p style={{ color: 'var(--mf-text-subtle)', fontSize: '12px', fontWeight: 200, letterSpacing: '0.06em', lineHeight: 1.7 }}>
            ao enviar, você concorda com nossa{' '}
            <a href="/privacidade" style={{ color: 'var(--mf-text-subtle)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              política de privacidade
            </a>
            .<br />
            MELFIORE © 2026 .TBF. inc. Todos os direitos reservados.
          </p>
        </footer>

      </main>
    </div>
  )
}
