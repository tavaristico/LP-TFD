'use client'

import { useCallback, useState } from 'react'
import { TarjaSvg } from './TarjaSvg'
import { CAMPO_ISCA } from '@/lib/antirrobo'
import { Isca, Turnstile } from './Antirrobo'

type FormState = {
  assinatura: string
  titulo: string
  historia: string
  cidade: string
}

type FormErrors = {
  historia?: string
  server?: string
}

type Focused = 'assinatura' | 'titulo' | 'historia' | 'cidade' | null

export default function FiorettesForm() {
  const [form, setForm] = useState<FormState>({
    assinatura: '',
    titulo: '',
    historia: '',
    cidade: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [focused, setFocused] = useState<Focused>(null)
  const [isca, setIsca] = useState('')
  const [token, setToken] = useState('')
  const aoToken = useCallback((t: string) => setToken(t), [])

  function set(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!form.historia.trim() || form.historia.trim().length < 3)
      e.historia = 'conta algo antes de entregar.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const res = await fetch('/api/fiorettes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assinatura: form.assinatura,
          titulo: form.titulo,
          historia: form.historia,
          cidade: form.cidade,
          [CAMPO_ISCA]: isca,
          turnstile: token,
        }),
      })
      const data = await res.json()
      if (data.success) setSubmitted(true)
      else setErrors({ server: data.message || 'algo deu errado. tenta de novo?' })
    } catch {
      setErrors({ server: 'sem conexão. tenta de novo em instantes.' })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div
        className="anim-fade-up"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '12px',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          padding: '40px 24px',
          textAlign: 'center',
        }}
      >
        <p
          className="headline-glow font-brand"
          style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 300, letterSpacing: '0.04em' }}
        >
          ela leu.
        </p>
        <p style={{ color: '#7A4848', fontSize: '13px', fontWeight: 200, letterSpacing: '0.04em', lineHeight: 1.75, marginTop: '12px' }}>
          quando ela escolher preservar,<br />
          sua página entra no arquivo.
        </p>
      </div>
    )
  }

  const borderFor = (field: Focused) =>
    `1px solid ${focused === field ? '#CC2020' : '#2a1212'}`

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Isca valor={isca} aoMudar={setIsca} />

      {/* Card container — liquid glass */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '12px',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        overflow: 'hidden',
      }}>

        {/* Textarea — corpo do post */}
        <div style={{ padding: '20px 20px 0' }}>
          <textarea
            placeholder="o que você quer deixar?"
            value={form.historia}
            onChange={e => set('historia', e.target.value)}
            onFocus={() => setFocused('historia')}
            onBlur={() => setFocused(null)}
            disabled={loading}
            maxLength={2000}
            rows={5}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              width: '100%',
              padding: 0,
              color: '#E8E8E8',
              fontSize: '16px',
              fontWeight: 300,
              fontFamily: 'var(--font-brother)',
              lineHeight: 1.75,
              resize: 'none',
            }}
            className="fiorettes-textarea"
          />
          {errors.historia && (
            <p style={{ color: '#FF4444', fontSize: '12px', fontWeight: 200, marginTop: '4px' }}>
              {errors.historia}
            </p>
          )}
          <p style={{ color: '#555555', fontSize: '11px', textAlign: 'right', marginTop: '4px', marginBottom: '12px' }}>
            {form.historia.length}/2000
          </p>
        </div>

        {/* Separador */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Barra inferior — assinatura + cidade + título */}
        <div style={{ padding: '12px 20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="nome secreto"
            value={form.assinatura}
            onChange={e => set('assinatura', e.target.value)}
            onFocus={() => setFocused('assinatura')}
            onBlur={() => setFocused(null)}
            disabled={loading}
            style={{
              flex: 1,
              minWidth: '120px',
              background: 'transparent',
              border: 'none',
              borderBottom: borderFor('assinatura'),
              outline: 'none',
              padding: '4px 0',
              color: '#E8E8E8',
              fontSize: '13px',
              fontWeight: 200,
              fontFamily: 'var(--font-brother)',
              transition: 'border-color 0.2s',
            }}
            className="fiorettes-input"
          />
          <input
            type="text"
            placeholder="༺cidade༻"
            value={form.cidade}
            onChange={e => set('cidade', e.target.value)}
            onFocus={() => setFocused('cidade')}
            onBlur={() => setFocused(null)}
            disabled={loading}
            style={{
              flex: 1,
              minWidth: '100px',
              background: 'transparent',
              border: 'none',
              borderBottom: borderFor('cidade'),
              outline: 'none',
              padding: '4px 0',
              color: '#E8E8E8',
              fontSize: '13px',
              fontWeight: 200,
              fontFamily: 'var(--font-brother)',
              transition: 'border-color 0.2s',
            }}
            className="fiorettes-input"
          />
          <input
            type="text"
            placeholder="título — opcional"
            value={form.titulo}
            onChange={e => set('titulo', e.target.value)}
            onFocus={() => setFocused('titulo')}
            onBlur={() => setFocused(null)}
            disabled={loading}
            style={{
              flex: 2,
              minWidth: '140px',
              background: 'transparent',
              border: 'none',
              borderBottom: borderFor('titulo'),
              outline: 'none',
              padding: '4px 0',
              color: '#E8E8E8',
              fontSize: '13px',
              fontWeight: 200,
              fontFamily: 'var(--font-brother)',
              transition: 'border-color 0.2s',
            }}
            className="fiorettes-input"
          />
        </div>

        {/* Separador */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

      </div>

      {/* D4 line */}
      <p style={{ color: '#7A4848', fontSize: '12px', fontWeight: 200, letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.7, margin: '16px 0' }}>
        seu número já existe no arquivo. só está esperando a página.
      </p>

      {/* Submit — Tarja CTA */}
      <div className={`tarja-field${!loading ? ' tarja-btn-glow' : ''}`}>
        <TarjaSvg fill={loading ? '#8B1515' : '#CC2020'} />
        <button
          type="submit"
          disabled={loading}
          className="font-brand"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            background: 'transparent', border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: 'white', fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            fontSize: '0.875rem',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.2s',
            zIndex: 1,
          }}
        >
          {loading ? 'entregando...' : 'entregar ao diário'}
        </button>
      </div>

      {errors.server && (
        <p style={{ color: '#FF4444', fontSize: '12px', fontWeight: 200, textAlign: 'center', marginTop: '8px' }}>
          {errors.server}
        </p>
      )}

      <p style={{ color: '#7A4848', fontSize: '11px', fontWeight: 200, letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.6, marginTop: '12px' }}>
        ao entregar, autorizo que MELFIORE leia e preserve esta página
      </p>

      <Turnstile aoToken={aoToken} />
    </form>
  )
}
