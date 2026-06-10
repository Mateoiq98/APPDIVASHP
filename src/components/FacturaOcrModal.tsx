import { useEffect, useMemo, useState, type ClipboardEvent, type DragEvent } from 'react'
import { Camera, Clipboard, Plus, Save, ScanLine, Settings, Trash2, Upload, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { analizarFacturaConOpenRouter, DEFAULT_OPENROUTER_OCR_MODEL } from '../lib/openrouterOcr'
import type { Proveedor } from '../types'

const MAX_FACTURA_IMAGES = 4

const MODEL_PRESETS = [
  { label: 'Preciso', value: 'google/gemini-3.1-flash-lite' },
  { label: 'Mas preciso', value: 'google/gemini-3.5-flash' },
  { label: 'Gratis', value: 'google/gemma-4-31b-it:free' },
  { label: 'Gratis NVIDIA', value: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free' }
]

const LEGACY_DEFAULT_MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
const MODEL_MIGRATION_KEY = 'divashop_ocr_model_migrated_v2'

const getInitialOcrModel = () => {
  const saved = localStorage.getItem('openrouter_model')
  if (!saved) return DEFAULT_OPENROUTER_OCR_MODEL
  if (saved === LEGACY_DEFAULT_MODEL && !localStorage.getItem(MODEL_MIGRATION_KEY)) {
    localStorage.setItem(MODEL_MIGRATION_KEY, 'true')
    return DEFAULT_OPENROUTER_OCR_MODEL
  }
  return saved
}

type DraftItem = {
  id: string
  nombre: string
  categoria: string
  marca: string
  talla_color: string
  cantidad: string
  precio_costo: string
  precio_total: string
  precio_venta: string
}

const emptyItem = (): DraftItem => ({
  id: crypto.randomUUID(),
  nombre: '',
  categoria: '',
  marca: '',
  talla_color: '',
  cantidad: '1',
  precio_costo: '',
  precio_total: '',
  precio_venta: ''
})

const parseCurrency = (value: string) => Number(value.toString().replace(/\D/g, '')) || 0

const formatCurrency = (value: string | number) => {
  const clean = value.toString().replace(/\D/g, '')
  return clean ? Number(clean).toLocaleString('es-CO') : ''
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const inferCategory = (name: string, fallback: string) => {
  if (fallback) return fallback
  const value = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/(jean|vaquero|pantalon|short|falda)/.test(value)) return 'Prendas inferiores'
  if (/(blusa|camisa|camiseta|top|body|chaqueta)/.test(value)) return 'Prendas superiores'
  if (/vestido/.test(value)) return 'Vestidos de Fiesta'
  if (/(zapato|sandalia|tacon|tenis)/.test(value)) return 'Calzado'
  if (/(arete|collar|pulsera|anillo|bolso|cinturon)/.test(value)) return 'Accesorios y Bisuteria'
  return ''
}

const fileToImageDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = event => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const maxSide = 1600
      const ratio = Math.min(1, maxSide / Math.max(image.width, image.height))
      canvas.width = Math.round(image.width * ratio)
      canvas.height = Math.round(image.height * ratio)
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    image.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    image.src = event.target?.result as string
  }
  reader.onerror = () => reject(new Error('No se pudo cargar el archivo.'))
  reader.readAsDataURL(file)
})

export default function FacturaOcrModal({
  categorias,
  onClose,
  onSuccess
}: {
  categorias: string[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [proveedorId, setProveedorId] = useState('')
  const [proveedorNombre, setProveedorNombre] = useState('')
  const [proveedorNit, setProveedorNit] = useState('')
  const [usarProveedorNuevo, setUsarProveedorNuevo] = useState(false)
  const [model, setModel] = useState(getInitialOcrModel)
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [items, setItems] = useState<DraftItem[]>([])
  const [loadingOcr, setLoadingOcr] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const categoriasOptions = useMemo(() => Array.from(new Set(categorias)).sort(), [categorias])

  useEffect(() => {
    supabase.from('proveedores').select('*').order('nombre').then(({ data }) => {
      if (data) setProveedores(data)
    })
  }, [])

  useEffect(() => {
    if (model) localStorage.setItem('openrouter_model', model)
  }, [model])

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  const addImageFiles = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      setError('No encontre imagenes para cargar.')
      return
    }

    const remainingSlots = Math.max(0, MAX_FACTURA_IMAGES - imageDataUrls.length)
    if (remainingSlots === 0) {
      setError(`Solo puedes cargar hasta ${MAX_FACTURA_IMAGES} fotos por factura.`)
      return
    }

    setError('')
    try {
      const urls = await Promise.all(imageFiles.slice(0, remainingSlots).map(fileToImageDataUrl))
      setImageDataUrls(prev => [...prev, ...urls].slice(0, MAX_FACTURA_IMAGES))
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar las imagenes.'))
    }
  }

  const handlePasteImages = async (event: ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(event.clipboardData.files)
    if (files.length === 0) return
    event.preventDefault()
    await addImageFiles(files)
  }

  const handleDropImages = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    await addImageFiles(Array.from(event.dataTransfer.files))
  }

  const handleAnalyze = async () => {
    if (imageDataUrls.length === 0) {
      setError('Sube al menos una foto de la factura primero.')
      return
    }

    setLoadingOcr(true)
    setError('')
    try {
      const result = await analizarFacturaConOpenRouter({
        model,
        imageDataUrls,
        categorias: categoriasOptions
      })

      if (result.proveedor?.nombre) {
        const nombreProveedor = result.proveedor.nombre.trim()
        const existing = proveedores.find(p => p.nombre.toLowerCase() === nombreProveedor.toLowerCase())
        if (existing) {
          setProveedorId(existing.id)
          setUsarProveedorNuevo(false)
        } else {
          setProveedorNombre(nombreProveedor)
          setProveedorNit(result.proveedor.nit || '')
          setUsarProveedorNuevo(true)
        }
      }

      setItems(result.productos.map(producto => ({
        id: crypto.randomUUID(),
        nombre: producto.nombre || '',
        categoria: inferCategory(producto.nombre || '', producto.categoria || ''),
        marca: producto.marca || '',
        talla_color: producto.talla_color || '',
        cantidad: String(producto.cantidad || 1),
        precio_costo: formatCurrency(producto.precio_costo || 0),
        precio_total: formatCurrency(producto.precio_total || 0),
        precio_venta: formatCurrency(producto.precio_venta || 0)
      })))
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo analizar la factura.'))
    } finally {
      setLoadingOcr(false)
    }
  }

  const ensureProveedor = async () => {
    if (!usarProveedorNuevo) return proveedorId || null
    const nombre = proveedorNombre.trim()
    if (!nombre) return null

    const existing = proveedores.find(p => p.nombre.toLowerCase() === nombre.toLowerCase())
    if (existing) return existing.id

    const { data, error: insertError } = await supabase
      .from('proveedores')
      .insert({ nombre, nit: proveedorNit.trim() })
      .select()
      .single()

    if (insertError) throw insertError
    return data.id as string
  }

  const handleSave = async () => {
    const validItems = items.filter(item => item.nombre.trim() && item.categoria.trim())
    if (validItems.length === 0) {
      setError('Agrega al menos un producto con nombre y categoria.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const finalProveedorId = await ensureProveedor()
      const payload = validItems.map(item => ({
        nombre: item.nombre.trim(),
        talla_color: item.talla_color.trim() || 'Sin talla / color',
        categoria: item.categoria.trim(),
        marca: item.marca.trim() || 'Sin marca',
        proveedor_id: finalProveedorId,
        precio_costo: parseCurrency(item.precio_costo) || Math.round(parseCurrency(item.precio_total) / Math.max(1, parseInt(item.cantidad, 10) || 1)),
        precio_venta: parseCurrency(item.precio_venta),
        stock: Math.max(1, parseInt(item.cantidad, 10) || 1)
      }))

      const { error: insertError } = await supabase.from('productos').insert(payload)
      if (insertError) throw insertError

      const marcas = Array.from(new Set(payload.map(item => item.marca).filter(Boolean)))
      await Promise.all(marcas.map(nombre => supabase.from('marcas').insert({ nombre }).then(() => undefined)))

      onSuccess()
    } catch (err) {
      const message = getErrorMessage(err, 'No se pudo guardar el lote.')
      setError(message.includes('proveedor_id')
        ? 'Falta ejecutar la migracion de proveedores en Supabase antes de guardar productos con proveedor.'
        : message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={event => event.stopPropagation()} style={{ maxWidth: 960 }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>Factura OCR</h2>
          <button className="btn-secondary" onClick={onClose} style={{ width: 40, height: 40, minHeight: 40, minWidth: 40, padding: 0 }} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="form-group" style={{ background: 'rgba(133,113,122,0.04)', padding: 12, borderRadius: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={14} /> Configuracion OCR
          </label>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select value={model} onChange={event => setModel(event.target.value)}>
                {MODEL_PRESETS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
                {!MODEL_PRESETS.some(option => option.value === model) && (
                  <option value={model}>Personalizado</option>
                )}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input value={model} onChange={event => setModel(event.target.value)} placeholder="Modelo OpenRouter" />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Proveedor</label>
          {!usarProveedorNuevo ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={proveedorId} onChange={event => setProveedorId(event.target.value)} style={{ flex: 1 }}>
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(proveedor => (
                  <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>
                ))}
              </select>
              <button className="btn-secondary" onClick={() => setUsarProveedorNuevo(true)} style={{ padding: '0 12px', whiteSpace: 'nowrap' }}>
                <Plus size={16} /> Nuevo
              </button>
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input value={proveedorNombre} onChange={event => setProveedorNombre(event.target.value)} placeholder="Nombre proveedor" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input value={proveedorNit} onChange={event => setProveedorNit(event.target.value)} placeholder="NIT / documento" />
              </div>
              <button className="btn-secondary" onClick={() => setUsarProveedorNuevo(false)} style={{ padding: '0 12px', whiteSpace: 'nowrap' }}>
                Existente
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Fotos de factura</label>
          <div
            tabIndex={0}
            onPaste={handlePasteImages}
            onDrop={handleDropImages}
            onDragOver={event => {
              event.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            style={{
              border: `1.5px dashed ${dragActive ? 'var(--rosa-metalico)' : 'var(--gris-claro)'}`,
              borderRadius: 12,
              padding: 14,
              background: dragActive ? 'rgba(213,141,138,0.08)' : 'rgba(133,113,122,0.04)',
              outline: 'none'
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="btn-secondary" style={{ minHeight: 42, margin: 0, textTransform: 'none', letterSpacing: 0, cursor: imageDataUrls.length >= MAX_FACTURA_IMAGES ? 'not-allowed' : 'pointer', opacity: imageDataUrls.length >= MAX_FACTURA_IMAGES ? 0.55 : 1 }}>
                <Camera size={17} /> Foto
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={async event => {
                    await addImageFiles(Array.from(event.target.files || []))
                    event.currentTarget.value = ''
                  }}
                  style={{ display: 'none' }}
                  disabled={imageDataUrls.length >= MAX_FACTURA_IMAGES}
                />
              </label>
              <label className="btn-secondary" style={{ minHeight: 42, margin: 0, textTransform: 'none', letterSpacing: 0, cursor: imageDataUrls.length >= MAX_FACTURA_IMAGES ? 'not-allowed' : 'pointer', opacity: imageDataUrls.length >= MAX_FACTURA_IMAGES ? 0.55 : 1 }}>
                <Upload size={17} /> Archivo
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async event => {
                    await addImageFiles(Array.from(event.target.files || []))
                    event.currentTarget.value = ''
                  }}
                  style={{ display: 'none' }}
                  disabled={imageDataUrls.length >= MAX_FACTURA_IMAGES}
                />
              </label>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--sombra-malva)', fontSize: 12, fontWeight: 700 }}>
                <Clipboard size={15} /> Pegar o arrastrar
              </span>
              <button className="btn-primary" onClick={handleAnalyze} disabled={loadingOcr || imageDataUrls.length === 0}>
                <ScanLine size={17} /> {loadingOcr ? 'Leyendo...' : 'Leer OCR'}
              </button>
              {imageDataUrls.length > 0 && <span className="badge badge-success">{imageDataUrls.length}/{MAX_FACTURA_IMAGES} fotos</span>}
            </div>
          </div>
          {imageDataUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              {imageDataUrls.map((url, index) => (
                <div key={url} style={{ position: 'relative', width: 120, height: 120 }}>
                  <img src={url} alt={`Factura ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--gris-perla)' }} />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setImageDataUrls(prev => prev.filter((_, i) => i !== index))}
                    style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, minWidth: 28, minHeight: 28, padding: 0, borderRadius: 14 }}
                    aria-label="Quitar foto"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div style={{ color: 'var(--color-error)', background: 'var(--fondo-error)', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ overflowX: 'auto', border: '1px solid var(--gris-perla)', borderRadius: 12 }}>
          <table style={{ width: '100%', minWidth: 1040, borderCollapse: 'collapse', background: 'white' }}>
            <thead>
              <tr style={{ background: 'var(--gris-fondo)' }}>
                {['Producto', 'Categoria', 'Marca', 'Talla / Color', 'Cant.', 'Costo unit.', 'Total compra', 'Venta', ''].map(label => (
                  <th key={label} style={{ textAlign: 'left', padding: 10, fontSize: 12, color: 'var(--sombra-malva)', textTransform: 'uppercase' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td style={{ padding: 8, minWidth: 190 }}>
                    <input value={item.nombre} onChange={event => updateItem(item.id, { nombre: event.target.value, categoria: inferCategory(event.target.value, item.categoria) })} />
                  </td>
                  <td style={{ padding: 8, minWidth: 170 }}>
                    <input list="categorias-ocr" value={item.categoria} onChange={event => updateItem(item.id, { categoria: event.target.value })} />
                  </td>
                  <td style={{ padding: 8, minWidth: 140 }}>
                    <input value={item.marca} onChange={event => updateItem(item.id, { marca: event.target.value })} />
                  </td>
                  <td style={{ padding: 8, minWidth: 150 }}>
                    <input value={item.talla_color} onChange={event => updateItem(item.id, { talla_color: event.target.value })} />
                  </td>
                  <td style={{ padding: 8, width: 90 }}>
                    <input type="number" min="1" value={item.cantidad} onChange={event => updateItem(item.id, { cantidad: event.target.value })} />
                  </td>
                  <td style={{ padding: 8, minWidth: 120 }}>
                    <input inputMode="numeric" value={item.precio_costo} onChange={event => updateItem(item.id, { precio_costo: formatCurrency(event.target.value) })} />
                  </td>
                  <td style={{ padding: 8, minWidth: 120 }}>
                    <input inputMode="numeric" value={item.precio_total} onChange={event => updateItem(item.id, { precio_total: formatCurrency(event.target.value) })} />
                  </td>
                  <td style={{ padding: 8, minWidth: 120 }}>
                    <input inputMode="numeric" value={item.precio_venta} onChange={event => updateItem(item.id, { precio_venta: formatCurrency(event.target.value) })} />
                  </td>
                  <td style={{ padding: 8, width: 56 }}>
                    <button className="btn-secondary" onClick={() => setItems(prev => prev.filter(row => row.id !== item.id))} style={{ width: 40, height: 40, minWidth: 40, minHeight: 40, padding: 0 }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="categorias-ocr">
            {categoriasOptions.map(categoria => <option key={categoria} value={categoria} />)}
          </datalist>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => setItems(prev => [...prev, emptyItem()])}>
            <Plus size={17} /> Fila
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || items.length === 0}>
            <Save size={17} /> {saving ? 'Guardando...' : 'Guardar lote'}
          </button>
        </div>
      </div>
    </div>
  )
}
