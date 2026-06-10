import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  clienteId: string
  clienteNombre: string
  onClose: () => void
  onSuccess: () => void
}

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

export default function AbonoModal({ clienteId, clienteNombre, onClose, onSuccess }: Props) {
  const [monto, setMonto] = useState('')
  const [destino, setDestino] = useState<'tienda' | 'servicio'>('tienda')
  const [loading, setLoading] = useState(false)
  const [cargandoSaldos, setCargandoSaldos] = useState(true)
  
  // Saldos individuales cargados desde la vista
  const [saldos, setSaldos] = useState<{ tienda: number; servicio: number }>({ tienda: 0, servicio: 0 })

  useEffect(() => {
    supabase.from('vista_saldos_pendientes')
      .select('saldo_pendiente_tienda, saldo_pendiente_servicio')
      .eq('cliente_id', clienteId)
      .maybeSingle()
      .then(r => {
        if (r.data) {
          const sTienda = Number(r.data.saldo_pendiente_tienda) || 0
          const sServicio = Number(r.data.saldo_pendiente_servicio) || 0
          setSaldos({ tienda: sTienda, servicio: sServicio })
          
          // Pre-seleccionar el destino que tenga deuda activa
          if (sTienda === 0 && sServicio > 0) {
            setDestino('servicio')
          } else {
            setDestino('tienda')
          }
        }
        setCargandoSaldos(false)
      })
  }, [clienteId])

  const handleSubmit = async () => {
    const valor = parseCurrency(monto)
    if (!valor || valor <= 0) return
    
    // Validación de seguridad para no abonar más de la deuda actual
    const deudaMaxima = destino === 'tienda' ? saldos.tienda : saldos.servicio
    if (deudaMaxima > 0 && valor > deudaMaxima) {
      if (!confirm(`El abono (${formatCOP(valor)}) supera la deuda actual en ${destino === 'tienda' ? 'Tienda' : 'Servicios'} (${formatCOP(deudaMaxima)}). ¿Deseas registrarlo de todas formas?`)) {
        return
      }
    }

    setLoading(true)
    const { error } = await supabase.from('abonos').insert({
      cliente_id: clienteId,
      monto: valor,
      destino: destino
    })
    setLoading(false)
    if (error) {
      alert('Error al registrar abono: ' + error.message)
      return
    }
    onSuccess()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2>Registrar Abono</h2>
        
        <p style={{ marginBottom: 12, color: 'var(--sombra-malva)', fontWeight: 700, fontSize: 16 }}>
          {clienteNombre}
        </p>

        {cargandoSaldos ? (
          <div style={{ fontSize: 13, color: 'var(--sombra-malva)', marginBottom: 16 }}>
            Consultando deudas pendientes...
          </div>
        ) : (
          <div style={{ background: 'var(--gris-fondo)', padding: 12, borderRadius: 12, border: '1px solid var(--gris-perla)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Deuda Tienda (Ropa):</span>
              <strong style={{ color: saldos.tienda > 0 ? 'var(--rosa-vino)' : 'var(--sombra-malva)' }}>
                {formatCOP(saldos.tienda)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Deuda Servicios (Estilismo):</span>
              <strong style={{ color: saldos.servicio > 0 ? 'var(--rosa-metalico)' : 'var(--sombra-malva)' }}>
                {formatCOP(saldos.servicio)}
              </strong>
            </div>
          </div>
        )}

        {/* Destino del Abono */}
        <div className="form-group">
          <label>Destino del Abono</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`filter-btn ${destino === 'tienda' ? 'active' : ''}`}
              onClick={() => setDestino('tienda')}
              style={{ flex: 1, height: 40 }}
              disabled={saldos.tienda === 0 && saldos.servicio > 0}
            >
              A Tienda {saldos.tienda > 0 && `(${formatCOP(saldos.tienda)})`}
            </button>
            <button
              type="button"
              className={`filter-btn ${destino === 'servicio' ? 'active' : ''}`}
              onClick={() => setDestino('servicio')}
              style={{ flex: 1, height: 40 }}
              disabled={saldos.servicio === 0 && saldos.tienda > 0}
            >
              A Servicios {saldos.servicio > 0 && `(${formatCOP(saldos.servicio)})`}
            </button>
          </div>
        </div>

        {/* Monto */}
        <div className="form-group">
          <label>Monto a Abonar ($)</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={monto}
            onChange={e => setMonto(formatInputCurrency(e.target.value))}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading || cargandoSaldos || !monto}
            style={{ flex: 1 }}
          >
            {loading ? 'Guardando...' : 'Confirmar Abono'}
          </button>
        </div>
      </div>
    </div>
  )
}
