// TRAVA DA ROTA DE COMPRAS (S25): fecha por padrao, no mesmo molde de lib/trava-email.ts.
// So aceita compra se COMPRAS_ENTRADA for exatamente "ligado" no ambiente.
// Ausente, vazio ou qualquer outro valor: a rota recusa (503) e registra no log.
// Ligar exige pedido do fundador. A rota nunca envia e-mail.
export function podeReceberCompra(origem: string, env: Record<string, unknown> = process.env): boolean {
  const ligado = env.COMPRAS_ENTRADA === 'ligado'
  if (!ligado) console.log(`[trava-compras] entrada bloqueada (${origem}): COMPRAS_ENTRADA != "ligado"`)
  return ligado
}
