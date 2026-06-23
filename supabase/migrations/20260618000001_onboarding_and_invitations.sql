-- Asegurar la extensión pgcrypto para gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabla de invitaciones pendientes (sin políticas SELECT directas)
CREATE TABLE public.pending_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  role public.user_role NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' 
    CONSTRAINT check_invitation_status CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  token varchar(64) UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  accepted_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT pending_invitations_no_super_admin CHECK (role <> 'super_admin'::public.user_role)
);

-- Índice único parcial para evitar duplicaciones en invitaciones activas
CREATE UNIQUE INDEX pending_invitations_email_pending_unique
ON public.pending_invitations (lower(email))
WHERE status = 'pending';

-- Habilitar RLS sin políticas directas de lectura/escritura
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- 2. Rediseñar trigger handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_token text;
  v_total_rows int;
BEGIN
  v_token := trim(NEW.raw_user_meta_data->>'invite_token');

  -- Contar filas para saber si la tabla entera es invisible
  SELECT count(*) INTO v_total_rows FROM public.pending_invitations;

  IF v_token IS NOT NULL AND v_token != '' THEN
    SELECT * INTO v_invitation
    FROM public.pending_invitations
    WHERE token = v_token;
  END IF;

  IF FOUND THEN
    IF v_invitation.status != 'pending' THEN
      RAISE EXCEPTION 'CRÍTICO: La invitación no está pendiente. Estado actual: %', v_invitation.status;
    END IF;

    IF v_invitation.expires_at < now() THEN
      RAISE EXCEPTION 'CRÍTICO: La invitación expiró el %', v_invitation.expires_at;
    END IF;

    -- Inserción oficial
    INSERT INTO public.profiles (id, first_name, last_name, role, company_id, is_active)
    VALUES (
      NEW.id,
      v_invitation.first_name,
      v_invitation.last_name,
      v_invitation.role,
      v_invitation.company_id,
      true
    );
    
    UPDATE public.pending_invitations
    SET status = 'accepted', accepted_at = now(), accepted_user_id = NEW.id, updated_at = now()
    WHERE id = v_invitation.id;
  ELSE
    IF v_token IS NOT NULL AND v_token != '' THEN
      RAISE EXCEPTION 'CRÍTICO: Fila INVISIBLE. Total filas visibles en tabla: %. Token buscado: "%"', v_total_rows, v_token;
    END IF;

    -- Registro sin invitación
    INSERT INTO public.profiles (id, first_name, last_name, role, company_id, is_active)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario'), COALESCE(NEW.raw_user_meta_data->>'last_name', ''), 'socio'::public.user_role, NULL, true);
  END IF;

  RETURN NEW;
END;
$$;


-- 3. RPC: create_super_admin_company
CREATE OR REPLACE FUNCTION public.create_super_admin_company(
  p_legal_name text,
  p_trade_name text,
  p_ruc text,
  p_plan_id uuid,
  p_status text,
  p_admin_first_name text,
  p_admin_last_name text,
  p_admin_email text
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

  -- 8.5 Validar que el usuario no exista ya en el sistema
  IF EXISTS(SELECT 1 FROM auth.users WHERE lower(email) = v_email_trimmed) THEN
    RAISE EXCEPTION 'El correo % ya pertenece a un usuario registrado en el sistema.', p_admin_email;
  END IF;

  -- 9. Insertar Compañía
  INSERT INTO public.companies (legal_name, trade_name, ruc, plan_id, status)
  VALUES (p_legal_name, p_trade_name, v_ruc_trimmed, p_plan_id, p_status)
  RETURNING id INTO v_company_id;

  -- 10. Generar Token Seguro con gen_random_bytes
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

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
    'company_id', v_company_id,
    'invite_token', v_token
  );
END;
$$;


-- 4. RPC: create_pending_invitation
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

  -- 3. Validar que no se invite a un super_admin
  IF p_role = 'super_admin'::public.user_role THEN
    RAISE EXCEPTION 'No se permite invitar usuarios con privilegios de super_admin.';
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


-- 5. RPC: cancel_pending_invitation
CREATE OR REPLACE FUNCTION public.cancel_pending_invitation(p_invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_company uuid;
  v_inv_company uuid;
  v_inv_status text;
BEGIN
  IF p_invitation_id IS NULL THEN
    RAISE EXCEPTION 'ID de invitación no especificado.';
  END IF;

  -- Buscar invitación y su estado
  SELECT company_id, status INTO v_inv_company, v_inv_status
  FROM public.pending_invitations WHERE id = p_invitation_id;

  IF v_inv_status IS NULL THEN
    RAISE EXCEPTION 'Invitación no encontrada.';
  END IF;

  IF v_inv_status != 'pending' THEN
    RAISE EXCEPTION 'La invitación no se encuentra en estado pendiente y no puede cancelarse.';
  END IF;

  -- Validar permisos del invocador
  SELECT role, company_id INTO v_caller_role, v_caller_company
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role = 'super_admin' THEN
    NULL;
  ELSIF v_caller_role = 'admin' THEN
    IF v_caller_company != v_inv_company THEN
      RAISE EXCEPTION 'No estás autorizado para cancelar invitaciones de otra compañía.';
    END IF;
  ELSE
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  -- Cancelar sin borrar para conservar auditoría
  UPDATE public.pending_invitations
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_invitation_id;

  RETURN true;
END;
$$;


-- 6. RPC: get_company_invitations
CREATE OR REPLACE FUNCTION public.get_company_invitations(p_company_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_company uuid;
  v_invitations json;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'ID de compañía no especificado.';
  END IF;

  -- Validar permisos de llamada
  SELECT role, company_id INTO v_caller_role, v_caller_company
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role = 'super_admin' THEN
    NULL;
  ELSIF v_caller_role IN ('admin', 'gerente', 'presidente', 'secretaria', 'tesorero') THEN
    IF p_company_id != v_caller_company THEN
      RAISE EXCEPTION 'Acceso denegado a invitaciones de otra compañía.';
    END IF;
  ELSE
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  -- Retorna campos seguros, calculando dinámicamente si la invitación expiró
  SELECT coalesce(json_agg(t), '[]'::json) INTO v_invitations
  FROM (
    SELECT 
      id, 
      email, 
      role, 
      first_name, 
      last_name, 
      CASE 
        WHEN status = 'pending' AND expires_at < now() THEN 'expired'
        ELSE status
      END as status,
      expires_at, 
      created_at
    FROM public.pending_invitations
    WHERE company_id = p_company_id
    ORDER BY created_at DESC
  ) t;

  RETURN v_invitations;
END;
$$;


-- 7. RPC: get_company_users
CREATE OR REPLACE FUNCTION public.get_company_users(p_company_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_company uuid;
  v_users json;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'ID de compañía no especificado.';
  END IF;

  -- 1. Validar identidad
  SELECT role, company_id INTO v_caller_role, v_caller_company
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role = 'super_admin' THEN
    -- Super administrador puede consultar cualquier compañía
    NULL;
  ELSIF v_caller_role IN ('admin', 'gerente', 'presidente', 'secretaria', 'tesorero') THEN
    -- Roles administrativos solo pueden consultar su propia cooperativa
    IF p_company_id != v_caller_company THEN
      RAISE EXCEPTION 'Acceso denegado a usuarios de otra compañía.';
    END IF;
  ELSE
    -- Socios, operadores u otros roles no autorizados
    RAISE EXCEPTION 'No autorizado para listar usuarios.';
  END IF;

  -- 2. Consulta unificada con auth.users
  SELECT coalesce(json_agg(t), '[]'::json) INTO v_users
  FROM (
    SELECT 
      p.id,
      p.first_name,
      p.last_name,
      p.role,
      p.is_active,
      p.created_at,
      u.email
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.company_id = p_company_id
    ORDER BY p.created_at DESC
  ) t;

  RETURN v_users;
END;
$$;


-- 8. RPC: update_company_user_status
CREATE OR REPLACE FUNCTION public.update_company_user_status(
  p_user_id uuid,
  p_is_active boolean
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
  IF p_user_id IS NULL OR p_is_active IS NULL THEN
    RAISE EXCEPTION 'Parámetros obligatorios faltantes o nulos.';
  END IF;

  -- 1. Validar existencia
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Usuario no encontrado.';
  END IF;

  SELECT role, company_id INTO v_caller_role, v_caller_company FROM public.profiles WHERE id = auth.uid();
  SELECT company_id, role INTO v_target_company, v_target_role FROM public.profiles WHERE id = p_user_id;

  -- 2. Impedir modificaciones de super_admins
  IF v_target_role = 'super_admin'::public.user_role THEN
    RAISE EXCEPTION 'No se permite desactivar cuentas de super_admin.';
  END IF;

  -- 3. Validar privilegios y jerarquía
  IF v_caller_role = 'super_admin' THEN
    IF p_user_id = auth.uid() THEN
      RAISE EXCEPTION 'No puedes suspender tu propia cuenta de super_admin.';
    END IF;
  ELSIF v_caller_role = 'admin' THEN
    IF v_caller_company != v_target_company THEN
      RAISE EXCEPTION 'No puedes modificar usuarios de otra compañía.';
    END IF;
    -- Impedir modificar otros admins de cooperativas o a sí mismo
    IF p_user_id = auth.uid() OR v_target_role = 'admin'::public.user_role THEN
      RAISE EXCEPTION 'No tienes permisos para desactivar cuentas administrativas principales (admin/super_admin).';
    END IF;
  ELSE
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  UPDATE public.profiles
  SET is_active = p_is_active, updated_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;


-- 9. RPC: update_company_user_role
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

  -- 2. Impedir asignar super_admin
  IF p_role = 'super_admin'::public.user_role THEN
    RAISE EXCEPTION 'No está permitido asignar el rol de super_admin.';
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
    IF p_role NOT IN ('operador', 'gerente', 'presidente', 'secretaria', 'tesorero', 'socio') THEN
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


-- 10. Permisos explícitos (REVOKE/GRANT con firmas detalladas)
REVOKE ALL ON FUNCTION public.create_super_admin_company(text, text, text, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_super_admin_company(text, text, text, uuid, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_pending_invitation(text, uuid, public.user_role, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_pending_invitation(text, uuid, public.user_role, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_pending_invitation(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_pending_invitation(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_company_invitations(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_company_invitations(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_company_users(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_company_users(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.update_company_user_status(uuid, boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_company_user_status(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.update_company_user_role(uuid, public.user_role) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_company_user_role(uuid, public.user_role) TO authenticated;
