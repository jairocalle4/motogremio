-- Migration: add_cloudinary_storage_by_plan

-- 1. Tabla: company_storage_settings
CREATE TABLE IF NOT EXISTS public.company_storage_settings (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade unique,
    provider text not null default 'cloudinary' check (provider in ('cloudinary')),
    cloud_name text not null,
    api_key text not null,
    api_secret_encrypted text,
    upload_preset text,
    base_folder text,
    max_file_size_mb integer not null default 5 check (max_file_size_mb between 1 and 25),
    allowed_formats text[] not null default array['pdf','jpg','jpeg','png','webp'],
    is_active boolean not null default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    updated_by uuid references public.profiles(id)
);

-- 2. Tabla: file_upload_logs
CREATE TABLE IF NOT EXISTS public.file_upload_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    document_id uuid,
    provider text not null,
    file_name text not null,
    file_type text,
    file_size_bytes bigint,
    status text not null check (status in ('pending', 'success', 'failed', 'blocked_by_plan', 'blocked_by_role', 'invalid_file', 'missing_provider_config')),
    error_message text,
    uploaded_by uuid references public.profiles(id),
    created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE public.company_storage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_upload_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Super_admin can select storage settings"
ON public.company_storage_settings FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "View logs by role"
ON public.file_upload_logs FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  OR
  (company_id = public.get_my_company_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'secretaria')))
);

-- 3. RPC: get_company_storage_settings
CREATE OR REPLACE FUNCTION public.get_company_storage_settings(p_company_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_settings record;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT id, company_id, provider, cloud_name, api_key,
         (api_secret_encrypted IS NOT NULL AND api_secret_encrypted != '') as has_secret,
         upload_preset, base_folder, max_file_size_mb, allowed_formats, is_active
  INTO v_settings
  FROM company_storage_settings
  WHERE company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN row_to_json(v_settings)::jsonb;
END;
$$ LANGUAGE plpgsql;
REVOKE ALL ON FUNCTION public.get_company_storage_settings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_storage_settings(uuid) TO authenticated;

-- 4. RPC: upsert_company_storage_settings
CREATE OR REPLACE FUNCTION public.upsert_company_storage_settings(
  p_company_id uuid,
  p_cloud_name text,
  p_api_key text,
  p_api_secret text,
  p_upload_preset text,
  p_base_folder text,
  p_max_file_size_mb integer,
  p_allowed_formats text[],
  p_is_active boolean
)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF EXISTS (SELECT 1 FROM company_storage_settings WHERE company_id = p_company_id) THEN
    UPDATE company_storage_settings
    SET cloud_name = p_cloud_name,
        api_key = p_api_key,
        api_secret_encrypted = CASE WHEN p_api_secret IS NOT NULL AND p_api_secret != '' THEN p_api_secret ELSE api_secret_encrypted END,
        upload_preset = p_upload_preset,
        base_folder = p_base_folder,
        max_file_size_mb = p_max_file_size_mb,
        allowed_formats = p_allowed_formats,
        is_active = p_is_active,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE company_id = p_company_id;
  ELSE
    INSERT INTO company_storage_settings (
      company_id, cloud_name, api_key, api_secret_encrypted, upload_preset, base_folder, max_file_size_mb, allowed_formats, is_active, updated_by
    ) VALUES (
      p_company_id, p_cloud_name, p_api_key, p_api_secret, p_upload_preset, p_base_folder, p_max_file_size_mb, p_allowed_formats, p_is_active, auth.uid()
    );
  END IF;

  -- En registrar auditoria usamos la tabla saas_audit_logs porque es el super admin
  INSERT INTO saas_audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (auth.uid(), 'UPDATE_STORAGE_SETTINGS', 'company_storage_settings', p_company_id, jsonb_build_object('is_active', p_is_active));
END;
$$ LANGUAGE plpgsql;
REVOKE ALL ON FUNCTION public.upsert_company_storage_settings(uuid, text, text, text, text, text, integer, text[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_company_storage_settings(uuid, text, text, text, text, text, integer, text[], boolean) TO authenticated;

-- 5. RPC: get_my_storage_capability
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
  IF NOT v_company.is_active THEN
    RETURN jsonb_build_object('can_upload', false, 'reason', 'company_inactive');
  END IF;

  SELECT * INTO v_plan FROM plans WHERE id = v_company.plan_id;
  IF v_plan.name NOT IN ('profesional', 'empresarial') THEN
    RETURN jsonb_build_object('can_upload', false, 'reason', 'plan_restricted', 'plan_name', v_plan.name);
  END IF;

  SELECT * INTO v_settings FROM company_storage_settings WHERE company_id = v_company_id;
  IF NOT FOUND OR NOT v_settings.is_active THEN
    RETURN jsonb_build_object('can_upload', false, 'reason', 'missing_provider_config', 'plan_name', v_plan.name);
  END IF;

  RETURN jsonb_build_object(
    'can_upload', true,
    'reason', 'success',
    'plan_name', v_plan.name,
    'max_file_size_mb', v_settings.max_file_size_mb,
    'allowed_formats', v_settings.allowed_formats
  );
END;
$$ LANGUAGE plpgsql;
REVOKE ALL ON FUNCTION public.get_my_storage_capability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_storage_capability() TO authenticated;
