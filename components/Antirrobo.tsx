'use client'

import { useEffect, useRef } from 'react'
import { CAMPO_ISCA } from '@/lib/antirrobo'

// S11. Isca: campo que pessoa nao ve e robo preenche (a rota finge sucesso e nao grava).
export function Isca({ valor, aoMudar }: { valor: string; aoMudar: (v: string) => void }) {
  return (
    <input
      type="text"
      name={CAMPO_ISCA}
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
    />
  )
}

const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY

interface TurnstileApi {
  render(el: HTMLElement, o: { sitekey: string; appearance: string; callback: (t: string) => void; 'expired-callback': () => void }): string
  remove(id: string): void
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

// Turnstile (antirrobo da Cloudflare). Sem NEXT_PUBLIC_TURNSTILE_SITEKEY no build: nao renderiza nada,
// nao carrega script. So aparece na tela se a Cloudflare achar o visitante suspeito (interaction-only).
export function Turnstile({ aoToken }: { aoToken: (t: string) => void }) {
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!SITEKEY || !caixa.current) return
    let id: string | undefined
    const montar = () => {
      if (!window.turnstile || !caixa.current || id) return
      id = window.turnstile.render(caixa.current, {
        sitekey: SITEKEY,
        appearance: 'interaction-only',
        callback: aoToken,
        'expired-callback': () => aoToken(''),
      })
    }
    if (window.turnstile) montar()
    else {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = montar
      document.head.appendChild(s)
    }
    return () => { if (id) window.turnstile?.remove(id) }
  }, [aoToken])
  if (!SITEKEY) return null
  return <div ref={caixa} />
}
