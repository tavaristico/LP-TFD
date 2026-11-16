import WaitlistForm from '@/components/WaitlistForm'

export default function Home() {
  return (
    <div
      className="relative"
      style={{
        height: '100dvh',
        background: '#000000',
        display: 'grid',
        gridTemplateRows: '1fr auto',
        overflow: 'hidden',
      }}
    >

      {/* ── Background effects ── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
        <div className="bg-blob bg-blob-4" />

        <div className="flash" style={{ width: 220, height: 220, top: '5%',  left: '-10%', animationDuration: '4.6s', animationDelay: '0.0s', zIndex: 1 }} />
        <div className="flash" style={{ width: 160, height: 160, top: '38%', left: '-4%',  animationDuration: '3.9s', animationDelay: '1.4s', zIndex: 1 }} />
        <div className="flash" style={{ width: 260, height: 260, top: '70%', left: '-12%', animationDuration: '5.3s', animationDelay: '0.7s', zIndex: 1 }} />
        <div className="flash" style={{ width: 200, height: 200, top: '12%', right: '-8%',  animationDuration: '4.2s', animationDelay: '2.1s', zIndex: 1 }} />
        <div className="flash" style={{ width: 180, height: 180, top: '52%', right: '-5%',  animationDuration: '5.7s', animationDelay: '0.4s', zIndex: 1 }} />
        <div className="flash" style={{ width: 240, height: 240, top: '75%', right: '-10%', animationDuration: '3.6s', animationDelay: '1.8s', zIndex: 1 }} />
        <div className="flash" style={{ width: 320, height: 320, top: '80%', left: '30%',   animationDuration: '6.1s', animationDelay: '2.8s', zIndex: 1 }} />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/naming.svg"
          alt=""
          aria-hidden
          className="pointer-events-none select-none absolute"
          style={{
            width: '560%',
            maxWidth: '3200px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(45deg)',
            opacity: 0.028,
            filter: 'blur(10px)',
            zIndex: 1,
          }}
        />
      </div>

      {/* ── Film grain ── */}
      <div aria-hidden className="grain-overlay" style={{ zIndex: 2 }} />

      {/* ── Main content: tudo centralizado como bloco único ── */}
      <main
        className="relative flex flex-col items-center justify-center px-6 text-center"
        style={{ zIndex: 3 }}
      >
        {/* Logo ancorada ao título */}
        <div
          className="logo-wrapper anim-fade-in delay-100"
          style={{ marginBottom: '0.75rem', pointerEvents: 'none' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="MELFIORE"
            className="logo-glow"
            style={{
              width: 'min(24rem, max(11rem, 52vw))',
              height: 'auto',
              display: 'block',
            }}
          />
        </div>

        <h1
          className="headline-glow anim-fade-up delay-200"
          style={{
            fontSize: 'var(--mf-hero-size)',
            fontWeight: 'var(--mf-hero-weight)',
            maxWidth: '32rem',
            marginBottom: '0.35rem',
            lineHeight: 1.3,
            letterSpacing: '0.08em',
          }}
        >
          junte-se a milhares de fãs<br />
          que aguardam saber<br />
          quem é ela.
        </h1>

        <div className="w-full anim-fade-up delay-500" style={{ maxWidth: '22rem', marginTop: '0.5rem' }}>
          <WaitlistForm />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="relative flex items-center justify-center anim-fade-in delay-650"
        style={{ zIndex: 3, background: 'transparent', padding: '8px 24px calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        <p
          style={{
            color: 'var(--mf-text-footer)',
            fontSize: '12px',
            fontWeight: 300,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 1.65,
          }}
        >
          MELFIORE © 2026 .TBF. inc. All rights reserved
          <span className="hidden sm:inline"><br />
          .THE FIORE DAILY. intimacy wellness club .TBF.ORIGINAL LABEL<br />
          RUA PAMPLONA, 145, JARDIM PAULISTA, SÃO PAULO, SP, 01.405-900</span>
        </p>
      </footer>

    </div>
  )
}
