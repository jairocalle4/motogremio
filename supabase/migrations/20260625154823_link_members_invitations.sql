-- Añadir member_id a pending_invitations
ALTER TABLE public.pending_invitations
ADD COLUMN member_id uuid REFERENCES public.members(id) ON DELETE CASCADE;

-- Crear un indice para acelerar las busquedas por member_id
CREATE INDEX IF NOT EXISTS idx_pending_invitations_member_id ON public.pending_invitations(member_id);

-- Actualizar la función handle_new_user
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

    -- Enlazar member_id si existe en la invitación
    IF v_invitation.member_id IS NOT NULL THEN
      UPDATE public.members 
      SET profile_id = NEW.id, updated_at = now()
      WHERE id = v_invitation.member_id;
    END IF;
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

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;