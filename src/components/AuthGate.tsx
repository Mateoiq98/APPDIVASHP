import { useEffect, useMemo, useState } from 'react'
import Login from '../pages/Login'
import { AuthContext, type AuthUser } from '../lib/AuthContext'
import { clearAuthSession, verifyStoredSession } from '../lib/appAuth'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    verifyStoredSession()
      .then(setUser)
      .finally(() => setChecking(false))
  }, [])

  const contextValue = useMemo(() => ({
    user: user as AuthUser,
    logout: () => {
      clearAuthSession()
      setUser(null)
    }
  }), [user])

  if (checking) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gris-fondo)', color: 'var(--sombra-malva)', fontWeight: 800 }}>
        Cargando...
      </div>
    )
  }

  if (!user) return <Login onLogin={setUser} />

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
