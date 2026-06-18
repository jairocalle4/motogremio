-- 1. Función Trigger para Socios (Members)
CREATE OR REPLACE FUNCTION public.check_company_member_limit_trigger()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_members int;
  v_current_members int;
  v_plan_id uuid;
  v_plan_active boolean;
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
      RAISE EXCEPTION 'No se puede registrar el socio: La compañía no tiene un plan activo asignado.';
    END IF;

    SELECT max_members, is_active INTO v_max_members, v_plan_active
    FROM public.plans
    WHERE id = v_plan_id;

    IF v_plan_active IS NULL OR NOT v_plan_active THEN
      RAISE EXCEPTION 'No se puede registrar el socio: El plan asignado a la compañía no está activo.';
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


-- 2. Función Trigger para Vehículos (Vehicles)
CREATE OR REPLACE FUNCTION public.check_company_vehicle_limit_trigger()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_vehicles int;
  v_current_vehicles int;
  v_plan_id uuid;
  v_plan_active boolean;
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
      RAISE EXCEPTION 'No se puede registrar la unidad: La compañía no tiene un plan activo asignado.';
    END IF;

    SELECT max_vehicles, is_active INTO v_max_vehicles, v_plan_active
    FROM public.plans
    WHERE id = v_plan_id;

    IF v_plan_active IS NULL OR NOT v_plan_active THEN
      RAISE EXCEPTION 'No se puede registrar la unidad: El plan asignado a la compañía no está activo.';
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

-- Eliminar triggers si ya existen
DROP TRIGGER IF EXISTS check_company_member_limit_before_write ON public.members;
DROP TRIGGER IF EXISTS check_company_vehicle_limit_before_write ON public.vehicles;

-- Crear triggers
CREATE TRIGGER check_company_member_limit_before_write
BEFORE INSERT OR UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.check_company_member_limit_trigger();

CREATE TRIGGER check_company_vehicle_limit_before_write
BEFORE INSERT OR UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.check_company_vehicle_limit_trigger();

-- Revocar accesos públicos a las funciones trigger (no deben invocarse por API)
REVOKE ALL ON FUNCTION public.check_company_member_limit_trigger() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_company_vehicle_limit_trigger() FROM PUBLIC, anon, authenticated, service_role;


-- 3. RPC: get_company_plan_usage
CREATE OR REPLACE FUNCTION public.get_company_plan_usage(p_company_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_company uuid;
  v_company_name text;
  v_plan_id uuid;
  v_plan_name text;
  v_max_members int;
  v_max_vehicles int;
  v_plan_active boolean;
  v_current_members int;
  v_current_vehicles int;
  v_members_usage_percent numeric;
  v_vehicles_usage_percent numeric;
  v_members_remaining int;
  v_vehicles_remaining int;
  v_exists boolean;
BEGIN
  -- Validar privilegios y rol administrativo del invocador
  SELECT role, company_id INTO v_caller_role, v_caller_company
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role = 'super_admin' THEN
    -- SuperAdmin puede ver cualquiera
    NULL;
  ELSIF v_caller_role IN ('admin', 'gerente', 'presidente', 'secretaria', 'tesorero') THEN
    -- Inquilinos administrativos solo su cooperativa
    IF p_company_id != v_caller_company THEN
      RAISE EXCEPTION 'No autorizado para consultar el uso de plan de otra compañía.';
    END IF;
  ELSE
    -- Socios, operadores u otros roles no administrativos
    RAISE EXCEPTION 'No autorizado para consultar el uso de planes.';
  END IF;

  -- Validar si la compañía existe
  SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = p_company_id) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Compañía no encontrada.';
  END IF;

  -- Obtener metadatos de la compañía y plan (LEFT JOIN para admitir compañías sin plan)
  SELECT 
    c.legal_name, 
    c.plan_id, 
    coalesce(p.name::text, 'Sin plan'), 
    coalesce(p.max_members, 0), 
    coalesce(p.max_vehicles, 0),
    coalesce(p.is_active, false)
  INTO 
    v_company_name, 
    v_plan_id, 
    v_plan_name, 
    v_max_members, 
    v_max_vehicles,
    v_plan_active
  FROM public.companies c
  LEFT JOIN public.plans p ON p.id = c.plan_id
  WHERE c.id = p_company_id;

  -- Contar socios activos
  SELECT count(*) INTO v_current_members
  FROM public.members
  WHERE company_id = p_company_id AND status = 'activo';

  -- Contar vehículos activos o en mantenimiento
  SELECT count(*) INTO v_current_vehicles
  FROM public.vehicles
  WHERE company_id = p_company_id AND status IN ('activa', 'mantenimiento');

  v_members_remaining := v_max_members - v_current_members;
  v_vehicles_remaining := v_max_vehicles - v_current_vehicles;

  v_members_usage_percent := CASE WHEN v_max_members > 0 THEN round((v_current_members::numeric / v_max_members::numeric) * 100, 2) ELSE 0 END;
  v_vehicles_usage_percent := CASE WHEN v_max_vehicles > 0 THEN round((v_current_vehicles::numeric / v_max_vehicles::numeric) * 100, 2) ELSE 0 END;

  RETURN json_build_object(
    'company_id', p_company_id,
    'company_name', v_company_name,
    'plan_id', v_plan_id,
    'plan_name', v_plan_name,
    'plan_is_active', v_plan_active,
    'max_members', v_max_members,
    'max_vehicles', v_max_vehicles,
    'current_members', v_current_members,
    'current_vehicles', v_current_vehicles,
    'members_usage_percent', v_members_usage_percent,
    'vehicles_usage_percent', v_vehicles_usage_percent,
    'members_remaining', greatest(0, v_members_remaining),
    'vehicles_remaining', greatest(0, v_vehicles_remaining),
    'is_members_limit_reached', (v_members_remaining <= 0),
    'is_vehicles_limit_reached', (v_vehicles_remaining <= 0),
    'is_near_members_limit', (v_members_usage_percent >= 80),
    'is_near_vehicles_limit', (v_vehicles_usage_percent >= 80)
  );
END;
$$;


-- 4. RPC: get_my_company_plan_usage (Wrapper seguro)
CREATE OR REPLACE FUNCTION public.get_my_company_plan_usage()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_company_id uuid;
BEGIN
  -- Validar rol administrativo
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role IN ('admin', 'gerente', 'presidente', 'secretaria', 'tesorero')
  ) THEN
    RAISE EXCEPTION 'No autorizado. Permisos administrativos de cooperativa requeridos.';
  END IF;

  SELECT company_id INTO v_my_company_id FROM public.profiles WHERE id = auth.uid();
  IF v_my_company_id IS NULL THEN
    RAISE EXCEPTION 'El perfil de usuario actual no tiene asignado una compañía.';
  END IF;

  -- Reutiliza la función base que contiene la validación lógica completa
  RETURN public.get_company_plan_usage(v_my_company_id);
END;
$$;


-- 5. RPC: get_super_admin_plan_usage_overview (LEFT JOIN para no ocultar compañías sin plan)
CREATE OR REPLACE FUNCTION public.get_super_admin_plan_usage_overview()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overview json;
BEGIN
  -- Validar privilegios
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Se requieren privilegios de super_admin.';
  END IF;

  SELECT coalesce(json_agg(t), '[]'::json) INTO v_overview
  FROM (
    SELECT 
      c.id as company_id,
      c.legal_name as company_name,
      coalesce(p.name::text, 'Sin plan') as plan_name,
      coalesce(p.is_active, false) as plan_is_active,
      c.status as status,
      (SELECT count(*) FROM public.members m WHERE m.company_id = c.id AND m.status = 'activo') as current_members,
      coalesce(p.max_members, 0) as max_members,
      (SELECT count(*) FROM public.vehicles v WHERE v.company_id = c.id AND v.status IN ('activa', 'mantenimiento')) as current_vehicles,
      coalesce(p.max_vehicles, 0) as max_vehicles,
      CASE WHEN coalesce(p.max_members, 0) > 0 THEN round(((SELECT count(*) FROM public.members m WHERE m.company_id = c.id AND m.status = 'activo')::numeric / p.max_members::numeric) * 100, 2) ELSE 0 END as members_usage_percent,
      CASE WHEN coalesce(p.max_vehicles, 0) > 0 THEN round(((SELECT count(*) FROM public.vehicles v WHERE v.company_id = c.id AND v.status IN ('activa', 'mantenimiento'))::numeric / p.max_vehicles::numeric) * 100, 2) ELSE 0 END as vehicles_usage_percent
    FROM public.companies c
    LEFT JOIN public.plans p ON p.id = c.plan_id
    ORDER BY c.created_at DESC
  ) t;

  RETURN v_overview;
END;
$$;

-- 6. Firmas de Funciones y Permisos Explícitos
REVOKE ALL ON FUNCTION public.get_company_plan_usage(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_company_plan_usage(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_company_plan_usage() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_company_plan_usage() TO authenticated;

REVOKE ALL ON FUNCTION public.get_super_admin_plan_usage_overview() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_super_admin_plan_usage_overview() TO authenticated;
