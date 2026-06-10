import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Venta } from '../types'

export default function Reports() {
  const [ventas, setVentas] = useState<(Venta & { cliente_nombre?: string })[]>([])
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'todos'>('mes')

  const load = async () => {
    let query = supabase
      .from('ventas')
      .select('*, clientes!inner(nombre)')
      .order('fecha_venta', { ascending: false })

    const now = new Date()
    if (periodo === 'semana') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      query = query.gte('fecha_venta', weekAgo.toISOString())
    } else if (periodo === 'mes') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      query = query.gte('fecha_venta', monthStart.toISOString())
    }

    const { data } = await query.limit(200)
    if (data) {
      setVentas(data.map((v: any) => ({ ...v, cliente_nombre: v.clientes?.nombre })))
    }
  }

  useEffect(() => { load() }, [periodo])

  const totalVentas = ventas.reduce((s, v) => s + Number(v.total_venta), 0)
  const totalPagado = ventas.filter(v => v.estado === 'pagado').reduce((s, v) => s + Number(v.total_venta), 0)
  const totalCredito = ventas.filter(v => v.estado === 'pendiente').reduce((s, v) => s + Number(v.total_venta), 0)
  return (
    <div className="page">
      <div className="page-header">
        <h1>Reportes</h1>
      </div>

      <div className="filter-bar">
        {(['semana', 'mes', 'todos'] as const).map(p => (
          <button
            key={p}
            className={`filter-btn ${periodo === p ? 'active' : ''}`}
            onClick={() => setPeriodo(p)}
          >
            {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Todo'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Ventas Totales</div>
          <div className="stat-value">${totalVentas.toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-label">Recaudado</div>
            <div className="stat-value" style={{ fontSize: 22, color: '#2d6b4f' }}>
              ${totalPagado.toFixed(2)}
            </div>
          </div>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-label">En Crédito</div>
            <div className="stat-value" style={{ fontSize: 22, color: 'var(--rosa-vino)' }}>
              ${totalCredito.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Historial de Ventas</h2>
      {ventas.map(v => (
        <div key={v.id} className="list-item">
          <div>
            <div style={{ fontWeight: 600 }}>{v.cliente_nombre || 'Sin nombre'}</div>
            <div style={{ fontSize: 12, color: 'var(--sombra-malva)' }}>
              {new Date(v.fecha_venta).toLocaleDateString('es-CO')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700 }}>${Number(v.total_venta).toFixed(2)}</div>
            <span className={`badge ${v.estado === 'pagado' ? 'badge-success' : 'badge-danger'}`}>
              {v.metodo_pago}
            </span>
          </div>
        </div>
      ))}
      {ventas.length === 0 && (
        <div className="empty-state">
          <p>No hay ventas en este período</p>
        </div>
      )}
    </div>
  )
}
