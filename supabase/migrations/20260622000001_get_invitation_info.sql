-- Migración para consultar la información de una invitación sin autenticación
-- Útil para pre-llenar y bloquear el formulario de registro.

CREATE OR REPLACE FUNCTION public.get_invitation_info(p_token text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
BEGIN
  SELECT email, first_name, last_name, company_id INTO v_invitation
  FROM public.pending_invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > now();

  IF v_invitation IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'email', v_invitation.email,
    'first_name', v_invitation.first_name,
    'last_name', v_invitation.last_name,
    'company_id', v_invitation.company_id
  );
END;
$$;
