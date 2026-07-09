import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade — MELFIORE',
  description: 'Como coletamos, usamos e protegemos seus dados pessoais.',
  robots: { index: false },
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: '48px' }}>
    <h2 style={{
      fontSize: 'clamp(0.7rem, 1.6vw, 0.85rem)',
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: '#7A4848',
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

export default function PrivacidadePage() {
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

        {/* Header */}
        <header style={{ marginBottom: '64px' }}>
          <a
            href="/"
            style={{
              display: 'inline-block',
              marginBottom: '48px',
              color: '#555555',
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
            Política de Privacidade
          </h1>
          <p style={{ color: '#555555', fontSize: '12px', fontWeight: 200, letterSpacing: '0.06em' }}>
            Última atualização: junho de 2026
          </p>
        </header>

        {/* Sections */}
        <Section title="1. Quem somos">
          <p>
            O site <strong style={{ color: '#E8E8E8', fontWeight: 400 }}>melfiore.com</strong> é operado pela{' '}
            <strong style={{ color: '#E8E8E8', fontWeight: 400 }}>.TBF. inc</strong>, inscrita no CNPJ
            61.360.565/0001-74, com sede na Rua Pamplona, 145, Jardim Paulista, São Paulo – SP, 01405-100.
          </p>
          <p style={{ marginTop: '12px' }}>
            Para questões relacionadas a dados pessoais, entre em contato pelo e-mail{' '}
            <a href="mailto:privacidade@thebrfactory.com" style={{ color: '#7A4848' }}>
              privacidade@thebrfactory.com
            </a>
            .
          </p>
        </Section>

        <Section title="2. Dados que coletamos">
          <p><strong style={{ color: '#E8E8E8', fontWeight: 400 }}>Lista de espera</strong></p>
          <p>
            Ao se cadastrar na lista de espera do MELFIORE, coletamos seu nome e endereço de e-mail.
            Esses dados são usados exclusivamente para enviar comunicações sobre o lançamento.
          </p>
          <p style={{ marginTop: '16px' }}><strong style={{ color: '#E8E8E8', fontWeight: 400 }}>Fiorettes — o diário</strong></p>
          <p>
            Ao enviar uma página ao Fiorettes, coletamos o texto da submissão, uma assinatura (que pode ser
            anônima) e, opcionalmente, a cidade. Nenhum dado de identificação obrigatório é coletado nesse
            formulário.
          </p>
          <p style={{ marginTop: '16px' }}><strong style={{ color: '#E8E8E8', fontWeight: 400 }}>Dados de navegação</strong></p>
          <p>
            Utilizamos o Google Analytics e o Vercel Analytics para coleta de dados agregados de acesso
            (páginas visitadas, localização aproximada, tipo de dispositivo). Esses dados são anonimizados
            e não permitem identificação individual.
          </p>
        </Section>

        <Section title="3. Como usamos seus dados">
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              'Enviar e-mails de comunicação sobre o lançamento do MELFIORE',
              'Selecionar e publicar páginas submetidas ao Fiorettes (com sua autorização implícita no envio)',
              'Melhorar a experiência do site com base em dados agregados de navegação',
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: '#7A4848', flexShrink: 0 }}>—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: '16px' }}>
            Não vendemos, alugamos nem compartilhamos seus dados com terceiros para fins comerciais.
          </p>
        </Section>

        <Section title="4. Armazenamento e terceiros">
          <p>
            Os dados da lista de espera são armazenados na plataforma{' '}
            <strong style={{ color: '#E8E8E8', fontWeight: 400 }}>Brevo</strong> (Sendinblue S.A.S.),
            sediada na França, que opera em conformidade com o RGPD europeu. As comunicações
            transacionais são enviadas por meio dessa mesma plataforma.
          </p>
          <p style={{ marginTop: '12px' }}>
            A hospedagem do site é realizada pela{' '}
            <strong style={{ color: '#E8E8E8', fontWeight: 400 }}>Vercel Inc.</strong>, localizada nos
            Estados Unidos, com servidores distribuídos globalmente.
          </p>
        </Section>

        <Section title="5. Seus direitos (LGPD)">
          <p>
            Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
          </p>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              'Confirmar a existência de tratamento dos seus dados',
              'Acessar os dados que temos sobre você',
              'Corrigir dados incompletos, inexatos ou desatualizados',
              'Solicitar a exclusão dos seus dados',
              'Revogar o consentimento a qualquer momento',
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: '#7A4848', flexShrink: 0 }}>—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: '16px' }}>
            Para exercer qualquer um desses direitos, entre em contato pelo e-mail{' '}
            <a href="mailto:privacidade@thebrfactory.com" style={{ color: '#7A4848' }}>
              privacidade@thebrfactory.com
            </a>
            . Respondemos em até 15 dias úteis.
          </p>
        </Section>

        <Section title="6. Retenção de dados">
          <p>
            Os dados da lista de espera são mantidos enquanto o serviço estiver ativo ou até que você
            solicite a exclusão. Páginas submetidas ao Fiorettes e publicadas no diário são mantidas
            indefinidamente como parte do arquivo, salvo solicitação de remoção pelo autor.
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>
            Utilizamos apenas cookies técnicos necessários para o funcionamento do site e cookies de
            analytics de terceiros (Google Analytics, Vercel Analytics). Não utilizamos cookies de
            rastreamento publicitário.
          </p>
        </Section>

        <Section title="8. Alterações nesta política">
          <p>
            Podemos atualizar esta política periodicamente. A data da última atualização é sempre
            indicada no topo da página. O uso continuado do site após alterações implica aceitação da
            versão vigente.
          </p>
        </Section>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '32px',
          marginTop: '16px',
          textAlign: 'center',
        }}>
          <p style={{ color: '#444444', fontSize: '11px', fontWeight: 200, letterSpacing: '0.06em', lineHeight: 1.7 }}>
            MELFIORE © 2026 .TBF. inc. Todos os direitos reservados.<br />
            .THE FIORE DAILY. intimacy wellness club .TBF.ORIGINAL LABEL
          </p>
        </footer>

      </main>
    </div>
  )
}
