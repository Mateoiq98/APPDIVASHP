import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Producto } from '../types'
import { Plus, Search } from 'lucide-react'

const CATEGORIAS = [
  'Prendas superiores',
  'Prendas inferiores',
  'Vestidos y enterizos',
  'Ropa interior y lencería',
  'Ropa deportiva',
  'Trajes de baño y salidas de baño',
  'Calzado y Accesorios',
] as const

const CATEGORIA_LABELS: Record<string, string> = {
  'Prendas superiores': 'Superiores',
  'Prendas inferiores': 'Inferiores',
  'Vestidos y enterizos': 'Vestidos',
  'Ropa interior y lencería': 'Lencería/Interior',
  'Ropa deportiva': 'Deportiva',
  'Trajes de baño y salidas de baño': 'Trajes de Baño',
  'Calzado y Accesorios': 'Accesorios/Calzado',
}

export default function Inventory() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [filtroStock, setFiltroStock] = useState<'todos' | 'disponibles' | 'agotados'>('todos')
  const [filtroCat, setFiltroCat] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)

  const load = async () => {
    const { data } = await supabase.from('productos').select('*').order('nombre')
    if (data) setProductos(data)
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
    const q = busqueda.toLowerCase()
    return p.nombre.toLowerCase().includes(q) || p.talla_color.toLowerCase().includes(q) || (p.marca && p.marca.toLowerCase().includes(q))
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1>Inventario</h1>
        <button className="btn-primary" onClick={() => { setEditando(null); setShowForm(true) }} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40 }}>
          <Plus size={18} /> Nuevo
        </button>
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

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <button className={`filter-btn ${filtroCat === '' ? 'active' : ''}`} onClick={() => setFiltroCat('')}>Todas</button>
        {CATEGORIAS.map(c => (
          <button
            key={c}
            className={`filter-btn ${filtroCat === c ? 'active' : ''}`}
            onClick={() => setFiltroCat(c)}
          >
            {CATEGORIA_LABELS[c] || c}
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
                    : '4px solid var(--rosa-claro)'
              }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--negro-elegante)' }}>{p.nombre}</span>
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
                    ${p.precio_venta.toFixed(2)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, borderTop: '1px solid rgba(234, 231, 231, 0.4)', paddingTop: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--sombra-malva)', opacity: 0.8, fontWeight: 500 }}>
                    {p.categoria}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--sombra-malva)', opacity: 0.8 }}>
                    Costo: <strong style={{ fontWeight: 700, color: 'var(--negro-elegante)' }}>${p.precio_costo.toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        
        {filtrados.length === 0 && (
          <div className="empty-state">
            <PackageIcon />
            <p>No hay productos registrados</p>
          </div>
        )}
      </div>

      {showForm && (
        <ProductoForm
          producto={editando}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function PackageIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: 12 }}>
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.29 7 8.71 5 8.71-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

const SUBTIPO_SUGERENCIAS: Record<string, string[]> = {
  'Prendas superiores': ['Blusas', 'Camisas', 'Tops', 'Camisetas', 'Crop tops', 'Bodies', 'Suéteres', 'Chaquetas'],
  'Prendas inferiores': ['Pantalones', 'Faldas', 'Shorts', 'Bermudas'],
  'Vestidos y enterizos': ['Vestidos cortos', 'Vestidos largos', 'De gala', 'Casuales', 'Enterizos', 'Monos'],
  'Ropa interior y lencería': ['Brasieres', 'Panties', 'Bodies moldeadores', 'Pijamas', 'Ropa de descanso'],
  'Ropa deportiva': ['Leggings', 'Shorts deportivos', 'Tops de alto impacto', 'Chaquetas rompevientos', 'Sudaderas'],
  'Trajes de baño y salidas de baño': ['Bikinis', 'Enteros', 'Pareos', 'Kimonos', 'Vestidos de playa'],
  'Calzado y Accesorios': ['Botas', 'Tacones', 'Tenís', 'Sandalias', 'Bolsos', 'Cinturones', 'Bisutería'],
}

function ProductoForm({ producto, onClose, onSuccess }: { producto: Producto | null; onClose: () => void; onSuccess: () => void }) {
  const [nombre, setNombre] = useState(producto?.nombre || '')
  const [tallaColor, setTallaColor] = useState(producto?.talla_color || '')
  const [categoria, setCategoria] = useState(producto?.categoria || '')
  const [marcaSel, setMarcaSel] = useState('')
  const [marcaNueva, setMarcaNueva] = useState('')
  const [marcasLista, setMarcasLista] = useState<{ id: string; nombre: string }[]>([])
  const [usarNueva, setUsarNueva] = useState(false)
  const [precioCosto, setPrecioCosto] = useState(producto?.precio_costo.toString() || '')
  const [precioVenta, setPrecioVenta] = useState(producto?.precio_venta.toString() || '')
  const [stock, setStock] = useState(producto?.stock.toString() || '0')
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
  }, [])

  const getMarca = () => usarNueva ? marcaNueva : marcaSel

  const handleSubmit = async () => {
    if (!nombre || !tallaColor || !precioVenta) return
    setLoading(true)
    const marcaFinal = getMarca()
    if (!marcaFinal) return

    const payload = {
      nombre,
      talla_color: tallaColor,
      categoria,
      marca: marcaFinal,
      precio_costo: parseFloat(precioCosto) || 0,
      precio_venta: parseFloat(precioVenta),
      stock: parseInt(stock) || 0,
    }
    const { error } = producto
      ? await supabase.from('productos').update(payload).eq('id', producto.id)
      : await supabase.from('productos').insert(payload)
    if (error) { setLoading(false); alert('Error: ' + error.message); return }

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
        
        <div className="form-group">
          <label>Categoría</label>
          <select value={categoria} onChange={e => { setCategoria(e.target.value); setTallaColor('') }}>
            <option value="">Seleccionar categoría...</option>
            {CATEGORIAS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        
        {categoria && SUBTIPO_SUGERENCIAS[categoria] && (
          <div className="form-group">
            <label>Subcategoría / Tipo</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUBTIPO_SUGERENCIAS[categoria].map(s => (
                <button
                  key={s}
                  type="button"
                  className={`filter-btn ${tallaColor.includes(s) ? 'active' : ''}`}
                  onClick={() => setTallaColor(prev => prev === s ? '' : s)}
                  style={{ fontSize: 13, padding: '6px 12px', minHeight: 36 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        
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
            <input type="number" step="0.01" value={precioCosto} onChange={e => setPrecioCosto(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Precio Venta ($)</label>
            <input type="number" step="0.01" value={precioVenta} onChange={e => setPrecioVenta(e.target.value)} />
          </div>
        </div>
        
        <div className="form-group">
          <label>Stock inicial</label>
          <input type="number" value={stock} onChange={e => setStock(e.target.value)} />
        </div>
        
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading || !nombre || !tallaColor || !precioVenta} style={{ flex: 1 }}>
            {loading ? 'Guardando...' : producto ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}
