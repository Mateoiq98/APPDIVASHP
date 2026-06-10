export interface Producto {
  id: string
  nombre: string
  talla_color: string
  categoria: string
  marca: string
  precio_costo: number
  precio_venta: number
  stock: number
  created_at: string
}

export interface Cliente {
  id: string
  nombre: string
  telefono: string
  created_at: string
}

export interface Venta {
  id: string
  cliente_id: string
  total_venta: number
  estado: 'pagado' | 'pendiente'
  metodo_pago: 'efectivo' | 'transferencia' | 'credito'
  fecha_venta: string
  cliente_nombre?: string
  detalles?: DetalleVenta[]
}

export interface DetalleVenta {
  id: string
  venta_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  producto_nombre?: string
  productoTallaColor?: string
}

export interface Abono {
  id: string
  cliente_id: string
  monto: number
  fecha_abono: string
}

export interface SaldoPendiente {
  cliente_id: string
  nombre: string
  telefono: string
  total_adeudado: number
  total_abonado: number
  saldo_pendiente: number
}

export interface Servicio {
  id: string
  nombre: string
  categoria: 'cejas' | 'pestañas' | 'cabello'
  created_at?: string
}

export interface Cita {
  id: string
  profesional: 'Sandra' | 'Hasly'
  cliente_id: string
  servicio_id: string
  fecha: string // YYYY-MM-DD
  hora: string // HH:MM
  estado: 'pendiente' | 'realizada' | 'pagada'
  valor: number
  created_at?: string
  cliente_nombre?: string
  servicio_nombre?: string
  servicio_categoria?: 'cejas' | 'pestañas' | 'cabello'
}

