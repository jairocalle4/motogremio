-- Fase 3.4 — Agregar columna notes a drivers
-- Justificación: Permite a secretarias y admins documentar información adicional
-- del conductor (incidentes, restricciones, datos complementarios).

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS notes text;
