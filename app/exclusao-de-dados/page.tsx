import type { Metadata } from 'next'
import { PaginaLegal, Section, Forte, Lista, LinkInterno, EmailPrivacidade } from '@/components/PaginaLegal'

export const metadata: Metadata = {
  title: 'Exclusão de dados | MELFIORE',
  description: 'Como pedir a exclusão dos seus dados pessoais na MELFIORE.',
  robots: { index: false },
}

export default function ExclusaoDeDadosPage() {
  return (
    <PaginaLegal titulo="Exclusão de dados" atualizacao="25 de novembro de 2026">
      <Section title="1. Como pedir">
        <p>
          Você pode pedir a exclusão dos seus dados pessoais a qualquer momento, sem dar motivo e sem custo.
          Escreva para <EmailPrivacidade />. Se preferir, mande a mensagem pelo mesmo WhatsApp em que
          conversou conosco e diga que quer excluir seus dados.
        </p>
      </Section>

      <Section title="2. O que enviar">
        <Lista
          itens={[
            'O e-mail ou o número de WhatsApp usado no cadastro ou na conversa',
            'O seu nome, como você o informou',
            'O que você quer apagar: tudo, só a lista de espera, só a conversa de WhatsApp ou uma página do Fiorettes',
            'Se o pedido for por e-mail, escreva do próprio endereço cadastrado. Isso nos ajuda a confirmar que é você',
          ]}
        />
        <p style={{ marginTop: '12px' }}>
          Não envie cópia de documento nem senhas. Se precisarmos confirmar que é você, pedimos apenas
          uma resposta a partir do contato cadastrado.
        </p>
      </Section>

      <Section title="3. Prazo de resposta">
        <p>
          Confirmamos o recebimento e respondemos em até <Forte>15 dias úteis</Forte>, dizendo o que foi
          apagado e o que precisa ser guardado por lei.
        </p>
      </Section>

      <Section title="4. O que é apagado">
        <Lista
          itens={[
            'O seu cadastro na lista de espera, no Brevo e em nossos registros',
            'As conversas de WhatsApp e os dados do contato (número, nome do perfil e mensagens)',
            'A página enviada ao Fiorettes, quando você pedir a remoção, e a assinatura ligada a ela',
            'Os dados de contato do seu cadastro de compra, no que a lei permitir',
          ]}
        />
        <p style={{ marginTop: '12px' }}>
          Cópias de segurança são sobrescritas em ciclo curto. Nada apagado volta a ser usado.
        </p>
      </Section>

      <Section title="5. O que a lei obriga a guardar">
        <p>
          Alguns dados não podem ser apagados enquanto uma lei mandar guardá-los. É o caso dos dados de
          pedidos e de notas fiscais, mantidos pelo prazo fiscal e contábil, e dos registros de acesso,
          mantidos pelo prazo do Marco Civil da Internet. Esses dados ficam separados, só para cumprir a
          lei, e são apagados quando o prazo termina. Também podemos guardar o mínimo necessário para
          nos defender em uma disputa, conforme a LGPD (art. 16).
        </p>
      </Section>

      <Section title="6. Como você confirma">
        <p>
          Ao concluir, enviamos uma mensagem, pelo canal que você usou, com a data da exclusão e a lista
          do que foi apagado e do que foi mantido, com o motivo. Guarde essa mensagem como comprovante.
          Se algo não estiver certo, responda a ela.
        </p>
      </Section>

      <Section title="7. Dados que estão na Meta">
        <p>
          Se você usa o WhatsApp, a Meta mantém dados próprios da sua conta. A exclusão que fazemos vale
          para o que está conosco. Para apagar dados direto na Meta, use as configurações do seu WhatsApp
          ou os canais da Meta.
        </p>
      </Section>

      <Section title="8. Seus outros direitos">
        <p>
          Você também pode pedir acesso, correção e outras medidas previstas na LGPD. Veja a{' '}
          <LinkInterno href="/privacidade">Política de Privacidade</LinkInterno> e os{' '}
          <LinkInterno href="/termos">Termos de Serviço</LinkInterno>.
        </p>
      </Section>
    </PaginaLegal>
  )
}
