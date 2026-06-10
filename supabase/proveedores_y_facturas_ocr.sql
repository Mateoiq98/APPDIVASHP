-- DIVA SHOP - Proveedores y compras por OCR

CREATE TABLE IF NOT EXISTS proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  nit text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS proveedor_id uuid REFERENCES proveedores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_productos_proveedor ON productos(proveedor_id);
