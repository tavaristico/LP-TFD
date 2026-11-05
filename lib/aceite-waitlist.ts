// Aviso de aceite exibido sob o botao da waitlist. Fonte unica: o form exibe,
// o route.ts grava este mesmo texto como prova. Nao ha caixa de marcar: o aviso
// fica a vista e o clique em "cadastrar" e o ato. O registro diz exatamente isso.
export const ACEITE_WAITLIST = {
  forma: 'aviso_e_clique',
  versao: 'waitlist-2026-11-04',
  texto: 'ao se cadastrar, você aceita receber e-mails da MELFIORE. sai quando quiser.',
} as const

export interface RegistroAceite {
  forma: typeof ACEITE_WAITLIST.forma
  versao: string
  texto: string
  /** ISO 8601 do clique, tomado no servidor. */
  aceito_em: string
}

/**
 * O que aconteceu, e nada alem disso. So existe registro se o navegador disse que mostrou
 * esta versao do aviso. Pagina antiga em cache (sem aviso) ou versao desconhecida: null,
 * a pessoa entra sem consentimento de marketing registrado.
 */
export function registrarAceite(versaoVista: unknown, agora: Date): RegistroAceite | null {
  if (versaoVista !== ACEITE_WAITLIST.versao) return null
  return { forma: ACEITE_WAITLIST.forma, versao: ACEITE_WAITLIST.versao, texto: ACEITE_WAITLIST.texto, aceito_em: agora.toISOString() }
}
