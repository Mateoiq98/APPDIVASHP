import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Producto } from '../types'
import { Plus, Search } from 'lucide-react'

export default function Inventory() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [filtro, setFiltro] = useState<'todos' | 'disponibles' | 'agotados'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)

  const load = async () => {
    const { data } = await supabase.from('productos').select('*').order('nombre')
    if (data) setProductos(data)
  }

  useEffect(() => { load() }, [])

  const filtrados = productos.filter(p => {
    if (filtro === 'disponibles') return p.stock > 0
    if (filtro === 'agotados') return p.stock === 0
    return true
  }).filter(p => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return p.nombre.toLowerCase().includes(q) || p.talla_color.toLowerCase().includes(q)
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1>Inventario</h1>
        <button className="btn-primary" onClick={() => { setEditando(null); setShowForm(true) }} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={18} /> Nuevo
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={18} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--gris-claro)' }} />
        <input
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ paddingLeft: 38 }}
        />
      </div>

      <div className="filter-bar">
        {(['todos', 'disponibles', 'agotados'] as const).map(f => (
          <button
            key={f}
            className={`filter-btn ${filtro === f ? 'active' : ''}`}
            onClick={() => setFiltro(f)}
          >
            {f === 'todos' ? 'Todos' : f === 'disponibles' ? 'Disponibles' : 'Agotados'}
          </button>
        ))}
      </div>

      <div>
        {filtrados.map(p => (
          <div
            key={p.id}
            className="list-item"
            onClick={() => { setEditando(p); setShowForm(true) }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{p.nombre}</div>
              <div style={{ fontSize: 13, color: 'var(--sombra-malva)' }}>
                {p.talla_color} · ${p.precio_venta.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: p.stock > 0 ? 'var(--rosa-metalico)' : 'var(--rosa-vino)' }}>
                {p.stock} uds
              </div>
              <div style={{ fontSize: 12, color: 'var(--gris-claro)' }}>
                Costo: ${p.precio_costo.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div className="empty-state">
            <PackageIcon />
            <p>No hay productos</p>
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
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16.5 9.4 7.55 4.24" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.29 7 8.71 5 8.71-5" /><path d="M12 22V12" />
    </svg>
  )
}

function ProductoForm({ producto, onClose, onSuccess }: { producto: Producto | null; onClose: () => void; onSuccess: () => void }) {
  const [nombre, setNombre] = useState(producto?.nombre || '')
  const [tallaColor, setTallaColor] = useState(producto?.talla_color || '')
  const [precioCosto, setPrecioCosto] = useState(producto?.precio_costo.toString() || '')
  const [precioVenta, setPrecioVenta] = useState(producto?.precio_venta.toString() || '')
  const [stock, setStock] = useState(producto?.stock.toString() || '0')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!nombre || !tallaColor || !precioVenta) return
    setLoading(true)
    const payload = {
      nombre,
      talla_color: tallaColor,
      precio_costo: parseFloat(precioCosto) || 0,
      precio_venta: parseFloat(precioVenta),
      stock: parseInt(stock) || 0,
    }
    const { error } = producto
      ? await supabase.from('productos').update(payload).eq('id', producto.id)
      : await supabase.from('productos').insert(payload)
    setLoading(false)
    if (error) { alert('Error: ' + error.message); return }
    onSuccess()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>{producto ? 'Editar Producto' : 'Nuevo Producto'}</h2>
        <div className="form-group">
          <label>Nombre / Descripción</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Jean Azul" />
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
