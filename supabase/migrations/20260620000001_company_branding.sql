-- =============================================================================
-- Fase 4.6 — Branding y Configuración Visual por Compañía
-- Migración: 20260620000001_company_branding.sql
--
-- LÍMITES DOCUMENTADOS:
--   * Los parámetros NULL en update_my_company_branding y
--     update_super_admin_company_branding NO borran campos existentes.
--     COALESCE preserva el valor anterior. Para borrar un campo
--     explícitamente se requerirá una extensión futura con parámetros p_clear_X.
--
-- SEPARACIÓN AUDITORÍA vs UI:
--   * v_old_data / v_new_data → filas reales de company_branding (sin fallback)
--                               → se guardan en audit_logs
--   * v_result               → objeto enriquecido con fallback desde companies
--                               → se retorna a la UI
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FUNCIÓN set_updated_at (idempotente)
--    Actualiza updated_at automáticamente en cualquier tabla que la use.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLA company_branding
--    Relación 1:1 con companies. RLS habilitado, sin políticas directas.
--    Acceso exclusivo por RPC.
--    UNIQUE(company_id) crea automáticamente el índice — no se añade otro.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.company_branding (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         uuid        NOT NULL UNIQUE
                                 REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Identidad comercial
  commercial_name    text        CHECK (char_length(commercial_name)    <= 120),
  slogan             text        CHECK (char_length(slogan)             <= 160),
  logo_url           text,       -- nullable; texto libre para futura integración con Storage

  -- Colores (formato HEX #RRGGBB)
  primary_color      varchar(7)  CHECK (
    primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  secondary_color    varchar(7)  CHECK (
    secondary_color IS NULL OR secondary_color ~ '^#[0-9A-Fa-f]{6}$'
  ),

  -- Contacto público (puede diferir del contacto legal en companies)
  contact_phone      varchar(30),
  contact_email      text        CHECK (
    contact_email IS NULL
    OR contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  public_address     text        CHECK (char_length(public_address)     <= 250),

  -- Reportes y comprobantes
  report_header_text text        CHECK (char_length(report_header_text) <= 500),

  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- Trigger de updated_at
CREATE TRIGGER company_branding_updated_at
  BEFORE UPDATE ON public.company_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS habilitado; sin políticas directas — acceso 100% por RPC
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.company_branding FROM PUBLIC, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC: get_my_company_branding()
--    Lectura del branding de la propia compañía.
--    Fallback desde companies si company_branding aún no tiene fila.
--    Roles autorizados (lectura): admin, gerente, presidente, secretaria,
--                                 tesorero, operador, socio.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_company_branding()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_role       public.user_role;
  v_result     jsonb;
BEGIN
  SELECT p.company_id, p.role
    INTO v_company_id, v_role
    FROM public.profiles p
   WHERE p.id = auth.uid();

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado o sin rol asignado.';
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no asociado a ninguna compañía.';
  END IF;

  IF v_role NOT IN (
    'admin','gerente','presidente','secretaria','tesorero','operador','socio'
  ) THEN
    RAISE EXCEPTION 'No autorizado para ver el branding de la compañía.';
  END IF;

  -- LEFT JOIN para fallback cuando no existe fila en company_branding
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
    FROM public.companies c
    LEFT JOIN public.company_branding cb ON cb.company_id = c.id
   WHERE c.id = v_company_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_company_branding()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_company_branding()
  TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC: update_my_company_branding(...)
--    Edición del branding de la propia compañía.
--    Roles autorizados (edición): admin, gerente, presidente, secretaria, tesorero.
--
--    Variables:
--      v_old_data → fila real de company_branding ANTES del cambio  → audit_logs
--      v_new_data → fila real de company_branding DESPUÉS del cambio → audit_logs
--      v_result   → objeto enriquecido con fallback desde companies  → UI (RETURN)
--
--    LÍMITE: parámetros NULL no borran campos existentes (COALESCE preserva valor).
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

  -- ── Validaciones de formato ──────────────────────────────────────────────
  IF p_primary_color IS NOT NULL
     AND p_primary_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Color primario inválido. Debe ser formato HEX #RRGGBB (ej. #1E3A5F).';
  END IF;

  IF p_secondary_color IS NOT NULL
     AND p_secondary_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Color secundario inválido. Debe ser formato HEX #RRGGBB (ej. #4A90D9).';
  END IF;

  IF p_contact_email IS NOT NULL
     AND p_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Correo de contacto inválido.';
  END IF;

  IF p_commercial_name IS NOT NULL
     AND char_length(p_commercial_name) > 120 THEN
    RAISE EXCEPTION 'El nombre comercial no puede superar 120 caracteres.';
  END IF;

  IF p_slogan IS NOT NULL
     AND char_length(p_slogan) > 160 THEN
    RAISE EXCEPTION 'El eslogan no puede superar 160 caracteres.';
  END IF;

  IF p_contact_phone IS NOT NULL
     AND char_length(p_contact_phone) > 30 THEN
    RAISE EXCEPTION 'El teléfono de contacto no puede superar 30 caracteres.';
  END IF;

  IF p_public_address IS NOT NULL
     AND char_length(p_public_address) > 250 THEN
    RAISE EXCEPTION 'La dirección pública no puede superar 250 caracteres.';
  END IF;

  IF p_report_header_text IS NOT NULL
     AND char_length(p_report_header_text) > 500 THEN
    RAISE EXCEPTION 'El encabezado de reportes no puede superar 500 caracteres.';
  END IF;

  -- ── Capturar fila real ANTES del cambio (para auditoría) ─────────────────
  SELECT to_jsonb(cb) INTO v_old_data
    FROM public.company_branding cb
   WHERE cb.company_id = v_company_id;

  -- ── UPSERT: captura el ID real de la fila via RETURNING ──────────────────
  INSERT INTO public.company_branding (
    company_id,
    commercial_name, slogan,             logo_url,
    primary_color,   secondary_color,
    contact_phone,   contact_email,      public_address,
    report_header_text,
    updated_at
  ) VALUES (
    v_company_id,
    p_commercial_name, p_slogan,         p_logo_url,
    p_primary_color,   p_secondary_color,
    p_contact_phone,   p_contact_email,  p_public_address,
    p_report_header_text,
    now()
  )
  ON CONFLICT (company_id) DO UPDATE SET
    commercial_name    = COALESCE(EXCLUDED.commercial_name,    company_branding.commercial_name),
    slogan             = COALESCE(EXCLUDED.slogan,             company_branding.slogan),
    logo_url           = COALESCE(EXCLUDED.logo_url,           company_branding.logo_url),
    primary_color      = COALESCE(EXCLUDED.primary_color,      company_branding.primary_color),
    secondary_color    = COALESCE(EXCLUDED.secondary_color,    company_branding.secondary_color),
    contact_phone      = COALESCE(EXCLUDED.contact_phone,      company_branding.contact_phone),
    contact_email      = COALESCE(EXCLUDED.contact_email,      company_branding.contact_email),
    public_address     = COALESCE(EXCLUDED.public_address,     company_branding.public_address),
    report_header_text = COALESCE(EXCLUDED.report_header_text, company_branding.report_header_text),
    updated_at         = now()
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

REVOKE ALL ON FUNCTION public.update_my_company_branding(text,text,text,text,text,text,text,text,text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_my_company_branding(text,text,text,text,text,text,text,text,text)
  TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC: get_super_admin_company_branding(p_company_id uuid)
--    Lectura del branding de cualquier compañía. Solo super_admin.
--    Valida parámetro y existencia de compañía. Fallback desde companies.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_super_admin_company_branding(
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Se requiere rol super_admin.';
  END IF;

  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'El identificador de la compañía es obligatorio.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'Compañía no encontrada.';
  END IF;

  -- LEFT JOIN para fallback cuando no existe fila en company_branding
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
    FROM public.companies c
    LEFT JOIN public.company_branding cb ON cb.company_id = c.id
   WHERE c.id = p_company_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_super_admin_company_branding(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_super_admin_company_branding(uuid)
  TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC: update_super_admin_company_branding(p_company_id uuid, ...)
--    Edición del branding de cualquier compañía. Solo super_admin.
--
--    Variables:
--      v_old_data → fila real de company_branding ANTES del cambio  → audit_logs
--      v_new_data → fila real de company_branding DESPUÉS del cambio → audit_logs
--      v_result   → objeto enriquecido con fallback desde companies  → UI (RETURN)
--
--    LÍMITE: parámetros NULL no borran campos existentes (COALESCE preserva valor).
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

  -- ── Validaciones de formato ──────────────────────────────────────────────
  IF p_primary_color IS NOT NULL
     AND p_primary_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Color primario inválido. Debe ser formato HEX #RRGGBB (ej. #1E3A5F).';
  END IF;

  IF p_secondary_color IS NOT NULL
     AND p_secondary_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Color secundario inválido. Debe ser formato HEX #RRGGBB (ej. #4A90D9).';
  END IF;

  IF p_contact_email IS NOT NULL
     AND p_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Correo de contacto inválido.';
  END IF;

  IF p_commercial_name IS NOT NULL
     AND char_length(p_commercial_name) > 120 THEN
    RAISE EXCEPTION 'El nombre comercial no puede superar 120 caracteres.';
  END IF;

  IF p_slogan IS NOT NULL
     AND char_length(p_slogan) > 160 THEN
    RAISE EXCEPTION 'El eslogan no puede superar 160 caracteres.';
  END IF;

  IF p_contact_phone IS NOT NULL
     AND char_length(p_contact_phone) > 30 THEN
    RAISE EXCEPTION 'El teléfono de contacto no puede superar 30 caracteres.';
  END IF;

  IF p_public_address IS NOT NULL
     AND char_length(p_public_address) > 250 THEN
    RAISE EXCEPTION 'La dirección pública no puede superar 250 caracteres.';
  END IF;

  IF p_report_header_text IS NOT NULL
     AND char_length(p_report_header_text) > 500 THEN
    RAISE EXCEPTION 'El encabezado de reportes no puede superar 500 caracteres.';
  END IF;

  -- ── Capturar fila real ANTES del cambio (para auditoría) ─────────────────
  SELECT to_jsonb(cb) INTO v_old_data
    FROM public.company_branding cb
   WHERE cb.company_id = p_company_id;

  -- ── UPSERT: captura el ID real de la fila via RETURNING ──────────────────
  INSERT INTO public.company_branding (
    company_id,
    commercial_name, slogan,             logo_url,
    primary_color,   secondary_color,
    contact_phone,   contact_email,      public_address,
    report_header_text,
    updated_at
  ) VALUES (
    p_company_id,
    p_commercial_name, p_slogan,         p_logo_url,
    p_primary_color,   p_secondary_color,
    p_contact_phone,   p_contact_email,  p_public_address,
    p_report_header_text,
    now()
  )
  ON CONFLICT (company_id) DO UPDATE SET
    commercial_name    = COALESCE(EXCLUDED.commercial_name,    company_branding.commercial_name),
    slogan             = COALESCE(EXCLUDED.slogan,             company_branding.slogan),
    logo_url           = COALESCE(EXCLUDED.logo_url,           company_branding.logo_url),
    primary_color      = COALESCE(EXCLUDED.primary_color,      company_branding.primary_color),
    secondary_color    = COALESCE(EXCLUDED.secondary_color,    company_branding.secondary_color),
    contact_phone      = COALESCE(EXCLUDED.contact_phone,      company_branding.contact_phone),
    contact_email      = COALESCE(EXCLUDED.contact_email,      company_branding.contact_email),
    public_address     = COALESCE(EXCLUDED.public_address,     company_branding.public_address),
    report_header_text = COALESCE(EXCLUDED.report_header_text, company_branding.report_header_text),
    updated_at         = now()
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

REVOKE ALL ON FUNCTION public.update_super_admin_company_branding(uuid,text,text,text,text,text,text,text,text,text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_super_admin_company_branding(uuid,text,text,text,text,text,text,text,text,text)
  TO authenticated;
