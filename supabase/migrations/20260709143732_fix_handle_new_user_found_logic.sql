-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix: Corregir bug de lógica FOUND en handle_new_user()
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA (ERROR 55000):
--   En la versión anterior, SELECT count(*) INTO v_total_rows se ejecutaba de
--   forma incondicional al inicio del cuerpo. PL/pgSQL actualiza la variable
--   especial FOUND después de CADA sentencia SELECT INTO. Como count(*) siempre
--   devuelve exactamente una fila, FOUND quedaba en true sin importar si existía
--   o no un token de invitación. Luego, cuando no había token, el bloque
--   "SELECT * INTO v_invitation" nunca se ejecutaba, dejando v_invitation sin
--   asignar (record not yet assigned). Al llegar al IF FOUND → true, el código
--   intentaba leer v_invitation.status de un record vacío → ERROR 55000.
--
-- CORRECCIÓN MÍNIMA APLICADA:
--   1. Mover el SELECT count(*) INTO v_total_rows DENTRO del bloque de token,
--      para que solo se ejecute cuando el usuario presenta un token.
--   2. Evaluar FOUND inmediatamente después del SELECT INTO v_invitation,
--      antes de cualquier otra sentencia, eliminando la ambigüedad.
--   3. Reemplazar la rama IF FOUND / ELSE por IF v_token IS NOT NULL / ELSE,
--      usando FOUND únicamente en su contexto correcto (NOT FOUND tras el
--      SELECT INTO v_invitation).
--
-- LO QUE NO CAMBIA:
--   - Flujo completo del flujo con invitación (validaciones status, expires_at,
--     INSERT en profiles, UPDATE en pending_invitations, UPDATE en members).
--   - Flujo de registro sin invitación (INSERT con valores por defecto).
--   - Mensaje de diagnóstico INVISIBLE (usa v_total_rows, ahora reubicado).
--   - Permisos: REVOKE/GRANT idénticos a la migración anterior.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_token      text;
  v_total_rows int;
BEGIN
  v_token := trim(NEW.raw_user_meta_data->>'invite_token');

  IF v_token IS NOT NULL AND v_token != '' THEN
    -- Contar filas para saber si la tabla entera es invisible (solo cuando hay token)
    SELECT count(*) INTO v_total_rows FROM public.pending_invitations;

    SELECT * INTO v_invitation
    FROM public.pending_invitations
    WHERE token = v_token;

    -- FOUND es evaluado inmediatamente: ninguna sentencia intermedia puede alterarlo
    IF NOT FOUND THEN
      RAISE EXCEPTION 'CRÍTICO: Fila INVISIBLE. Total filas visibles en tabla: %. Token buscado: "%"', v_total_rows, v_token;
    END IF;

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
    -- Registro sin invitación
    INSERT INTO public.profiles (id, first_name, last_name, role, company_id, is_active)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario'), COALESCE(NEW.raw_user_meta_data->>'last_name', ''), 'socio'::public.user_role, NULL, true);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
