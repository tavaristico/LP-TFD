// 2A.3: contato unico. Grava no Supabase (crm) ANTES do Brevo. SPEC 14 em ../_DOCS/SITE-OFICIAL/MEDUSA-VPS.
// Atras da flag CRM_ENVIO: so roda com o valor exato "ligado". Ausente ou outro valor: nada acontece.
// Nunca lanca: falha do Supabase vira log estruturado e a inscricao segue para o Brevo.
import { capturarComSupabase } from '@/lib/crm'
import type { EntradaCaptura } from '@/lib/crm'

export function crmLigado(): boolean {
  return process.env.CRM_ENVIO === 'ligado'
}

// Texto exato do aceite gravado em crm.consentimentos. A versao muda se o formulario mudar.
const WAITLIST_ACEITE = {
  texto_versao: 'waitlist-2026-11-03',
  texto_aceito: 'cadastro na lista de espera da melfiore pelo formulario de nome e e-mail (botao cadastrar)',
}

async function hashIp(ip: string): Promise<string | undefined> {
  const sal = process.env.CRM_IP_SALT
  if (!sal || ip === 'unknown') return undefined // sem sal, IP nao vira hash: melhor nao guardar
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sal}|${ip}`))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function log(nivel: 'info' | 'error', evento: string, campos: Record<string, unknown>) {
  // Sem e-mail, nome nem corpo de resposta: so o que permite reenviar pela chave.
  console[nivel === 'error' ? 'error' : 'log'](JSON.stringify({ evento, ...campos }))
}

export async function capturarWaitlistNoCrm(dados: { name: string; email: string; ip: string }): Promise<void> {
  const url = process.env.SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_KEY
  if (!url || !chave) {
    log('error', 'crm.sem_config', { origem: 'waitlist' })
    return
  }
  try {
    const ip_hash = await hashIp(dados.ip)
    const entrada: EntradaCaptura = {
      origem: 'waitlist',
      nome: dados.name,
      email: dados.email,
      consentimentos: [{ canal: 'email', finalidade: 'marketing', marcado: true, ...WAITLIST_ACEITE }],
      ...(ip_hash ? { ip_hash } : {}),
    }
    // Teto de 7 s para o Supabase nao segurar a inscricao: estourou, o Brevo segue e a pendencia fica no log.
    let relogio: ReturnType<typeof setTimeout> | undefined
    const limite = new Promise<'tempo'>((ok) => { relogio = setTimeout(() => ok('tempo'), 7000) })
    const r = await Promise.race([capturarComSupabase(entrada, { url, chave, timeoutMs: 3000 }), limite])
    clearTimeout(relogio)
    if (r === 'tempo') {
      log('error', 'crm.pendente', { origem: 'waitlist', codigo: 'tempo' })
      return
    }
    const { gravacao, resultado } = r
    if (gravacao.estado === 'falhou') {
      log('error', 'crm.pendente', { origem: 'waitlist', codigo: gravacao.codigo, chave_idempotencia: gravacao.chave_idempotencia })
    } else if (resultado && !resultado.ok) {
      log('error', 'crm.recusada', { origem: 'waitlist', motivo: resultado.motivo })
    } else {
      log('info', 'crm.capturado', { origem: 'waitlist', gravacao: gravacao.estado })
    }
  } catch {
    log('error', 'crm.pendente', { origem: 'waitlist', codigo: 'inesperado' })
  }
}
