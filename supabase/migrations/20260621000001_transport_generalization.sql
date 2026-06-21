-- 1. Agregar service_type y custom_service_type a companies
ALTER TABLE public.companies
ADD COLUMN service_type text NOT NULL DEFAULT 'mototaxi'
CHECK (service_type IN ('mototaxi', 'taxi', 'camioneta', 'transporte_mixto', 'otro'));

ALTER TABLE public.companies
ADD COLUMN custom_service_type text
CHECK (char_length(custom_service_type) <= 80);

-- 2. Agregar vehicle_type y custom_vehicle_type a vehicles
ALTER TABLE public.vehicles
ADD COLUMN vehicle_type text
CHECK (vehicle_type IS NULL OR vehicle_type IN ('moto', 'auto', 'camioneta', 'furgoneta', 'tricimoto', 'otro'));

ALTER TABLE public.vehicles
ADD COLUMN custom_vehicle_type text
CHECK (char_length(custom_vehicle_type) <= 80);

-- 3. Actualizar create_super_admin_company para aceptar service_type
DROP FUNCTION IF EXISTS public.create_super_admin_company(text, text, text, uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_super_admin_company(
  p_legal_name text,
  p_trade_name text,
  p_ruc text,
  p_plan_id uuid,
  p_status text,
  p_admin_first_name text,
  p_admin_last_name text,
  p_admin_email text,
  p_service_type text DEFAULT 'mototaxi',
  p_custom_service_type text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_token varchar(64);
  v_plan_active boolean;
  v_ruc_trimmed text;
  v_email_trimmed text;
BEGIN
  -- 1. Validar identidad
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Permisos de super_admin requeridos.';
  END IF;

  -- 2. Validar campos obligatorios (coalesce para soportar NULL)
  IF coalesce(trim(p_legal_name), '') = '' OR 
     coalesce(trim(p_admin_first_name), '') = '' OR 
     coalesce(trim(p_admin_last_name), '') = '' THEN
    RAISE EXCEPTION 'El nombre legal de la compañía, así como el nombre y apellido del administrador no pueden estar vacíos.';
  END IF;

  -- 3. Limpieza y validación de RUC
  v_ruc_trimmed := trim(p_ruc);
  IF coalesce(v_ruc_trimmed, '') = '' OR v_ruc_trimmed !~ '^[0-9]{13}$' THEN
    RAISE EXCEPTION 'El RUC debe constar de exactamente 13 dígitos numéricos.';
  END IF;

  -- 4. Limpieza y validación de Email
  v_email_trimmed := lower(trim(p_admin_email));
  IF coalesce(v_email_trimmed, '') = '' OR v_email_trimmed !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Formato de correo electrónico inválido para el administrador.';
  END IF;

  -- 5. Validar estado de compañía
  IF p_status IS NULL OR p_status NOT IN ('activa', 'inactiva') THEN
    RAISE EXCEPTION 'Estado no permitido para la compañía o valor nulo recibido.';
  END IF;

  -- 6. Validar Plan
  IF p_plan_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere especificar un ID de plan válido.';
  END IF;

  SELECT is_active INTO v_plan_active FROM public.plans WHERE id = p_plan_id;
  IF v_plan_active IS NULL OR NOT v_plan_active THEN
    RAISE EXCEPTION 'El plan seleccionado no existe o no se encuentra activo.';
  END IF;

  -- 7. Validar duplicación de RUC
  IF EXISTS(SELECT 1 FROM public.companies WHERE ruc = v_ruc_trimmed) THEN
    RAISE EXCEPTION 'Ya existe una compañía registrada con el RUC %.', v_ruc_trimmed;
  END IF;

  -- 8. Validar duplicación de invitación pendiente de administrador
  IF EXISTS(SELECT 1 FROM public.pending_invitations WHERE lower(email) = v_email_trimmed AND status = 'pending') THEN
    RAISE EXCEPTION 'Ya existe una invitación pendiente activa para el correo %.', p_admin_email;
  END IF;

  -- 9. Insertar Compañía
  INSERT INTO public.companies (legal_name, trade_name, ruc, plan_id, status, service_type, custom_service_type)
  VALUES (p_legal_name, p_trade_name, v_ruc_trimmed, p_plan_id, p_status, coalesce(p_service_type, 'mototaxi'), p_custom_service_type)
  RETURNING id INTO v_company_id;

  -- 10. Generar Token Seguro con gen_random_bytes
  v_token := encode(gen_random_bytes(32), 'hex');

  -- 11. Registrar invitación del Admin Inicial
  INSERT INTO public.pending_invitations (email, company_id, role, first_name, last_name, token, expires_at, created_by)
  VALUES (
    v_email_trimmed,
    v_company_id,
    'admin'::public.user_role,
    p_admin_first_name,
    p_admin_last_name,
    v_token,
    now() + INTERVAL '7 days',
    auth.uid()
  );

  RETURN json_build_object(
    'success', true,
    'company_id', v_company_id,
    'invitation_token', v_token,
    'email', v_email_trimmed,
    'service_type', coalesce(p_service_type, 'mototaxi')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_super_admin_company(text, text, text, uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_super_admin_company(text, text, text, uuid, text, text, text, text, text, text) TO authenticated;

-- 4. Actualizar get_companies_with_stats
CREATE OR REPLACE FUNCTION public.get_companies_with_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT coalesce(json_agg(t), '[]'::json) INTO v_result
  FROM (
    SELECT 
      c.id,
      c.legal_name,
      c.trade_name,
      c.ruc,
      c.status,
      c.service_type,
      c.custom_service_type,
      c.created_at,
      p.name as plan_name,
      (SELECT count(*) FROM public.members m WHERE m.company_id = c.id) as members_count,
      (SELECT count(*) FROM public.vehicles v WHERE v.company_id = c.id) as vehicles_count,
      (SELECT count(*) FROM public.profiles pr WHERE pr.company_id = c.id) as users_count,
      (SELECT coalesce(sum(balance), 0) FROM public.charges ch WHERE ch.company_id = c.id AND ch.balance > 0 AND ch.status != 'anulada') as total_debt
    FROM public.companies c
    LEFT JOIN public.plans p ON p.id = c.plan_id
    ORDER BY c.created_at DESC
  ) t;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_companies_with_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_companies_with_stats() TO authenticated;
