-- ============================================
-- DIVA SHOP - Migración: Separar Abonos (Tienda vs Servicios)
-- ============================================

-- 1. Agregar columna 'destino' a la tabla 'abonos' si no existe
ALTER TABLE abonos ADD COLUMN IF NOT EXISTS destino text NOT NULL DEFAULT 'tienda' CHECK (destino IN ('tienda', 'servicio'));

-- 2. Recrear la vista de saldos pendientes con saldos separados e individuales
CREATE OR REPLACE VIEW vista_saldos_pendientes AS
SELECT
  c.id AS cliente_id,
  c.nombre,
  c.telefono,
  
  -- Totales de Tienda (ropa/productos)
  COALESCE(SUM(v.total_venta), 0) AS total_adeudado_tienda,
  COALESCE((
    SELECT SUM(a.monto) 
    FROM abonos a 
    WHERE a.cliente_id = c.id AND a.destino = 'tienda'
  ), 0) AS total_abonado_tienda,
  
  -- Totales de Servicio (salón de belleza)
  COALESCE((
    SELECT SUM(ci.valor) 
    FROM citas ci 
    WHERE ci.cliente_id = c.id AND ci.estado = 'realizada'
  ), 0) AS total_adeudado_servicio,
  COALESCE((
    SELECT SUM(a.monto) 
    FROM abonos a 
    WHERE a.cliente_id = c.id AND a.destino = 'servicio'
  ), 0) AS total_abonado_servicio,
  
  -- Saldo pendiente individual de Tienda (mínimo 0)
  GREATEST(COALESCE(SUM(v.total_venta), 0) - COALESCE((
    SELECT SUM(a.monto) 
    FROM abonos a 
    WHERE a.cliente_id = c.id AND a.destino = 'tienda'
  ), 0), 0) AS saldo_pendiente_tienda,
  
  -- Saldo pendiente individual de Servicio (mínimo 0)
  GREATEST(COALESCE((
    SELECT SUM(ci.valor) 
    FROM citas ci 
    WHERE ci.cliente_id = c.id AND ci.estado = 'realizada'
  ), 0) - COALESCE((
    SELECT SUM(a.monto) 
    FROM abonos a 
    WHERE a.cliente_id = c.id AND a.destino = 'servicio'
  ), 0), 0) AS saldo_pendiente_servicio,
  
  -- Saldo pendiente total (suma de ambos)
  GREATEST(COALESCE(SUM(v.total_venta), 0) - COALESCE((
    SELECT SUM(a.monto) 
    FROM abonos a 
    WHERE a.cliente_id = c.id AND a.destino = 'tienda'
  ), 0), 0) + 
  GREATEST(COALESCE((
    SELECT SUM(ci.valor) 
    FROM citas ci 
    WHERE ci.cliente_id = c.id AND ci.estado = 'realizada'
  ), 0) - COALESCE((
    SELECT SUM(a.monto) 
    FROM abonos a 
    WHERE a.cliente_id = c.id AND a.destino = 'servicio'
  ), 0), 0) AS saldo_pendiente

FROM clientes c
LEFT JOIN ventas v ON v.cliente_id = c.id AND v.estado = 'pendiente'
GROUP BY c.id, c.nombre, c.telefono
HAVING 
  (COALESCE(SUM(v.total_venta), 0) - COALESCE((
    SELECT SUM(a.monto) 
    FROM abonos a 
    WHERE a.cliente_id = c.id AND a.destino = 'tienda'
  ), 0)) > 0 OR
  (COALESCE((
    SELECT SUM(ci.valor) 
    FROM citas ci 
    WHERE ci.cliente_id = c.id AND ci.estado = 'realizada'
  ), 0) - COALESCE((
    SELECT SUM(a.monto) 
    FROM abonos a 
    WHERE a.cliente_id = c.id AND a.destino = 'servicio'
  ), 0)) > 0
ORDER BY saldo_pendiente DESC;
