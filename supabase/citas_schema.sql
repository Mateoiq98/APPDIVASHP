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
