import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Customers from './pages/Customers'
import Reports from './pages/Reports'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventario" element={<Inventory />} />
        <Route path="/ventas" element={<Sales />} />
        <Route path="/clientas" element={<Customers />} />
        <Route path="/reportes" element={<Reports />} />
      </Route>
    </Routes>
  )
}
