# Ensaio da fila de captura: queda real do Supabase, 06/11/2026

> Criado em 06/11/2026 · Revisado em 06/11/2026 · 0 dias em aberto

## O que foi feito

Worker real (`custom-worker.ts` sobre o build OpenNext) rodando em `wrangler dev --local`, KV local, contra o MELFIORE STAGING (ref `hubhpbmerhsdfswsgwnv`). `CRM_ENVIO=ligado` e `EMAIL_ENVIO=desligado` só nesse ambiente, sem `BREVO_API_KEY`: nada tocou Brevo. Produção intocada, sem `--remote`, sem deploy.
Config e `.dev.vars` do ensaio ficaram fora do repo (pasta de rascunho). O JWT `captura_web` foi emitido na hora, validade de 1 hora, sem ser impresso.

## Resultado [FATO, rodado]

| Passo | Observado |
|---|---|
| 1. `SUPABASE_URL` apontando para host morto (`.invalid`), POST `/api/waitlist` com `teste+queda1@melfiore.invalid` | HTTP 200 "cadastro confirmado". Log: `crm.na_fila`, `codigo: rede`. |
| 2. KV local | 1 chave `waitlist:<hash>`: item com nome, e-mail, hash do IP (sem IP puro), aceite `aviso_e_clique`, `tentativas: 0`, `ultimo_codigo: rede`. |
| 3. Staging antes do reprocesso | `crm.contatos`: 0 linhas para o e-mail. |
| 4. URL certa, `GET /__scheduled` (handler `scheduled` do `custom-worker.ts`) | Log: `crm.capturado gravada`, `crm.fila_agendada reenviados:1 restantes:0`. KV vazio. |
| 5. Staging depois | `crm.contatos`: 1; `crm.capturas`: 1; origem `waitlist`. |
| 6. Cron de novo (fila vazia) | `reenviados:0 restantes:0`. Nada novo. |
| 7. Nova inscrição do mesmo e-mail, Supabase vivo | `crm.contatos` continua 1; `crm.capturas` sobe para 2 (nova captura, mesmo contato). Sem duplicar contato. |

## Limites

- O cron real da Cloudflare (`triggers.crons`) não foi exercido: o disparo foi manual pelo `--test-scheduled`. O handler é o mesmo.
- KV local (miniflare), não o namespace `CAPTURA_FILA` remoto (id em `wrangler.jsonc`). Binding, serialização e `list` valem igual; latência e consistência do KV de verdade não foram medidas.
- Contato `teste+queda1@melfiore.invalid` ficou no staging (base inventada). Limpeza só por transação no staging, se for preciso.
- Brevo fora do ensaio por regra. O caminho Supabase antes do Brevo foi provado; o Brevo depois dele segue como estava.
- `/fiorettes` não foi exercida contra o staging, só por teste automatizado (`tests/rotas-captura.test.ts`).

//-> ADENDO: 
