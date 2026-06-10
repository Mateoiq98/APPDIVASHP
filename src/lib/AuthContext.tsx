import { createContext, useContext } from 'react'

export interface AuthUser {
  email: string
}

export interface AuthContextValue {
  user: AuthUser
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthContext.')
  return context
}
