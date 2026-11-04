'use client'

import { useState } from 'react'
import { TarjaSvg } from './TarjaSvg'
import { ACEITE_WAITLIST } from '@/lib/aceite-waitlist'

type FormState  = { name: string; email: string }
type FormErrors = { name?: string; email?: string; server?: string }

export default function WaitlistForm() {
  const [form, setForm]           = useState<FormState>({ name: '', email: '' })
  const [errors, setErrors]       = useState<FormErrors>({})
  const [loading, setLoading]     = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [focused, setFocused]     = useState<'name' | 'email' | null>(null)

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!form.name.trim())                                    e.name  = 'Por favor, insira seu nome.'
    if (!form.email.trim())                                   e.email = 'Por favor, insira seu e-mail.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const res  = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) setSubmitted(true)
      else setErrors({ server: data.message || 'Algo deu errado. Tente novamente.' })
    } catch {
      setErrors({ server: 'Sem conexão. Tente novamente em instantes.' })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-4 anim-fade-up">
        <p
          className="text-2xl font-black tracking-tight headline-glow"
          style={{ letterSpacing: '-0.02em' }}
        >
          Você está dentro.
        </p>
        <p className="mt-3 text-sm font-light" style={{ color: '#CC2020', lineHeight: 1.6 }}>
          Fique de olho no seu e-mail.<br />Em breve, tudo fará sentido.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full flex flex-col gap-2 sm:gap-3">

      {/* Nome */}
      <div className="flex flex-col gap-1.5">
        <div className="tarja-field">
          <TarjaSvg
            fill={loading ? '#030000' : '#0a0000'}
            stroke={errors.name ? '#FF4444' : focused === 'name' ? '#CC2020' : '#2a1212'}
          />
          <input
            type="text"
            id="waitlist-name"
            aria-label="Seu nome"
            placeholder="amor, fala seu nome?"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
            className="tarja-input font-brand"
            autoComplete="name"
            disabled={loading}
          />
        </div>
        {errors.name && (
          <span className="text-xs font-light text-brand-error pl-1">{errors.name}</span>
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <div className="tarja-field">
          <TarjaSvg
            fill={loading ? '#030000' : '#0a0000'}
            stroke={errors.email ? '#FF4444' : focused === 'email' ? '#CC2020' : '#2a1212'}
          />
          <input
            type="email"
            id="waitlist-email"
            aria-label="Seu e-mail"
            placeholder="vida, fala seu e-mail?"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            className="tarja-input font-brand"
            autoComplete="email"
            inputMode="email"
            disabled={loading}
          />
        </div>
        {errors.email && (
          <span className="text-xs font-light text-brand-error pl-1">{errors.email}</span>
        )}
      </div>

      {/* Server error */}
      {errors.server && (
        <span className="text-xs font-light text-brand-error text-center">{errors.server}</span>
      )}

      {/* CTA */}
      <div
        className={`tarja-field${!loading ? ' tarja-btn-glow' : ''}`}
      >
        <TarjaSvg fill={loading ? '#8B1515' : '#CC2020'} />
        <button
          type="submit"
          disabled={loading}
          className="font-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: 'white',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontSize: '0.875rem',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.2s',
            zIndex: 1,
          }}
        >
          {loading ? 'aguarde...' : 'cadastrar'}
        </button>
      </div>

      {/* Aceite (prova gravada em lib/aceite-waitlist.ts) */}
      <p
        className="text-center"
        style={{ color: '#AAAAAA', fontSize: '11px', fontWeight: 300, letterSpacing: '0.04em', lineHeight: 1.5 }}
      >
        {ACEITE_WAITLIST.texto}
      </p>

      {/* Who is MELFIORE */}
      <a
        href="https://instagram.com/thefioredaily"
        target="_blank"
        rel="noopener noreferrer"
        className="text-center block"
        style={{
          color: '#FFD700',
          fontSize: '13px',
          fontWeight: 200,
          letterSpacing: '0.10em',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
          textShadow: '0 0 12px rgba(255,215,0,0.6)',
        }}
      >
        quem é MELFIORE?
      </a>

      {/* Microcopy */}
      <p
        className="hidden sm:block text-center mt-1"
        style={{ color: '#7A4848', fontSize: '13px', fontWeight: 200, letterSpacing: '0.06em', lineHeight: 1.75 }}
      >
        seus dados são criptografados e protegidos.<br />
        no spam, ever.
      </p>
    </form>
  )
}
