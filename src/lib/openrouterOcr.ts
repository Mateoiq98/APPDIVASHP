import { getAuthToken } from './appAuth'

export const DEFAULT_OPENROUTER_OCR_MODEL =
  import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemini-3.1-flash-lite'

export interface OcrProducto {
  nombre: string
  categoria: string
  marca: string
  talla_color: string
  cantidad: number
  precio_costo: number
  precio_total?: number
  precio_venta: number
}

export interface OcrFacturaResult {
  proveedor?: {
    nombre?: string
    nit?: string
    telefono?: string
  }
  productos: OcrProducto[]
}

export async function analizarFacturaConOpenRouter({
  model,
  imageDataUrls,
  categorias
}: {
  model: string
  imageDataUrls: string[]
  categorias: string[]
}): Promise<OcrFacturaResult> {
  const response = await fetch('/api/openrouter-ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({
      model,
      imageDataUrls,
      categorias
    })
  })

  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(detail?.error || `OCR respondio ${response.status}.`)
  }

  const parsed = await response.json() as OcrFacturaResult
  if (!Array.isArray(parsed.productos)) {
    throw new Error('La respuesta no contiene una lista de productos.')
  }

  return parsed
}
