// TRAVA DE E-MAIL (fundador, 03/11/2026): "nunca, jamais, em hipótese alguma, envie algum
// e-mail sem o meu consentimento e sem eu aprovar".
// Fecha por padrão: só envia se EMAIL_ENVIO for exatamente "ligado" no ambiente.
// Ausente, vazio ou qualquer outro valor: não envia, só registra no log.
// Todo fetch para /smtp/email passa por aqui. scripts/trava-email.mjs reprova o build se não passar.
export function podeEnviarEmail(origem: string): boolean {
  const ligado = process.env.EMAIL_ENVIO === 'ligado'
  if (!ligado) console.log(`[trava-email] envio bloqueado (${origem}): EMAIL_ENVIO != "ligado"`)
  return ligado
}
