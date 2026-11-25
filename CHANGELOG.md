# CHANGELOG: MELFIORE Landing Page

Formato: `[versão] · data · descrição`
Branch de referência: `main` = produção · `develop` = trabalho em andamento

---

## 25/11/2026: rolagem das paginas de texto e paginas legais (nada publicado)

- Bug: `/privacidade` nao rolava (print do fundador, 25/11). Causa: `app/globals.css` fixava `html, body { height: 100%; overflow: hidden }` para a home, e valia para toda rota. Correcao: sem `overflow` e sem `height: 100%` na raiz; `body` com `min-height: 100dvh` (em `globals.css`, e `min-h-screen` saiu do `layout.tsx`). A home (`100dvh` e `overflow: hidden` proprios) e a `/fiorettes` (rolagem propria) seguem sem rolar a pagina.
- `components/PaginaLegal.tsx` (novo): casca das paginas legais (Section, Lista, rodape com os tres links). `app/privacidade/page.tsx` passa a usar.
- `/termos` e `/exclusao-de-dados` (novas, caminhos fixos para o formulario do app da Meta). `sitemap.ts` lista as duas.
- `/privacidade`: secao 4 atendimento por WhatsApp, cookies na frase do fundador de 24/11, links para as duas paginas novas, data 25 de novembro de 2026. Rascunho para o advogado (L1).
- `app/page.tsx`: tres links no rodape da home (lg: canto direito, sem aumentar a altura; abaixo de lg: linha propria). `COPY.md` 1.11.
- Teste de rolagem (roda, End, toque): `/privacidade` 390 e 1440 rolam depois, nao rolavam antes. Home e `/fiorettes` seguem em 844 e 900.

---

## 18/11/2026: campos com 16px (nada publicado)

- `app/globals.css` (`.tarja-input`) e `components/FiorettesForm.tsx` (3 inputs da barra inferior): `font-size` 16px. Abaixo disso o Safari do iPhone e o navegador do Instagram dao zoom ao tocar no campo. So o tamanho da fonte mudou.

---

## 18/11/2026: aceite enxuto e celular com espacos (nada publicado)

- `lib/aceite-waitlist.ts`: versao `waitlist-2026-11-18`, sem compra e sem cpf.
- `lib/celular-br.ts`: `+55 11 98765 4321`, so espacos, que entram conforme digita. Validacao e E.164 do servidor intactos.
- `components/WaitlistForm.tsx`: placeholder fixo, sem molde no foco. Testes e `COPY.md` atualizados.

---

## 16/11/2026: tokens do design system no site (nada publicado)

- `app/tokens.melfiore.css` (novo): copia de `DESIGN-SYSTEM/dist/lp-tfd` (feat/decisoes-16-11, 5d42ed0) sem os `@font-face`; a fonte segue self-hosted no `layout.tsx`. Entra por `import` no `layout.tsx`. O consumidor `lp-tfd` do sync segue `enabled:false`.
- Vermelho blood `#8B1A1A` (hover `#741515`, busy `#5E1212`), blood-ui `#C82F2F` (titulo, foco, contorno), blood-lt `#D95C5C` (letra pequena), gold, raios 8/12/16, flat, `--mf-text-tier-*`, `--mf-text-footer`, `--mf-border-soft`, `--mf-bg-hover`. `tailwind.config.ts`, `app/globals.css`, `WaitlistForm`, `FiorettesForm`, `app/page.tsx`, `app/fiorettes/page.tsx`, e-mail de `app/api/fiorettes/route.ts` apontam para os tokens.
- `components/TarjaSvg.tsx`: tarja em 3 fatias (`#mf-tarja-d` definido uma vez em `layout.tsx` por `TarjaDefs`). Ponta nao distorce.
- Contraste: `#7A4848` vira `--mf-color-mauve-lt`, `#555555` e `#444444` viram `--mf-text-subtle`, vermelho pequeno vira blood-lt, rodape 10px a 50% vira 12px a 85%, aceite 11px vira 12px.
- Decisao visual: acima de 640px e ate 980px de altura a tarja desce de 90 para 72px (`globals.css`), porque a home nao rola e o rodape de 12px nao cabia em 1440x900. Fora disso vale 90px.
- `app/privacidade/page.tsx`: sem travessao; hospedagem cita Cloudflare, Inc. (o site roda no Worker, `wrangler.jsonc`). `/fiorettes`: titulo e placeholder sem travessao. `COPY.md` 1.10.
- Capturas: `_DOCS/SITE-OFICIAL/MEDUSA-VPS/pesquisa/2026-11-16-lp-tokens-screens/`.

## 16/11/2026: aceite cobre celular e dados da compra; fim da afirmacao de criptografia (nada publicado)

- `lib/aceite-waitlist.ts`: texto novo (versao `waitlist-2026-11-16`): cobre e-mail e celular informados e diz que CPF e endereco do pedido ficam no cadastro da loja, so para entrega, nota e atendimento, nunca vendidos nem usados em anuncio.
- `components/WaitlistForm.tsx`: microcopy "seus dados sao criptografados e protegidos" vira "seus dados ficam protegidos" (a coluna do CPF nao e cifrada).
- `app/privacidade/page.tsx`: celular, CPF e endereco com finalidade (secoes 2 e 3). Travessoes e a linha da Vercel (secao 4) ja existiam e ficaram.
- `tests/aceite-texto.test.ts` (novo), `tests/captura-fila.test.ts` (versao vem da constante). `COPY.md` 1.7b, 1.9, 1.9b atualizado.

## 16/11/2026: CRM central de dados, celular na landing (nada publicado)

- `app/api/loja/compra/route.ts` (sem mudanca) agora leva ao CRM tudo que o pedido ja tiver: CPF, endereco de entrega e cobranca, forma de pagamento, celular. Nenhum campo e pedido ao cliente so para o CRM; ausente fica vazio, sem erro; CPF invalido vira aviso. Cartao, senha, CNPJ e RG seguem recusados (422). Vem do pacote sincronizado (`lib/crm/compras.ts`, novo `lib/crm/dadosPessoais.ts`); `scripts/sincronizar-crm.mjs` copia o arquivo novo e aceita `MELFIORE_SITE_DIR` (worktree).
- `components/WaitlistForm.tsx`: campo WhatsApp opcional (mobile-first, mesma tarja), pre-checagem em `lib/celular-br.ts` (sem import de Node). `app/api/waitlist/route.ts`: celular preenchido e invalido volta 400; valido vira E.164 e entra pela mesma captura do e-mail (`capturarWaitlistNoCrm`, fila KV inclusa). Nunca vai ao Brevo, sem consentimento de WhatsApp, sem envio novo.
- Testes: `tests/waitlist-celular.test.ts` (novo), `tests/rota-compras.test.ts` (CPF e endereco entram, sem CPF nao quebra, nada para Brevo), `tests/captura-fila.test.ts`.
- Depende da migration 020 do MELFIORE-SITE (so arquivo, nao aplicada). `COMPRAS_ENTRADA` e `CRM_ENVIO` continuam como estavam.

## 16/11/2026: S25, rota de entrada de compras assinada, desligada (nada publicado)

- `lib/crm/`: sincronizado com `MELFIORE-SITE/packages/crm` (assinatura HMAC, validacao de compras, `receberCompra`, tipos de evento de compra, `postarRpc`). `scripts/sincronizar-crm.mjs` copia os 4 arquivos novos e ajusta um cast de tipo no `verify` (tsc do LP-TFD).
- `app/api/loja/compra/route.ts` (novo) e `lib/trava-compras.ts` (novo): fecha por padrao, so abre com `COMPRAS_ENTRADA=ligado` (fora do `wrangler.jsonc`, nao ligada). Recusa CPF, endereco e cartao (422). Nunca envia e-mail.
- Segredos vem de `COMPRAS_ASSINATURA_SEGREDO`, `COMPRAS_ASSINATURA_SEGREDO_ANTERIOR`, `SUPABASE_COMPRAS_JWT`: nada configurado.
- `tests/rota-compras.test.ts` (novo, 8 testes, Supabase mockado).

## 16/11/2026: camada 7, ciber em codigo: S11, S26, S27, S34 provas (nada publicado)

- S11: `lib/antirrobo.ts` (novo) e `components/Antirrobo.tsx` (novo). Limite por IP via binding de rate limit da Cloudflare (`wrangler.jsonc`, `ratelimits`, LIMITE_WAITLIST 5/min e LIMITE_FIORETTES 3/min), memoria da instancia como reserva; campo isca escondido (rota finge sucesso e nao grava); Turnstile dormente ate `TURNSTILE_SECRET_KEY` (servidor) e `NEXT_PUBLIC_TURNSTILE_SITEKEY` (build). CSP Report-Only ganha `challenges.cloudflare.com`. Sem texto novo na tela.
- S27: `delete-ghost-contact.mjs` sai da raiz (ignorado pelo git) e vira `scripts/delete-ghost-contact.mjs` versionado: ensaio por padrao, `--confirmo` para apagar (e digitar o numero no terminal), poupa contato com WhatsApp, SMS ou telefone. `.gitignore` perde a linha dele.
- S26: `.github/workflows/ci.yml` (testes, `npm audit --omit=dev --audit-level=critical`, build, cabecalhos) e `scripts/checar-cabecalhos.mjs`. Nao ativa nada no GitHub; deploy segue so pelo `/deploy`.
- S34: `tests/analytics.test.ts` prova o que o commit 0463497 fez. `app/privacidade/page.tsx:140` ainda cita a Vercel como hospedagem: conferir com o fundador (o site roda na Cloudflare).
- Testes: `tests/antirrobo.test.ts`, `delete-ghost-contact.test.ts`, `ci.test.ts`, `analytics.test.ts`.

## 14/11/2026: numero da fiorette nunca repete (nada publicado)

- `lib/fiorette-id.ts` (novo): `reservarId` sorteia, confere no KV (`CAPTURA_FILA`, prefixo `fiorette-id:`, sem expiracao) e sorteia de novo. Cheio o espaco de 4 digitos (ou 25 tentativas), sobe para 5, ate 8. Evita os 7 numeros do arquivo publico. Sem KV (dev) sorteia como antes.
- `app/api/fiorettes/route.ts`: sai `randomId()` (Math.random sem checagem, ~39% de colisao com 100 inscritas); entra `reservarId`.
- Limite: KV nao e atomico, so uma corrida no mesmo milissegundo escapa. Garantia total pede sequencia no Supabase. O numero so existia no e-mail de aviso e na resposta; nao ha tabela.
- `tests/fiorette-id.test.ts` (novo, 4 testes; sem a checagem, o teste do sorteio viciado falha).

## 14/11/2026: Vercel Analytics e Speed Insights fora, GA4 atras de chave desligada (nada publicado)

- `app/layout.tsx`: sai `<Analytics />` e `<SpeedInsights />`; GA4 so carrega com `GA4_ATIVO`. `lib/ga4.ts` (novo): `NEXT_PUBLIC_GA4=ligado` no build liga; padrao desligado. Pendencia no advogado: `_DOCS/SITE-OFICIAL/MEDUSA-VPS/LISTA-ADVOGADO.md`.
- `package.json` e lockfile: removidos `@vercel/analytics` e `@vercel/speed-insights`.
- `lib/seguranca.ts`: CSP Report-Only sem hosts da Vercel.
- `app/privacidade/page.tsx`: secoes 2 e 7 dizem que nao ha analytics nem cookie de analise.

## 12/11/2026: S22 e S23, cabecalhos de seguranca e entrada das rotas de captura (nada publicado)

- `next.config.ts`: `poweredByHeader: false`, CSP em Report-Only (frame-ancestors none, GTM e Vercel liberados) e Permissions-Policy. `lib/seguranca.ts` (novo) guarda as constantes, `escaparHtml`, `lerCorpoJson`, tetos.
- `custom-worker.ts`: http vira 301 para https; toda resposta leva `Strict-Transport-Security: max-age=15552000` (sem includeSubDomains, sem preload) e sai sem `x-powered-by`.
- `wrangler.jsonc`: `workers_dev` false. `public/.well-known/security.txt` novo.
- `app/api/saude/route.ts`: devolve so `{status:'ok'}`.
- `app/api/fiorettes/route.ts`, `app/api/waitlist/route.ts`: campos escapados no e-mail de aviso, tetos (nome 100, e-mail 254, titulo 120, assinatura 80, cidade 80, corpo 10 kB), JSON invalido ou tipo errado devolve 400.
- `tests/seguranca.test.ts` (novo, 14 testes); `tests/producao.test.ts` ajustado ao saude novo.

## 07/11/2026: inscricao nunca confirma sem gravar, log sem dado pessoal, GET /api/saude (nada em producao)

- `app/api/waitlist/route.ts`, `app/api/fiorettes/route.ts`: em producao, `BREVO_API_KEY` ausente devolve 500 (log so com o nome da variavel). Antes devolvia 200 e o lead sumia no `console.log`. Fora de producao o modo dev segue. `/fiorettes` separa chave ausente (500) de trava de e-mail desligada (200 sem aviso, como antes). Saem do log: nome, e-mail, assinatura, titulo, historia, cidade; fica so o id.
- `lib/ambiente.ts` (novo): `foraDeProducao()` e verdadeiro so com `NODE_ENV` development ou test. O `next build` e o define do OpenNext fixam `production` no Worker; ausente ou estranho fecha em producao.
- `app/api/saude/route.ts` (novo): GET com booleanos `brevo`, `email_envio`, `crm_envio`, `supabase`. Sem valor, sem rede.
- `app/api/fiorettes/route.ts`: travessoes do e-mail interno de aviso trocados por dois-pontos.
- `tests/producao.test.ts`: 9 testes. Formularios ja mostram `data.message` em qualquer `success: false`, sem mudanca de UI.

## 06/11/2026: /fiorettes na captura, IP da Cloudflare, fila criada (nada em producao)

- `app/api/fiorettes/route.ts`: com `CRM_ENVIO=ligado` e e-mail no corpo, grava no Supabase com origem `fiorettes` antes do Brevo; sem e-mail ou flag desligada, nada muda. O formulario ainda nao pede e-mail (sem mexer em UI).
- Rate limit das duas rotas usa `cf-connecting-ip` (`ipDoCliente`); sem o header, cai no `x-forwarded-for`.
- `lib/crm-captura.ts`, `lib/fila-captura.ts`: origem vira parametro; item da fila leva `origem`.
- `wrangler.jsonc`: KV `CAPTURA_FILA` criado (`eaa8592a78454236b8cd4cd582678aa9`). Cron e `CRM_ENVIO` seguem fora.
- Ensaio de queda real no staging: `docs/ensaio-fila-captura-2026-11-06.md`. `CLAUDE.md` corrigido (trava de e-mail ligada, `_BIBLE`).

## 05/11/2026 (noite): captura com papel restrito, forma do aceite e fila agendada (Fase 2A, nada em producao)

- `lib/crm-captura.ts`: uma chamada so, `crm.capturar` (o banco decide gemeo e captura repetida). `apikey` leva a chave publishable (`SUPABASE_PUBLISHABLE_KEY`) e o JWT `captura_web` vai em `Authorization: Bearer`: o gateway recusa JWT customizado no `apikey` (401, testado no staging). Resolve o bloqueio da entrada anterior.
- Aceite: o pacote recebe `forma: aviso_e_clique` no lugar de `marcado`. `lib/crm/` ressincronizada.
- `.env.example`: `SUPABASE_PUBLISHABLE_KEY` entra. `CRM_ENVIO` segue desligada.
- Fila agendada: `custom-worker.ts` (novo `main` do `wrangler.jsonc`) embrulha o handler do OpenNext e acrescenta `scheduled`, que chama `lib/fila-agendada.ts` e esvazia a fila (ate 25 itens por rodada) sem depender de nova inscricao. Trigger `cron` (`*/5 * * * *`) COMENTADO em `wrangler.jsonc`, junto com o KV: ligar os dois e `CRM_ENVIO` so a pedido do fundador. Sem flag, sem KV ou sem chave o cron registra e sai. `wrangler deploy --dry-run` empacota (default com `fetch` e `scheduled`, DOs exportados); nada foi publicado. `tests/fila-agendada.test.ts`: 9 testes.


## 05/11/2026: aceite verdadeiro, chave restrita e fila de reenvio (auditoria P1, P2, P3)

- `lib/aceite-waitlist.ts`: registro `{forma: aviso_e_clique, versao, texto, aceito_em}`. Sem campo `marcado`. Versao nao enviada pelo navegador (pagina antiga) = sem consentimento registrado. Linha de aceite e layout do form intactos; o form so passa a enviar `aceite_versao`.
- `lib/crm-captura.ts`: usa `SUPABASE_CAPTURA_JWT` (role `captura_web`), nunca `service_role`. Segue atras de `CRM_ENVIO` (desligada).
- `lib/fila-captura.ts`: fila em KV (binding `CAPTURA_FILA`), reenvio pela mesma chave de idempotencia, 30 dias de TTL. Binding ausente: site igual a hoje, log `crm.perdido_sem_fila` sem e-mail. Esvazia a fila (3 itens) a cada inscricao que o Supabase aceita.
- `tests/captura-fila.test.ts` (vitest, `npm test`): 18 testes. `vitest` entra como devDependency.
- BLOQUEIO ao ligar: `captura_web` so executa `crm.gravar_captura`; o pacote le contatos, capturas e consentimentos pela Data API antes da RPC. Com o papel restrito essas leituras dao 403 e tudo vai para a fila. Falta mover a leitura do gemeo para dentro da RPC (patch em MELFIORE-SITE).
- Decisao do fundador (05/11): os 100 contatos antigos entram marcados como waitlist antiga, sem e-mail de reconfirmacao.


## 04/11/2026: aceite visivel e versionado na waitlist

- `lib/aceite-waitlist.ts`: texto e versao (`waitlist-2026-11-04`) em fonte unica. O form exibe, `lib/crm-captura.ts` grava o mesmo texto em `crm.consentimentos`.
- `components/WaitlistForm.tsx`: linha de aceite sob o botao, cor #AAAAAA, peso 300, contraste 9:1 sobre o preto.


## 04/11/2026: contato unico na inscricao (2A.3), desligado

- `app/api/waitlist/route.ts`: com `CRM_ENVIO=ligado`, grava no Supabase (schema crm, uma transacao: contato, captura, consentimento, eventos) ANTES do Brevo. Sem a flag, o comportamento e identico ao anterior. Falha do Supabase vai ao log (`crm.pendente`) e o Brevo segue.
- `lib/crm/` e copia vendorizada de `MELFIORE-SITE/packages/crm` (`node scripts/sincronizar-crm.mjs`). `lib/crm-captura.ts` e a ponte da route. Dependencia nova: `libphonenumber-js`.
- Variaveis para ligar (nenhuma esta em producao): `CRM_ENVIO`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, opcional `CRM_IP_SALT`.
- `/api/fiorettes` nao captura contato (so a pagina anonima): nada a ligar la.

## 03/11/2026: melfiore.com na Cloudflare

- Build para Cloudflare Workers via OpenNext (`wrangler.jsonc`, `open-next.config.ts`, scripts `cf:*`).
- melfiore.com e www servidos pelo Worker `melfiore` desde ~15h45. Registros da Vercel anotados em `_SHARED/INFRA/dns/melfiore.com.zone` para volta atrás.
- Trava de e-mail: `lib/trava-email.ts` + `scripts/trava-email.mjs` no `prebuild`. Boas-vindas da lista e aviso das Fiorettes desligados até pedido do fundador.
- Endereço de teste: https://melfiore.melfiore-waitlist.workers.dev

## [1.1.0] · 2026-05-31

### Alterado
- Copy: "pessoas" → "fãs" na headline de social proof (mobile + desktop)
- Removido subheadline "obtenha acesso antecipado & atualizações exclusivas" do desktop
- Estrutura de pastas: `site/` agora é symlink para o repositório git (`LP | TFD`)
- Branch `develop` criada como branch padrão de trabalho

### Adicionado
- `CLAUDE.md` na raiz do working directory, regras operacionais para sessões Claude Code
- `CHANGELOG.md` no repositório: rastreamento de mudanças por versão
- `CHECKLIST_DEPLOY.md`: gate de qualidade pré-deploy
- `RETROSPECTIVA.md`: histórico completo do processo de construção

---

## [1.0.1] · 2026-05-30

### Corrigido
- Mobile layout: hierarquia de conteúdo e espaçamento (commit `dab9857`)
- Footer invisível em mobile (commit `e216d23`)
- Título pequeno demais em mobile (commit `e216d23`)

### Adicionado
- Integração Google Analytics 4 (commit `246cc68`)
- Configuração Vercel otimizada (commit `246cc68`)

### Ajustado
- Performance settings: redução de bundle (commit `7afac5a`)
- Remoção de arquivos não utilizados: `opengraph-image.tsx`, `privacidade/page.tsx` (commit `83e3d5c`)

---

## [1.0.0] · 2026-05-30

### Lançado
- Estrutura completa da landing page (Next.js 15, Tailwind CSS, Brother 1816)
- Formulário de waitlist com validação inline
- Integração Brevo para e-mail de boas-vindas (API route)
- Logo SVG com yellow glow embutido, viewBox `8674 8228 250 72`
- Red glow na headline via text-shadow
- Gradiente radial vermelho no background
- Página de privacidade
- SEO: metadados, sitemap, robots.txt, manifest
- Deploy na Vercel · domínio: melfiore.com

---

---

## [1.2.0] · 2026-05-31

### Confirmado em produção
- E-mail de boas-vindas ativo e chegando na caixa de entrada
- Remetente `diario@melfiore.com` verificado (SPF/DKIM/DMARC)
- Integração Brevo 100% funcional

---

## [1.2.1] · 2026-06-04

### Corrigido
- Bug: campo `NOME` não era salvo na Brevo, `attributes` usava `FIRSTNAME` (campo inexistente na conta). Corrigido para `NOME`. Commit `10259f0` · branch `main`

### Operacional
- Contato fantasma (ID 2, "Welcome Bot", sem e-mail) deletado via MCP Brevo
- MCP Brevo configurado em `~/.claude.json`: Claude acessa a Brevo diretamente sem scripts

### Status
- 8 contatos reais na lista, todos com e-mail de confirmação entregue
- Campo NOME em branco nos cadastros anteriores ao fix (esperado, não retroativo)

**Produto estável em produção.**

---

## [1.2.2] · 2026-06-06

### Operacional
- Repo tornado **público** no GitHub: resolve bloqueio de deploy no Vercel Hobby (plano gratuito não suporta colaboração em repos privados)
- Co-Authored-By removido dos commits: Vercel parseia co-autores e bloqueia quando não encontra conta GitHub
- Fix NOME (`10259f0`) confirmado em produção, campo NOME salva corretamente na Brevo ✅

**Fase 1 encerrada. Site 100% funcional.**
