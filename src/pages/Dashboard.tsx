import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import FloatingActions from '../components/FloatingActions'
import VentaModal from '../components/VentaModal'
import AbonoModal from '../components/AbonoModal'
import type { SaldoPendiente } from '../types'

// Helper de formateo para Peso Colombiano (COP)
const formatCOP = (val: number | string) => {
  if (val === undefined || val === null || val === '') return '$0'
  const num = typeof val === 'string' ? parseFloat(val) : val
  return '$' + Math.round(num).toLocaleString('es-CO')
}

export default function Dashboard() {
  const [totalPorCobrar, setTotalPorCobrar] = useState(0)
  const [prendasStock, setPrendasStock] = useState(0)
  const [gananciasMes, setGananciasMes] = useState(0)
  const [showVenta, setShowVenta] = useState(false)
  const [showAbono, setShowAbono] = useState(false)
  const [deudoras, setDeudoras] = useState<SaldoPendiente[]>([])
  const [selectedDeuda, setSelectedDeuda] = useState<SaldoPendiente | null>(null)

  const loadData = async () => {
    const [stockRes, ventasRes, saldosRes] = await Promise.all([
      supabase.from('productos').select('stock'),
      supabase.from('ventas').select('total_venta, fecha_venta, estado'),
      supabase.from('vista_saldos_pendientes').select('*'),
    ])

    if (stockRes.data) {
      setPrendasStock(stockRes.data.reduce((s, p) => s + p.stock, 0))
    }

    if (ventasRes.data) {
      const now = new Date()
      const mesActual = now.getMonth()
      const anioActual = now.getFullYear()
      const delMes = ventasRes.data.filter(v => {
        const d = new Date(v.fecha_venta)
        return d.getMonth() === mesActual && d.getFullYear() === anioActual
      })
      setGananciasMes(delMes.reduce((s, v) => s + Number(v.total_venta), 0))
    }

    if (saldosRes.data) {
      setDeudoras(saldosRes.data)
      setTotalPorCobrar(saldosRes.data.reduce((s, c) => s + Number(c.saldo_pendiente), 0))
    }
  }

  useEffect(() => { loadData() }, [])

  return (
    <div className="page">
      <div style={{ textAlign: 'center', padding: '20px 0 12px' }}>
        <img src="/logo.png" alt="Diva Shop" style={{ height: 60, marginBottom: 4 }} />
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--rosa-metalico)' }}>Diva Shop</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total por Cobrar</div>
          <div className="stat-value" style={{ color: 'var(--rosa-vino)' }}>
            {formatCOP(totalPorCobrar)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-label">Prendas en Stock</div>
            <div className="stat-value">{prendasStock}</div>
          </div>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-label">Ventas del Mes</div>
            <div className="stat-value">{formatCOP(gananciasMes)}</div>
          </div>
        </div>
      </div>

      {deudoras.length > 0 && (
        <div>
          <div className="table-header">
            <h2>Deudoras</h2>
          </div>
          {deudoras.slice(0, 5).map(d => {
            const sTienda = Number(d.saldo_pendiente_tienda) || 0
            const sServicio = Number(d.saldo_pendiente_servicio) || 0
            return (
              <div
                key={d.cliente_id}
                className={`list-item customer-debt ${Number(d.saldo_pendiente) > 200 ? 'high' : ''}`}
                onClick={() => { setSelectedDeuda(d); setShowAbono(true) }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{d.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--sombra-malva)', marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sTienda > 0 && <span>• Tienda: <strong>{formatCOP(sTienda)}</strong></span>}
                    {sServicio > 0 && <span>• Servicios: <strong>{formatCOP(sServicio)}</strong></span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge badge-danger" style={{ alignSelf: 'center', margin: 0 }}>
                    {formatCOP(d.saldo_pendiente)}
                  </span>
                  {d.telefono && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        let tel = d.telefono.replace(/\D/g, '')
                        if (tel.length === 10) tel = '57' + tel
                        const mensaje = `Hola ${d.nombre}, te saludamos de Diva Shop. ✨ Te recordamos amablemente que tienes un saldo pendiente de ${formatCOP(d.saldo_pendiente)}. ¿Nos podrías confirmar si deseas abonar o pagar por transferencia? ¡Muchas gracias! 💖`
                        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, '_blank')
                      }}
                      style={{
                        background: '#25D366',
                        color: 'white',
                        border: 'none',
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        minWidth: 'unset',
                        minHeight: 'unset',
                        boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)',
                        cursor: 'pointer'
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: 'currentColor' }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <FloatingActions onVenta={() => setShowVenta(true)} onAbono={() => setShowAbono(true)} />

      {showVenta && <VentaModal onClose={() => setShowVenta(false)} onSuccess={loadData} />}
      {showAbono && selectedDeuda && (
        <AbonoModal
          clienteId={selectedDeuda.cliente_id}
          clienteNombre={selectedDeuda.nombre}
          onClose={() => { setShowAbono(false); setSelectedDeuda(null) }}
          onSuccess={loadData}
        />
      )}
      {showAbono && !selectedDeuda && <AbonoListModal onClose={() => setShowAbono(false)} onSuccess={loadData} />}
    </div>
  )
}

function AbonoListModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [deudoras, setDeudoras] = useState<SaldoPendiente[]>([])
  const [selected, setSelected] = useState<SaldoPendiente | null>(null)

  useEffect(() => {
    supabase.from('vista_saldos_pendientes').select('*').then(r => {
      if (r.data) setDeudoras(r.data)
    })
  }, [])

  if (selected) {
    return (
      <AbonoModal
        clienteId={selected.cliente_id}
        clienteNombre={selected.nombre}
        onClose={() => setSelected(null)}
        onSuccess={onSuccess}
      />
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Seleccionar Clienta</h2>
        {deudoras.map(d => (
          <div
            key={d.cliente_id}
            className={`list-item customer-debt ${Number(d.saldo_pendiente) > 200 ? 'high' : ''}`}
            onClick={() => setSelected(d)}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{d.nombre}</div>
              <div style={{ fontSize: 13, color: 'var(--sombra-malva)' }}>
                Saldo: {formatCOP(d.saldo_pendiente)}
              </div>
            </div>
          </div>
        ))}
        {deudoras.length === 0 && (
          <div className="empty-state">No hay deudoras pendientes</div>
        )}
        <button className="btn-secondary" onClick={onClose} style={{ width: '100%', marginTop: 16 }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
