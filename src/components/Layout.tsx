import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Package, ShoppingCart, Users, BarChart3 } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/', label: 'Inicio', icon: LayoutGrid },
  { path: '/inventario', label: 'Inventario', icon: Package },
  { path: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { path: '/clientas', label: 'Clientas', icon: Users },
  { path: '/reportes', label: 'Reportes', icon: BarChart3 },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative', minHeight: '100dvh' }}>
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
