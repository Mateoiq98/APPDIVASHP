import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Cita, Servicio, Cliente } from '../types'
import { Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight, Settings } from 'lucide-react'

const HORAS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
] as const

const CATEGORIAS = ['cejas', 'pestañas', 'cabello'] as const

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

export default function Appointments() {
  const [activeTab, setActiveTab] = useState<'historial' | 'agenda' | 'servicios'>('historial')
  const [citas, setCitas] = useState<Cita[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  
  // Estados de carga y error de base de datos
  const [loading, setLoading] = useState(true)
  const [missingTables, setMissingTables] = useState(false)

  // Estados de la Agenda (Calendario)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedProf, setSelectedProf] = useState<'Sandra' | 'Hasly'>('Sandra')
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth())

  // Estados de Filtros de Historial
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'realizada' | 'pagada'>('todos')

  // Modales
  const [showCitaForm, setShowCitaForm] = useState(false)
  const [editandoCita, setEditandoCita] = useState<Cita | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Obtener citas
      const { data: citasData, error: citasError } = await supabase
        .from('citas')
        .select('*, clientes(nombre), servicios(nombre, categoria)')
        .order('fecha', { ascending: false })
        .order('hora', { ascending: true })

      if (citasError && (citasError.code === '42P01' || citasError.message.includes('does not exist'))) {
        setMissingTables(true)
        setLoading(false)
        return
      }

      // 2. Obtener servicios
      const { data: serviciosData } = await supabase
        .from('servicios')
        .select('*')
        .order('nombre')

      // 3. Obtener clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre')

      if (citasData) {
        setCitas(citasData.map((c: any) => ({
          ...c,
          cliente_nombre: c.clientes?.nombre || 'Sin clienta',
          servicio_nombre: c.servicios?.nombre || 'Sin servicio',
          servicio_categoria: c.servicios?.categoria
        })))
      }
      if (serviciosData) setServicios(serviciosData)
      if (clientesData) setClientes(clientesData)
      
      setMissingTables(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auxiliares del calendario
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1)
    const days: (Date | null)[] = []
    const startDay = date.getDay()
    
    // Relleno de días vacíos del mes anterior
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }
    
    while (date.getMonth() === month) {
      days.push(new Date(date))
      date.setDate(date.getDate() + 1)
    }
    
    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11)
        setCurrentYear(prev => prev - 1)
      } else {
        setCurrentMonth(prev => prev - 1)
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0)
        setCurrentYear(prev => prev + 1)
      } else {
        setCurrentMonth(prev => prev + 1)
      }
    }
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const formattedSelectedDateStr = selectedDate.toISOString().split('T')[0]

  // Citas de la agenda para el día y profesional seleccionado
  const appointmentsForSelectedDate = citas.filter(c => c.fecha === formattedSelectedDateStr && c.profesional === selectedProf)

  // Filtrado de historial
  const citasHistorial = citas.filter(c => {
    if (filtroEstado === 'todos') return true
    return c.estado === filtroEstado
  })

  if (missingTables) {
    return (
      <div className="page" style={{ paddingBottom: 100 }}>
        <div className="card" style={{ marginTop: 40, borderLeft: '4px solid var(--color-error)' }}>
          <Settings size={36} style={{ color: 'var(--color-error)', marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Se requiere migración de Supabase</h2>
          <p style={{ fontSize: 14, color: 'var(--sombra-malva)', lineHeight: 1.5, marginBottom: 16 }}>
            Las tablas <strong>citas</strong> y/o <strong>servicios</strong> no existen en tu base de datos de Supabase.
          </p>
          <div style={{ background: 'var(--gris-fondo)', padding: 12, borderRadius: 8, fontSize: 13, border: '1px solid var(--gris-perla)', marginBottom: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>Pasos para solucionar:</p>
            <ol style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Abre el panel de control de Supabase.</li>
              <li>Ve a la sección <strong>SQL Editor</strong>.</li>
              <li>Crea una consulta nueva (New Query).</li>
              <li>Copia y pega el contenido del archivo local <code style={{ background: '#eee', padding: '2px 4px', borderRadius: 4 }}>supabase/citas_schema.sql</code>.</li>
              <li>Haz clic en <strong>Run</strong> (Ejecutar).</li>
            </ol>
          </div>
          <button className="btn-primary" onClick={loadData} style={{ width: '100%' }}>
            Volver a verificar conexión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Cabecera del módulo */}
      <div className="page-header">
        <h1>Agenda de Citas</h1>
        <button 
          className="btn-primary" 
          onClick={() => { setEditandoCita(null); setShowCitaForm(true) }}
          style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40 }}
        >
          <Plus size={18} /> Nueva Cita
        </button>
      </div>

      {/* Pestañas Superiores */}
      <div className="filter-bar" style={{ marginBottom: 16, borderBottom: '1px solid var(--gris-perla)', paddingBottom: 8 }}>
        <button 
          className={`filter-btn ${activeTab === 'historial' ? 'active' : ''}`}
          onClick={() => setActiveTab('historial')}
          style={{ flex: 1 }}
        >
          Historial
        </button>
        <button 
          className={`filter-btn ${activeTab === 'agenda' ? 'active' : ''}`}
          onClick={() => setActiveTab('agenda')}
          style={{ flex: 1 }}
        >
          Agenda (Día)
        </button>
        <button 
          className={`filter-btn ${activeTab === 'servicios' ? 'active' : ''}`}
          onClick={() => setActiveTab('servicios')}
          style={{ flex: 1 }}
        >
          Servicios
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sombra-malva)' }}>
          Cargando agenda...
        </div>
      ) : (
        <>
          {/* VISTA 1: HISTORIAL (POR DEFECTO) */}
          {activeTab === 'historial' && (
            <div>
              {/* Filtros de Historial */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {(['todos', 'pendiente', 'realizada', 'pagada'] as const).map(est => (
                  <button
                    key={est}
                    className={`filter-btn ${filtroEstado === est ? 'active' : ''}`}
                    onClick={() => setFiltroEstado(est)}
                    style={{ fontSize: 12, padding: '6px 12px', minHeight: 34, flex: 1 }}
                  >
                    {est === 'todos' ? 'Todos' : est.charAt(0).toUpperCase() + est.slice(1)}
                  </button>
                ))}
              </div>

              {/* Listado */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {citasHistorial.map(cita => {
                  const labelEst = cita.estado === 'pagada' ? 'Pagada' : cita.estado === 'realizada' ? 'Realizada' : 'Pendiente'
                  const badgeClass = cita.estado === 'pagada' ? 'badge-success' : cita.estado === 'realizada' ? 'badge-warning' : 'badge-danger'
                  
                  return (
                    <div 
                      key={cita.id} 
                      className="list-item"
                      onClick={() => { setEditandoCita(cita); setShowCitaForm(true) }}
                      style={{ borderLeft: `4px solid ${cita.estado === 'pagada' ? 'var(--color-exito)' : 'var(--rosa-metalico)'}` }}
                    >
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 700, fontSize: 16 }}>{cita.cliente_nombre}</span>
                          <span className={`badge ${badgeClass}`}>{labelEst}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--sombra-malva)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ background: 'var(--gris-perla)', padding: '2px 6px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                            {cita.profesional}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--negro-elegante)' }}>
                            {cita.servicio_nombre}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(234, 231, 231, 0.4)' }}>
                          <span style={{ fontSize: 12, color: 'var(--sombra-malva)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CalendarIcon size={12} /> {new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                            {' · '}
                            <Clock size={12} /> {cita.hora}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--negro-elegante)', fontSize: 14 }}>
                            {formatCOP(cita.valor)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {citasHistorial.length === 0 && (
                  <div className="empty-state">
                    <CalendarIcon size={48} style={{ opacity: 0.5, marginBottom: 12 }} />
                    <p>No se encontraron citas en el historial</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA 2: AGENDA (CALENDARIO + HORAS GOOGLE CALENDAR) */}
          {activeTab === 'agenda' && (
            <div>
              {/* Selector de profesional */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {(['Sandra', 'Hasly'] as const).map(prof => (
                  <button
                    key={prof}
                    className={`btn-secondary ${selectedProf === prof ? 'btn-primary' : ''}`}
                    onClick={() => setSelectedProf(prof)}
                    style={{ flex: 1, height: 40 }}
                  >
                    Agenda {prof}
                  </button>
                ))}
              </div>

              {/* Calendario */}
              <div className="card" style={{ padding: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <button onClick={() => navigateMonth('prev')} style={{ background: 'none', minWidth: 32, minHeight: 32 }}>
                    <ChevronLeft size={20} />
                  </button>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                  <button onClick={() => navigateMonth('next')} style={{ background: 'none', minWidth: 32, minHeight: 32 }}>
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--sombra-malva)', marginBottom: 4 }}>
                  <span>Do</span><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {getDaysInMonth(currentYear, currentMonth).map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />
                    const isSelected = selectedDate.getDate() === day.getDate() && selectedDate.getMonth() === day.getMonth() && selectedDate.getFullYear() === day.getFullYear()
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        style={{
                          minWidth: 32,
                          minHeight: 32,
                          height: 32,
                          borderRadius: '50%',
                          fontSize: 13,
                          fontWeight: isSelected ? 700 : 500,
                          background: isSelected ? 'var(--rosa-metalico)' : 'transparent',
                          color: isSelected ? 'white' : 'var(--negro-elegante)',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {day.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Agenda por Horas */}
              <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ borderBottom: '1px solid var(--gris-perla)', paddingBottom: 6, marginBottom: 6, fontSize: 13, fontWeight: 700, color: 'var(--sombra-malva)' }}>
                  Bloques para el {selectedDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>

                {HORAS.map(hora => {
                  const citaEnHora = appointmentsForSelectedDate.find(c => c.hora === hora)
                  
                  return (
                    <div key={hora} style={{ display: 'flex', gap: 12, alignItems: 'center', minHeight: 56, borderBottom: '1px solid rgba(234,231,231,0.5)', paddingBottom: 6 }}>
                      <div style={{ width: 45, fontSize: 13, fontWeight: 700, color: 'var(--sombra-malva)' }}>
                        {hora}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        {citaEnHora ? (
                          <div
                            onClick={() => { setEditandoCita(citaEnHora); setShowCitaForm(true) }}
                            style={{
                              background: citaEnHora.estado === 'pagada' ? 'var(--fondo-exito)' : 'rgba(213, 141, 138, 0.12)',
                              color: citaEnHora.estado === 'pagada' ? 'var(--color-exito)' : 'var(--negro-elegante)',
                              borderLeft: `3px solid ${citaEnHora.estado === 'pagada' ? 'var(--color-exito)' : 'var(--rosa-metalico)'}`,
                              borderRadius: 8,
                              padding: '8px 12px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{citaEnHora.cliente_nombre}</div>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>{citaEnHora.servicio_nombre}</div>
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                              {formatCOP(citaEnHora.valor)}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditandoCita(null)
                              setSelectedDate(selectedDate)
                              setShowCitaForm(true)
                              setTimeout(() => {
                                const selectHora = document.getElementById('form-hora') as HTMLSelectElement
                                if (selectHora) selectHora.value = hora
                              }, 50)
                            }}
                            style={{
                              width: '100%',
                              height: 38,
                              background: 'transparent',
                              border: '1px dashed var(--gris-claro)',
                              borderRadius: 8,
                              color: 'var(--sombra-malva)',
                              fontSize: 12,
                              fontWeight: 500,
                              justifyContent: 'flex-start',
                              paddingLeft: 12
                            }}
                          >
                            + Libre
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* VISTA 3: SERVICIOS (GESTIÓN DE SERVICIOS) */}
          {activeTab === 'servicios' && (
            <div>
              {/* Formulario de Nuevo Servicio */}
              <div className="card" style={{ padding: 16, marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Agregar Nuevo Servicio</h3>
                <ServicioFormForm onSuccess={loadData} />
              </div>

              {/* Categorías y servicios */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {CATEGORIAS.map(cat => {
                  const serviciosCat = servicios.filter(s => s.categoria === cat)
                  
                  return (
                    <div key={cat} className="card" style={{ padding: 16 }}>
                      <h4 style={{ textTransform: 'capitalize', fontWeight: 800, fontSize: 15, borderBottom: '1.5px solid var(--gris-perla)', paddingBottom: 6, marginBottom: 8, color: 'var(--rosa-metalico)' }}>
                        {cat} ({serviciosCat.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {serviciosCat.map(s => (
                          <div 
                            key={s.id} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '8px 0', 
                              borderBottom: '1px solid rgba(234,231,231,0.3)' 
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{s.nombre}</span>
                            <button
                              onClick={async () => {
                                if (confirm(`¿Estás seguro de eliminar el servicio "${s.nombre}"?`)) {
                                  const { error } = await supabase.from('servicios').delete().eq('id', s.id)
                                  if (error) alert('Error: ' + error.message)
                                  else loadData()
                                }
                              }}
                              style={{ 
                                color: 'var(--color-error)', 
                                background: 'transparent', 
                                minWidth: 24, 
                                minHeight: 24, 
                                fontSize: 12, 
                                padding: 0 
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        ))}
                        {serviciosCat.length === 0 && (
                          <div style={{ fontSize: 13, color: 'var(--sombra-malva)', fontStyle: 'italic', padding: '4px 0' }}>
                            Sin servicios creados
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* FORMULARIO DE CITA (BOTTOM SHEET) */}
      {showCitaForm && (
        <CitaFormSheet
          cita={editandoCita}
          defaultDate={selectedDate}
          clientes={clientes}
          servicios={servicios}
          onClose={() => setShowCitaForm(false)}
          onSuccess={() => { setShowCitaForm(false); loadData() }}
        />
      )}
    </div>
  )
}

/* FORMULARIO DE CREACIÓN DE SERVICIOS */
function ServicioFormForm({ onSuccess }: { onSuccess: () => void }) {
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState<'cejas' | 'pestañas' | 'cabello'>('cejas')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return

    setLoading(true)
    const { error } = await supabase
      .from('servicios')
      .insert({ nombre: nombre.trim(), categoria })

    setLoading(false)
    if (error) {
      if (error.code === '23505') {
        alert('Este servicio ya existe en esta categoría')
      } else {
        alert('Error: ' + error.message)
      }
      return
    }
    setNombre('')
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="form-row">
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label style={{ fontSize: 11 }}>Categoría</label>
          <select 
            value={categoria} 
            onChange={e => setCategoria(e.target.value as any)}
            style={{ minHeight: 38, fontSize: 14 }}
          >
            {CATEGORIAS.map(cat => (
              <option key={cat} value={cat}>{cat.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
          <label style={{ fontSize: 11 }}>Nombre del Servicio</label>
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Keratina, Perfilado..."
            style={{ minHeight: 38, fontSize: 14 }}
          />
        </div>
      </div>
      <button 
        type="submit" 
        className="btn-primary" 
        disabled={loading || !nombre.trim()}
        style={{ minHeight: 36, padding: '8px 12px', fontSize: 13, width: '100%', marginTop: 4 }}
      >
        {loading ? 'Guardando...' : 'Guardar Servicio'}
      </button>
    </form>
  )
}

/* FORMULARIO / EDICIÓN DE CITA (BOTTOM SHEET) */
function CitaFormSheet({ 
  cita, 
  defaultDate, 
  clientes, 
  servicios, 
  onClose, 
  onSuccess 
}: { 
  cita: Cita | null
  defaultDate: Date
  clientes: Cliente[]
  servicios: Servicio[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [profesional, setProfesional] = useState<'Sandra' | 'Hasly'>(cita?.profesional || 'Sandra')
  const [fecha, setFecha] = useState(cita?.fecha || defaultDate.toISOString().split('T')[0])
  const [hora, setHora] = useState(cita?.hora || '09:00')
  const [clienteId, setClienteId] = useState(cita?.cliente_id || '')
  
  const [categoria, setCategoria] = useState<'cejas' | 'pestañas' | 'cabello'>('cejas')
  const [servicioId, setServicioId] = useState(cita?.servicio_id || '')
  
  // Usar formato de COP para inicializar el input
  const [valor, setValor] = useState(formatInputCurrency(cita?.valor || ''))
  const [estado, setEstado] = useState<'pendiente' | 'realizada' | 'pagada'>(cita?.estado || 'pendiente')
  const [loading, setLoading] = useState(false)

  const [creandoCliente, setCreandoCliente] = useState(false)
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('')
  const [nuevoClienteTel, setNuevoClienteTel] = useState('')

  useEffect(() => {
    if (cita && servicios.length > 0) {
      const s = servicios.find(srv => srv.id === cita.servicio_id)
      if (s) {
        setCategoria(s.categoria)
      }
    }
  }, [cita, servicios])

  const servicesFiltered = servicios.filter(s => s.categoria === categoria)

  const handleCreateCliente = async () => {
    if (!nuevoClienteNombre.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .insert({ nombre: nuevoClienteNombre.trim(), telefono: nuevoClienteTel.trim() })
      .select()
    
    setLoading(false)
    if (error) {
      alert('Error al crear clienta: ' + error.message)
      return
    }
    if (data && data[0]) {
      setClienteId(data[0].id)
      setCreandoCliente(false)
      setNuevoClienteNombre('')
      setNuevoClienteTel('')
      alert('Clienta agregada con éxito')
      onSuccess()
    }
  }

  const handleSubmit = async () => {
    if (!clienteId || !servicioId || !fecha || !hora) {
      alert('Por favor completa los campos requeridos')
      return
    }

    setLoading(true)
    const payload = {
      profesional,
      cliente_id: clienteId,
      servicio_id: servicioId,
      fecha,
      hora,
      estado,
      valor: parseCurrency(valor)
    }

    const { error } = cita
      ? await supabase.from('citas').update(payload).eq('id', cita.id)
      : await supabase.from('citas').insert(payload)

    setLoading(false)
    if (error) {
      alert('Error al guardar cita: ' + error.message)
      return
    }
    onSuccess()
  }

  const handleDelete = async () => {
    if (!cita) return
    if (confirm('¿Estás seguro de cancelar esta cita?')) {
      setLoading(true)
      const { error } = await supabase.from('citas').delete().eq('id', cita.id)
      setLoading(false)
      if (error) alert('Error: ' + error.message)
      else onSuccess()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2>{cita ? 'Editar Cita' : 'Programar Nueva Cita'}</h2>

        <div className="form-group">
          <label>Profesional</label>
          <select value={profesional} onChange={e => setProfesional(e.target.value as any)}>
            <option value="Sandra">Sandra (Por defecto)</option>
            <option value="Hasly">Hasly</option>
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Hora</label>
            <select id="form-hora" value={hora} onChange={e => setHora(e.target.value)}>
              {HORAS.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clientas */}
        <div className="form-group" style={{ background: 'rgba(133,113,122,0.04)', padding: 12, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ margin: 0 }}>Clienta</label>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCreandoCliente(!creandoCliente)}
              style={{ minHeight: 28, minWidth: 70, height: 28, fontSize: 12, padding: '0 8px' }}
            >
              {creandoCliente ? 'Elegir Existente' : '+ Nueva clienta'}
            </button>
          </div>

          {!creandoCliente ? (
            <select value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">Seleccionar clienta...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {c.telefono && `(${c.telefono})`}</option>
              ))}
            </select>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                value={nuevoClienteNombre}
                onChange={e => setNuevoClienteNombre(e.target.value)}
                placeholder="Nombre de la nueva clienta"
                style={{ minHeight: 38, fontSize: 14 }}
              />
              <input
                value={nuevoClienteTel}
                onChange={e => setNuevoClienteTel(e.target.value)}
                placeholder="Teléfono (Ej. 3001234567)"
                type="tel"
                style={{ minHeight: 38, fontSize: 14 }}
              />
              <button
                type="button"
                className="btn-success"
                onClick={handleCreateCliente}
                disabled={loading || !nuevoClienteNombre.trim()}
                style={{ minHeight: 34, height: 34, fontSize: 12, padding: '0 12px', width: '100%' }}
              >
                Guardar Clienta Nueva
              </button>
            </div>
          )}
        </div>

        {/* Categoría y Servicio */}
        <div className="form-group" style={{ background: 'rgba(133,113,122,0.04)', padding: 12, borderRadius: 12 }}>
          <label>1. Categoría de Servicio</label>
          <select value={categoria} onChange={e => { setCategoria(e.target.value as any); setServicioId('') }}>
            {CATEGORIAS.map(cat => (
              <option key={cat} value={cat}>{cat.toUpperCase()}</option>
            ))}
          </select>

          <label style={{ marginTop: 10, display: 'block' }}>2. Servicio</label>
          <select value={servicioId} onChange={e => setServicioId(e.target.value)}>
            <option value="">Seleccionar servicio...</option>
            {servicesFiltered.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
          
          {servicesFiltered.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--color-error)', marginTop: 4, fontStyle: 'italic' }}>
              No hay servicios en esta categoría. Agrega uno primero en la pestaña "Servicios".
            </p>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Valor del servicio ($)</label>
            <input 
              type="text" 
              inputMode="numeric"
              value={valor} 
              onChange={e => setValor(formatInputCurrency(e.target.value))} 
              placeholder="Ej: 35.000" 
            />
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value as any)}>
              <option value="pendiente">Pendiente</option>
              <option value="realizada">Realizada</option>
              <option value="pagada">Pagada</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {cita && (
            <button 
              type="button" 
              className="btn-danger" 
              onClick={handleDelete}
              disabled={loading}
              style={{ flex: 1, background: 'var(--color-error)' }}
            >
              Eliminar
            </button>
          )}
          <button 
            className="btn-secondary" 
            onClick={onClose} 
            disabled={loading}
            style={{ flex: 1 }}
          >
            Cancelar
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSubmit} 
            disabled={loading || !clienteId || !servicioId} 
            style={{ flex: 2 }}
          >
            {loading ? 'Guardando...' : cita ? 'Actualizar' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}
