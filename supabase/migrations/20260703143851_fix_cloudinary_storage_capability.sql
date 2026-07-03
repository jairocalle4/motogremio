-- Migration: fix_cloudinary_storage_capability

CREATE OR REPLACE FUNCTION public.get_my_storage_capability()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_company_id uuid;
  v_company record;
  v_plan record;
  v_settings record;
BEGIN
  v_company_id := get_my_company_id();
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('can_upload', false, 'reason', 'no_company');
  END IF;

  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  IF v_user_role NOT IN ('admin', 'secretaria') THEN
    RETURN jsonb_build_object('can_upload', false, 'reason', 'blocked_by_role');
  END IF;

  SELECT * INTO v_company FROM companies WHERE id = v_company_id;
  IF v_company.status != 'activa' THEN
    RETURN jsonb_build_object('can_upload', false, 'reason', 'company_inactive');
  END IF;

  SELECT * INTO v_plan FROM plans WHERE id = v_company.plan_id;
  IF v_plan.name::text NOT IN ('profesional', 'empresarial', 'professional', 'enterprise') THEN
    RETURN jsonb_build_object('can_upload', false, 'reason', 'plan_restricted', 'plan_name', v_plan.name::text);
  END IF;

  SELECT * INTO v_settings FROM company_storage_settings WHERE company_id = v_company_id;
  IF NOT FOUND OR NOT v_settings.is_active THEN
    RETURN jsonb_build_object('can_upload', false, 'reason', 'missing_provider_config', 'plan_name', v_plan.name::text);
  END IF;

  RETURN jsonb_build_object(
    'can_upload', true,
    'reason', 'success',
    'plan_name', v_plan.name::text,
    'max_file_size_mb', v_settings.max_file_size_mb,
    'allowed_formats', v_settings.allowed_formats
  );
END;
$$ LANGUAGE plpgsql;
REVOKE ALL ON FUNCTION public.get_my_storage_capability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_storage_capability() TO authenticated;
