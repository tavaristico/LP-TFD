# CLAUDE.md: LP-TFD
> melfiore.com (landing) + `/fiorettes` (rota oculta): vertical MELFIORE / THE FIORE DAILY da `.TBF. inc`.
> Este arquivo é autossuficiente: contém o crítico para mexer neste código com segurança.

## Stack e comandos

- Next.js 15 + Tailwind 3 + Brevo (e-mail transacional) · **produção na Cloudflare** (Worker `melfiore`, OpenNext) desde 03/11/2026
- `npm run dev` · antes de commitar: `npm run build` · prévia no motor da Cloudflare: `npm run cf:preview`
- Publicar: **só pela skill `/deploy`** (roda `npm run cf:deploy`). `cf:deploy` avulso é bloqueado pelo `tbf-main-guard`.
- 🔴 **Trava de e-mail** (fundador, 03/11/2026): todo envio passa por `podeEnviarEmail()` em `lib/trava-email.ts` e só sai com `EMAIL_ENVIO=ligado`. Hoje está `ligado` em `wrangler.jsonc` (pedido dele em 03/11/2026 16h46, template Brevo 1). Mudar o estado exige pedido dele. `scripts/trava-email.mjs` reprova o build se um envio escapar.

## Branches e deploy

| Branch | Uso |
|---|---|
| `develop` | Trabalho. Todo desenvolvimento começa e fica aqui. |
| `main` | Produção (fonte da verdade). O `/deploy` sobe `develop:main` e publica na Cloudflare. A Vercel ainda builda `main`, mas não serve mais o domínio (volta atrás até 09/11). |

- **Nunca** merge/push para `main` sem aprovação explícita do usuário
- **NUNCA adicionar `Co-Authored-By` em commits deste repo**: o Vercel Hobby bloqueia o deploy quando o co-autor não tem conta GitHub reconhecida. (espelhada de `_SHARED/INFRA/accounts.md`)
- `.env.local` nunca vai para o repo
- Commits: `fix:` `add:` `update:` `remove:`
- Diagnóstico de deploy: logar na Vercel como `thefioredaily@gmail.com`: o CLI local pode estar autenticado em outra conta

## Regras de copy (todo texto público)

- Tudo em **lowercase**: exceto `MELFIORE` e siglas
- Sem emojis, sem exclamações
- **Nunca revelar o nicho do produto** em texto público
- MELFIORE fala em primeira pessoa: "ela escolheu", nunca "a marca selecionou" (ver `../_BIBLE/`)

## Identidade visual: não alterar sem revisão

- **Mobile-first**: todo componente parte do mobile e escala para desktop. (espelhada da raiz do ecossistema)
- viewBox do logo SVG: `8674 8228 250 72`: não modificar; o glow está embutido no SVG, não no CSS
- Fonte Brother 1816 **self-hosted** (`public/fonts/`, 4 woff2): nunca substituir por CDN
- Headline `#CC2020` · fundo `#000000` com gradiente radial vermelho atmosférico

## Docs sob demanda

> Paths relativos ao ecossistema local. Em clone isolado (CI/web), pedir os arquivos ao usuário.

| Precisa de | Leia |
|---|---|
| Identidade canônica da marca | `../_BIBLE/` |
| Estado, número e decisão da loja MELFIORE | `python3 .claude/scripts/obra.py vale` na raiz do ecossistema |
| Landing page, copy, spec, checklist deploy | `../_DOCS/LP/` |
| Fiorettes, briefing, copy, wireframe | `../_DOCS/FIORETTES/` |
| Contas e acessos | `../../_SHARED/INFRA/accounts.md` |

## Pós-sessão (obrigatório)

- Mudou texto da página → atualizar o `COPY.md` correspondente (`../_DOCS/LP/` ou `../_DOCS/FIORETTES/`) na mesma sessão
- Toda sessão de dev → registrar em `CHANGELOG.md`

## Nunca fazer

- Push direto para `main` · `Co-Authored-By` · commitar `.env.local`
- Revelar o nicho do produto em qualquer texto público
- Alterar o viewBox do logo sem reteste visual
- Editar código deste produto fora deste repo
