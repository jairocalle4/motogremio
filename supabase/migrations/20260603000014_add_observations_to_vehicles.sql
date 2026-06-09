-- Migración incremental: agrega columna observations a vehicles
-- No toca member_id, driver_id ni ningún otro campo existente

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS observations text;
