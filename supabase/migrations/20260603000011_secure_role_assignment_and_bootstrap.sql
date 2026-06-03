-- ==============================================================================
-- MIGRACIÓN 0011: Gestión Segura de Roles y Bootstrap Administrativo
-- ==============================================================================

-- 1. Asegurar is_super_admin (Responsabilidad Única)
-- Mantiene su función original sin mezclar con roles de BD.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- 2. Trigger Inteligente para Evitar Escaladas (Bypass Controlado para RPCs)
-- Bloquea cualquier intento de cambiar roles/compañías directamente vía REST (UPDATE estándar).
CREATE OR REPLACE FUNCTION public.protect_profile_escalation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si el update viene desde uno de los RPC autorizados de esta migración, 
  -- se permite el paso y se delegará la validación y la auditoría al RPC.
  -- Este valor dura únicamente durante la transacción actual.
  IF current_setting('motogremio.bypass_rls_trigger', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Bloquear modificación directa de rol
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Seguridad: No puedes modificar roles directamente. Utiliza el procedimiento asignado.';
  END IF;

  -- Bloquear modificación directa de compañía
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Seguridad: No puedes modificar tu compañía directamente.';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Función Exclusiva de Bootstrap (Uso Administrativo Seguro)
CREATE OR REPLACE FUNCTION public.bootstrap_first_super_admin(target_user uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_exists boolean;
  v_has_super boolean;
  v_old_role public.user_role;
  v_old_company uuid;
BEGIN
  -- Verificar existencia y capturar datos viejos para auditoría
  SELECT role, company_id INTO v_old_role, v_old_company FROM public.profiles WHERE id = target_user;
  IF v_old_role IS NULL THEN
    RAISE EXCEPTION 'Bootstrap: El usuario objetivo no existe en profiles.';
  END IF;

  -- Verificar que no exista ya un super administrador
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'super_admin') INTO v_has_super;
  IF v_has_super THEN
    RAISE EXCEPTION 'Bootstrap: Ya existe un super administrador. Operación rechazada.';
  END IF;

  -- Habilitar el bypass para la transacción actual
  PERFORM set_config('motogremio.bypass_rls_trigger', 'true', true);

  -- Actualizar el perfil inicial (sin eliminarlo)
  UPDATE public.profiles
  SET role = 'super_admin',
      company_id = NULL,
      first_name = 'Jairo',
      last_name = 'Calle',
      is_active = true,
      updated_at = now()
  WHERE id = target_user;

  -- Registrar en Auditoría
  -- user_id = NULL indica que fue una operación del sistema (bootstrap desde SQL Editor)
  INSERT INTO public.audit_logs (
    company_id, user_id, action, table_name, record_id, old_data, new_data
  ) VALUES (
    NULL, 
    NULL, 
    'BOOTSTRAP_SUPER_ADMIN', 
    'profiles', 
    target_user,
    jsonb_build_object(
      'actor', 'system_bootstrap_sql_editor',
      'role', v_old_role,
      'company_id', v_old_company
    ),
    jsonb_build_object(
      'role', 'super_admin',
      'company_id', NULL
    )
  );
END;
$$;

-- Permisos estrictos: Solo puede ejecutarlo postgres (Panel SQL). Revocado a todos los demás.
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_super_admin(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_super_admin(uuid) TO postgres;


-- 4. RPC Futuro para Asignación Estricta de Roles (Frontend/API)
CREATE OR REPLACE FUNCTION public.assign_user_role(
  target_user_id uuid,
  target_company_id uuid,
  target_role public.user_role
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoker_role public.user_role;
  v_invoker_company uuid;
  v_old_role public.user_role;
  v_old_company uuid;
BEGIN
  -- Validar identidad del invocador
  SELECT role, company_id INTO v_invoker_role, v_invoker_company
  FROM public.profiles WHERE id = auth.uid();

  IF v_invoker_role IS NULL THEN
    RAISE EXCEPTION 'Seguridad: Usuario invocador no identificado.';
  END IF;

  -- Impedir automodificación
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Seguridad: No puedes modificar tu propio rol o compañía mediante este procedimiento.';
  END IF;

  -- Validar identidad del objetivo
  SELECT role, company_id INTO v_old_role, v_old_company
  FROM public.profiles WHERE id = target_user_id;

  IF v_old_role IS NULL THEN
    RAISE EXCEPTION 'Seguridad: Usuario objetivo no existe.';
  END IF;

  -- REGLAS SUPER ADMIN
  IF v_invoker_role = 'super_admin' THEN
    IF target_role = 'super_admin' THEN
      RAISE EXCEPTION 'Seguridad: Un super administrador no puede nombrar a otro super administrador por esta vía.';
    END IF;
    IF target_company_id IS NULL THEN
      RAISE EXCEPTION 'Seguridad: Se requiere especificar la compañía para el rol asignado.';
    END IF;

  -- REGLAS ADMIN DE COMPAÑÍA
  ELSIF v_invoker_role = 'admin' THEN
    IF target_role IN ('super_admin', 'admin') THEN
      RAISE EXCEPTION 'Seguridad: Solo puedes asignar roles subordinados operativos.';
    END IF;
    
    -- El administrador solo puede operar dentro de su propia compañía 
    -- y solo sobre usuarios que ya pertenecen a su compañía.
    IF target_company_id IS DISTINCT FROM v_invoker_company OR v_old_company IS DISTINCT FROM v_invoker_company THEN
      RAISE EXCEPTION 'Seguridad: Acceso denegado. Solo puedes gestionar roles subordinados de usuarios que ya pertenecen a tu compañía.';
    END IF;

  -- OTROS ROLES (DENEGADO)
  ELSE
    RAISE EXCEPTION 'Seguridad: No tienes privilegios para asignar roles.';
  END IF;

  -- Habilitar el bypass para la transacción actual
  PERFORM set_config('motogremio.bypass_rls_trigger', 'true', true);

  -- Actualizar
  UPDATE public.profiles 
  SET role = target_role,
      company_id = target_company_id,
      updated_at = now()
  WHERE id = target_user_id;

  -- Registrar Auditoría
  INSERT INTO public.audit_logs (
    company_id, user_id, action, table_name, record_id, old_data, new_data
  ) VALUES (
    COALESCE(target_company_id, v_old_company), 
    auth.uid(), 
    'UPDATE_ROLE', 
    'profiles', 
    target_user_id,
    jsonb_build_object('role', v_old_role, 'company_id', v_old_company),
    jsonb_build_object('role', target_role, 'company_id', target_company_id)
  );
END;
$$;

-- Permisos estrictos: Solo usuarios autenticados pueden ejecutarla
REVOKE EXECUTE ON FUNCTION public.assign_user_role(uuid, uuid, public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, uuid, public.user_role) TO authenticated;
