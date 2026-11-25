import type { Metadata } from 'next'
import { PaginaLegal, Section, Forte, Lista, LinkInterno, EmailPrivacidade } from '@/components/PaginaLegal'

export const metadata: Metadata = {
  title: 'Política de Privacidade | MELFIORE',
  description: 'Como coletamos, usamos e protegemos seus dados pessoais.',
  robots: { index: false },
}

export default function PrivacidadePage() {
  return (
    <PaginaLegal titulo="Política de Privacidade" atualizacao="25 de novembro de 2026">
      <Section title="1. Quem somos">
        <p>
          O site <Forte>melfiore.com</Forte> é operado pela <Forte>.TBF. inc</Forte>, inscrita no CNPJ
          61.360.565/0001-74, com sede na Rua Pamplona, 145, Jardim Paulista, São Paulo, SP, 01405-100.
        </p>
        <p style={{ marginTop: '12px' }}>
          Para questões relacionadas a dados pessoais, entre em contato pelo e-mail <EmailPrivacidade />.
        </p>
      </Section>

      <Section title="2. Dados que coletamos">
        <p><Forte>Lista de espera</Forte></p>
        <p>
          Ao se cadastrar na lista de espera do MELFIORE, coletamos seu nome e endereço de e-mail e, se você informar, seu celular (WhatsApp).
          Esses dados são usados para enviar comunicações sobre o lançamento e para identificar seu cadastro.
        </p>
        <p style={{ marginTop: '16px' }}><Forte>Compra na loja</Forte></p>
        <p>
          Quando houver compra, guardamos no seu cadastro da loja o CPF e o endereço do pedido. Usamos
          esses dados apenas para entrega, emissão de nota e atendimento. Não são vendidos nem usados
          para anúncio.
        </p>
        <p style={{ marginTop: '16px' }}><Forte>Atendimento por WhatsApp</Forte></p>
        <p>
          Se você conversar conosco pelo WhatsApp, tratamos os dados descritos na seção 4.
        </p>
        <p style={{ marginTop: '16px' }}><Forte>Fiorettes: o diário</Forte></p>
        <p>
          Ao enviar uma página ao Fiorettes, coletamos o texto da submissão, uma assinatura (que pode ser
          anônima) e, opcionalmente, a cidade. Nenhum dado de identificação obrigatório é coletado nesse
          formulário.
        </p>
        <p style={{ marginTop: '16px' }}><Forte>Dados de navegação</Forte></p>
        <p>
          Este site não usa ferramentas de análise de acesso nem de terceiros para medir a navegação.
          Se isso mudar, esta política será atualizada antes e o aviso de cookies será exibido.
        </p>
      </Section>

      <Section title="3. Como usamos seus dados">
        <Lista
          itens={[
            'Enviar e-mails de comunicação sobre o lançamento do MELFIORE',
            'Entregar pedidos, emitir nota e prestar atendimento (CPF, endereço e celular, quando houver compra)',
            'Responder suas mensagens no WhatsApp',
            'Selecionar e publicar páginas submetidas ao Fiorettes (com sua autorização implícita no envio)',
            'Melhorar a experiência do site com base em dados agregados de navegação',
          ]}
        />
        <p style={{ marginTop: '16px' }}>
          Não vendemos, alugamos nem compartilhamos seus dados com terceiros para fins comerciais.
        </p>
      </Section>

      <Section title="4. Atendimento por WhatsApp">
        <p>
          Quando você escreve para o número de WhatsApp da MELFIORE, tratamos o seu número de telefone,
          o nome do seu perfil e o conteúdo das mensagens que você envia (texto e arquivos), com data e hora.
        </p>
        <p style={{ marginTop: '12px' }}>
          <Forte>Para que usamos:</Forte> somente para atender você: responder dúvidas, acompanhar pedidos
          e resolver problemas. Não usamos essa conversa para anúncio e não a vendemos.
        </p>
        <p style={{ marginTop: '12px' }}>
          <Forte>Quem transmite as mensagens:</Forte> a WhatsApp Business Platform, da Meta Platforms, Inc.,
          que atua como operadora e pode processar os dados fora do Brasil. O uso do WhatsApp também
          segue os termos e a política de privacidade da própria Meta.
        </p>
        <p style={{ marginTop: '12px' }}>
          <Forte>Por quanto tempo guardamos:</Forte> enquanto durar o atendimento e pelo prazo necessário
          para comprovar o que foi tratado e cumprir obrigação legal. Depois, apagamos ou anonimizamos.
        </p>
        <p style={{ marginTop: '12px' }}>
          <Forte>Exclusão:</Forte> você pode pedir a exclusão da conversa a qualquer momento, como explicado em{' '}
          <LinkInterno href="/exclusao-de-dados">melfiore.com/exclusao-de-dados</LinkInterno>.
        </p>
      </Section>

      <Section title="5. Armazenamento e terceiros">
        <p>
          Os dados da lista de espera são armazenados na plataforma <Forte>Brevo</Forte> (Sendinblue S.A.S.),
          sediada na França, que opera em conformidade com o RGPD europeu. As comunicações
          transacionais são enviadas por meio dessa mesma plataforma.
        </p>
        <p style={{ marginTop: '12px' }}>
          A hospedagem do site é realizada pela <Forte>Cloudflare, Inc.</Forte>, localizada nos
          Estados Unidos, com servidores distribuídos globalmente.
        </p>
        <p style={{ marginTop: '12px' }}>
          As mensagens de WhatsApp passam pela <Forte>Meta Platforms, Inc.</Forte>, como descrito na seção 4.
        </p>
      </Section>

      <Section title="6. Seus direitos (LGPD)">
        <p>
          Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
        </p>
        <Lista
          itens={[
            'Confirmar a existência de tratamento dos seus dados',
            'Acessar os dados que temos sobre você',
            'Corrigir dados incompletos, inexatos ou desatualizados',
            'Solicitar a exclusão dos seus dados',
            'Revogar o consentimento a qualquer momento',
          ]}
        />
        <p style={{ marginTop: '16px' }}>
          Para exercer qualquer um desses direitos, entre em contato pelo e-mail <EmailPrivacidade />.
          Respondemos em até 15 dias úteis. O passo a passo do pedido de exclusão está em{' '}
          <LinkInterno href="/exclusao-de-dados">melfiore.com/exclusao-de-dados</LinkInterno>.
        </p>
      </Section>

      <Section title="7. Retenção de dados">
        <p>
          Os dados da lista de espera são mantidos enquanto o serviço estiver ativo ou até que você
          solicite a exclusão. As conversas de WhatsApp seguem o prazo da seção 4. Páginas submetidas
          ao Fiorettes e publicadas no diário são mantidas indefinidamente como parte do arquivo, salvo
          solicitação de remoção pelo autor.
        </p>
      </Section>

      <Section title="8. Cookies">
        <p>
          Ao navegar por este site você aceita o uso de cookies para agilizar a sua experiência de compra.
        </p>
        <p style={{ marginTop: '12px' }}>
          Hoje usamos apenas cookies técnicos, necessários para o funcionamento do site. Não utilizamos
          cookies de análise nem de rastreamento publicitário. Se isso mudar, esta política será
          atualizada antes.
        </p>
      </Section>

      <Section title="9. Termos de Serviço">
        <p>
          O uso do site e do atendimento segue os nossos{' '}
          <LinkInterno href="/termos">Termos de Serviço</LinkInterno>.
        </p>
      </Section>

      <Section title="10. Alterações nesta política">
        <p>
          Podemos atualizar esta política periodicamente. A data da última atualização é sempre
          indicada no topo da página. O uso continuado do site após alterações implica aceitação da
          versão vigente.
        </p>
      </Section>
    </PaginaLegal>
  )
}
