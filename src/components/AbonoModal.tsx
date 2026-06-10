import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  clienteId: string
  clienteNombre: string
  onClose: () => void
  onSuccess: () => void
}

export default function AbonoModal({ clienteId, clienteNombre, onClose, onSuccess }: Props) {
  const [monto, setMonto] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const valor = parseFloat(monto)
    if (!valor || valor <= 0) return
    setLoading(true)
    const { error } = await supabase.from('abonos').insert({
      cliente_id: clienteId,
      monto: valor,
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
        <h2>Registrar Abono</h2>
        <p style={{ marginBottom: 16, color: 'var(--sombra-malva)' }}>
          {clienteNombre}
        </p>
        <div className="form-group">
          <label>Monto del abono ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading || !monto}
            style={{ flex: 1 }}
          >
            {loading ? 'Guardando...' : 'Confirmar Abono'}
          </button>
        </div>
      </div>
    </div>
  )
}
