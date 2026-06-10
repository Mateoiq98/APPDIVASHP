import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Producto } from '../types'
import { FileText, Plus, Search } from 'lucide-react'
import FacturaOcrModal from '../components/FacturaOcrModal'

type ProductoWithProveedor = Producto & {
  proveedores?: { nombre?: string } | null
}

const DEFAULT_CATEGORIAS = [
  'Vestidos de Novia',
  'Vestidos de Fiesta',
  'Prendas superiores',
  'Prendas inferiores',
  'Velo y Tocados',
  'Lencería / Interior',
  'Accesorios y Bisutería',
  'Calzado'
]

// Helpers de formateo para Peso Colombiano (COP)
const formatCOP = (val: number | string) => {
  if (val === undefined || val === null || val === '') return '$0'
  const num = typeof val === 'string' ? parseFloat(val) : val
  return '$' + Math.round(num).toLocaleString('es-CO')
}

const formatInputCurrency = (val: string | number) => {
  if (val === undefined || val === null || val === '') return ''
  const clean = val.toString().replace(/\D/g, '')
  if (!clean) return ''
  return Number(clean).toLocaleString('es-CO')
}

const parseCurrency = (val: string): number => {
  const clean = val.replace(/\D/g, '')
  return parseFloat(clean) || 0
}

// Helper para comprimir la imagen del lado del cliente
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 500
        const MAX_HEIGHT = 500
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
        resolve(dataUrl)
      }
      img.onerror = () => {
        reject(new Error('El archivo no es una imagen válida o está dañado.'))
      }
    }
    reader.onerror = (error) => reject(error)
  })
}

export default function Inventory() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [filtroStock, setFiltroStock] = useState<'todos' | 'disponibles' | 'agotados'>('todos')
  const [filtroCat, setFiltroCat] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showOcr, setShowOcr] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)
  
  // Estado para previsualizar foto grande
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const load = async () => {
    const { data, error } = await supabase.from('productos').select('*, proveedores(nombre)').order('nombre')
    if (!error && data) {
      setProductos((data as ProductoWithProveedor[]).map(p => ({
        ...p,
        proveedor_nombre: p.proveedores?.nombre || ''
      })))
      return
    }

    const fallback = await supabase.from('productos').select('*').order('nombre')
    if (fallback.data) setProductos(fallback.data)
  }

  useEffect(() => { load() }, [])

  const filtrados = productos.filter(p => {
    if (filtroStock === 'disponibles') return p.stock > 0
    if (filtroStock === 'agotados') return p.stock === 0
    return true
  }).filter(p => {
    if (filtroCat && p.categoria !== filtroCat) return false
    return true
  }).filter(p => {
    if (!busqueda) return true
    const keywords = busqueda.toLowerCase().split(/\s+/).filter(Boolean)
    if (keywords.length === 0) return true
    
    return keywords.every(kw => {
      const matchNombre = p.nombre.toLowerCase().includes(kw)
      const matchTallaColor = p.talla_color.toLowerCase().includes(kw)
      const matchMarca = p.marca ? p.marca.toLowerCase().includes(kw) : false
      const matchCategoria = p.categoria ? p.categoria.toLowerCase().includes(kw) : false
      return matchNombre || matchTallaColor || matchMarca || matchCategoria
    })
  })

  // Obtener categorías activas y combinarlas con las default
  const categoriasList = Array.from(new Set([
    ...DEFAULT_CATEGORIAS,
    ...productos.map(p => p.categoria).filter(Boolean)
  ])).sort()

  return (
    <div className="page">
      <div className="page-header">
        <h1>Inventario</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setShowOcr(true)} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40 }}>
            <FileText size={18} /> OCR
          </button>
          <button className="btn-primary" onClick={() => { setEditando(null); setShowForm(true) }} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40 }}>
            <Plus size={18} /> Nuevo
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--sombra-malva)', opacity: 0.7 }} />
        <input
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ paddingLeft: 42, background: 'white', border: '1.5px solid var(--gris-perla)' }}
        />
      </div>

      <div className="filter-bar">
        {(['todos', 'disponibles', 'agotados'] as const).map(f => (
          <button
            key={f}
            className={`filter-btn ${filtroStock === f ? 'active' : ''}`}
            onClick={() => setFiltroStock(f)}
          >
            {f === 'todos' ? 'Todos' : f === 'disponibles' ? 'Disponibles' : 'Agotados'}
          </button>
        ))}
      </div>

      {/* Categorías Dinámicas */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <button className={`filter-btn ${filtroCat === '' ? 'active' : ''}`} onClick={() => setFiltroCat('')}>Todas</button>
        {categoriasList.map(c => (
          <button
            key={c}
            className={`filter-btn ${filtroCat === c ? 'active' : ''}`}
            onClick={() => setFiltroCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtrados.map(p => {
          const isAgotado = p.stock === 0
          const isBajoStock = p.stock > 0 && p.stock <= 3
          
          return (
            <div
              key={p.id}
              className="list-item"
              onClick={() => { setEditando(p); setShowForm(true) }}
              style={{
                borderLeft: isAgotado 
                  ? '4px solid var(--color-error)' 
                  : isBajoStock 
                    ? '4px solid var(--color-alerta)' 
                    : '4px solid var(--rosa-claro)',
                display: 'flex',
                gap: 12,
                alignItems: 'center'
              }}
            >
              {/* Miniatura de la foto */}
              <div
                onClick={(e) => {
                  if (p.imagen) {
                    e.stopPropagation()
                    setPreviewImage(p.imagen)
                  }
                }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  background: 'var(--gris-perla)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  cursor: p.imagen ? 'zoom-in' : 'default',
                  border: '1px solid rgba(234, 231, 231, 0.7)'
                }}
              >
                {p.imagen ? (
                  <img src={p.imagen} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <PackageIcon />
                )}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--negro-elegante)' }}>{p.nombre}</span>
                  <span className={`badge ${isAgotado ? 'badge-danger' : isBajoStock ? 'badge-warning' : 'badge-success'}`}>
                    {isAgotado ? 'Agotado' : isBajoStock ? `${p.stock} uds (Bajo)` : `${p.stock} uds`}
                  </span>
                </div>
                
                <div style={{ fontSize: 13, color: 'var(--sombra-malva)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {p.marca && (
                    <span style={{ background: 'var(--gris-perla)', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: 'var(--sombra-malva)' }}>
                      {p.marca}
                    </span>
                  )}
                  <span style={{ fontWeight: 500 }}>{p.talla_color}</span>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span style={{ fontWeight: 700, color: 'var(--negro-elegante)' }}>
                    {formatCOP(p.precio_venta)}
                  </span>
                  {p.proveedor_nombre && (
                    <>
                      <span style={{ opacity: 0.4 }}>•</span>
                      <span style={{ fontWeight: 600 }}>Prov. {p.proveedor_nombre}</span>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, borderTop: '1px solid rgba(234, 231, 231, 0.4)', paddingTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--sombra-malva)', opacity: 0.8, fontWeight: 500 }}>
                    {p.categoria}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--sombra-malva)', opacity: 0.8 }}>
                    Costo: <strong style={{ fontWeight: 700, color: 'var(--negro-elegante)' }}>{formatCOP(p.precio_costo)}</strong>
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        
        {filtrados.length === 0 && (
          <div className="empty-state">
            <PackageIconLarge />
            <p>No hay productos registrados</p>
          </div>
        )}
      </div>

      {showForm && (
        <ProductoForm
          producto={editando}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load() }}
          categoriasExistentes={categoriasList}
        />
      )}

      {showOcr && (
        <FacturaOcrModal
          categorias={categoriasList}
          onClose={() => setShowOcr(false)}
          onSuccess={() => { setShowOcr(false); load() }}
        />
      )}

      {/* VISUALIZADOR DE FOTO GRANDE (LIGHTBOX MODAL) */}
      {previewImage && (
        <div 
          className="modal-overlay" 
          onClick={() => setPreviewImage(null)} 
          style={{ background: 'rgba(29, 25, 27, 0.9)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <img 
              src={previewImage} 
              alt="Ampliada" 
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} 
            />
            <button 
              className="btn-primary" 
              onClick={() => setPreviewImage(null)} 
              style={{ marginTop: 16, minHeight: 38, padding: '8px 24px', fontSize: 14 }}
            >
              Cerrar Foto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PackageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4 }}>
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.29 7 8.71 5 8.71-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function PackageIconLarge() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: 12 }}>
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.29 7 8.71 5 8.71-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function ProductoForm({ 
  producto, 
  onClose, 
  onSuccess,
  categoriasExistentes 
}: { 
  producto: Producto | null
  onClose: () => void
  onSuccess: () => void
  categoriasExistentes: string[]
}) {
  const [nombre, setNombre] = useState(producto?.nombre || '')
  const [tallaColor, setTallaColor] = useState(producto?.talla_color || '')
  
  // Categoría Dinámica
  const [categoriaSel, setCategoriaSel] = useState('')
  const [categoriaNueva, setCategoriaNueva] = useState('')
  const [usarNuevaCategoria, setUsarNuevaCategoria] = useState(false)

  const [marcaSel, setMarcaSel] = useState('')
  const [marcaNueva, setMarcaNueva] = useState('')
  const [marcasLista, setMarcasLista] = useState<{ id: string; nombre: string }[]>([])
  const [usarNueva, setUsarNueva] = useState(false)
  
  const [precioCosto, setPrecioCosto] = useState(formatInputCurrency(producto?.precio_costo || ''))
  const [precioVenta, setPrecioVenta] = useState(formatInputCurrency(producto?.precio_venta || ''))
  const [stock, setStock] = useState(producto?.stock.toString() || '0')
  
  const [imagen, setImagen] = useState(producto?.imagen || '')
  const [compressing, setCompressing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('marcas').select('*').order('nombre').then(r => {
      if (!r.data) return
      setMarcasLista(r.data)
      if (producto?.marca) {
        const existe = r.data.find(m => m.nombre === producto.marca)
        if (existe) {
          setMarcaSel(producto.marca)
        } else {
          setUsarNueva(true)
          setMarcaNueva(producto.marca)
        }
      }
    })

    // Cargar categoría inicial si edita
    if (producto?.categoria) {
      if (categoriasExistentes.includes(producto.categoria)) {
        setCategoriaSel(producto.categoria)
      } else {
        setUsarNuevaCategoria(true)
        setCategoriaNueva(producto.categoria)
      }
    }
  }, [producto, categoriasExistentes])

  const getMarca = () => usarNueva ? marcaNueva : marcaSel
  const getCategoria = () => usarNuevaCategoria ? categoriaNueva : categoriaSel

  const handleSubmit = async () => {
    const catFinal = getCategoria()
    if (!nombre || !tallaColor || !precioVenta || !catFinal) return
    setLoading(true)
    const marcaFinal = getMarca()
    if (!marcaFinal) return

    const payload = {
      nombre,
      talla_color: tallaColor,
      categoria: catFinal,
      marca: marcaFinal,
      precio_costo: parseCurrency(precioCosto),
      precio_venta: parseCurrency(precioVenta),
      stock: parseInt(stock) || 0,
      imagen
    }
    
    const { error } = producto
      ? await supabase.from('productos').update(payload).eq('id', producto.id)
      : await supabase.from('productos').insert(payload)
    if (error) { 
      setLoading(false)
      if (error.message.includes('column "imagen"') || error.message.includes('imagen')) {
        alert('Error: La columna "imagen" no existe en Supabase.\n\nDebes ir a la consola de Supabase (SQL Editor) y ejecutar este comando:\n\nALTER TABLE productos ADD COLUMN imagen text;')
      } else {
        alert('Error: ' + error.message)
      }
      return 
    }

    if (!marcasLista.find(m => m.nombre === marcaFinal)) {
      await supabase.from('marcas').insert({ nombre: marcaFinal })
    }

    setLoading(false)
    onSuccess()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2>{producto ? 'Editar Producto' : 'Nuevo Producto'}</h2>
        
        {/* SUBIDA DE FOTO CON COMPRESIÓN */}
        <div className="form-group" style={{ background: 'rgba(133,113,122,0.04)', padding: 12, borderRadius: 12 }}>
          <label style={{ fontSize: 12 }}>Foto del Producto (Compresión Automática)</label>
          
          {imagen ? (
            <div style={{ position: 'relative', width: 90, height: 90, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--gris-perla)', marginTop: 6 }}>
              <img src={imagen} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => setImagen('')}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.9)',
                  color: 'var(--color-error)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  padding: 0,
                  minWidth: 'unset',
                  minHeight: 'unset',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 6 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 42,
                  border: '1.5px dashed var(--gris-claro)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--sombra-malva)',
                  background: 'white',
                  textTransform: 'none',
                  letterSpacing: 'normal',
                  margin: 0
                }}
              >
                <Plus size={16} /> 
                {compressing ? 'Comprimiendo...' : 'Subir Foto'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    
                    if (!file.type.startsWith('image/')) {
                      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG).')
                      return
                    }
                    
                    setCompressing(true)
                    try {
                      const compressed = await compressImage(file)
                      setImagen(compressed)
                    } catch (err) {
                      console.error(err)
                      alert('Error al procesar la imagen: ' + (err instanceof Error ? err.message : 'Error desconocido'))
                    } finally {
                      setCompressing(false)
                    }
                  }}
                  style={{ display: 'none' }}
                  disabled={compressing}
                />
              </label>
            </div>
          )}
        </div>

        {/* Categoría Dinámica */}
        <div className="form-group">
          <label>Categoría</label>
          {!usarNuevaCategoria ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={categoriaSel} onChange={e => setCategoriaSel(e.target.value)} style={{ flex: 1 }}>
                <option value="">Seleccionar categoría...</option>
                {categoriasExistentes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setUsarNuevaCategoria(true)}
                style={{ padding: '0 12px', minWidth: 'unset', fontSize: 13, whiteSpace: 'nowrap' }}
              >
                + Nueva
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={categoriaNueva}
                onChange={e => setCategoriaNueva(e.target.value)}
                placeholder="Escribir nueva categoría..."
                style={{ flex: 1 }}
              />
              {categoriasExistentes.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setUsarNuevaCategoria(false)}
                  style={{ padding: '0 12px', minWidth: 'unset', fontSize: 13, whiteSpace: 'nowrap' }}
                >
                  Usar existente
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label>Nombre / Descripción</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Jean Azul" />
        </div>
        
        <div className="form-group">
          <label>Marca</label>
          {!usarNueva ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={marcaSel} onChange={e => setMarcaSel(e.target.value)} style={{ flex: 1 }}>
                <option value="">Seleccionar marca...</option>
                {marcasLista.map(m => (
                  <option key={m.id} value={m.nombre}>{m.nombre}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setUsarNueva(true)}
                style={{ padding: '0 12px', minWidth: 'unset', fontSize: 13, whiteSpace: 'nowrap' }}
              >
                + Nueva
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={marcaNueva}
                onChange={e => setMarcaNueva(e.target.value)}
                placeholder="Escribir nueva marca..."
                style={{ flex: 1 }}
              />
              {marcasLista.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setUsarNueva(false)}
                  style={{ padding: '0 12px', minWidth: 'unset', fontSize: 13, whiteSpace: 'nowrap' }}
                >
                  Usar existente
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label>Talla / Color</label>
          <input value={tallaColor} onChange={e => setTallaColor(e.target.value)} placeholder="Ej: M / Negro" />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Precio Costo ($)</label>
            <input 
              type="text" 
              inputMode="numeric"
              value={precioCosto} 
              onChange={e => setPrecioCosto(formatInputCurrency(e.target.value))} 
              placeholder="0"
            />
          </div>
          <div className="form-group">
            <label>Precio Venta ($)</label>
            <input 
              type="text" 
              inputMode="numeric"
              value={precioVenta} 
              onChange={e => setPrecioVenta(formatInputCurrency(e.target.value))} 
              placeholder="0"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Stock inicial</label>
          <input type="number" value={stock} onChange={e => setStock(e.target.value)} />
        </div>
        
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading || compressing || !nombre || !tallaColor || !precioVenta} style={{ flex: 1 }}>
            {loading ? 'Guardando...' : producto ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}
