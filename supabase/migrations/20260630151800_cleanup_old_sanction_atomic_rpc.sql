-- 1. Eliminar los privilegios de ejecución para roles públicos/autenticados de la función vieja
REVOKE ALL ON FUNCTION public.create_sanction_atomic(uuid, uuid, uuid, text, date, text, numeric, date, text, uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;

-- 2. Eliminar la función vieja de forma segura si no tiene más dependencias internas en DB
DROP FUNCTION IF EXISTS public.create_sanction_atomic(
  p_member_id uuid,
  p_vehicle_id uuid,
  p_sanction_type_id uuid,
  p_reason text,
  p_date date,
  p_severity text,
  p_fine_amount numeric,
  p_due_date date,
  p_resolution_notes text,
  p_meeting_id uuid,
  p_meeting_attendance_id uuid
) CASCADE;
