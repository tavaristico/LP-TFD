// GA4 desligado por padrao (decisao do fundador, 14/11/2026, item 17 de LOJA MEDUSA.md):
// hoje ha cookie antes do aviso. Nada carrega, nem script nem cookie, ate existir o aviso
// de cookies E o advogado liberar. Pendencia: 2. MELFIORE/_DOCS/SITE-OFICIAL/MEDUSA-VPS/LISTA-ADVOGADO.md
// Para ligar (so com pedido dele): NEXT_PUBLIC_GA4=ligado no build, e o aviso no ar.
export const GA4_ID = 'G-QDQDMC73CF'
export const GA4_ATIVO = process.env.NEXT_PUBLIC_GA4 === 'ligado'
