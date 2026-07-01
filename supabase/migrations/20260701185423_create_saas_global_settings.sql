-- 1. Crear tabla de configuraciones globales del SaaS
CREATE TABLE public.saas_settings (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  next_due_warning_days integer NOT NULL DEFAULT 7 CHECK (next_due_warning_days BETWEEN 1 AND 30),
  grace_period_days integer NOT NULL DEFAULT 5 CHECK (grace_period_days BETWEEN 0 AND 30),
  limit_warning_percent integer NOT NULL DEFAULT 80 CHECK (limit_warning_percent BETWEEN 1 AND 100),
  limit_critical_percent integer NOT NULL DEFAULT 90 CHECK (limit_critical_percent BETWEEN 1 AND 100),
  currency_code text NOT NULL DEFAULT 'USD',
  currency_symbol text NOT NULL DEFAULT '$',
  payment_bank_name text NULL,
  payment_account_number text NULL,
  payment_account_type text NULL,
  payment_account_holder text NULL,
  payment_account_holder_id text NULL,
  payment_instructions text NULL,
  internal_receipt_note text NOT NULL DEFAULT 'Este documento es un comprobante interno de cobro del SaaS. No corresponde a una factura electrónica SRI.',
  suspension_mode text NOT NULL DEFAULT 'manual' CHECK (suspension_mode IN ('manual','auto')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT limit_thresholds_valid CHECK (limit_warning_percent < limit_critical_percent)
);

-- 2. Insertar único registro inicial
INSERT INTO public.saas_settings (
  next_due_warning_days,
  grace_period_days,
  limit_warning_percent,
  limit_critical_percent,
  currency_code,
  currency_symbol,
  suspension_mode
) VALUES (7, 5, 80, 90, 'USD', '$', 'manual')
ON CONFLICT DO NOTHING;

-- 3. Habilitar RLS
ALTER TABLE public.saas_settings ENABLE ROW LEVEL SECURITY;

-- 4. RPCs de Gestión
CREATE OR REPLACE FUNCTION get_saas_settings()
RETURNS TABLE (
  id integer,
  next_due_warning_days integer,
  grace_period_days integer,
  limit_warning_percent integer,
  limit_critical_percent integer,
  currency_code text,
  currency_symbol text,
  payment_bank_name text,
  payment_account_number text,
  payment_account_type text,
  payment_account_holder text,
  payment_account_holder_id text,
  payment_instructions text,
  internal_receipt_note text,
  suspension_mode text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  updated_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.next_due_warning_days,
    s.grace_period_days,
    s.limit_warning_percent,
    s.limit_critical_percent,
    s.currency_code,
    s.currency_symbol,
    s.payment_bank_name,
    s.payment_account_number,
    s.payment_account_type,
    s.payment_account_holder,
    s.payment_account_holder_id,
    s.payment_instructions,
    s.internal_receipt_note,
    s.suspension_mode,
    s.created_at,
    s.updated_at,
    s.updated_by
  FROM saas_settings s
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION get_saas_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_saas_settings() TO authenticated;


CREATE OR REPLACE FUNCTION update_saas_settings(
  p_next_due_warning_days integer,
  p_grace_period_days integer,
  p_limit_warning_percent integer,
  p_limit_critical_percent integer,
  p_currency_code text,
  p_currency_symbol text,
  p_payment_bank_name text,
  p_payment_account_number text,
  p_payment_account_type text,
  p_payment_account_holder text,
  p_payment_account_holder_id text,
  p_payment_instructions text,
  p_internal_receipt_note text,
  p_suspension_mode text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_data jsonb;
  v_new_data jsonb;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  -- Validaciones manuales adicionales para asegurar consistencia
  IF p_limit_warning_percent >= p_limit_critical_percent THEN
    RAISE EXCEPTION 'El umbral de advertencia debe ser menor que el umbral crítico.';
  END IF;

  IF p_next_due_warning_days NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'Los días de aviso deben estar entre 1 y 30.';
  END IF;

  IF p_grace_period_days NOT BETWEEN 0 AND 30 THEN
    RAISE EXCEPTION 'Los días de gracia deben estar entre 0 y 30.';
  END IF;

  IF p_suspension_mode NOT IN ('manual', 'auto') THEN
    RAISE EXCEPTION 'Modo de suspensión inválido.';
  END IF;

  -- Respaldar datos viejos para auditoría
  SELECT to_jsonb(s) INTO v_old_data FROM saas_settings s LIMIT 1;

  UPDATE saas_settings
  SET
    next_due_warning_days = p_next_due_warning_days,
    grace_period_days = p_grace_period_days,
    limit_warning_percent = p_limit_warning_percent,
    limit_critical_percent = p_limit_critical_percent,
    currency_code = p_currency_code,
    currency_symbol = p_currency_symbol,
    payment_bank_name = p_payment_bank_name,
    payment_account_number = p_payment_account_number,
    payment_account_type = p_payment_account_type,
    payment_account_holder = p_payment_account_holder,
    payment_account_holder_id = p_payment_account_holder_id,
    payment_instructions = p_payment_instructions,
    internal_receipt_note = p_internal_receipt_note,
    suspension_mode = p_suspension_mode,
    updated_at = now(),
    updated_by = auth.uid();

  -- Cargar nuevos datos
  SELECT to_jsonb(s) INTO v_new_data FROM saas_settings s LIMIT 1;

  -- Registrar auditoría
  INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    NULL,
    auth.uid(),
    'UPDATE_SAAS_GLOBAL_SETTINGS',
    'saas_settings',
    NULL,
    v_old_data,
    v_new_data
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION update_saas_settings(integer,integer,integer,integer,text,text,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_saas_settings(integer,integer,integer,integer,text,text,text,text,text,text,text,text,text,text) TO authenticated;


-- 5. Actualizar la RPC get_super_admin_alerts() para consumir la configuración dinámica
CREATE OR REPLACE FUNCTION get_super_admin_alerts()
RETURNS TABLE (
  id text,
  type text,
  severity text,
  title text,
  description text,
  company_id uuid,
  company_name text,
  amount numeric,
  due_date date,
  status text,
  action_label text,
  action_href text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_due_days integer;
  v_warning_percent integer;
  v_critical_percent integer;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  -- Cargar parámetros o usar fallbacks estándar
  SELECT 
    COALESCE(next_due_warning_days, 7),
    COALESCE(limit_warning_percent, 80),
    COALESCE(limit_critical_percent, 90)
  INTO v_next_due_days, v_warning_percent, v_critical_percent
  FROM saas_settings
  LIMIT 1;

  IF NOT FOUND THEN
    v_next_due_days := 7;
    v_warning_percent := 80;
    v_critical_percent := 90;
  END IF;

  RETURN QUERY
  -- 1. Cobros vencidos
  SELECT
    'overdue-' || inv.id::text AS id,
    'billing_overdue'::text AS type,
    'critical'::text AS severity,
    'Cobro Vencido ' || inv.invoice_number AS title,
    'El cobro interno de ' || COALESCE(c.trade_name, c.legal_name, c.id::text) || ' por $' || inv.amount || ' venció el ' || to_char(inv.due_date, 'DD/MM/YYYY') || '.' AS description,
    c.id AS company_id,
    COALESCE(c.trade_name, c.legal_name, c.id::text)::text AS company_name,
    inv.balance AS amount,
    inv.due_date AS due_date,
    inv.status::text AS status,
    'Ir a Suscripciones'::text AS action_label,
    '/super-admin/subscriptions'::text AS action_href,
    inv.created_at AS created_at
  FROM saas_invoices inv
  JOIN companies c ON c.id = inv.company_id
  WHERE inv.due_date < CURRENT_DATE
    AND inv.balance > 0
    AND inv.status <> 'void'

  UNION ALL

  -- 2. Compañías con deuda SaaS pendiente (no vencidas)
  SELECT
    'pending-' || inv.id::text AS id,
    'billing_pending'::text AS type,
    'warning'::text AS severity,
    'Deuda SaaS Pendiente ' || inv.invoice_number AS title,
    'La compañía ' || COALESCE(c.trade_name, c.legal_name, c.id::text) || ' tiene un cobro por vencer de $' || inv.amount || ' para el ' || to_char(inv.due_date, 'DD/MM/YYYY') || '.' AS description,
    c.id AS company_id,
    COALESCE(c.trade_name, c.legal_name, c.id::text)::text AS company_name,
    inv.balance AS amount,
    inv.due_date AS due_date,
    inv.status::text AS status,
    'Ir a Cobros SaaS'::text AS action_label,
    '/super-admin/subscriptions'::text AS action_href,
    inv.created_at AS created_at
  FROM saas_invoices inv
  JOIN companies c ON c.id = inv.company_id
  WHERE inv.due_date >= CURRENT_DATE
    AND inv.balance > 0
    AND inv.status <> 'void'

  UNION ALL

  -- 3. Próximos vencimientos de suscripción (próximos v_next_due_days días)
  SELECT
    'subdue-' || sub.id::text AS id,
    'subscription_due_soon'::text AS type,
    'warning'::text AS severity,
    'Suscripción por vencer' AS title,
    'El plan ' || p.name::text || ' contratado por ' || COALESCE(c.trade_name, c.legal_name, c.id::text) || ' tiene su próximo pago programado para el ' || to_char(sub.next_due_date, 'DD/MM/YYYY') || '.' AS description,
    c.id AS company_id,
    COALESCE(c.trade_name, c.legal_name, c.id::text)::text AS company_name,
    sub.price_amount AS amount,
    sub.next_due_date AS due_date,
    sub.status::text AS status,
    'Ir a Cobros SaaS'::text AS action_label,
    '/super-admin/subscriptions'::text AS action_href,
    sub.created_at AS created_at
  FROM company_subscriptions sub
  JOIN companies c ON c.id = sub.company_id
  JOIN plans p ON p.id = sub.plan_id
  WHERE sub.next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (v_next_due_days || ' days')::interval
    AND sub.status IN ('active', 'trial', 'past_due')

  UNION ALL

  -- 4. Compañías inactivas/suspendidas (status = 'inactiva')
  SELECT
    'inactive-' || c.id::text AS id,
    'company_inactive'::text AS type,
    'critical'::text AS severity,
    'Compañía Suspendida / Inactiva' AS title,
    'La cooperativa ' || COALESCE(c.trade_name, c.legal_name, c.id::text) || ' se encuentra marcada como INACTIVA y sus usuarios tienen bloqueado el acceso.' AS description,
    c.id AS company_id,
    COALESCE(c.trade_name, c.legal_name, c.id::text)::text AS company_name,
    NULL::numeric AS amount,
    NULL::date AS due_date,
    c.status::text AS status,
    'Ver compañía'::text AS action_label,
    '/super-admin/companies/' || c.id AS action_href,
    c.created_at AS created_at
  FROM companies c
  WHERE c.status = 'inactiva'

  UNION ALL

  -- 5 & 6. Alertas de límites
  SELECT
    lims.id,
    lims.type,
    lims.severity,
    lims.title,
    lims.description,
    lims.company_id,
    lims.company_name,
    NULL::numeric AS amount,
    NULL::date AS due_date,
    NULL::text AS status,
    'Cambiar plan'::text AS action_label,
    '/super-admin/companies/' || lims.company_id AS action_href,
    CURRENT_TIMESTAMP AS created_at
  FROM (
    SELECT
      'limit-mem-' || c.id::text AS id,
      'member_limit_warning'::text AS type,
      CASE WHEN (count(m.id)::numeric / p.max_members * 100) >= v_critical_percent THEN 'critical'::text ELSE 'warning'::text END AS severity,
      'Límite de Socios Crítico'::text AS title,
      'La compañía ' || COALESCE(c.trade_name, c.legal_name, c.id::text) || ' tiene ' || count(m.id) || ' socios de un máximo de ' || p.max_members || ' (' || round((count(m.id)::numeric / p.max_members * 100)) || '%).' AS description,
      c.id AS company_id,
      COALESCE(c.trade_name, c.legal_name, c.id::text)::text AS company_name
    FROM companies c
    JOIN company_subscriptions sub ON sub.company_id = c.id
    JOIN plans p ON p.id = sub.plan_id
    LEFT JOIN members m ON m.company_id = c.id
    WHERE sub.status = 'active'
    GROUP BY c.id, c.trade_name, c.legal_name, p.max_members
    HAVING (count(m.id)::numeric / p.max_members * 100) >= v_warning_percent

    UNION ALL

    SELECT
      'limit-veh-' || c.id::text AS id,
      'vehicle_limit_warning'::text AS type,
      CASE WHEN (count(v.id)::numeric / p.max_vehicles * 100) >= v_critical_percent THEN 'critical'::text ELSE 'warning'::text END AS severity,
      'Límite de Vehículos Crítico'::text AS title,
      'La compañía ' || COALESCE(c.trade_name, c.legal_name, c.id::text) || ' tiene ' || count(v.id) || ' unidades de un máximo de ' || p.max_vehicles || ' (' || round((count(v.id)::numeric / p.max_vehicles * 100)) || '%).' AS description,
      c.id AS company_id,
      COALESCE(c.trade_name, c.legal_name, c.id::text)::text AS company_name
    FROM companies c
    JOIN company_subscriptions sub ON sub.company_id = c.id
    JOIN plans p ON p.id = sub.plan_id
    LEFT JOIN vehicles v ON v.company_id = c.id
    WHERE sub.status = 'active'
    GROUP BY c.id, c.trade_name, c.legal_name, p.max_vehicles
    HAVING (count(v.id)::numeric / p.max_vehicles * 100) >= v_warning_percent
  ) lims
  ORDER BY severity DESC, created_at DESC;
END;
$$;
