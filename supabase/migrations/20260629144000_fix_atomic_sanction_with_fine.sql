-- 1. Crear RPC transaccional v2 para registrar sanciones y multas de forma atómica
CREATE OR REPLACE FUNCTION public.create_sanction_atomic_v2(
  p_member_id uuid,
  p_sanction_type_id uuid,
  p_reason text,
  p_date date,
  p_fine_amount numeric,
  p_vehicle_id uuid DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_resolution_notes text DEFAULT NULL,
  p_meeting_id uuid DEFAULT NULL,
  p_meeting_attendance_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_user_role public.user_role;
  v_current_user_id uuid;
  v_charge_type_id uuid;
  v_created_charge_id uuid := NULL;
  v_created_sanction_id uuid;
  v_member_company_id uuid;
  v_vehicle_company_id uuid;
  v_sanction_type_name text;
BEGIN
  -- 1. Validar usuario autenticado
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- 2. Obtener company_id y rol
  SELECT company_id, role INTO v_company_id, v_user_role
  FROM public.profiles WHERE id = v_current_user_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Compañía no encontrada para el operador actual';
  END IF;

  -- 3. Rechazar rol socio
  IF v_user_role = 'socio'::public.user_role THEN
    RAISE EXCEPTION 'Operación no permitida para socios';
  END IF;

  -- 4. Validar que el socio sea de la misma compañía
  SELECT company_id INTO v_member_company_id
  FROM public.members WHERE id = p_member_id;

  IF v_member_company_id IS NULL OR v_member_company_id <> v_company_id THEN
    RAISE EXCEPTION 'El socio no pertenece a esta compañía';
  END IF;

  -- 5. Validar que el vehículo sea de la misma compañía
  IF p_vehicle_id IS NOT NULL THEN
    SELECT company_id INTO v_vehicle_company_id
    FROM public.vehicles WHERE id = p_vehicle_id;

    IF v_vehicle_company_id IS NULL OR v_vehicle_company_id <> v_company_id THEN
      RAISE EXCEPTION 'El vehículo no pertenece a esta compañía';
    END IF;
  END IF;

  -- 6. Obtener nombre y validar tipo de sanción
  SELECT name INTO v_sanction_type_name
  FROM public.sanction_types
  WHERE id = p_sanction_type_id AND company_id = v_company_id;

  IF v_sanction_type_name IS NULL THEN
    RAISE EXCEPTION 'Tipo de sanción no encontrado o no autorizado';
  END IF;

  -- 7. Validar motivo
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'El motivo es obligatorio';
  END IF;

  -- 8. Si tiene multa económica, crear el charge
  IF p_fine_amount > 0 THEN
    IF p_due_date IS NULL THEN
      RAISE EXCEPTION 'La fecha de vencimiento es obligatoria para sanciones con multa';
    END IF;

    -- Buscar tipo de cobro "Multa"
    SELECT id INTO v_charge_type_id
    FROM public.charge_types
    WHERE company_id = v_company_id AND name = 'Multa';

    -- Si no existe, crearlo
    IF v_charge_type_id IS NULL THEN
      INSERT INTO public.charge_types (
        company_id,
        name,
        description,
        default_amount,
        is_recurring
      ) VALUES (
        v_company_id,
        'Multa',
        'Cargos generados por sanciones y multas disciplinarias',
        NULL,
        FALSE
      ) RETURNING id INTO v_charge_type_id;
    END IF;

    -- Crear el cargo (deuda)
    INSERT INTO public.charges (
      company_id,
      member_id,
      vehicle_id,
      charge_type_id,
      description,
      amount,
      balance,
      due_date,
      status
    ) VALUES (
      v_company_id,
      p_member_id,
      p_vehicle_id,
      v_charge_type_id,
      'Multa por Sanción: ' || v_sanction_type_name || ' - ' || trim(p_reason),
      p_fine_amount,
      p_fine_amount,
      p_due_date,
      'pendiente'::public.charge_status
    ) RETURNING id INTO v_created_charge_id;
  END IF;

  -- 9. Crear la sanción
  INSERT INTO public.sanctions (
    company_id,
    member_id,
    vehicle_id,
    sanction_type_id,
    charge_id,
    date,
    reason,
    severity,
    status,
    resolution_notes,
    meeting_id,
    meeting_attendance_id
  ) VALUES (
    v_company_id,
    p_member_id,
    p_vehicle_id,
    p_sanction_type_id,
    v_created_charge_id,
    p_date,
    trim(p_reason),
    p_severity,
    'pendiente'::public.sanction_status,
    p_resolution_notes,
    p_meeting_id,
    p_meeting_attendance_id
  ) RETURNING id INTO v_created_sanction_id;

  -- 10. Retornar estructura JSON informativa
  RETURN json_build_object(
    'sanction_id', v_created_sanction_id,
    'charge_id', v_created_charge_id,
    'status', 'pendiente'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_sanction_atomic_v2(uuid, uuid, text, date, numeric, uuid, text, date, text, uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_sanction_atomic_v2(uuid, uuid, text, date, numeric, uuid, text, date, text, uuid, uuid) TO authenticated;
