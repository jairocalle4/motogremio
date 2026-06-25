CREATE OR REPLACE FUNCTION public.create_pending_invitation(
  p_email text,
  p_company_id uuid,
  p_role public.user_role,
  p_first_name text,
  p_last_name text,
  p_member_id uuid DEFAULT NULL
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

  -- 5. Validaciones de autorización (Security Definer)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para realizar esta acción.';
  END IF;

  SELECT role, company_id INTO v_caller_role, v_caller_company_id 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'No tienes un rol válido asignado en el sistema.';
  END IF;

  IF v_caller_role = 'super_admin'::public.user_role THEN
    -- super_admin puede invitar a cualquier rol permitido a cualquier compañía
    NULL;
  ELSIF v_caller_role = 'admin'::public.user_role THEN
    IF v_caller_company_id != p_company_id THEN
      RAISE EXCEPTION 'Solo puedes invitar usuarios a tu propia compañía.';
    END IF;
    IF p_role NOT IN ('secretaria'::public.user_role, 'socio'::public.user_role) THEN
      RAISE EXCEPTION 'No tienes permisos para invitar un usuario con el rol %.', p_role;
    END IF;
  ELSE
    RAISE EXCEPTION 'Tu rol (%) no te permite invitar usuarios al sistema.', v_caller_role;
  END IF;

  -- 6. Crear token e insertar
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.pending_invitations (
    email,
    company_id,
    role,
    first_name,
    last_name,
    token,
    created_by,
    member_id
  ) VALUES (
    v_email_normalized,
    p_company_id,
    p_role,
    trim(p_first_name),
    trim(p_last_name),
    v_token,
    auth.uid(),
    p_member_id
  );

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_pending_invitation(text, uuid, public.user_role, text, text, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_pending_invitation(text, uuid, public.user_role, text, text, uuid) TO authenticated;
