import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import FloatingActions from '../components/FloatingActions'
import VentaModal from '../components/VentaModal'
import AbonoModal from '../components/AbonoModal'
import type { SaldoPendiente } from '../types'
import { Coins, Package, TrendingUp, MessageCircle } from 'lucide-react'
import { useBackButtonClose } from '../lib/useBackButtonClose'

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

  useBackButtonClose(showVenta, () => setShowVenta(false), 'dashboard-venta')
  useBackButtonClose(showAbono, () => {
    setShowAbono(false)
    setSelectedDeuda(null)
  }, 'dashboard-abono')

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
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--rosa-metalico)' }}>Diva Shop</h1>
      </div>

      {/* Saludo y Fecha Dinámica */}
      <div style={{ marginBottom: 20, textAlign: 'left', padding: '0 4px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--negro-elegante)' }}>
          ¡Hola! ✨
        </h2>
        <p style={{ fontSize: 13, color: 'var(--sombra-malva)', fontWeight: 500, marginTop: 2, textTransform: 'capitalize' }}>
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
        {/* Card principal con degradado */}
        <div 
          className="stat-card" 
          style={{ 
            background: 'linear-gradient(135deg, var(--rosa-vino) 0%, var(--rosa-metalico) 100%)',
            color: 'white',
            padding: '24px 20px',
            borderRadius: '20px',
            boxShadow: '0 8px 20px rgba(149, 84, 91, 0.25)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'transform 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {/* Círculos decorativos de fondo en el card */}
          <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', zIndex: 0 }} />
          <div style={{ position: 'absolute', left: '-10px', top: '-30px', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', zIndex: 0 }} />
          
          <div style={{ zIndex: 1, textAlign: 'left' }}>
            <div className="stat-label" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              Total por Cobrar
            </div>
            <div className="stat-value" style={{ color: 'white', fontSize: 32, fontWeight: 800, marginTop: 6, letterSpacing: '-1px' }}>
              {formatCOP(totalPorCobrar)}
            </div>
          </div>
          <div style={{ 
            zIndex: 1, 
            background: 'rgba(255, 255, 255, 0.15)', 
            width: 48, 
            height: 48, 
            borderRadius: 14, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white'
          }}>
            <Coins size={24} />
          </div>
        </div>

        {/* Sub-cards */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div 
            className="stat-card" 
            style={{ 
              flex: 1, 
              background: 'white', 
              borderRadius: 16, 
              padding: 16, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-start',
              border: '1px solid rgba(234, 231, 231, 0.6)',
              boxShadow: 'var(--sombra-tarjeta)',
              position: 'relative',
              transition: 'transform 0.2s ease',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ color: 'var(--rosa-metalico)', background: 'rgba(182, 108, 112, 0.08)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Package size={18} />
            </div>
            <div className="stat-label" style={{ fontSize: 11, color: 'var(--sombra-malva)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              En Stock
            </div>
            <div className="stat-value" style={{ fontSize: 22, fontWeight: 800, color: 'var(--negro-elegante)', marginTop: 4 }}>
              {prendasStock} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--sombra-malva)' }}>uds</span>
            </div>
          </div>

          <div 
            className="stat-card" 
            style={{ 
              flex: 1, 
              background: 'white', 
              borderRadius: 16, 
              padding: 16, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-start',
              border: '1px solid rgba(234, 231, 231, 0.6)',
              boxShadow: 'var(--sombra-tarjeta)',
              position: 'relative',
              transition: 'transform 0.2s ease',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ color: 'var(--color-exito)', background: 'rgba(45, 107, 79, 0.08)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <TrendingUp size={18} />
            </div>
            <div className="stat-label" style={{ fontSize: 11, color: 'var(--sombra-malva)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Ventas del Mes
            </div>
            <div className="stat-value" style={{ fontSize: 20, fontWeight: 800, color: 'var(--negro-elegante)', marginTop: 4 }}>
              {formatCOP(gananciasMes)}
            </div>
          </div>
        </div>
      </div>

      {deudoras.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="table-header" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--negro-elegante)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Deudoras Recientes</span>
              <span style={{ fontSize: 11, background: 'var(--fondo-error)', color: 'var(--color-error)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                {deudoras.length} pendientes
              </span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deudoras.slice(0, 5).map(d => {
              const sTienda = Number(d.saldo_pendiente_tienda) || 0
              const sServicio = Number(d.saldo_pendiente_servicio) || 0
              const isHighDebt = Number(d.saldo_pendiente) > 200
              
              return (
                <div
                  key={d.cliente_id}
                  className={`list-item customer-debt ${isHighDebt ? 'high' : ''}`}
                  onClick={() => { setSelectedDeuda(d); setShowAbono(true) }}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '14px 16px',
                    borderRadius: 14,
                    borderLeft: isHighDebt ? '4px solid var(--rosa-vino)' : '4px solid var(--rosa-claro)',
                    background: isHighDebt ? '#fffafa' : 'white',
                    boxShadow: 'var(--sombra-tarjeta)',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                    margin: 0
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--negro-elegante)' }}>{d.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--sombra-malva)', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {sTienda > 0 && <span>• Tienda: <strong style={{ color: 'var(--negro-elegante)' }}>{formatCOP(sTienda)}</strong></span>}
                      {sServicio > 0 && <span>• Servicios: <strong style={{ color: 'var(--negro-elegante)' }}>{formatCOP(sServicio)}</strong></span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="badge badge-danger" style={{ alignSelf: 'center', margin: 0, fontWeight: 800, fontSize: 12, padding: '4px 10px' }}>
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
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          minWidth: 'unset',
                          minHeight: 'unset',
                          boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease'
                        }}
                      >
                        <MessageCircle size={15} style={{ fill: 'currentColor' }} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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
