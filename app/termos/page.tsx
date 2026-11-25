import type { Metadata } from 'next'
import { PaginaLegal, Section, Forte, Lista, LinkInterno, EmailPrivacidade } from '@/components/PaginaLegal'

export const metadata: Metadata = {
  title: 'Termos de Serviço | MELFIORE',
  description: 'As regras de uso do site melfiore.com e do atendimento da MELFIORE.',
  robots: { index: false },
}

export default function TermosPage() {
  return (
    <PaginaLegal titulo="Termos de Serviço" atualizacao="25 de novembro de 2026">
      <Section title="1. Quem somos e o que estes termos cobrem">
        <p>
          Estes termos valem para o uso do site <Forte>melfiore.com</Forte> e do atendimento da MELFIORE
          por e-mail e WhatsApp. O site é operado pela <Forte>.TBF. inc</Forte>, inscrita no CNPJ
          61.360.565/0001-74, com sede na Rua Pamplona, 145, Jardim Paulista, São Paulo, SP.
        </p>
        <p style={{ marginTop: '12px' }}>
          Ao usar o site ou falar conosco, você concorda com estes termos e com a nossa{' '}
          <LinkInterno href="/privacidade">Política de Privacidade</LinkInterno>.
        </p>
      </Section>

      <Section title="2. Quem pode usar">
        <p>
          O site e o atendimento são para maiores de 18 anos. Se você tem menos de 18 anos, não use o
          site nem escreva para o nosso WhatsApp.
        </p>
      </Section>

      <Section title="3. O que oferecemos hoje">
        <p>
          O site apresenta a MELFIORE, recebe cadastros na lista de espera e publica o Fiorettes, o
          diário aberto a páginas enviadas por quem lê. O atendimento por WhatsApp responde dúvidas
          sobre a marca e, quando a loja abrir, sobre pedidos.
        </p>
      </Section>

      <Section title="4. Suas responsabilidades">
        <Lista
          itens={[
            'Informar dados verdadeiros e que sejam seus',
            'Não usar o site ou o atendimento para fraude, assédio, spam ou qualquer ato ilegal',
            'Não tentar acessar áreas restritas, derrubar o site ou copiar o conteúdo de forma automática',
            'Não enviar ao Fiorettes texto que pertença a outra pessoa ou que exponha dados de terceiros',
          ]}
        />
      </Section>

      <Section title="5. Fiorettes: páginas enviadas">
        <p>
          O texto que você envia continua sendo seu. Ao enviar, você nos autoriza a selecionar, editar
          o mínimo necessário e publicar a página no diário, com a assinatura que você escolheu. Você
          pode pedir a remoção a qualquer momento, pelo e-mail <EmailPrivacidade />. Não somos obrigados
          a publicar todas as páginas recebidas.
        </p>
      </Section>

      <Section title="6. Atendimento por WhatsApp">
        <p>
          Respondemos nas mensagens recebidas, sem prazo garantido fora do que for informado na própria
          conversa. O atendimento pode ser feito por pessoa ou por sistema automático. O tratamento dos
          seus dados nessa conversa está descrito na{' '}
          <LinkInterno href="/privacidade">Política de Privacidade</LinkInterno>. O WhatsApp é um serviço
          da Meta e tem termos próprios.
        </p>
      </Section>

      <Section title="7. Marca e conteúdo">
        <p>
          A marca MELFIORE, o logotipo, os textos, as imagens e o design do site pertencem à .TBF. inc.
          Você pode ver e compartilhar o link do site. Copiar, vender ou alterar o conteúdo exige
          autorização por escrito.
        </p>
      </Section>

      <Section title="8. Compras">
        <p>
          A loja ainda não está aberta. Quando abrir, as regras de pagamento, entrega, arrependimento e
          garantia serão publicadas em página própria antes da primeira compra, e valem o Código de
          Defesa do Consumidor e a lei do comércio eletrônico.
        </p>
      </Section>

      <Section title="9. Limite de responsabilidade">
        <p>
          O site é oferecido no estado em que está. Fazemos o possível para mantê-lo no ar, mas pode
          haver interrupções. Não respondemos por falhas de serviços de terceiros, como a internet, o
          WhatsApp ou o seu aparelho. Nada aqui retira direitos que a lei garante a você.
        </p>
      </Section>

      <Section title="10. Alterações, lei aplicável e contato">
        <p>
          Podemos atualizar estes termos. A data no topo da página mostra a versão vigente, e o uso
          continuado do site após a mudança vale como aceite dela.
        </p>
        <p style={{ marginTop: '12px' }}>
          Valem as leis do Brasil. Fica eleito o foro da comarca de São Paulo, SP, sem prejuízo do foro
          do consumidor onde a lei o garantir.
        </p>
        <p style={{ marginTop: '12px' }}>
          Dúvidas sobre estes termos: <EmailPrivacidade />.
        </p>
      </Section>
    </PaginaLegal>
  )
}
