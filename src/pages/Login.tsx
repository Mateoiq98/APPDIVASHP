import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { isAllowedLoginEmail, loginWithPassword, normalizeLoginEmail } from '../lib/appAuth'
import type { AuthUser } from '../lib/AuthContext'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'No se pudo iniciar sesion.'

export default function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<'email' | 'password'>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const cleanEmail = normalizeLoginEmail(email)

  const handleEmailSubmit = () => {
    setError('')
    if (!isAllowedLoginEmail(cleanEmail)) {
      setError('Este correo no tiene acceso.')
      return
    }
    setStep('password')
  }

  const handlePasswordSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const user = await loginWithPassword(cleanEmail, password)
      onLogin(user)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, background: 'var(--gris-fondo)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <img src="/logo.png" alt="Diva Shop" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover' }} />
          <div>
            <h1 style={{ fontSize: 24, lineHeight: '28px', margin: 0 }}>Diva Shop</h1>
            <p style={{ color: 'var(--sombra-malva)', fontSize: 13, fontWeight: 700, marginTop: 2 }}>
              Acceso privado
            </p>
          </div>
        </div>

        <div className="form-group">
          <label>Correo</label>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--sombra-malva)' }} />
            <input
              type="email"
              value={email}
              onChange={event => {
                setEmail(event.target.value)
                setError('')
                if (step === 'password') {
                  setPassword('')
                  setStep('email')
                }
              }}
              placeholder="correo@gmail.com"
              autoComplete="email"
              style={{ paddingLeft: 42 }}
              disabled={loading}
            />
          </div>
        </div>

        {step === 'password' && (
          <div className="form-group">
            <label>Contrasena</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--sombra-malva)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Contrasena de acceso"
                autoComplete="current-password"
                style={{ paddingLeft: 42, paddingRight: 48 }}
                disabled={loading}
                onKeyDown={event => {
                  if (event.key === 'Enter' && password) handlePasswordSubmit()
                }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPassword(prev => !prev)}
                style={{ position: 'absolute', right: 5, top: 5, width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 0, borderRadius: 10 }}
                aria-label={showPassword ? 'Ocultar contrasena' : 'Ver contrasena'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'var(--fondo-error)', color: 'var(--color-error)', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {step === 'email' ? (
          <button className="btn-primary" onClick={handleEmailSubmit} disabled={!cleanEmail || loading} style={{ width: '100%' }}>
            Continuar
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={() => { setStep('email'); setPassword(''); setError('') }} disabled={loading} style={{ flex: 1 }}>
              Cambiar
            </button>
            <button className="btn-primary" onClick={handlePasswordSubmit} disabled={!password || loading} style={{ flex: 1 }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
