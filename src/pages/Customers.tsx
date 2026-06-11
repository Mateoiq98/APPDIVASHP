import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Cliente, SaldoPendiente } from '../types'
import AbonoModal from '../components/AbonoModal'
import { Plus, Phone, Search } from 'lucide-react'
import { useBackButtonClose } from '../lib/useBackButtonClose'

// Helper de formateo para Peso Colombiano (COP)
const formatCOP = (val: number | string) => {
  if (val === undefined || val === null || val === '') return '$0'
  const num = typeof val === 'string' ? parseFloat(val) : val
  return '$' + Math.round(num).toLocaleString('es-CO')
}

const cleanPhoneNumber = (tel: string): string => {
  const digits = tel.replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('57')) return digits.slice(2)
  return digits
}

export default function Customers() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [saldos, setSaldos] = useState<SaldoPendiente[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showAbono, setShowAbono] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<{ id: string; nombre: string } | null>(null)
  const [tab, setTab] = useState<'todas' | 'deudoras'>('todas')
  const [showBatchAssistant, setShowBatchAssistant] = useState(false)
  const [loading, setLoading] = useState(false)
  const [contactsApiSupported, setContactsApiSupported] = useState(false)

  useBackButtonClose(showForm, () => setShowForm(false), 'cliente-form')
  useBackButtonClose(showAbono, () => {
    setShowAbono(false)
    setSelectedCliente(null)
  }, 'cliente-abono')
  useBackButtonClose(showBatchAssistant, () => setShowBatchAssistant(false), 'recordatorios-lote')

  useEffect(() => {
    setContactsApiSupported('contacts' in navigator && 'ContactsManager' in window)
  }, [])

  const load = async () => {
    const [cRes, sRes] = await Promise.all([
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('vista_saldos_pendientes').select('*'),
    ])
    if (cRes.data) setClientes(cRes.data)
    if (sRes.data) setSaldos(sRes.data)
  }

  useEffect(() => { load() }, [])

  const handleImportContacts = async () => {
    try {
      const props = ['name', 'tel']
      const opts = { multiple: true }
      
      const selectedContacts = await (navigator as any).contacts.select(props, opts)
      if (!selectedContacts || selectedContacts.length === 0) return
      
      setLoading(true)
      
      const { data: existingClients } = await supabase.from('clientes').select('*')
      const existingMap = new Map<string, string>()
      
      if (existingClients) {
        existingClients.forEach(c => {
          const clean = cleanPhoneNumber(c.telefono)
          if (clean) {
            existingMap.set(clean, c.id)
          }
        })
      }
      
      let inserts = 0
      let updates = 0
      
      for (const contact of selectedContacts) {
        const name = contact.name?.[0] || ''
        const rawTel = contact.tel?.[0] || ''
        
        if (!name || !rawTel) continue
        
        const cleanTel = cleanPhoneNumber(rawTel)
        if (!cleanTel) continue
        
        const existingId = existingMap.get(cleanTel)
        
        if (existingId) {
          await supabase
            .from('clientes')
            .update({ nombre: name, telefono: rawTel })
            .eq('id', existingId)
          updates++
        } else {
          await supabase
            .from('clientes')
            .insert({ nombre: name, telefono: rawTel })
          inserts++
        }
      }
      
      alert(`Importación exitosa: ${inserts} creados, ${updates} actualizados (sobrescritos).`)
      load()
    } catch (err: any) {
      console.error('Error al importar contactos:', err)
      if (err.name !== 'AbortError') {
        alert('Error al importar contactos: ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const deudaMap = new Map(saldos.map(s => [s.cliente_id, s]))
  const filtrados = clientes.filter(c => {
    if (tab === 'deudoras' && !deudaMap.has(c.id)) return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return c.nombre.toLowerCase().includes(q) || c.telefono.includes(q)
  })

  return (
    <div className="page">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h1>Clientas</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {contactsApiSupported && (
            <button 
              className="btn-secondary" 
              onClick={handleImportContacts} 
              disabled={loading}
              style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, minHeight: 40 }}
            >
              📱 Importar
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowForm(true)} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, minHeight: 40 }}>
            <Plus size={18} /> Nueva
          </button>
        </div>
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

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <button className={`filter-btn ${tab === 'todas' ? 'active' : ''}`} onClick={() => setTab('todas')}>Todas</button>
        <button className={`filter-btn ${tab === 'deudoras' ? 'active' : ''}`} onClick={() => setTab('deudoras')}>
          Con Deuda ({saldos.length})
        </button>
      </div>

      {tab === 'deudoras' && saldos.length > 0 && (
        <button 
          className="btn-primary" 
          onClick={() => setShowBatchAssistant(true)}
          style={{ width: '100%', marginBottom: 16, background: '#25D366', borderColor: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 40 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: 'currentColor' }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          Recordar Deudas en Lote ({saldos.length})
        </button>
      )}

      <div>
        {filtrados.map(c => {
          const deuda = deudaMap.get(c.id)
          const sTienda = deuda ? Number(deuda.saldo_pendiente_tienda) || 0 : 0
          const sServicio = deuda ? Number(deuda.saldo_pendiente_servicio) || 0 : 0
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
                {deuda && (
                  <div style={{ fontSize: 11, color: 'var(--sombra-malva)', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sTienda > 0 && <span>• Tienda: <strong>{formatCOP(sTienda)}</strong></span>}
                    {sServicio > 0 && <span>• Servicios: <strong>{formatCOP(sServicio)}</strong></span>}
                  </div>
                )}
              </div>
              {deuda && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--rosa-vino)', fontSize: 14 }}>
                      {formatCOP(deuda.saldo_pendiente)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--sombra-malva)' }}>adeuda</div>
                  </div>
                  {c.telefono && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        let tel = c.telefono.replace(/\D/g, '')
                        if (tel.length === 10) tel = '57' + tel
                        const mensaje = `Hola ${c.nombre}, te saludamos de Diva Shop. ✨ Te recordamos amablemente que tienes un saldo pendiente de ${formatCOP(deuda.saldo_pendiente)}. ¿Nos podrías confirmar si deseas abonar o pagar por transferencia? ¡Muchas gracias! 💖`
                        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, '_blank')
                      }}
                      style={{
                        background: '#25D366',
                        color: 'white',
                        border: 'none',
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        minWidth: 'unset',
                        minHeight: 'unset',
                        boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
                        cursor: 'pointer'
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: 'currentColor' }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    </button>
                  )}
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

      {showBatchAssistant && (
        <BatchReminderAssistant deudoras={saldos} onClose={() => setShowBatchAssistant(false)} />
      )}
    </div>
  )
}

function BatchReminderAssistant({ 
  deudoras, 
  onClose 
}: { 
  deudoras: SaldoPendiente[]
  onClose: () => void 
}) {
  const [index, setIndex] = useState(0)
  
  if (deudoras.length === 0) return null
  
  const current = deudoras[index]
  const totalDebtors = deudoras.length
  
  const handleSend = () => {
    if (!current) return
    
    let tel = current.telefono.replace(/\D/g, '')
    if (tel.length === 10) {
      tel = '57' + tel
    }
    
    const sTienda = Number(current.saldo_pendiente_tienda) || 0
    const sServicio = Number(current.saldo_pendiente_servicio) || 0
    
    let mensaje = `Hola ${current.nombre}, te saludamos de Diva Shop. ✨ Te recordamos amablemente que tienes un saldo pendiente de ${formatCOP(current.saldo_pendiente)}.`
    
    if (sTienda > 0 && sServicio > 0) {
      mensaje += ` Desglose: Tienda: ${formatCOP(sTienda)} y Servicios: ${formatCOP(sServicio)}.`
    }
    
    mensaje += ` ¿Nos podrías confirmar si deseas abonar o pagar por transferencia? ¡Muchas gracias! 💖`
    
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
    
    if (index < totalDebtors - 1) {
      setIndex(prev => prev + 1)
    } else {
      alert('¡Has finalizado el envío de recordatorios a todas las deudoras!')
      onClose()
    }
  }

  const handleSkip = () => {
    if (index < totalDebtors - 1) {
      setIndex(prev => prev + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (index > 0) {
      setIndex(prev => prev - 1)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ paddingBottom: 24 }}>
        <div className="modal-handle" />
        <h2 style={{ marginBottom: 4 }}>Cobro en Lote (Paso a Paso)</h2>
        <p style={{ fontSize: 13, color: 'var(--sombra-malva)', marginBottom: 16 }}>
          Cliente {index + 1} de {totalDebtors}
        </p>

        <div className="card" style={{ background: 'var(--gris-fondo)', marginBottom: 20, textAlign: 'center', padding: '20px 16px', border: '1px solid var(--gris-perla)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--negro-elegante)' }}>{current.nombre}</div>
          <div style={{ fontSize: 13, color: 'var(--sombra-malva)', marginTop: 4 }}>
            Teléfono: {current.telefono || 'Sin registrar'}
          </div>
          
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--rosa-vino)', margin: '14px 0 8px' }}>
            {formatCOP(current.saldo_pendiente)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--sombra-malva)', borderTop: '1px solid var(--gris-perla)', paddingTop: 10 }}>
            {Number(current.saldo_pendiente_tienda) > 0 && (
              <div>Tienda: <strong>{formatCOP(current.saldo_pendiente_tienda)}</strong></div>
            )}
            {Number(current.saldo_pendiente_servicio) > 0 && (
              <div>Servicios: <strong>{formatCOP(current.saldo_pendiente_servicio)}</strong></div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button className="btn-secondary" onClick={handlePrev} disabled={index === 0} style={{ flex: 1, minHeight: 42 }}>
            Anterior
          </button>
          <button className="btn-secondary" onClick={handleSkip} style={{ flex: 1, minHeight: 42 }}>
            Omitir
          </button>
        </div>

        <button 
          className="btn-primary" 
          onClick={handleSend} 
          disabled={!current.telefono}
          style={{ width: '100%', minHeight: 46, background: '#25D366', borderColor: '#25D366', color: 'white', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: 'currentColor' }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          {!current.telefono ? 'Sin Teléfono' : 'Enviar WhatsApp y Siguiente'}
        </button>

        <button className="btn-secondary" onClick={onClose} style={{ width: '100%', marginTop: 16 }}>
          Cerrar Asistente
        </button>
      </div>
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
