import { verifySession } from '../server/auth.js'

const DEFAULT_MODEL = 'google/gemini-3.1-flash-lite'
const MAX_IMAGES = 4

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

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return 0
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  return Number(normalized) || 0
}

const isNonProductLine = (name) => {
  const normalized = String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  return /^(iva|impuesto|subtotal|total|descuento|rete|retencion|flete|envio|domicilio|saldo|abono|cambio|pago|forma de pago)\b/.test(normalized)
}

const normalizeOcrResult = (raw) => {
  const productos = Array.isArray(raw.productos) ? raw.productos : []
  return {
    proveedor: {
      nombre: String(raw.proveedor?.nombre || '').trim(),
      nit: String(raw.proveedor?.nit || '').trim(),
      telefono: String(raw.proveedor?.telefono || '').trim()
    },
    productos: productos
      .map((item) => {
        const cantidad = Math.max(1, Math.round(toNumber(item.cantidad) || 1))
        const precioTotal = toNumber(item.precio_total ?? item.total_linea ?? item.total ?? item.valor_total)
        const precioCostoRaw = toNumber(item.precio_costo ?? item.precio_unitario ?? item.valor_unitario)
        const precioCosto = precioCostoRaw > 0 ? precioCostoRaw : precioTotal > 0 ? precioTotal / cantidad : 0
        return {
          nombre: String(item.nombre || item.descripcion || item.producto || '').trim(),
          categoria: String(item.categoria || '').trim(),
          marca: String(item.marca || '').trim(),
          talla_color: String(item.talla_color || item.talla || item.color || '').trim(),
          cantidad,
          precio_costo: Math.round(precioCosto),
          precio_total: Math.round(precioTotal || precioCosto * cantidad),
          precio_venta: Math.round(toNumber(item.precio_venta))
        }
      })
      .filter((item) => item.nombre && !isNonProductLine(item.nombre))
  }
}

const buildResponseFormat = (model) => {
  if (model.includes(':free') || model.includes('nemotron')) return undefined
  return {
    type: 'json_schema',
    json_schema: {
      name: 'factura_ocr',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['proveedor', 'productos'],
        properties: {
          proveedor: {
            type: 'object',
            additionalProperties: false,
            required: ['nombre', 'nit', 'telefono'],
            properties: {
              nombre: { type: 'string' },
              nit: { type: 'string' },
              telefono: { type: 'string' }
            }
          },
          productos: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['nombre', 'categoria', 'marca', 'talla_color', 'cantidad', 'precio_costo', 'precio_total', 'precio_venta'],
              properties: {
                nombre: { type: 'string' },
                categoria: { type: 'string' },
                marca: { type: 'string' },
                talla_color: { type: 'string' },
                cantidad: { type: 'number' },
                precio_costo: { type: 'number' },
                precio_total: { type: 'number' },
                precio_venta: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }
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

  if (imageDataUrls.length === 0 || imageDataUrls.length > MAX_IMAGES) {
    return sendJson(res, 400, { error: `Sube entre 1 y ${MAX_IMAGES} imagenes de la factura.` })
  }

  if (imageDataUrls.some((url) => typeof url !== 'string' || !url.startsWith('data:image/'))) {
    return sendJson(res, 400, { error: 'Hay una imagen invalida.' })
  }

  try {
    const requestBody = {
      model,
      temperature: 0,
      max_tokens: 6000,
      messages: [
        {
          role: 'system',
          content: 'Eres un OCR experto para facturas de ropa e inventario. Debes leer tablas, listas y recibos aunque tengan columnas desalineadas. Devuelve solo JSON valido, sin markdown.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extrae proveedor y TODOS los productos comprados desde TODAS las imagenes.

Reglas criticas:
- Si son varias fotos, tratalas como partes de la misma factura y no dupliques lineas.
- Extrae cada renglon de producto por separado. No agrupes productos similares.
- No incluyas subtotal, total, IVA, retenciones, descuentos, fletes, medios de pago ni saldos como productos.
- Si una linea tiene codigo/referencia y descripcion, pon ambos en "nombre" de forma legible.
- "cantidad" debe ser la cantidad comprada. Si no aparece, usa 1.
- "precio_costo" debe ser el precio unitario de compra.
- "precio_total" debe ser el total de la linea. Si solo aparece total y cantidad, calcula precio_costo = precio_total / cantidad.
- "precio_venta" solo si la factura lo muestra como precio de venta; si no aparece, usa 0.
- Si ves jean, jeans, denim, vaquero o pantalon, usa categoria "Prendas inferiores".
- Si ves blusa, camisa, camiseta, top, body o chaqueta, usa categoria "Prendas superiores".
- Si ves vestido o enterizo, usa la categoria mas cercana.
- Si no hay talla/color, deja "talla_color" vacio.
- Usa categorias existentes cuando aplique: ${categorias.join(', ')}.

Devuelve este JSON exacto:
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
      "precio_total": 0,
      "precio_venta": 0
    }
  ]
}`
            },
            ...imageDataUrls.map((url) => ({
              type: 'image_url',
              image_url: { url }
            }))
          ]
        }
      ]
    }
    const responseFormat = buildResponseFormat(model)
    if (responseFormat) requestBody.response_format = responseFormat

    const openRouterHeaders = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': req.headers.origin || 'https://divashop.vercel.app',
      'X-Title': 'Diva Shop Facturas OCR'
    }

    let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: openRouterHeaders,
      body: JSON.stringify(requestBody)
    })

    let responseText = await response.text()
    if (!response.ok && requestBody.response_format && /response_format|schema|structured/i.test(responseText)) {
      delete requestBody.response_format
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: openRouterHeaders,
        body: JSON.stringify(requestBody)
      })
      responseText = await response.text()
    }

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

    const parsed = normalizeOcrResult(JSON.parse(cleanJsonText(content)))
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
