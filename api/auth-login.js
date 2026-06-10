import { checkPassword, isAllowedEmail, normalizeEmail, parseBody, sendJson, signSession } from '../server/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Metodo no permitido.' })
  }

  let body
  try {
    body = parseBody(req)
  } catch {
    return sendJson(res, 400, { error: 'JSON invalido.' })
  }

  const email = normalizeEmail(body.email)
  const password = String(body.password || '')

  if (!isAllowedEmail(email)) {
    return sendJson(res, 403, { error: 'Este correo no tiene acceso.' })
  }

  const passwordResult = checkPassword(email, password)
  if (passwordResult.missingConfig) {
    return sendJson(res, 500, { error: `Falta ${passwordResult.envName || 'APP_LOGIN_PASSWORD'} en Vercel.` })
  }

  if (!passwordResult.ok) {
    return sendJson(res, 401, { error: 'Contrasena incorrecta.' })
  }

  return sendJson(res, 200, {
    token: signSession(email),
    user: { email }
  })
}
