import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Producto, Cliente } from '../types'
import { Plus, Minus, X } from 'lucide-react'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

interface ItemSeleccionado {
  producto: Producto
  cantidad: number
}

export default function VentaModal({ onClose, onSuccess }: Props) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'credito'>('efectivo')
  const [items, setItems] = useState<ItemSeleccionado[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('clientes').select('*').order('nombre'),
    ]).then(([p, c]) => {
      if (p.data) setProductos(p.data)
      if (c.data) setClientes(c.data)
    })
  }, [])

  const addProducto = (p: Producto) => {
    setItems(prev => {
      const existing = prev.find(i => i.producto.id === p.id)
      if (existing) {
        if (existing.cantidad >= p.stock) return prev
        return prev.map(i => i.producto.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { producto: p, cantidad: 1 }]
    })
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.producto.id !== id))
  }

  const changeCantidad = (id: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.producto.id !== id) return i
      const nueva = i.cantidad + delta
      if (nueva <= 0) return null as unknown as ItemSeleccionado
      if (nueva > i.producto.stock) return i
      return { ...i, cantidad: nueva }
    }).filter(Boolean) as ItemSeleccionado[])
  }

  const total = items.reduce((sum, i) => sum + i.producto.precio_venta * i.cantidad, 0)
  const estado = metodoPago === 'credito' ? 'pendiente' : 'pagado'

  const handleSubmit = async () => {
    if (!clienteId || items.length === 0) return
    setLoading(true)

    const { data: venta, error: errVenta } = await supabase.from('ventas').insert({
      cliente_id: clienteId,
      total_venta: total,
      estado,
      metodo_pago: metodoPago,
    }).select().single()

    if (errVenta || !venta) {
      alert('Error al crear venta: ' + (errVenta?.message || ''))
      setLoading(false)
      return
    }

    const detalles = items.map(i => ({
      venta_id: venta.id,
      producto_id: i.producto.id,
      cantidad: i.cantidad,
      precio_unitario: i.producto.precio_venta,
    }))

    const { error: errDetalles } = await supabase.from('detalles_ventas').insert(detalles)
    if (errDetalles) {
      alert('Error al registrar detalles: ' + errDetalles.message)
      setLoading(false)
      return
    }

    for (const item of items) {
      await supabase.rpc('descontar_stock', {
        p_producto_id: item.producto.id,
        p_cantidad: item.cantidad,
      })
    }

    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Nueva Venta</h2>

        <div className="form-group">
          <label>Clienta</label>
          <select value={clienteId} onChange={e => setClienteId(e.target.value)}>
            <option value="">Seleccionar clienta...</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Método de pago</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['efectivo', 'transferencia', 'credito'] as const).map(m => (
              <button
                key={m}
                className={`filter-btn ${metodoPago === m ? 'active' : ''}`}
                onClick={() => setMetodoPago(m)}
                style={{ flex: 1 }}
              >
                {m === 'efectivo' ? 'Efectivo' : m === 'transferencia' ? 'Transferencia' : 'Crédito'}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Productos</label>
          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
            {productos.filter(p => p.stock > 0).map(p => (
              <div key={p.id} className="product-select-item">
                <div className="info">
                  <div className="name">{p.nombre}</div>
                  <div className="detail">{p.talla_color} · ${p.precio_venta.toFixed(2)} · Stock: {p.stock}</div>
                </div>
                <button onClick={() => addProducto(p)} style={{ background: 'var(--rosa-claro)', color: 'var(--negro-elegante)' }}>
                  <Plus size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {items.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--sombra-malva)', display: 'block', marginBottom: 8 }}>
              Items seleccionados
            </label>
            {items.map(item => (
              <div key={item.producto.id} className="product-select-item">
                <div className="info">
                  <div className="name">{item.producto.nombre}</div>
                  <div className="detail">
                    ${(item.producto.precio_venta * item.cantidad).toFixed(2)}
                  </div>
                </div>
                <div className="actions">
                  <button onClick={() => changeCantidad(item.producto.id, -1)}><Minus size={16} /></button>
                  <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.cantidad}</span>
                  <button onClick={() => changeCantidad(item.producto.id, 1)}><Plus size={16} /></button>
                  <button onClick={() => removeItem(item.producto.id)} style={{ background: '#fee' }}><X size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '12px 0', borderTop: '1px solid var(--gris-perla)',
          fontSize: 18, fontWeight: 700, marginTop: 8,
        }}>
          <span>Total</span>
          <span style={{ color: 'var(--rosa-metalico)' }}>${total.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading || !clienteId || items.length === 0}
            style={{ flex: 1 }}
          >
            {loading ? 'Procesando...' : 'Confirmar Venta'}
          </button>
        </div>
      </div>
    </div>
  )
}
