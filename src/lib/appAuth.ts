import type { AuthUser } from './AuthContext'

const SESSION_KEY = 'divashop_auth_session'

export const ALLOWED_LOGIN_EMAILS = [
  'haslytrujillo7@gmail.com',
  'sandramsilva588@gmail.com',
  'teogoals@gmail.com'
]

export const LOGIN_PROFILES = {
  'haslytrujillo7@gmail.com': {
    name: 'Hasly',
    label: 'Perfil Hasly',
    message: 'Tienes la tienda y las citas listas para hoy.'
  },
  'sandramsilva588@gmail.com': {
    name: 'Sandra',
    label: 'Perfil Sandra',
    message: 'Tu agenda y tus clientas estan al dia.'
  },
  'teogoals@gmail.com': {
    name: 'Teo',
    label: 'Perfil administrador',
    message: 'La vista general del negocio esta lista.'
  }
}

export const normalizeLoginEmail = (email: string) => email.trim().toLowerCase()

export const isAllowedLoginEmail = (email: string) => ALLOWED_LOGIN_EMAILS.includes(normalizeLoginEmail(email))

export const getLoginProfile = (email: string) =>
  LOGIN_PROFILES[normalizeLoginEmail(email) as keyof typeof LOGIN_PROFILES] || {
    name: 'Diva Shop',
    label: 'Perfil autorizado',
    message: 'Todo listo para trabajar.'
  }

export const clearAuthSession = () => localStorage.removeItem(SESSION_KEY)

export const getAuthToken = () => localStorage.getItem(SESSION_KEY) || ''

const saveAuthSession = (token: string) => localStorage.setItem(SESSION_KEY, token)

const readError = async (response: Response) => {
  const body = await response.json().catch(() => null)
  return body?.error || 'No se pudo iniciar sesion.'
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const response = await fetch('/api/auth-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalizeLoginEmail(email), password })
  })

  if (!response.ok) throw new Error(await readError(response))

  const data = await response.json()
  saveAuthSession(data.token)
  return data.user
}

export async function verifyStoredSession(): Promise<AuthUser | null> {
  const token = getAuthToken()
  if (!token) return null

  const response = await fetch('/api/auth-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })

  if (!response.ok) {
    clearAuthSession()
    return null
  }

  const data = await response.json()
  return data.user
}
