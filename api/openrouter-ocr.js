import { verifySession } from '../server/auth.js'

const DEFAULT_MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'

export const config = {
  maxDuration: 60
}

const sendJson = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

const cleanJsonText = (text) => {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const raw = fenced ? fenced[1].trim() : trimmed
  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first >= 0 && last > first) return raw.slice(first, last + 1)
  return raw
}

const parseBody = (req) => {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body)
  return req.body
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Metodo no permitido.' })
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!verifySession(token)) {
    return sendJson(res, 401, { error: 'Sesion invalida.' })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return sendJson(res, 500, { error: 'Falta OPENROUTER_API_KEY en Vercel.' })
  }

  let body
  try {
    body = parseBody(req)
  } catch {
    return sendJson(res, 400, { error: 'JSON invalido.' })
  }

  const imageDataUrls = Array.isArray(body.imageDataUrls)
    ? body.imageDataUrls
    : body.imageDataUrl
      ? [body.imageDataUrl]
      : []
  const categorias = Array.isArray(body.categorias) ? body.categorias : []
  const model = typeof body.model === 'string' && body.model.trim()
    ? body.model.trim()
    : process.env.OPENROUTER_MODEL || DEFAULT_MODEL

  if (imageDataUrls.length === 0 || imageDataUrls.length > 2) {
    return sendJson(res, 400, { error: 'Sube entre 1 y 2 imagenes de la factura.' })
  }

  if (imageDataUrls.some((url) => typeof url !== 'string' || !url.startsWith('data:image/'))) {
    return sendJson(res, 400, { error: 'Hay una imagen invalida.' })
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.origin || 'https://divashop.vercel.app',
        'X-Title': 'Diva Shop Facturas OCR'
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: 'Eres un OCR experto para facturas de ropa. Lee una o varias imagenes de la misma factura y devuelve solo JSON valido, sin markdown.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extrae proveedor y productos comprados desde todas las imagenes. Si son dos fotos, tratalas como partes de la misma factura y no dupliques lineas. Si el texto dice jean, jeans, vaquero o pantalon denim, usa categoria "Prendas inferiores". Si no hay talla/color, infiere lo visible o deja vacio. Usa categorias existentes cuando aplique: ${categorias.join(', ')}.

Devuelve este formato exacto:
{
  "proveedor": { "nombre": "", "nit": "", "telefono": "" },
  "productos": [
    {
      "nombre": "",
      "categoria": "",
      "marca": "",
      "talla_color": "",
      "cantidad": 1,
      "precio_costo": 0,
      "precio_venta": 0
    }
  ]
}

precio_costo debe ser el valor unitario de compra, no el total de la linea. precio_venta puede ser 0 si no aparece en la factura.`
              },
              ...imageDataUrls.map((url) => ({
                type: 'image_url',
                image_url: { url }
              }))
            ]
          }
        ]
      })
    })

    const responseText = await response.text()
    if (!response.ok) {
      return sendJson(res, response.status, {
        error: `OpenRouter respondio ${response.status}.`,
        detail: responseText.slice(0, 300)
      })
    }

    const data = JSON.parse(responseText)
    const content = data?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      return sendJson(res, 502, { error: 'OpenRouter no devolvio texto para interpretar.' })
    }

    const parsed = JSON.parse(cleanJsonText(content))
    if (!Array.isArray(parsed.productos)) {
      return sendJson(res, 502, { error: 'La respuesta no contiene una lista de productos.' })
    }

    return sendJson(res, 200, parsed)
  } catch (error) {
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'No se pudo analizar la factura.'
    })
  }
}
