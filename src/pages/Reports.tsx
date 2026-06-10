import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Venta, Cita } from '../types'
import { ShoppingBag, Sparkles, TrendingUp, Calendar } from 'lucide-react'

// Helper de formateo para Peso Colombiano (COP)
const formatCOP = (val: number | string) => {
  if (val === undefined || val === null || val === '') return '$0'
  const num = typeof val === 'string' ? parseFloat(val) : val
  return '$' + Math.round(num).toLocaleString('es-CO')
}

export default function Reports() {
  const [ventas, setVentas] = useState<(Venta & { cliente_nombre?: string; detalles_ventas?: any[] })[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'todos'>('mes')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const now = new Date()

    // Consulta Ventas con detalles y categoría de productos
    let ventasQuery = supabase
      .from('ventas')
      .select('*, clientes!inner(nombre), detalles_ventas(cantidad, precio_unitario, productos(categoria, nombre))')
      .order('fecha_venta', { ascending: false })

    // Consulta Citas
    let citasQuery = supabase
      .from('citas')
      .select('*, clientes(nombre), servicios(nombre, categoria)')
      .order('fecha', { ascending: false })

    if (periodo === 'semana') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      ventasQuery = ventasQuery.gte('fecha_venta', weekAgo.toISOString())
      citasQuery = citasQuery.gte('fecha', weekAgo.toISOString().split('T')[0])
    } else if (periodo === 'mes') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      ventasQuery = ventasQuery.gte('fecha_venta', monthStart.toISOString())
      citasQuery = citasQuery.gte('fecha', monthStart.toISOString().split('T')[0])
    }

    try {
      const [vRes, cRes] = await Promise.all([
        ventasQuery.limit(200),
        citasQuery.limit(200)
      ])

      if (vRes.data) {
        setVentas(vRes.data.map((v: any) => ({ ...v, cliente_nombre: v.clientes?.nombre })))
      }
      
      if (cRes.data) {
        setCitas(cRes.data.map((c: any) => ({
          ...c,
          cliente_nombre: c.clientes?.nombre || 'Sin clienta',
          servicio_nombre: c.servicios?.nombre || 'Sin servicio',
          servicio_categoria: c.servicios?.categoria
        })))
      } else {
        setCitas([])
      }
    } catch (err) {
      console.error('Error al cargar reportes:', err)
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => {
    load()
  }, [load])

  // --- MÉTRICAS TIENDA ---
  const totalVentasTienda = ventas.reduce((s, v) => s + Number(v.total_venta), 0)
  const recaudadoTienda = ventas.filter(v => v.estado === 'pagado').reduce((s, v) => s + Number(v.total_venta), 0)
  const creditoTienda = ventas.filter(v => v.estado === 'pendiente').reduce((s, v) => s + Number(v.total_venta), 0)

  // Totales por categoría de productos (tienda)
  const porCategoriaTienda: Record<string, { total: number; cantidad: number }> = {}
  ventas.forEach(v => {
    if (v.detalles_ventas) {
      v.detalles_ventas.forEach((d: any) => {
        const cat = d.productos?.categoria || 'Sin Categoría'
        const totalDetalle = Number(d.precio_unitario) * Number(d.cantidad)
        const cant = Number(d.cantidad)
        
        if (!porCategoriaTienda[cat]) {
          porCategoriaTienda[cat] = { total: 0, cantidad: 0 }
        }
        porCategoriaTienda[cat].total += totalDetalle
        porCategoriaTienda[cat].cantidad += cant
      })
    }
  })

  // Ordenar por volumen de dinero vendido
  const categoriasTiendaOrdenadas = Object.entries(porCategoriaTienda)
    .sort((a, b) => b[1].total - a[1].total)

  // --- MÉTRICAS CITAS ---
  const recaudadoCitas = citas.filter(c => c.estado === 'pagada').reduce((s, c) => s + Number(c.valor), 0)
  const pendienteCitas = citas.filter(c => c.estado === 'realizada' || c.estado === 'pendiente').reduce((s, c) => s + Number(c.valor), 0)
  const totalCitasValor = citas.reduce((s, c) => s + Number(c.valor), 0)

  // Totales por categoría de citas
  const porCategoria = { cejas: 0, pestañas: 0, cabello: 0 }
  citas.forEach(c => {
    if (c.estado === 'pagada' || c.estado === 'realizada') {
      if (c.servicio_categoria === 'cejas') porCategoria.cejas += Number(c.valor)
      if (c.servicio_categoria === 'pestañas') porCategoria.pestañas += Number(c.valor)
      if (c.servicio_categoria === 'cabello') porCategoria.cabello += Number(c.valor)
    }
  })

  // Totales por profesional
  const porProf = { Sandra: 0, Hasly: 0 }
  citas.forEach(c => {
    if (c.estado === 'pagada' || c.estado === 'realizada') {
      if (c.profesional === 'Sandra') porProf.Sandra += Number(c.valor)
      if (c.profesional === 'Hasly') porProf.Hasly += Number(c.valor)
    }
  })

  // --- CONSOLIDADO GENERAL ---
  const totalIngresoGeneral = recaudadoTienda + recaudadoCitas
  const totalFacturadoGeneral = totalVentasTienda + totalCitasValor
  const totalPendienteGeneral = creditoTienda + pendienteCitas

  return (
    <div className="page" style={{ paddingBottom: 120 }}>
      <div className="page-header">
        <h1>Reportes Financieros</h1>
      </div>

      {/* Selector de periodo */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {(['semana', 'mes', 'todos'] as const).map(p => (
          <button
            key={p}
            className={`filter-btn ${periodo === p ? 'active' : ''}`}
            onClick={() => setPeriodo(p)}
            style={{ flex: 1 }}
          >
            {p === 'semana' ? 'Esta Semana' : p === 'mes' ? 'Este Mes' : 'Histórico'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sombra-malva)' }}>
          Generando reportes...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* SECCIÓN 1: RESUMEN CONSOLIDADO */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--rosa-metalico) 0%, var(--rosa-vino) 100%)', color: 'white', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.9, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <TrendingUp size={16} /> Resumen General Consolidado
            </div>
            
            <div style={{ margin: '14px 0 18px 0' }}>
              <div style={{ fontSize: 13, opacity: 0.85 }}>Dinero Total Recaudado (Caja)</div>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, marginTop: 4 }}>
                {formatCOP(totalIngresoGeneral)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 14 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, opacity: 0.8 }}>Total Facturado</span>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{formatCOP(totalFacturadoGeneral)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, opacity: 0.8 }}>Total en Crédito/Deuda</span>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{formatCOP(totalPendienteGeneral)}</div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: TIENDA (ROPA Y PRODUCTOS) */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--rosa-metalico)' }}>
              <ShoppingBag size={18} /> Resumen de Tienda (Productos)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-perla)' }}>
                <span style={{ fontSize: 14, color: 'var(--sombra-malva)', fontWeight: 500 }}>Ventas Totales Tienda</span>
                <strong style={{ fontSize: 14, fontWeight: 700 }}>{formatCOP(totalVentasTienda)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-perla)' }}>
                <span style={{ fontSize: 14, color: 'var(--color-exito)', fontWeight: 600 }}>Recaudado (Efectivo/Transf)</span>
                <strong style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-exito)' }}>{formatCOP(recaudadoTienda)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: 14, color: 'var(--color-error)', fontWeight: 600 }}>En Crédito (Adeuda)</span>
                <strong style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-error)' }}>{formatCOP(creditoTienda)}</strong>
              </div>
            </div>

            {/* Categorías más vendidas de la Tienda */}
            <div style={{ borderTop: '1px solid var(--gris-perla)', paddingTop: 14, marginTop: 14 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--sombra-malva)', marginBottom: 12, letterSpacing: 0.5 }}>
                Categorías más vendidas (Tienda)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {categoriasTiendaOrdenadas.length > 0 ? (
                  categoriasTiendaOrdenadas.map(([cat, info]) => {
                    const totalTienda = Object.values(porCategoriaTienda).reduce((s, c) => s + c.total, 0)
                    const porcentaje = totalTienda > 0 ? (info.total / totalTienda) * 100 : 0
                    return (
                      <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {cat} <span style={{ fontWeight: 500, fontSize: 11, color: 'var(--sombra-malva)' }}>({info.cantidad} uds)</span>
                          </span>
                          <span style={{ fontWeight: 700 }}>{formatCOP(info.total)}</span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: 'var(--gris-perla)', borderRadius: 3, overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${porcentaje}%`, 
                              height: '100%', 
                              background: '#B66C70',
                              borderRadius: 3 
                            }} 
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--sombra-malva)', opacity: 0.8, fontStyle: 'italic' }}>
                    No hay productos vendidos en este período
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: AGENDA (SERVICIOS Y ESTILISMO) */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--rosa-metalico)' }}>
              <Sparkles size={18} /> Resumen de Servicios (Salón)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-perla)' }}>
                <span style={{ fontSize: 14, color: 'var(--sombra-malva)', fontWeight: 500 }}>Total Servicios Agendados</span>
                <strong style={{ fontSize: 14, fontWeight: 700 }}>{formatCOP(totalCitasValor)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-perla)' }}>
                <span style={{ fontSize: 14, color: 'var(--color-exito)', fontWeight: 600 }}>Recaudado (Servicios Pagos)</span>
                <strong style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-exito)' }}>{formatCOP(recaudadoCitas)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: 14, color: 'var(--color-alerta)', fontWeight: 600 }}>Por Cobrar (Pendiente/Realizado)</span>
                <strong style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-alerta)' }}>{formatCOP(pendienteCitas)}</strong>
              </div>
            </div>

            {/* Ingreso por Categorías */}
            <div style={{ borderTop: '1px solid var(--gris-perla)', paddingTop: 14, marginTop: 6 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--sombra-malva)', marginBottom: 12, letterSpacing: 0.5 }}>
                Servicios por Categoría
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(porCategoria).map(([cat, valor]) => {
                  const totalSalón = recaudadoCitas + pendienteCitas
                  const porcentaje = totalSalón > 0 ? (valor / totalSalón) * 100 : 0
                  return (
                    <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{cat}</span>
                        <span style={{ fontWeight: 700 }}>{formatCOP(valor)}</span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: 'var(--gris-perla)', borderRadius: 3, overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${porcentaje}%`, 
                            height: '100%', 
                            background: cat === 'cejas' ? '#B66C70' : cat === 'pestañas' ? '#D58D8A' : '#95545B',
                            borderRadius: 3 
                          }} 
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Ingreso por Profesional */}
            <div style={{ borderTop: '1px solid var(--gris-perla)', paddingTop: 14, marginTop: 14 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--sombra-malva)', marginBottom: 10, letterSpacing: 0.5 }}>
                Rendimiento del Personal
              </h4>
              <div style={{ display: 'flex', gap: 10 }}>
                {Object.entries(porProf).map(([prof, valor]) => (
                  <div key={prof} style={{ flex: 1, background: 'var(--gris-fondo)', padding: 10, borderRadius: 10, textAlign: 'center', border: '1px solid var(--gris-perla)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sombra-malva)' }}>{prof}</span>
                    <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{formatCOP(valor)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HISTORIAL DETALLADO DE TRANSACCIONES */}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, letterSpacing: -0.5 }}>Historial de Tienda</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ventas.map(v => (
                <div key={v.id} className="list-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>{v.cliente_nombre || 'Sin nombre'}</div>
                    <div style={{ fontSize: 12, color: 'var(--sombra-malva)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Calendar size={12} /> {new Date(v.fecha_venta).toLocaleDateString('es-CO')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--negro-elegante)' }}>{formatCOP(v.total_venta)}</div>
                    <span className={`badge ${v.estado === 'pagado' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {v.metodo_pago.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
              {ventas.length === 0 && (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <p>No hay ventas en este período</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, letterSpacing: -0.5 }}>Historial de Citas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {citas.map(c => (
                <div key={c.id} className="list-item" style={{ borderLeft: `3px solid ${c.estado === 'pagada' ? 'var(--color-exito)' : 'var(--rosa-metalico)'}` }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.cliente_nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--sombra-malva)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                      <span style={{ fontWeight: 700, color: 'var(--rosa-metalico)' }}>{c.profesional}</span>
                      <span>•</span>
                      <span>{c.servicio_nombre}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{formatCOP(c.valor)}</div>
                    <span className={`badge ${c.estado === 'pagada' ? 'badge-success' : c.estado === 'realizada' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {c.estado.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
              {citas.length === 0 && (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <p>No hay citas agendadas en este período</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
