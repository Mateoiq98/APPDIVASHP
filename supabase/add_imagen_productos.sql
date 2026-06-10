-- ============================================
-- DIVA SHOP - Migración: Agregar imagen a productos
-- ============================================

-- Agregar columna 'imagen' a la tabla 'productos' si no existe
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen text;
