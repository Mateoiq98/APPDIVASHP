import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Cliente, SaldoPendiente } from '../types'
import AbonoModal from '../components/AbonoModal'
import { Plus, Phone, Search } from 'lucide-react'

export default function Customers() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [saldos, setSaldos] = useState<SaldoPendiente[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showAbono, setShowAbono] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<{ id: string; nombre: string } | null>(null)
  const [tab, setTab] = useState<'todas' | 'deudoras'>('todas')

  const load = async () => {
    const [cRes, sRes] = await Promise.all([
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('vista_saldos_pendientes').select('*'),
    ])
    if (cRes.data) setClientes(cRes.data)
    if (sRes.data) setSaldos(sRes.data)
  }

  useEffect(() => { load() }, [])

  const deudaMap = new Map(saldos.map(s => [s.cliente_id, s]))
  const filtrados = clientes.filter(c => {
    if (tab === 'deudoras' && !deudaMap.has(c.id)) return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return c.nombre.toLowerCase().includes(q) || c.telefono.includes(q)
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1>Clientas</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={18} /> Nueva
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={18} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--gris-claro)' }} />
        <input
          placeholder="Buscar clienta..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ paddingLeft: 38 }}
        />
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${tab === 'todas' ? 'active' : ''}`} onClick={() => setTab('todas')}>Todas</button>
        <button className={`filter-btn ${tab === 'deudoras' ? 'active' : ''}`} onClick={() => setTab('deudoras')}>
          Con Deuda ({saldos.length})
        </button>
      </div>

      <div>
        {filtrados.map(c => {
          const deuda = deudaMap.get(c.id)
          return (
            <div
              key={c.id}
              className={`list-item ${deuda ? 'customer-debt' : ''} ${deuda && Number(deuda.saldo_pendiente) > 200 ? 'high' : ''}`}
              onClick={() => {
                if (deuda) {
                  setSelectedCliente({ id: c.id, nombre: c.nombre })
                  setShowAbono(true)
                }
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                <div style={{ fontSize: 13, color: 'var(--sombra-malva)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={12} /> {c.telefono || 'Sin teléfono'}
                </div>
              </div>
              {deuda && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--rosa-vino)', fontSize: 14 }}>
                    ${Number(deuda.saldo_pendiente).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--sombra-malva)' }}>adeuda</div>
                </div>
              )}
            </div>
          )
        })}
        {filtrados.length === 0 && (
          <div className="empty-state">
            <p>{tab === 'deudoras' ? 'No hay clientas con deuda' : 'No hay clientas registradas'}</p>
          </div>
        )}
      </div>

      {showForm && (
        <ClienteForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); load() }} />
      )}

      {showAbono && selectedCliente && (
        <AbonoModal
          clienteId={selectedCliente.id}
          clienteNombre={selectedCliente.nombre}
          onClose={() => { setShowAbono(false); setSelectedCliente(null) }}
          onSuccess={load}
        />
      )}
    </div>
  )
}

function ClienteForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!nombre) return
    setLoading(true)
    const { error } = await supabase.from('clientes').insert({ nombre, telefono })
    setLoading(false)
    if (error) { alert('Error: ' + error.message); return }
    onSuccess()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Nueva Clienta</h2>
        <div className="form-group">
          <label>Nombre</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" />
        </div>
        <div className="form-group">
          <label>Teléfono</label>
          <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="300 123 4567" type="tel" />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading || !nombre} style={{ flex: 1 }}>
            {loading ? 'Guardando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}
