-- supabase/migrations/20260620000002_company_branding_clear_empty_fields.sql
-- Fix to allow clearing optional fields by sending empty string ''

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RPC: update_my_company_branding(...)
--    Se ajustan validaciones e UPSERT para soportar limpieza de campos.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_my_company_branding(
  p_commercial_name    text DEFAULT NULL,
  p_slogan             text DEFAULT NULL,
  p_logo_url           text DEFAULT NULL,
  p_primary_color      text DEFAULT NULL,
  p_secondary_color    text DEFAULT NULL,
  p_contact_phone      text DEFAULT NULL,
  p_contact_email      text DEFAULT NULL,
  p_public_address     text DEFAULT NULL,
  p_report_header_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id  uuid;
  v_role        public.user_role;
  v_user_id     uuid;
  v_branding_id uuid;
  v_old_data    jsonb;  -- fila real company_branding antes del cambio → audit
  v_new_data    jsonb;  -- fila real company_branding después del cambio → audit
  v_result      jsonb;  -- objeto enriquecido con fallback desde companies → UI
BEGIN
  v_user_id := auth.uid();

  SELECT p.company_id, p.role
    INTO v_company_id, v_role
    FROM public.profiles p
   WHERE p.id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado o sin rol asignado.';
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no asociado a ninguna compañía.';
  END IF;

  IF v_role NOT IN ('admin','gerente','presidente','secretaria','tesorero') THEN
    RAISE EXCEPTION 'No autorizado: el rol % no puede editar el branding de la compañía.', v_role;
  END IF;

  -- ── Validaciones de formato (ignoran strings vacíos) ─────────────────────
  IF NULLIF(btrim(p_primary_color), '') IS NOT NULL
     AND NULLIF(btrim(p_primary_color), '') !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Color primario inválido. Debe ser formato HEX #RRGGBB (ej. #1E3A5F).';
  END IF;

  IF NULLIF(btrim(p_secondary_color), '') IS NOT NULL
     AND NULLIF(btrim(p_secondary_color), '') !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Color secundario inválido. Debe ser formato HEX #RRGGBB (ej. #4A90D9).';
  END IF;

  IF NULLIF(btrim(p_contact_email), '') IS NOT NULL
     AND NULLIF(btrim(p_contact_email), '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Correo de contacto inválido.';
  END IF;

  IF NULLIF(btrim(p_commercial_name), '') IS NOT NULL
     AND char_length(btrim(p_commercial_name)) > 120 THEN
    RAISE EXCEPTION 'El nombre comercial no puede superar 120 caracteres.';
  END IF;

  IF NULLIF(btrim(p_slogan), '') IS NOT NULL
     AND char_length(btrim(p_slogan)) > 160 THEN
    RAISE EXCEPTION 'El eslogan no puede superar 160 caracteres.';
  END IF;

  IF NULLIF(btrim(p_contact_phone), '') IS NOT NULL
     AND char_length(btrim(p_contact_phone)) > 30 THEN
    RAISE EXCEPTION 'El teléfono de contacto no puede superar 30 caracteres.';
  END IF;

  IF NULLIF(btrim(p_public_address), '') IS NOT NULL
     AND char_length(btrim(p_public_address)) > 250 THEN
    RAISE EXCEPTION 'La dirección pública no puede superar 250 caracteres.';
  END IF;

  IF NULLIF(btrim(p_report_header_text), '') IS NOT NULL
     AND char_length(btrim(p_report_header_text)) > 500 THEN
    RAISE EXCEPTION 'El encabezado de reportes no puede superar 500 caracteres.';
  END IF;

  -- ── Capturar fila real ANTES del cambio (para auditoría) ─────────────────
  SELECT to_jsonb(cb) INTO v_old_data
    FROM public.company_branding cb
   WHERE cb.company_id = v_company_id;

  -- ── UPSERT: Manejo de limpieza con CASE ────────────────────────────────────
  INSERT INTO public.company_branding (
    company_id,
    commercial_name, slogan,             logo_url,
    primary_color,   secondary_color,
    contact_phone,   contact_email,      public_address,
    report_header_text,
    updated_at
  ) VALUES (
    v_company_id,
    NULLIF(btrim(p_commercial_name), ''), NULLIF(btrim(p_slogan), ''), NULLIF(btrim(p_logo_url), ''),
    NULLIF(btrim(p_primary_color), ''),   NULLIF(btrim(p_secondary_color), ''),
    NULLIF(btrim(p_contact_phone), ''),   NULLIF(btrim(p_contact_email), ''),  NULLIF(btrim(p_public_address), ''),
    NULLIF(btrim(p_report_header_text), ''),
    now()
  )
  ON CONFLICT (company_id) DO UPDATE SET
    commercial_name = CASE
      WHEN p_commercial_name IS NULL THEN company_branding.commercial_name
      WHEN btrim(p_commercial_name) = '' THEN NULL
      ELSE btrim(p_commercial_name)
    END,
    slogan = CASE
      WHEN p_slogan IS NULL THEN company_branding.slogan
      WHEN btrim(p_slogan) = '' THEN NULL
      ELSE btrim(p_slogan)
    END,
    logo_url = CASE
      WHEN p_logo_url IS NULL THEN company_branding.logo_url
      WHEN btrim(p_logo_url) = '' THEN NULL
      ELSE btrim(p_logo_url)
    END,
    primary_color = CASE
      WHEN p_primary_color IS NULL THEN company_branding.primary_color
      WHEN btrim(p_primary_color) = '' THEN NULL
      ELSE btrim(p_primary_color)
    END,
    secondary_color = CASE
      WHEN p_secondary_color IS NULL THEN company_branding.secondary_color
      WHEN btrim(p_secondary_color) = '' THEN NULL
      ELSE btrim(p_secondary_color)
    END,
    contact_phone = CASE
      WHEN p_contact_phone IS NULL THEN company_branding.contact_phone
      WHEN btrim(p_contact_phone) = '' THEN NULL
      ELSE btrim(p_contact_phone)
    END,
    contact_email = CASE
      WHEN p_contact_email IS NULL THEN company_branding.contact_email
      WHEN btrim(p_contact_email) = '' THEN NULL
      ELSE btrim(p_contact_email)
    END,
    public_address = CASE
      WHEN p_public_address IS NULL THEN company_branding.public_address
      WHEN btrim(p_public_address) = '' THEN NULL
      ELSE btrim(p_public_address)
    END,
    report_header_text = CASE
      WHEN p_report_header_text IS NULL THEN company_branding.report_header_text
      WHEN btrim(p_report_header_text) = '' THEN NULL
      ELSE btrim(p_report_header_text)
    END,
    updated_at = now()
  RETURNING id INTO v_branding_id;

  -- ── Capturar fila real DESPUÉS del cambio (para auditoría) ───────────────
  SELECT to_jsonb(cb) INTO v_new_data
    FROM public.company_branding cb
   WHERE cb.id = v_branding_id;

  -- ── Construir objeto enriquecido con fallback (para UI) ───────────────────
  SELECT jsonb_build_object(
    'id',                cb.id,
    'company_id',        c.id,
    'commercial_name',   COALESCE(cb.commercial_name, c.trade_name, c.legal_name),
    'slogan',            cb.slogan,
    'logo_url',          COALESCE(cb.logo_url, c.logo_url),
    'primary_color',     cb.primary_color,
    'secondary_color',   cb.secondary_color,
    'contact_phone',     COALESCE(cb.contact_phone, c.phone),
    'contact_email',     COALESCE(cb.contact_email, c.email),
    'public_address',    COALESCE(cb.public_address, c.address),
    'report_header_text',cb.report_header_text,
    'created_at',        cb.created_at,
    'updated_at',        cb.updated_at
  )
    INTO v_result
    FROM public.company_branding cb
    JOIN public.companies c ON c.id = cb.company_id
   WHERE cb.id = v_branding_id;

  -- ── Auditoría: fila real sin fallback ────────────────────────────────────
  INSERT INTO public.audit_logs (
    company_id, user_id,
    action,                    table_name,
    record_id,
    old_data,   new_data
  ) VALUES (
    v_company_id, v_user_id,
    'update_company_branding', 'company_branding',
    v_branding_id,
    v_old_data,   v_new_data
  );

  -- ── Retornar objeto enriquecido a la UI ───────────────────────────────────
  RETURN v_result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RPC: update_super_admin_company_branding(...)
--    Se ajustan validaciones e UPSERT para soportar limpieza de campos.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_super_admin_company_branding(
  p_company_id         uuid,
  p_commercial_name    text DEFAULT NULL,
  p_slogan             text DEFAULT NULL,
  p_logo_url           text DEFAULT NULL,
  p_primary_color      text DEFAULT NULL,
  p_secondary_color    text DEFAULT NULL,
  p_contact_phone      text DEFAULT NULL,
  p_contact_email      text DEFAULT NULL,
  p_public_address     text DEFAULT NULL,
  p_report_header_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid;
  v_branding_id uuid;
  v_old_data    jsonb;  -- fila real company_branding antes del cambio → audit
  v_new_data    jsonb;  -- fila real company_branding después del cambio → audit
  v_result      jsonb;  -- objeto enriquecido con fallback desde companies → UI
BEGIN
  v_user_id := auth.uid();

  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Se requiere rol super_admin.';
  END IF;

  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'El identificador de la compañía es obligatorio.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'Compañía no encontrada.';
  END IF;

  -- ── Validaciones de formato (ignoran strings vacíos) ─────────────────────
  IF NULLIF(btrim(p_primary_color), '') IS NOT NULL
     AND NULLIF(btrim(p_primary_color), '') !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Color primario inválido. Debe ser formato HEX #RRGGBB (ej. #1E3A5F).';
  END IF;

  IF NULLIF(btrim(p_secondary_color), '') IS NOT NULL
     AND NULLIF(btrim(p_secondary_color), '') !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Color secundario inválido. Debe ser formato HEX #RRGGBB (ej. #4A90D9).';
  END IF;

  IF NULLIF(btrim(p_contact_email), '') IS NOT NULL
     AND NULLIF(btrim(p_contact_email), '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Correo de contacto inválido.';
  END IF;

  IF NULLIF(btrim(p_commercial_name), '') IS NOT NULL
     AND char_length(btrim(p_commercial_name)) > 120 THEN
    RAISE EXCEPTION 'El nombre comercial no puede superar 120 caracteres.';
  END IF;

  IF NULLIF(btrim(p_slogan), '') IS NOT NULL
     AND char_length(btrim(p_slogan)) > 160 THEN
    RAISE EXCEPTION 'El eslogan no puede superar 160 caracteres.';
  END IF;

  IF NULLIF(btrim(p_contact_phone), '') IS NOT NULL
     AND char_length(btrim(p_contact_phone)) > 30 THEN
    RAISE EXCEPTION 'El teléfono de contacto no puede superar 30 caracteres.';
  END IF;

  IF NULLIF(btrim(p_public_address), '') IS NOT NULL
     AND char_length(btrim(p_public_address)) > 250 THEN
    RAISE EXCEPTION 'La dirección pública no puede superar 250 caracteres.';
  END IF;

  IF NULLIF(btrim(p_report_header_text), '') IS NOT NULL
     AND char_length(btrim(p_report_header_text)) > 500 THEN
    RAISE EXCEPTION 'El encabezado de reportes no puede superar 500 caracteres.';
  END IF;

  -- ── Capturar fila real ANTES del cambio (para auditoría) ─────────────────
  SELECT to_jsonb(cb) INTO v_old_data
    FROM public.company_branding cb
   WHERE cb.company_id = p_company_id;

  -- ── UPSERT: Manejo de limpieza con CASE ────────────────────────────────────
  INSERT INTO public.company_branding (
    company_id,
    commercial_name, slogan,             logo_url,
    primary_color,   secondary_color,
    contact_phone,   contact_email,      public_address,
    report_header_text,
    updated_at
  ) VALUES (
    p_company_id,
    NULLIF(btrim(p_commercial_name), ''), NULLIF(btrim(p_slogan), ''), NULLIF(btrim(p_logo_url), ''),
    NULLIF(btrim(p_primary_color), ''),   NULLIF(btrim(p_secondary_color), ''),
    NULLIF(btrim(p_contact_phone), ''),   NULLIF(btrim(p_contact_email), ''),  NULLIF(btrim(p_public_address), ''),
    NULLIF(btrim(p_report_header_text), ''),
    now()
  )
  ON CONFLICT (company_id) DO UPDATE SET
    commercial_name = CASE
      WHEN p_commercial_name IS NULL THEN company_branding.commercial_name
      WHEN btrim(p_commercial_name) = '' THEN NULL
      ELSE btrim(p_commercial_name)
    END,
    slogan = CASE
      WHEN p_slogan IS NULL THEN company_branding.slogan
      WHEN btrim(p_slogan) = '' THEN NULL
      ELSE btrim(p_slogan)
    END,
    logo_url = CASE
      WHEN p_logo_url IS NULL THEN company_branding.logo_url
      WHEN btrim(p_logo_url) = '' THEN NULL
      ELSE btrim(p_logo_url)
    END,
    primary_color = CASE
      WHEN p_primary_color IS NULL THEN company_branding.primary_color
      WHEN btrim(p_primary_color) = '' THEN NULL
      ELSE btrim(p_primary_color)
    END,
    secondary_color = CASE
      WHEN p_secondary_color IS NULL THEN company_branding.secondary_color
      WHEN btrim(p_secondary_color) = '' THEN NULL
      ELSE btrim(p_secondary_color)
    END,
    contact_phone = CASE
      WHEN p_contact_phone IS NULL THEN company_branding.contact_phone
      WHEN btrim(p_contact_phone) = '' THEN NULL
      ELSE btrim(p_contact_phone)
    END,
    contact_email = CASE
      WHEN p_contact_email IS NULL THEN company_branding.contact_email
      WHEN btrim(p_contact_email) = '' THEN NULL
      ELSE btrim(p_contact_email)
    END,
    public_address = CASE
      WHEN p_public_address IS NULL THEN company_branding.public_address
      WHEN btrim(p_public_address) = '' THEN NULL
      ELSE btrim(p_public_address)
    END,
    report_header_text = CASE
      WHEN p_report_header_text IS NULL THEN company_branding.report_header_text
      WHEN btrim(p_report_header_text) = '' THEN NULL
      ELSE btrim(p_report_header_text)
    END,
    updated_at = now()
  RETURNING id INTO v_branding_id;

  -- ── Capturar fila real DESPUÉS del cambio (para auditoría) ───────────────
  SELECT to_jsonb(cb) INTO v_new_data
    FROM public.company_branding cb
   WHERE cb.id = v_branding_id;

  -- ── Construir objeto enriquecido con fallback (para UI) ───────────────────
  SELECT jsonb_build_object(
    'id',                cb.id,
    'company_id',        c.id,
    'commercial_name',   COALESCE(cb.commercial_name, c.trade_name, c.legal_name),
    'slogan',            cb.slogan,
    'logo_url',          COALESCE(cb.logo_url, c.logo_url),
    'primary_color',     cb.primary_color,
    'secondary_color',   cb.secondary_color,
    'contact_phone',     COALESCE(cb.contact_phone, c.phone),
    'contact_email',     COALESCE(cb.contact_email, c.email),
    'public_address',    COALESCE(cb.public_address, c.address),
    'report_header_text',cb.report_header_text,
    'created_at',        cb.created_at,
    'updated_at',        cb.updated_at
  )
    INTO v_result
    FROM public.company_branding cb
    JOIN public.companies c ON c.id = cb.company_id
   WHERE cb.id = v_branding_id;

  -- ── Auditoría: fila real sin fallback ────────────────────────────────────
  INSERT INTO public.audit_logs (
    company_id, user_id,
    action,                                  table_name,
    record_id,
    old_data,   new_data
  ) VALUES (
    p_company_id, v_user_id,
    'super_admin_update_company_branding',   'company_branding',
    v_branding_id,
    v_old_data,   v_new_data
  );

  -- ── Retornar objeto enriquecido a la UI ───────────────────────────────────
  RETURN v_result;
END;
$$;
