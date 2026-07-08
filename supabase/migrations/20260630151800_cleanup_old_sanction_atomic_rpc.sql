-- 1. Eliminar la función vieja de forma segura si existe
DROP FUNCTION IF EXISTS public.create_sanction_atomic(
  uuid,
  uuid,
  uuid,
  text,
  date,
  text,
  numeric,
  date,
  text,
  uuid,
  uuid
);
