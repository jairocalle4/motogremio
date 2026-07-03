-- Migration: fix_cloudinary_storage_audit_logs

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

  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (auth.uid(), 'UPDATE_STORAGE_SETTINGS', 'company_storage_settings', p_company_id, jsonb_build_object('is_active', p_is_active));
END;
$$ LANGUAGE plpgsql;
REVOKE ALL ON FUNCTION public.upsert_company_storage_settings(uuid, text, text, text, text, text, integer, text[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_company_storage_settings(uuid, text, text, text, text, text, integer, text[], boolean) TO authenticated;
