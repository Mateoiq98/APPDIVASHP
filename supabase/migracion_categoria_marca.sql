-- Ejecutar en el SQL Editor de Supabase en orden:

-- 1. Agregar columnas a productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT '';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS marca text NOT NULL DEFAULT '';

-- 2. Crear tabla de marcas
CREATE TABLE IF NOT EXISTS marcas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Poblar marcas desde productos existentes
INSERT INTO marcas (nombre)
SELECT DISTINCT TRIM(marca) FROM productos WHERE marca != '' AND marca IS NOT NULL
ON CONFLICT (nombre) DO NOTHING;
