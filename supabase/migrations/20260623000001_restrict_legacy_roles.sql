-- 1. Actualizar RPC: update_company_user_role para rechazar roles legacy
CREATE OR REPLACE FUNCTION public.update_company_user_role(
  p_user_id uuid,
  p_role public.user_role
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_company uuid;
  v_target_company uuid;
  v_target_role public.user_role;
  v_exists boolean;
BEGIN
  IF p_user_id IS NULL OR p_role IS NULL THEN
    RAISE EXCEPTION 'Parámetros obligatorios faltantes o nulos.';
  END IF;

  -- 1. Validar existencia
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Usuario no encontrado.';
  END IF;

  -- 2. Impedir asignar super_admin o roles legacy
  IF p_role = 'super_admin'::public.user_role THEN
    RAISE EXCEPTION 'No está permitido asignar el rol de super_admin.';
  END IF;

  IF p_role IN ('gerente', 'presidente', 'tesorero', 'operador') THEN
    RAISE EXCEPTION 'No se permite asignar roles heredados (legacy).';
  END IF;

  SELECT role, company_id INTO v_caller_role, v_caller_company FROM public.profiles WHERE id = auth.uid();
  SELECT company_id, role INTO v_target_company, v_target_role FROM public.profiles WHERE id = p_user_id;

  -- 3. Impedir modificar super_admins existentes
  IF v_target_role = 'super_admin'::public.user_role THEN
    RAISE EXCEPTION 'No se permite modificar cuentas de super_admin.';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes modificar tu propio rol mediante este procedimiento.';
  END IF;

  -- 4. Validar privilegios y jerarquía
  IF v_caller_role = 'super_admin' THEN
    NULL;
  ELSIF v_caller_role = 'admin' THEN
    IF v_caller_company != v_target_company THEN
      RAISE EXCEPTION 'No puedes modificar usuarios de otra compañía.';
    END IF;
    -- Impedir modificar otros admins de cooperativas
    IF v_target_role = 'admin'::public.user_role THEN
      RAISE EXCEPTION 'No tienes permisos para modificar roles de cuentas administrativas principales.';
    END IF;
    -- Roles permitidos subordinados para un admin
    IF p_role NOT IN ('secretaria', 'socio') THEN
      RAISE EXCEPTION 'Rol asignado no es un rol operativo subordinado permitido.';
    END IF;
  ELSE
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  -- Habilitar el bypass para saltar el trigger protect_profile_escalation
  PERFORM set_config('motogremio.bypass_rls_trigger', 'true', true);

  UPDATE public.profiles
  SET role = p_role, updated_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;


-- 2. Actualizar RPC: create_pending_invitation para rechazar roles legacy
CREATE OR REPLACE FUNCTION public.create_pending_invitation(
  p_email text,
  p_company_id uuid,
  p_role public.user_role,
  p_first_name text,
  p_last_name text
)
RETURNS varchar(64)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_company_id uuid;
  v_token varchar(64);
  v_email_normalized text;
  v_comp_exists boolean;
BEGIN
  -- 1. Validaciones básicas de campos obligatorios
  v_email_normalized := lower(trim(p_email));
  IF coalesce(v_email_normalized, '') = '' OR v_email_normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Formato de correo electrónico inválido o campo vacío.';
  END IF;
  
  IF coalesce(trim(p_first_name), '') = '' OR coalesce(trim(p_last_name), '') = '' THEN
    RAISE EXCEPTION 'El nombre y apellido no pueden estar vacíos.';
  END IF;

  IF p_role IS NULL THEN
    RAISE EXCEPTION 'Se requiere especificar un rol para invitar al usuario.';
  END IF;

  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere especificar una compañía de destino para la invitación.';
  END IF;

  -- 2. Validar que la compañía exista y esté activa
  SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = p_company_id AND status = 'activa') INTO v_comp_exists;
  IF NOT v_comp_exists THEN
    RAISE EXCEPTION 'La compañía seleccionada no existe o no se encuentra activa.';
  END IF;

  -- 3. Validar roles permitidos
  IF p_role = 'super_admin'::public.user_role THEN
    RAISE EXCEPTION 'No se permite invitar usuarios con privilegios de super_admin.';
  END IF;

  IF p_role IN ('gerente', 'presidente', 'tesorero', 'operador') THEN
    RAISE EXCEPTION 'No se permite asignar roles heredados (legacy) en nuevas invitaciones.';
  END IF;

  -- 4. Validar duplicación de invitación pendiente activa
  IF EXISTS(SELECT 1 FROM public.pending_invitations WHERE lower(email) = v_email_normalized AND status = 'pending') THEN
    RAISE EXCEPTION 'Ya existe una invitación pendiente activa para el correo %.', p_email;
  END IF;

  -- 4.5 Validar que el usuario no exista ya en el sistema
  IF EXISTS(SELECT 1 FROM auth.users WHERE lower(email) = v_email_normalized) THEN
    RAISE EXCEPTION 'El correo % ya pertenece a un usuario registrado en el sistema.', p_email;
  END IF;

  -- 5. Validar privilegios del invocador
  SELECT role, company_id INTO v_caller_role, v_caller_company_id
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role = 'super_admin' THEN
    -- SuperAdmin puede invitar cualquier rol subordinado a cualquier compañía
    NULL;
  ELSIF v_caller_role = 'admin' THEN
    -- Admin solo puede invitar a su propia compañía
    IF p_company_id != v_caller_company_id THEN
      RAISE EXCEPTION 'Acceso denegado. No puedes invitar usuarios a otras compañías.';
    END IF;
    -- Admin no puede crear roles superiores ni a otro admin (solo uno por compañía)
    IF p_role IN ('super_admin', 'admin') THEN
      RAISE EXCEPTION 'No tienes privilegios para invitar administradores.';
    END IF;
  ELSE
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  -- 6. Generar Token Seguro
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- 7. Insertar
  INSERT INTO public.pending_invitations (email, company_id, role, first_name, last_name, token, expires_at, created_by)
  VALUES (
    v_email_normalized,
    p_company_id,
    p_role,
    p_first_name,
    p_last_name,
    v_token,
    now() + INTERVAL '3 days',
    auth.uid()
  );

  RETURN v_token;
END;
$$;
