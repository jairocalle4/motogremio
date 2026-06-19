-- ============================================================================
-- 1. Modificación de Triggers de la Fase 4.3 (Permitir operación con planes inactivos existentes)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_company_member_limit_trigger()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_members int;
  v_current_members int;
  v_plan_id uuid;
BEGIN
  -- Evaluar si aplica validación (Inserción activa OR actualización a activo/cambio de cooperativa)
  IF (TG_OP = 'INSERT' AND NEW.status = 'activo') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'activo' AND (
       OLD.status IS DISTINCT FROM NEW.status OR 
       OLD.company_id IS DISTINCT FROM NEW.company_id
     )) THEN

    -- Bloqueo exclusivo de fila del tenant para serializar y proteger contra concurrencia
    PERFORM 1 FROM public.companies WHERE id = NEW.company_id FOR UPDATE;

    -- Obtener datos del plan asignado
    SELECT plan_id INTO v_plan_id FROM public.companies WHERE id = NEW.company_id;
    
    IF v_plan_id IS NULL THEN
      RAISE EXCEPTION 'No se puede registrar el socio: La compañía no tiene un plan asignado.';
    END IF;

    SELECT max_members INTO v_max_members
    FROM public.plans
    WHERE id = v_plan_id;

    -- Validar existencia del plan (no se exige is_active = true para compañías que ya lo poseen)
    IF v_max_members IS NULL THEN
      RAISE EXCEPTION 'No se puede registrar el socio: El plan asignado a la compañía no existe.';
    END IF;

    -- Contar socios activos actuales
    SELECT count(*) INTO v_current_members
    FROM public.members
    WHERE company_id = NEW.company_id AND status = 'activo';

    -- Comparar límite
    IF v_current_members >= v_max_members THEN
      RAISE EXCEPTION 'Límite alcanzado: Tu plan permite máximo % socios activos.', v_max_members;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_company_vehicle_limit_trigger()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_vehicles int;
  v_current_vehicles int;
  v_plan_id uuid;
BEGIN
  -- Evaluar si aplica validación
  IF (TG_OP = 'INSERT' AND NEW.status IN ('activa', 'mantenimiento')) OR 
     (TG_OP = 'UPDATE' AND NEW.status IN ('activa', 'mantenimiento') AND (
       OLD.status IS DISTINCT FROM NEW.status OR 
       OLD.company_id IS DISTINCT FROM NEW.company_id
     )) THEN

    -- Bloqueo exclusivo de fila del tenant para serializar y proteger contra concurrencia
    PERFORM 1 FROM public.companies WHERE id = NEW.company_id FOR UPDATE;

    -- Obtener datos del plan asignado
    SELECT plan_id INTO v_plan_id FROM public.companies WHERE id = NEW.company_id;
    
    IF v_plan_id IS NULL THEN
      RAISE EXCEPTION 'No se puede registrar la unidad: La compañía no tiene un plan asignado.';
    END IF;

    SELECT max_vehicles INTO v_max_vehicles
    FROM public.plans
    WHERE id = v_plan_id;

    -- Validar existencia del plan (no se exige is_active = true para compañías que ya lo poseen)
    IF v_max_vehicles IS NULL THEN
      RAISE EXCEPTION 'No se puede registrar la unidad: El plan asignado a la compañía no existe.';
    END IF;

    -- Contar vehículos activos o en mantenimiento actuales
    SELECT count(*) INTO v_current_vehicles
    FROM public.vehicles
    WHERE company_id = NEW.company_id AND status IN ('activa', 'mantenimiento');

    -- Comparar límite
    IF v_current_vehicles >= v_max_vehicles THEN
      RAISE EXCEPTION 'Límite alcanzado: Tu plan permite máximo % unidades activas o en mantenimiento.', v_max_vehicles;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================================
-- 2. RPC: get_super_admin_plans()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_super_admin_plans()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plans json;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Se requieren privilegios de super_admin.';
  END IF;

  SELECT coalesce(json_agg(t), '[]'::json) INTO v_plans
  FROM (
    SELECT 
      p.id,
      p.name,
      p.description,
      p.max_members,
      p.max_vehicles,
      p.price_monthly,
      p.features,
      p.is_active,
      p.created_at,
      p.updated_at,
      (SELECT count(*) FROM public.companies c WHERE c.plan_id = p.id) as companies_count
    FROM public.plans p
    ORDER BY p.price_monthly ASC
  ) t;

  RETURN v_plans;
END;
$$;


-- ============================================================================
-- 3. RPC: create_super_admin_plan(...)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_super_admin_plan(
  p_name public.plan_name,
  p_description text,
  p_max_members int,
  p_max_vehicles int,
  p_price_monthly numeric,
  p_features jsonb,
  p_is_active boolean
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_plan json;
  v_new_plan_id uuid;
  v_features jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Se requieren privilegios de super_admin.';
  END IF;

  -- Validaciones explícitas de NULL y rangos
  IF p_name IS NULL THEN
    RAISE EXCEPTION 'El nombre del plan es obligatorio y debe ser un valor del enum plan_name (basico, profesional, empresarial).';
  END IF;

  IF p_max_members IS NULL OR p_max_members <= 0 THEN
    RAISE EXCEPTION 'El límite máximo de socios (max_members) debe ser mayor a 0.';
  END IF;

  IF p_max_vehicles IS NULL OR p_max_vehicles <= 0 THEN
    RAISE EXCEPTION 'El límite máximo de unidades (max_vehicles) debe ser mayor a 0.';
  END IF;

  IF p_price_monthly IS NULL OR p_price_monthly < 0 THEN
    RAISE EXCEPTION 'El precio mensual no puede ser negativo o nulo.';
  END IF;

  IF p_is_active IS NULL THEN
    RAISE EXCEPTION 'El estado activo/inactivo (is_active) es obligatorio.';
  END IF;

  -- Comprobación de duplicados
  IF EXISTS (SELECT 1 FROM public.plans WHERE name = p_name) THEN
    RAISE EXCEPTION 'Ya existe un plan con el nombre "%". No se permiten nombres personalizados fuera del enum plan_name.', p_name;
  END IF;

  v_features := coalesce(p_features, '[]'::jsonb);

  INSERT INTO public.plans (
    name,
    description,
    max_members,
    max_vehicles,
    price_monthly,
    features,
    is_active
  ) VALUES (
    p_name,
    p_description,
    p_max_members,
    p_max_vehicles,
    p_price_monthly,
    v_features,
    p_is_active
  ) RETURNING id, json_build_object(
    'id', id,
    'name', name,
    'description', description,
    'max_members', max_members,
    'max_vehicles', max_vehicles,
    'price_monthly', price_monthly,
    'features', features,
    'is_active', is_active,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_new_plan_id, v_new_plan;

  -- Registrar en bitácora de auditoría global con todos los campos del nuevo plan
  INSERT INTO public.audit_logs (
    company_id,
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    NULL,
    auth.uid(),
    'create_plan',
    'plans',
    v_new_plan_id,
    NULL,
    v_new_plan::jsonb
  );

  RETURN v_new_plan;
END;
$$;


-- ============================================================================
-- 4. RPC: preview_super_admin_plan_update(...)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.preview_super_admin_plan_update(
  p_plan_id uuid,
  p_max_members int,
  p_max_vehicles int
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_name text;
  v_current_companies_count int;
  v_affected_companies_count int;
  v_affected_companies json;
  v_warning_message text := '';
  v_can_update_without_exceeding boolean;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Se requieren privilegios de super_admin.';
  END IF;

  -- Validaciones NULL
  IF p_plan_id IS NULL THEN
    RAISE EXCEPTION 'El identificador del plan (p_plan_id) es obligatorio.';
  END IF;

  IF p_max_members IS NULL OR p_max_members <= 0 THEN
    RAISE EXCEPTION 'El límite de socios propuesto debe ser mayor a 0.';
  END IF;

  IF p_max_vehicles IS NULL OR p_max_vehicles <= 0 THEN
    RAISE EXCEPTION 'El límite de unidades propuesto debe ser mayor a 0.';
  END IF;

  -- Obtener nombre del plan
  SELECT name::text INTO v_plan_name FROM public.plans WHERE id = p_plan_id;
  IF v_plan_name IS NULL THEN
    RAISE EXCEPTION 'El plan especificado no existe.';
  END IF;

  -- Contar compañías usando este plan actualmente
  SELECT count(*) INTO v_current_companies_count FROM public.companies WHERE plan_id = p_plan_id;

  -- Calcular compañías afectadas
  SELECT coalesce(json_agg(t), '[]'::json) INTO v_affected_companies
  FROM (
    SELECT 
      c.id as company_id,
      c.legal_name as company_name,
      (SELECT count(*) FROM public.members m WHERE m.company_id = c.id AND m.status = 'activo') as current_members,
      p_max_members as new_max_members,
      ((SELECT count(*) FROM public.members m WHERE m.company_id = c.id AND m.status = 'activo') > p_max_members) as exceeds_members,
      (SELECT count(*) FROM public.vehicles v WHERE v.company_id = c.id AND v.status IN ('activa', 'mantenimiento')) as current_vehicles,
      p_max_vehicles as new_max_vehicles,
      ((SELECT count(*) FROM public.vehicles v WHERE v.company_id = c.id AND v.status IN ('activa', 'mantenimiento')) > p_max_vehicles) as exceeds_vehicles
    FROM public.companies c
    WHERE c.plan_id = p_plan_id
  ) t
  WHERE t.exceeds_members = true OR t.exceeds_vehicles = true;

  v_affected_companies_count := json_array_length(v_affected_companies);
  v_can_update_without_exceeding := (v_affected_companies_count = 0);

  IF NOT v_can_update_without_exceeding THEN
    v_warning_message := 'Hay ' || v_affected_companies_count || ' compañía(s) que quedarán excedida(s) en sus límites de socios o unidades con esta reducción.';
  END IF;

  RETURN json_build_object(
    'plan_id', p_plan_id,
    'plan_name', v_plan_name,
    'current_companies_count', v_current_companies_count,
    'affected_companies_count', v_affected_companies_count,
    'affected_companies', v_affected_companies,
    'can_update_without_exceeding', v_can_update_without_exceeding,
    'warning_message', v_warning_message
  );
END;
$$;


-- ============================================================================
-- 5. RPC: update_super_admin_plan(...)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_super_admin_plan(
  p_plan_id uuid,
  p_description text,
  p_max_members int,
  p_max_vehicles int,
  p_price_monthly numeric,
  p_features jsonb,
  p_is_active boolean,
  p_force boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preview json;
  v_can_update boolean;
  v_affected_count int;
  v_old_plan jsonb;
  v_new_plan json;
  v_features jsonb;
  v_force boolean := coalesce(p_force, false);
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Se requieren privilegios de super_admin.';
  END IF;

  -- Validaciones de parámetros obligatorios
  IF p_plan_id IS NULL THEN
    RAISE EXCEPTION 'El identificador del plan (p_plan_id) es obligatorio.';
  END IF;

  IF p_max_members IS NULL OR p_max_members <= 0 THEN
    RAISE EXCEPTION 'El límite máximo de socios (max_members) debe ser mayor a 0.';
  END IF;

  IF p_max_vehicles IS NULL OR p_max_vehicles <= 0 THEN
    RAISE EXCEPTION 'El límite máximo de unidades (max_vehicles) debe ser mayor a 0.';
  END IF;

  IF p_price_monthly IS NULL OR p_price_monthly < 0 THEN
    RAISE EXCEPTION 'El precio mensual no puede ser nulo ni negativo.';
  END IF;

  IF p_is_active IS NULL THEN
    RAISE EXCEPTION 'El estado activo/inactivo (p_is_active) es obligatorio.';
  END IF;

  -- Obtener estado actual del plan
  SELECT json_build_object(
    'description', description,
    'max_members', max_members,
    'max_vehicles', max_vehicles,
    'price_monthly', price_monthly,
    'features', features,
    'is_active', is_active
  )::jsonb INTO v_old_plan
  FROM public.plans 
  WHERE id = p_plan_id;

  IF v_old_plan IS NULL THEN
    RAISE EXCEPTION 'El plan especificado no existe.';
  END IF;

  -- Obtener el preview de afectación
  SELECT public.preview_super_admin_plan_update(p_plan_id, p_max_members, p_max_vehicles) INTO v_preview;
  v_can_update := (v_preview->>'can_update_without_exceeding')::boolean;
  v_affected_count := (v_preview->>'affected_companies_count')::int;

  -- Validar regla de fuerza
  IF NOT v_can_update AND NOT v_force THEN
    RAISE EXCEPTION 'Actualización bloqueada: Reducir límites afectará a % compañía(s) que superarán el cupo propuesto. Utiliza el parámetro de forzado si es necesario.', v_affected_count;
  END IF;

  v_features := coalesce(p_features, '[]'::jsonb);

  UPDATE public.plans
  SET 
    description = p_description,
    max_members = p_max_members,
    max_vehicles = p_max_vehicles,
    price_monthly = p_price_monthly,
    features = v_features,
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_plan_id
  RETURNING json_build_object(
    'id', id,
    'name', name,
    'max_members', max_members,
    'max_vehicles', max_vehicles,
    'price_monthly', price_monthly,
    'is_active', is_active
  ) INTO v_new_plan;

  -- Guardar auditoría detallada
  INSERT INTO public.audit_logs (
    company_id,
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    NULL,
    auth.uid(),
    'update_plan',
    'plans',
    p_plan_id,
    v_old_plan,
    jsonb_build_object(
      'new_data', v_new_plan::jsonb,
      'forced', v_force,
      'affected_companies_count', v_affected_count
    )
  );

  RETURN v_new_plan;
END;
$$;


-- ============================================================================
-- 6. RPC: preview_company_plan_change(...)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.preview_company_plan_change(
  p_company_id uuid,
  p_new_plan_id uuid
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_members int;
  v_current_vehicles int;
  v_new_max_members int;
  v_new_max_vehicles int;
  v_new_plan_name text;
  v_new_plan_is_active boolean;
  v_exceeds_members boolean;
  v_exceeds_vehicles boolean;
  v_can_change boolean;
  v_warning_message text := '';
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Se requieren privilegios de super_admin.';
  END IF;

  -- Validaciones NULL
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'El identificador de la compañía (p_company_id) es obligatorio.';
  END IF;

  IF p_new_plan_id IS NULL THEN
    RAISE EXCEPTION 'El identificador del nuevo plan (p_new_plan_id) es obligatorio.';
  END IF;

  -- Validar existencia de compañía
  IF NOT EXISTS(SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'Compañía no encontrada.';
  END IF;

  -- Validar existencia de plan y obtener datos
  SELECT name::text, max_members, max_vehicles, is_active 
  INTO v_new_plan_name, v_new_max_members, v_new_max_vehicles, v_new_plan_is_active
  FROM public.plans 
  WHERE id = p_new_plan_id;

  IF v_new_plan_name IS NULL THEN
    RAISE EXCEPTION 'El nuevo plan especificado no existe.';
  END IF;

  -- Contar socios activos actuales
  SELECT count(*) INTO v_current_members
  FROM public.members
  WHERE company_id = p_company_id AND status = 'activo';

  -- Contar unidades activas/mantenimiento actuales
  SELECT count(*) INTO v_current_vehicles
  FROM public.vehicles
  WHERE company_id = p_company_id AND status IN ('activa', 'mantenimiento');

  v_exceeds_members := (v_current_members > v_new_max_members);
  v_exceeds_vehicles := (v_current_vehicles > v_new_max_vehicles);
  v_can_change := (NOT v_exceeds_members AND NOT v_exceeds_vehicles);

  -- Construir advertencias
  IF NOT v_new_plan_is_active THEN
    v_warning_message := 'Advertencia: El plan de destino se encuentra inactivo. ';
  END IF;

  IF v_exceeds_members AND v_exceeds_vehicles THEN
    v_warning_message := v_warning_message || 'La cooperativa excede los límites de socios (' || v_current_members || '/' || v_new_max_members || ') y unidades (' || v_current_vehicles || '/' || v_new_max_vehicles || ') del nuevo plan.';
  ELSIF v_exceeds_members THEN
    v_warning_message := v_warning_message || 'La cooperativa excede el límite de socios (' || v_current_members || '/' || v_new_max_members || ') del nuevo plan.';
  ELSIF v_exceeds_vehicles THEN
    v_warning_message := v_warning_message || 'La cooperativa excede el límite de unidades (' || v_current_vehicles || '/' || v_new_max_vehicles || ') del nuevo plan.';
  END IF;

  RETURN json_build_object(
    'company_id', p_company_id,
    'new_plan_id', p_new_plan_id,
    'new_plan_name', v_new_plan_name,
    'new_plan_is_active', v_new_plan_is_active,
    'current_members', v_current_members,
    'current_vehicles', v_current_vehicles,
    'new_max_members', v_new_max_members,
    'new_max_vehicles', v_new_max_vehicles,
    'exceeds_members', v_exceeds_members,
    'exceeds_vehicles', v_exceeds_vehicles,
    'can_change', v_can_change,
    'warning_message', v_warning_message
  );
END;
$$;


-- ============================================================================
-- 7. RPC: update_company_plan(...)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_company_plan(
  p_company_id uuid,
  p_new_plan_id uuid,
  p_force boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preview json;
  v_can_change boolean;
  v_old_plan_id uuid;
  v_new_plan_active boolean;
  v_force boolean := coalesce(p_force, false);
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Se requieren privilegios de super_admin.';
  END IF;

  -- Validaciones NULL explícitas
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'El identificador de la compañía (p_company_id) es obligatorio.';
  END IF;

  IF p_new_plan_id IS NULL THEN
    RAISE EXCEPTION 'El identificador del nuevo plan (p_new_plan_id) es obligatorio.';
  END IF;

  -- Validar existencia y plan actual de la compañía
  SELECT plan_id INTO v_old_plan_id FROM public.companies WHERE id = p_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compañía no encontrada.';
  END IF;

  -- Validar si ya tiene asignado ese mismo plan
  IF v_old_plan_id = p_new_plan_id THEN
    RAISE EXCEPTION 'La compañía ya tiene asignado este plan.';
  END IF;

  -- Validar que el nuevo plan exista y esté activo (Solo se puede cambiar a planes ACTIVOS)
  SELECT is_active INTO v_new_plan_active FROM public.plans WHERE id = p_new_plan_id;
  IF v_new_plan_active IS NULL THEN
    RAISE EXCEPTION 'El plan especificado no existe.';
  END IF;
  
  IF NOT v_new_plan_active THEN
    RAISE EXCEPTION 'No se puede asignar un plan inactivo a una compañía.';
  END IF;

  -- Obtener preview de límites
  SELECT public.preview_company_plan_change(p_company_id, p_new_plan_id) INTO v_preview;
  v_can_change := (v_preview->>'can_change')::boolean;

  -- Bloquear si no se usa fuerza y excede límites
  IF NOT v_can_change AND NOT v_force THEN
    RAISE EXCEPTION 'Cambio bloqueado: El uso actual supera los límites del nuevo plan. Utiliza el parámetro de forzado si estás seguro.';
  END IF;

  -- Actualizar plan de la compañía
  UPDATE public.companies
  SET plan_id = p_new_plan_id, updated_at = now()
  WHERE id = p_company_id;

  -- Registrar en bitácora de auditoría detallada
  INSERT INTO public.audit_logs (
    company_id,
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    p_company_id,
    auth.uid(),
    'change_company_plan',
    'companies',
    p_company_id,
    jsonb_build_object('plan_id', v_old_plan_id),
    jsonb_build_object(
      'plan_id', p_new_plan_id,
      'forced', v_force,
      'can_change', v_can_change,
      'preview', v_preview
    )
  );

  RETURN json_build_object(
    'success', true,
    'company_id', p_company_id,
    'old_plan_id', v_old_plan_id,
    'new_plan_id', p_new_plan_id,
    'forced', v_force
  );
END;
$$;


-- ============================================================================
-- 8. Firmas de Permisos y Ejecución Explícitas (Incluyendo revokes de triggers)
-- ============================================================================
REVOKE ALL ON FUNCTION public.check_company_member_limit_trigger() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_company_vehicle_limit_trigger() FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_super_admin_plans() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_super_admin_plans() TO authenticated;

REVOKE ALL ON FUNCTION public.create_super_admin_plan(public.plan_name, text, int, int, numeric, jsonb, boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_super_admin_plan(public.plan_name, text, int, int, numeric, jsonb, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.preview_super_admin_plan_update(uuid, int, int) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.preview_super_admin_plan_update(uuid, int, int) TO authenticated;

REVOKE ALL ON FUNCTION public.update_super_admin_plan(uuid, text, int, int, numeric, jsonb, boolean, boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_super_admin_plan(uuid, text, int, int, numeric, jsonb, boolean, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.preview_company_plan_change(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.preview_company_plan_change(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.update_company_plan(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_company_plan(uuid, uuid, boolean) TO authenticated;
