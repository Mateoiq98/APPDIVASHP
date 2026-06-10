import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Calendar, Package, ShoppingCart, Users, BarChart3, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const NAV_ITEMS = [
  { path: '/', label: 'Inicio', icon: LayoutGrid },
  { path: '/citas', label: 'Citas', icon: Calendar },
  { path: '/inventario', label: 'Inventario', icon: Package },
  { path: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { path: '/clientas', label: 'Clientas', icon: Users },
  { path: '/reportes', label: 'Reportes', icon: BarChart3 },
]

type BrowserAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

type CitaAlertRow = {
  id: string
  hora: string
  profesional: string
  clientes?: { nombre?: string } | null
  servicios?: { nombre?: string } | null
}

// Sintetizar tono de timbre (Chime) premium
const playChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as BrowserAudioWindow).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime
    
    // Nota 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(659.25, now)
    gain1.gain.setValueAtTime(0.12, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.6)

    // Nota 2: A5 (880.00 Hz) con ligero retraso
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880.00, now + 0.15)
    gain2.gain.setValueAtTime(0.12, now + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.75)
  } catch (err) {
    console.error('Audio chime error:', err)
  }
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const [activeAlert, setActiveAlert] = useState<{
    id: string
    cliente: string
    servicio: string
    hora: string
    profesional: string
  } | null>(null)

  useEffect(() => {
    const checkCitas = async () => {
      try {
        const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local
        
        const { data } = await supabase
          .from('citas')
          .select('*, clientes(nombre), servicios(nombre)')
          .eq('fecha', todayStr)
          .eq('estado', 'pendiente')
        
        if (!data) return
        
        const now = new Date()
        const nowTime = now.getTime()
        
        const alertedIds: string[] = JSON.parse(localStorage.getItem('alertedCitasIds') || '[]')
        let updatedAlerted = false
        
        ;(data as CitaAlertRow[]).forEach((cita) => {
          if (alertedIds.includes(cita.id)) return
          
          const [hours, minutes] = cita.hora.split(':').map(Number)
          const citaDate = new Date()
          citaDate.setHours(hours, minutes, 0, 0)
          
          const diffMs = citaDate.getTime() - nowTime
          const diffMins = diffMs / (1000 * 60)
          
          // Si faltan entre 0 y 16 minutos para la cita
          if (diffMins > 0 && diffMins <= 16) {
            playChime()
            setActiveAlert({
              id: cita.id,
              cliente: cita.clientes?.nombre || 'Sin nombre',
              servicio: cita.servicios?.nombre || 'Servicio',
              hora: cita.hora,
              profesional: cita.profesional
            })
            alertedIds.push(cita.id)
            updatedAlerted = true
          }
        })

        if (updatedAlerted) {
          localStorage.setItem('alertedCitasIds', JSON.stringify(alertedIds))
        }
      } catch (err) {
        console.error('Error al revisar citas próximas:', err)
      }
    }

    // Ejecutar check inicial y luego cada 30 segundos
    checkCitas()
    const interval = setInterval(checkCitas, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative', minHeight: '100dvh' }}>
      <style>{`
        @keyframes slideDownAlert {
          from { transform: translate(-50%, -30px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
      
      {activeAlert && (
        <div style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: 400,
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 10px 30px rgba(182, 108, 112, 0.3)',
          borderRadius: 16,
          padding: '14px 16px',
          zIndex: 9999,
          border: '1.5px solid var(--rosa-metalico)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          animation: 'slideDownAlert 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--rosa-metalico)', letterSpacing: 0.5 }}>
              🔔 Cita Próxima (En 15 min)
            </span>
            <button 
              onClick={() => setActiveAlert(null)}
              style={{
                background: 'rgba(133,113,122,0.1)',
                border: 'none',
                color: 'var(--sombra-malva)',
                width: 22,
                height: 22,
                borderRadius: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 700,
                minWidth: 'unset',
                minHeight: 'unset',
                padding: 0
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: 13, color: 'var(--negro-elegante)', lineHeight: '18px' }}>
            A las <strong style={{ color: 'var(--rosa-vino)' }}>{activeAlert.hora}</strong>: <strong>{activeAlert.cliente}</strong> tiene cita de <strong>{activeAlert.servicio}</strong> con <strong>{activeAlert.profesional}</strong>.
          </div>
        </div>
      )}

      <button
        className="btn-secondary"
        onClick={logout}
        title="Cerrar sesion"
        aria-label="Cerrar sesion"
        style={{
          position: 'fixed',
          top: 12,
          right: 'max(12px, calc(50% - 228px))',
          width: 38,
          height: 38,
          minWidth: 38,
          minHeight: 38,
          padding: 0,
          borderRadius: 12,
          zIndex: 120
        }}
      >
        <LogOut size={17} />
      </button>

      <Outlet />
      
      <nav className="nav-bar">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              className={`nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
