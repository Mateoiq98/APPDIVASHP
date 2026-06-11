import { useState } from 'react'
import { Eye, EyeOff, Heart, Lock, Mail, Sparkles } from 'lucide-react'
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
      <style>{`
        @keyframes loginCelebrate {
          0% { transform: translateY(10px) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-82px) rotate(145deg); opacity: 0; }
        }

        @keyframes loginPhotoGlow {
          0%, 100% { box-shadow: 0 8px 18px rgba(149, 84, 91, 0.18); }
          50% { box-shadow: 0 10px 28px rgba(182, 108, 112, 0.32); }
        }

        @keyframes loginBadgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 74, padding: '8px 18px', borderRadius: 18, background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(245,183,179,0.12))', border: '1px solid rgba(245,183,179,0.45)' }}>
            <img src="/logo-diva-shop-wordmark-compact.png" alt="Diva Shop" style={{ width: 230, maxWidth: '100%', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 5px 10px rgba(149, 84, 91, 0.14))' }} />
          </div>
          <p style={{ color: 'var(--sombra-malva)', fontSize: 13, fontWeight: 800, marginTop: 8 }}>
            Acceso privado
          </p>
        </div>

        <div style={{ position: 'relative', overflow: 'hidden', marginBottom: 22, border: '1px solid rgba(245, 183, 179, 0.7)', borderRadius: 18, padding: 12, background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(253,244,244,0.94))' }}>
          {[0, 1, 2, 3, 4, 5].map(index => (
            <span
              key={index}
              style={{
                position: 'absolute',
                left: `${14 + index * 14}%`,
                bottom: -12,
                width: index % 2 === 0 ? 7 : 5,
                height: index % 2 === 0 ? 14 : 10,
                borderRadius: 3,
                background: index % 3 === 0 ? 'var(--rosa-metalico)' : index % 3 === 1 ? 'var(--rosa-claro)' : 'var(--color-exito)',
                opacity: 0,
                animation: `loginCelebrate ${2.8 + index * 0.18}s ease-in-out ${index * 0.22}s infinite`
              }}
            />
          ))}

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src="/anniversary-login.jpeg"
                alt="Hasly y Teo"
                style={{ width: 82, height: 92, borderRadius: 18, objectFit: 'cover', border: '3px solid white', animation: 'loginPhotoGlow 3s ease-in-out infinite' }}
              />
              <div style={{ position: 'absolute', right: -6, bottom: -6, width: 32, height: 32, borderRadius: 16, background: 'var(--rosa-metalico)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', animation: 'loginBadgePulse 2.4s ease-in-out infinite' }}>
                <Heart size={15} fill="currentColor" />
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--rosa-vino)', fontSize: 11, fontWeight: 800, marginBottom: 5 }}>
                <Sparkles size={13} /> 5 años celebrando amor
              </div>
              <p style={{ margin: 0, color: 'var(--negro-elegante)', fontSize: 13, lineHeight: '18px', fontWeight: 800 }}>
                Una app hecha con amor para Hasly, para estos 5 años y para todo lo bonito que seguimos construyendo.
              </p>
              <p style={{ margin: '5px 0 0', color: 'var(--sombra-malva)', fontSize: 11, lineHeight: '16px', fontWeight: 600 }}>
                Que cada detalle guarde un pedacito de nuestra historia.
              </p>
            </div>
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
