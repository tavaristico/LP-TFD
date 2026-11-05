# CHANGELOG: MELFIORE Landing Page

Formato: `[versão] · data · descrição`
Branch de referência: `main` = produção · `develop` = trabalho em andamento

---

## 05/11/2026 (noite): captura com papel restrito, forma do aceite e fila agendada (Fase 2A, nada em producao)

- `lib/crm-captura.ts`: uma chamada so, `crm.capturar` (o banco decide gemeo e captura repetida). `apikey` leva a chave publishable (`SUPABASE_PUBLISHABLE_KEY`) e o JWT `captura_web` vai em `Authorization: Bearer`: o gateway recusa JWT customizado no `apikey` (401, testado no staging). Resolve o bloqueio da entrada anterior.
- Aceite: o pacote recebe `forma: aviso_e_clique` no lugar de `marcado`. `lib/crm/` ressincronizada.
- `.env.example`: `SUPABASE_PUBLISHABLE_KEY` entra. `CRM_ENVIO` segue desligada.


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
