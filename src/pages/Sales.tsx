import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Venta } from '../types'
import VentaModal from '../components/VentaModal'
import { Plus } from 'lucide-react'

export default function Sales() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [showModal, setShowModal] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('ventas')
      .select('*, clientes!inner(nombre)')
      .order('fecha_venta', { ascending: false })
      .limit(50)
    if (data) {
      setVentas(data.map((v: any) => ({ ...v, cliente_nombre: v.clientes?.nombre })))
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1>Ventas</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={18} /> Nueva
        </button>
      </div>

      <div>
        {ventas.map(v => (
          <div key={v.id} className="list-item">
            <div>
              <div style={{ fontWeight: 600 }}>{v.cliente_nombre || 'Sin nombre'}</div>
              <div style={{ fontSize: 13, color: 'var(--sombra-malva)' }}>
                {new Date(v.fecha_venta).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                {' · '}
                <span style={{ textTransform: 'capitalize' }}>{v.metodo_pago}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: 'var(--rosa-metalico)' }}>
                ${Number(v.total_venta).toFixed(2)}
              </div>
              <span className={`badge ${v.estado === 'pagado' ? 'badge-success' : 'badge-danger'}`}>
                {v.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
              </span>
            </div>
          </div>
        ))}
        {ventas.length === 0 && (
          <div className="empty-state">
            <p>No hay ventas registradas</p>
          </div>
        )}
      </div>

      {showModal && <VentaModal onClose={() => setShowModal(false)} onSuccess={load} />}
    </div>
  )
}
