-- ============================================
-- DIVA SHOP - Esquema de Base de Datos
-- ============================================

-- 1. PRODUCTOS
CREATE TABLE productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  talla_color text NOT NULL,
  precio_costo numeric(10,2) NOT NULL DEFAULT 0,
  precio_venta numeric(10,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. CLIENTES
CREATE TABLE clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. VENTAS
CREATE TABLE ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  total_venta numeric(10,2) NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pagado', 'pendiente')),
  metodo_pago text NOT NULL DEFAULT 'efectivo' CHECK (metodo_pago IN ('efectivo', 'transferencia', 'credito')),
  fecha_venta timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_ventas_fecha ON ventas(fecha_venta);

-- 4. DETALLES_VENTAS
CREATE TABLE detalles_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad integer NOT NULL DEFAULT 1,
  precio_unitario numeric(10,2) NOT NULL
);
CREATE INDEX idx_detalles_venta ON detalles_ventas(venta_id);

-- 5. ABONOS
CREATE TABLE abonos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  monto numeric(10,2) NOT NULL DEFAULT 0,
  fecha_abono timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_abonos_cliente ON abonos(cliente_id);

-- ============================================
-- FUNCIÓN: Descontar stock al vender
-- ============================================
CREATE OR REPLACE FUNCTION descontar_stock(p_producto_id uuid, p_cantidad integer)
RETURNS void AS $$
BEGIN
  UPDATE productos
  SET stock = stock - p_cantidad
  WHERE id = p_producto_id AND stock >= p_cantidad;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: Reponer stock al devolver
-- ============================================
CREATE OR REPLACE FUNCTION reponer_stock(p_producto_id uuid, p_cantidad integer)
RETURNS void AS $$
BEGIN
  UPDATE productos
  SET stock = stock + p_cantidad
  WHERE id = p_producto_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VISTA AUXILIAR: Saldo pendiente por clienta
-- ============================================
CREATE OR REPLACE VIEW vista_saldos_pendientes AS
SELECT
  c.id AS cliente_id,
  c.nombre,
  c.telefono,
  COALESCE(SUM(v.total_venta), 0) AS total_adeudado,
  COALESCE(SUM(a.monto), 0) AS total_abonado,
  COALESCE(SUM(v.total_venta), 0) - COALESCE(SUM(a.monto), 0) AS saldo_pendiente
FROM clientes c
LEFT JOIN ventas v ON v.cliente_id = c.id AND v.estado = 'pendiente'
LEFT JOIN abonos a ON a.cliente_id = c.id
GROUP BY c.id, c.nombre, c.telefono
HAVING COALESCE(SUM(v.total_venta), 0) - COALESCE(SUM(a.monto), 0) > 0
ORDER BY saldo_pendiente DESC;
