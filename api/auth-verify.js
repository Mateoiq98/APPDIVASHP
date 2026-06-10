import { parseBody, sendJson, verifySession } from '../server/auth.js'

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

  const token = body.token || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const user = verifySession(token)

  if (!user) {
    return sendJson(res, 401, { error: 'Sesion invalida.' })
  }

  return sendJson(res, 200, { user })
}
