-- ============================================
-- DIVA SHOP - Migración para Agenda de Citas
-- ============================================

-- 1. TABLA DE SERVICIOS
CREATE TABLE IF NOT EXISTS servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('cejas', 'pestañas', 'cabello')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nombre, categoria)
);

-- 2. TABLA DE CITAS
CREATE TABLE IF NOT EXISTS citas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional text NOT NULL CHECK (profesional IN ('Sandra', 'Hasly')),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  servicio_id uuid NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
  fecha date NOT NULL,
  hora text NOT NULL, -- formato de 24 horas 'HH:MM' (ej. '09:00', '13:30')
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'realizada', 'pagada')),
  valor numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_citas_prof_fecha ON citas(profesional, fecha);
CREATE INDEX IF NOT EXISTS idx_citas_cliente ON citas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha);
CREATE INDEX IF NOT EXISTS idx_servicios_cat ON servicios(categoria);

-- 3. ACTUALIZAR VISTA DE SALDOS PENDIENTES
-- Incluye la suma de las citas que se han marcado como 'realizada' (completada) pero no 'pagada'
CREATE OR REPLACE VIEW vista_saldos_pendientes AS
SELECT
  c.id AS cliente_id,
  c.nombre,
  c.telefono,
  COALESCE(SUM(v.total_venta), 0) + COALESCE((
    SELECT SUM(ci.valor) 
    FROM citas ci 
    WHERE ci.cliente_id = c.id AND ci.estado = 'realizada'
  ), 0) AS total_adeudado,
  COALESCE(SUM(a.monto), 0) AS total_abonado,
  (COALESCE(SUM(v.total_venta), 0) + COALESCE((
    SELECT SUM(ci.valor) 
    FROM citas ci 
    WHERE ci.cliente_id = c.id AND ci.estado = 'realizada'
  ), 0)) - COALESCE(SUM(a.monto), 0) AS saldo_pendiente
FROM clientes c
LEFT JOIN ventas v ON v.cliente_id = c.id AND v.estado = 'pendiente'
LEFT JOIN abonos a ON a.cliente_id = c.id
GROUP BY c.id, c.nombre, c.telefono
HAVING (COALESCE(SUM(v.total_venta), 0) + COALESCE((
  SELECT SUM(ci.valor) 
  FROM citas ci 
  WHERE ci.cliente_id = c.id AND ci.estado = 'realizada'
), 0)) - COALESCE(SUM(a.monto), 0) > 0
ORDER BY saldo_pendiente DESC;

