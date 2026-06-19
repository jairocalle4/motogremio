-- ============================================================================
-- 1. Creación de Índices de Rendimiento para la Bitácora
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs (company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created_at ON public.audit_logs (company_id, created_at DESC) WHERE company_id IS NOT NULL;


-- ============================================================================
-- 2. Seguridad Directa sobre la Tabla Base (Inmutabilidad y Blindaje de Frontend)
-- ============================================================================

-- Eliminar políticas directas existentes de RLS
DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_update ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_delete ON public.audit_logs;

-- Revocar permisos de acceso directo por RLS / API REST para usuarios, públicos y anónimos
REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;


-- ============================================================================
-- 3. RPC: get_super_admin_audit_logs(...) (Paginado Seguro con data + total_count)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_super_admin_audit_logs(
  p_company_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_table_name text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count int;
  v_data json;
  v_action text := nullif(btrim(p_action), '');
  v_table_name text := nullif(btrim(p_table_name), '');
BEGIN
  -- Validar rol de Super Admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Se requieren privilegios de super_admin.';
  END IF;

  -- Validaciones de parámetros
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'El límite de registros (p_limit) debe estar entre 1 y 100.';
  END IF;

  IF p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'El desplazamiento de paginación (p_offset) no puede ser negativo.';
  END IF;

  IF p_date_from IS NOT NULL AND p_date_to IS NOT NULL AND p_date_from > p_date_to THEN
    RAISE EXCEPTION 'Rango de fechas inválido: la fecha de inicio no puede ser posterior a la fecha de fin.';
  END IF;

  -- Calcular total_count con filtros aplicados (sin paginación)
  SELECT count(*) INTO v_total_count
  FROM public.audit_logs al
  WHERE (p_company_id IS NULL OR al.company_id = p_company_id)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (v_action IS NULL OR al.action = v_action)
    AND (v_table_name IS NULL OR al.table_name = v_table_name)
    AND (p_date_from IS NULL OR al.created_at >= p_date_from)
    AND (p_date_to IS NULL OR al.created_at <= p_date_to);

  -- Consultar la página de datos
  SELECT coalesce(json_agg(t), '[]'::json) INTO v_data
  FROM (
    SELECT 
      al.id,
      al.company_id,
      c.legal_name as company_name,
      al.user_id,
      nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') as user_full_name,
      al.action,
      al.table_name,
      al.record_id,
      al.ip_address,
      al.created_at,
      (al.old_data IS NOT NULL) as has_old_data,
      (al.new_data IS NOT NULL) as has_new_data
    FROM public.audit_logs al
    LEFT JOIN public.companies c ON c.id = al.company_id
    LEFT JOIN public.profiles p ON p.id = al.user_id
    WHERE (p_company_id IS NULL OR al.company_id = p_company_id)
      AND (p_user_id IS NULL OR al.user_id = p_user_id)
      AND (v_action IS NULL OR al.action = v_action)
      AND (v_table_name IS NULL OR al.table_name = v_table_name)
      AND (p_date_from IS NULL OR al.created_at >= p_date_from)
      AND (p_date_to IS NULL OR al.created_at <= p_date_to)
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) t;

  -- Retornar objeto final de paginación
  RETURN json_build_object(
    'data', v_data,
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;


-- ============================================================================
-- 4. RPC: get_super_admin_audit_log_detail(...)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_super_admin_audit_log_detail(
  p_audit_log_id uuid
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_detail json;
BEGIN
  -- Validar rol de Super Admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Se requieren privilegios de super_admin.';
  END IF;

  -- Validaciones NULL
  IF p_audit_log_id IS NULL THEN
    RAISE EXCEPTION 'El identificador del registro de auditoría (p_audit_log_id) es obligatorio.';
  END IF;

  SELECT json_build_object(
    'id', al.id,
    'company_id', al.company_id,
    'company_name', c.legal_name,
    'user_id', al.user_id,
    'user_full_name', nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
    'action', al.action,
    'table_name', al.table_name,
    'record_id', al.record_id,
    'old_data', al.old_data,
    'new_data', al.new_data,
    'ip_address', al.ip_address,
    'created_at', al.created_at
  ) INTO v_detail
  FROM public.audit_logs al
  LEFT JOIN public.companies c ON c.id = al.company_id
  LEFT JOIN public.profiles p ON p.id = al.user_id
  WHERE al.id = p_audit_log_id;

  IF v_detail IS NULL THEN
    RAISE EXCEPTION 'Registro de auditoría no encontrado.';
  END IF;

  RETURN v_detail;
END;
$$;


-- ============================================================================
-- 5. RPC: get_super_admin_audit_filters() (Subconsultas Ordenadas)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_super_admin_audit_filters()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actions json;
  v_tables json;
  v_companies json;
  v_users json;
BEGIN
  -- Validar rol de Super Admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado. Se requieren privilegios de super_admin.';
  END IF;

  -- Acciones distintas registradas en la bitácora ordenadas
  SELECT coalesce(json_agg(t.action), '[]'::json) INTO v_actions
  FROM (
    SELECT DISTINCT action
    FROM public.audit_logs
    ORDER BY action ASC
  ) t;

  -- Tablas distintas registradas en la bitácora ordenadas
  SELECT coalesce(json_agg(t.table_name), '[]'::json) INTO v_tables
  FROM (
    SELECT DISTINCT table_name
    FROM public.audit_logs
    ORDER BY table_name ASC
  ) t;

  -- Compañías que registran movimientos en la bitácora ordenadas
  SELECT coalesce(json_agg(t), '[]'::json) INTO v_companies
  FROM (
    SELECT DISTINCT c.id, c.legal_name
    FROM public.audit_logs al
    JOIN public.companies c ON c.id = al.company_id
    ORDER BY c.legal_name ASC
  ) t;

  -- Usuarios que registran movimientos en la bitácora ordenados
  SELECT coalesce(json_agg(t), '[]'::json) INTO v_users
  FROM (
    SELECT DISTINCT pr.id, nullif(trim(coalesce(pr.first_name, '') || ' ' || coalesce(pr.last_name, '')), '') as full_name
    FROM public.audit_logs al
    JOIN public.profiles pr ON pr.id = al.user_id
    ORDER BY full_name ASC
  ) t;

  RETURN json_build_object(
    'actions', v_actions,
    'table_names', v_tables,
    'companies', v_companies,
    'users', v_users
  );
END;
$$;


-- ============================================================================
-- 6. Firmas de Permisos y Ejecución Explícitas
-- ============================================================================
REVOKE ALL ON FUNCTION public.get_super_admin_audit_logs(uuid, uuid, text, text, timestamptz, timestamptz, int, int) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_super_admin_audit_logs(uuid, uuid, text, text, timestamptz, timestamptz, int, int) TO authenticated;

REVOKE ALL ON FUNCTION public.get_super_admin_audit_log_detail(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_super_admin_audit_log_detail(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_super_admin_audit_filters() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_super_admin_audit_filters() TO authenticated;
