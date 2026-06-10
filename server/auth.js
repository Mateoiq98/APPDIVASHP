import { createHmac, timingSafeEqual } from 'node:crypto'

export const ALLOWED_EMAILS = [
  'haslytrujillo7@gmail.com',
  'sandramsilva588@gmail.com',
  'teogoals@gmail.com'
]

const EMAIL_PASSWORD_ENV = {
  'haslytrujillo7@gmail.com': 'APP_PASSWORD_HASLY',
  'sandramsilva588@gmail.com': 'APP_PASSWORD_SANDRA',
  'teogoals@gmail.com': 'APP_PASSWORD_TEO'
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

export const isAllowedEmail = (email) => ALLOWED_EMAILS.includes(normalizeEmail(email))

export const sendJson = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export const parseBody = (req) => {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body)
  return req.body
}

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left))
  const rightBuffer = Buffer.from(String(right))
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

const getSessionSecret = () =>
  process.env.APP_AUTH_SECRET ||
  process.env.APP_PASSWORD_HASLY ||
  process.env.APP_PASSWORD_SANDRA ||
  process.env.APP_PASSWORD_TEO ||
  process.env.APP_LOGIN_PASSWORD ||
  ''

const getExpectedPassword = (email) => {
  const envName = EMAIL_PASSWORD_ENV[normalizeEmail(email)]
  return {
    envName,
    password: envName ? process.env[envName] : ''
  }
}

export const checkPassword = (email, password) => {
  const expected = getExpectedPassword(email)
  const configuredPassword = expected.password || process.env.APP_LOGIN_PASSWORD
  if (!configuredPassword) {
    return { ok: false, missingConfig: true, envName: expected.envName }
  }
  return { ok: safeCompare(password, configuredPassword), missingConfig: false, envName: expected.envName }
}

export const signSession = (email) => {
  const secret = getSessionSecret()
  const payload = Buffer.from(JSON.stringify({
    email: normalizeEmail(email),
    exp: Date.now() + SESSION_TTL_MS
  })).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export const verifySession = (token) => {
  const secret = getSessionSecret()
  if (!secret || !token || typeof token !== 'string') return null

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expectedSignature = createHmac('sha256', secret).update(payload).digest('base64url')
  if (!safeCompare(signature, expectedSignature)) return null

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const email = normalizeEmail(session.email)
    if (!isAllowedEmail(email) || !session.exp || Date.now() > session.exp) return null
    return { email }
  } catch {
    return null
  }
}
