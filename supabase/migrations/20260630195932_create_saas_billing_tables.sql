-- =====================================================================
-- 1. Redefinir Cmp_Select para permitir que el frontend lea datos de la compañía inactiva
-- =====================================================================
DROP POLICY IF EXISTS "Cmp_Select" ON companies;
CREATE POLICY "Cmp_Select" ON companies FOR SELECT 
USING (id = (SELECT company_id FROM profiles WHERE id = auth.uid()) OR is_super_admin());

-- =====================================================================
-- 2. Modificar get_my_company_id para retornar NULL si la compañía está inactiva
-- =====================================================================
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_status text;
BEGIN
  -- Obtener company_id
  SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
  IF v_company_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Validar estado de la compañía
  SELECT status INTO v_status FROM companies WHERE id = v_company_id;
  IF v_status != 'activa' THEN
    RETURN NULL;
  END IF;

  RETURN v_company_id;
END;
$$;

-- =====================================================================
-- 3. Secuencia y Función para número de factura SaaS
-- =====================================================================
CREATE SEQUENCE IF NOT EXISTS saas_invoice_num_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_next_saas_invoice_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year text := to_char(current_date, 'YYYY');
  v_next_val bigint;
BEGIN
  SELECT nextval('saas_invoice_num_seq') INTO v_next_val;
  RETURN 'SaaS-' || v_year || '-' || lpad(v_next_val::text, 6, '0');
END;
$$;

-- =====================================================================
-- 4. Creación de Tablas de Suscripciones y Cobros SaaS
-- =====================================================================
CREATE TABLE company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES plans(id) NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  price_amount numeric(12,2) NOT NULL CHECK (price_amount >= 0),
  currency text DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'past_due', 'suspended', 'cancelled')),
  starts_at date NOT NULL DEFAULT current_date,
  current_period_start date NOT NULL DEFAULT current_date,
  current_period_end date NOT NULL,
  next_due_date date NOT NULL,
  grace_until date,
  suspended_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índice único para asegurar una sola suscripción activa/pendiente por compañía
CREATE UNIQUE INDEX unique_active_company_sub 
ON company_subscriptions (company_id) 
WHERE (status IN ('active', 'trial', 'past_due'));

CREATE TABLE saas_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL DEFAULT generate_next_saas_invoice_number(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES company_subscriptions(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES plans(id) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  amount_paid numeric(12,2) DEFAULT 0 CHECK (amount_paid >= 0),
  balance numeric(12,2) NOT NULL CHECK (balance >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'void')),
  paid_at timestamptz,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE saas_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES saas_invoices(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'deposit', 'other')),
  reference text,
  receipt_url text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by uuid REFERENCES profiles(id) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- 5. Habilitar RLS y Políticas
-- =====================================================================
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sub_Select" ON company_subscriptions FOR SELECT 
USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) OR is_super_admin());

CREATE POLICY "Inv_Select" ON saas_invoices FOR SELECT 
USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) OR is_super_admin());

CREATE POLICY "Pay_Select" ON saas_payments FOR SELECT 
USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) OR is_super_admin());

-- =====================================================================
-- 6. RPCs para Super Admin (SECURITY DEFINER)
-- =====================================================================

-- Overview de métricas globales SaaS Billing
CREATE OR REPLACE FUNCTION get_saas_billing_overview()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mrr numeric(12,2);
  v_collected_month numeric(12,2);
  v_pending_total numeric(12,2);
  v_overdue_total numeric(12,2);
  v_suspended_companies bigint;
  v_mrr_month_start date := date_trunc('month', current_date);
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  -- MRR: Suma de suscripciones mensuales + anuales/12 en estados activos
  SELECT COALESCE(SUM(
    CASE 
      WHEN billing_cycle = 'annual' THEN price_amount / 12 
      ELSE price_amount 
    END
  ), 0) INTO v_mrr
  FROM company_subscriptions
  WHERE status IN ('active', 'trial', 'past_due');

  -- Cobrado en el mes actual
  SELECT COALESCE(SUM(amount), 0) INTO v_collected_month
  FROM saas_payments
  WHERE paid_at >= v_mrr_month_start;

  -- Pendiente por cobrar (excluyendo facturas anuladas)
  SELECT COALESCE(SUM(balance), 0) INTO v_pending_total
  FROM saas_invoices
  WHERE status != 'void' AND balance > 0;

  -- Vencido (due_date anterior a hoy y balance > 0, excluyendo void)
  SELECT COALESCE(SUM(balance), 0) INTO v_overdue_total
  FROM saas_invoices
  WHERE status != 'void' AND due_date < current_date AND balance > 0;

  -- Cooperativas suspendidas (inactivas)
  SELECT COUNT(*) INTO v_suspended_companies
  FROM companies
  WHERE status = 'inactiva';

  RETURN json_build_object(
    'mrr', v_mrr,
    'collected_month', v_collected_month,
    'pending_total', v_pending_total,
    'overdue_total', v_overdue_total,
    'suspended_companies', v_suspended_companies
  );
END;
$$;

-- Obtener las suscripciones y saldos de cada compañía
CREATE OR REPLACE FUNCTION get_company_subscriptions()
RETURNS TABLE (
  company_id uuid,
  legal_name text,
  trade_name text,
  ruc varchar,
  company_status text,
  sub_id uuid,
  plan_id uuid,
  plan_name plan_name,
  billing_cycle text,
  price_amount numeric,
  sub_status text,
  next_due_date date,
  outstanding_balance numeric,
  last_payment_date timestamptz
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
    c.id AS company_id,
    c.legal_name,
    c.trade_name,
    c.ruc,
    c.status AS company_status,
    cs.id AS sub_id,
    cs.plan_id,
    p.name AS plan_name,
    cs.billing_cycle,
    cs.price_amount,
    cs.status AS sub_status,
    cs.next_due_date,
    COALESCE((SELECT SUM(i.balance) FROM saas_invoices i WHERE i.company_id = c.id AND i.status != 'void'), 0.00)::numeric AS outstanding_balance,
    (SELECT MAX(sp.paid_at) FROM saas_payments sp WHERE sp.company_id = c.id) AS last_payment_date
  FROM companies c
  LEFT JOIN company_subscriptions cs ON cs.company_id = c.id AND cs.status IN ('active', 'trial', 'past_due', 'suspended')
  LEFT JOIN plans p ON cs.plan_id = p.id
  ORDER BY c.legal_name;
END;
$$;

-- Crear o actualizar una suscripción de compañía
CREATE OR REPLACE FUNCTION create_or_update_company_subscription(
  p_company_id uuid,
  p_plan_id uuid,
  p_billing_cycle text,
  p_price_amount numeric,
  p_starts_at date,
  p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id uuid;
  v_period_end date;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  -- Calcular fin de periodo
  IF p_billing_cycle = 'monthly' THEN
    v_period_end := p_starts_at + INTERVAL '1 month';
  ELSE
    v_period_end := p_starts_at + INTERVAL '1 year';
  END IF;

  -- Buscar suscripción activa existente
  SELECT id INTO v_sub_id 
  FROM company_subscriptions 
  WHERE company_id = p_company_id AND status IN ('active', 'trial', 'past_due');

  IF v_sub_id IS NOT NULL THEN
    -- Actualizar existente
    UPDATE company_subscriptions
    SET 
      plan_id = p_plan_id,
      billing_cycle = p_billing_cycle,
      price_amount = p_price_amount,
      current_period_start = p_starts_at,
      current_period_end = v_period_end,
      next_due_date = v_period_end,
      notes = p_notes,
      updated_at = now()
    WHERE id = v_sub_id;
  ELSE
    -- Crear nueva
    INSERT INTO company_subscriptions (
      company_id, plan_id, billing_cycle, price_amount, starts_at, current_period_start, current_period_end, next_due_date, notes
    ) VALUES (
      p_company_id, p_plan_id, p_billing_cycle, p_price_amount, p_starts_at, p_starts_at, v_period_end, v_period_end, p_notes
    ) RETURNING id INTO v_sub_id;

    -- Actualizar plan de la compañía
    UPDATE companies SET plan_id = p_plan_id WHERE id = p_company_id;
  END IF;

  -- Auditar acción
  INSERT INTO audit_logs (company_id, user_id, action, table_name, row_id, new_data)
  VALUES (
    p_company_id, 
    auth.uid(), 
    'SET_SAAS_SUBSCRIPTION', 
    'company_subscriptions', 
    v_sub_id, 
    jsonb_build_object('plan_id', p_plan_id, 'price', p_price_amount, 'cycle', p_billing_cycle)
  );

  RETURN v_sub_id;
END;
$$;

-- Generar factura SaaS manualmente
CREATE OR REPLACE FUNCTION generate_saas_invoice(
  p_company_id uuid,
  p_subscription_id uuid,
  p_plan_id uuid,
  p_period_start date,
  p_period_end date,
  p_due_date date,
  p_amount numeric,
  p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  INSERT INTO saas_invoices (
    company_id, subscription_id, plan_id, period_start, period_end, due_date, amount, balance, notes, created_by
  ) VALUES (
    p_company_id, p_subscription_id, p_plan_id, p_period_start, p_period_end, p_due_date, p_amount, p_amount, p_notes, auth.uid()
  ) RETURNING id INTO v_invoice_id;

  -- Auditar acción
  INSERT INTO audit_logs (company_id, user_id, action, table_name, row_id, new_data)
  VALUES (
    p_company_id, 
    auth.uid(), 
    'GENERATE_SAAS_INVOICE', 
    'saas_invoices', 
    v_invoice_id, 
    jsonb_build_object('amount', p_amount, 'due_date', p_due_date)
  );

  RETURN v_invoice_id;
END;
$$;

-- Registrar pago atómico
CREATE OR REPLACE FUNCTION register_saas_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference text,
  p_receipt_url text,
  p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_balance numeric;
  v_invoice_company uuid;
  v_new_amount_paid numeric;
  v_new_balance numeric;
  v_payment_id uuid;
  v_sub_id uuid;
BEGIN
  -- 1. Validar permisos de Super Admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  -- 2. Validar que el monto sea positivo
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto del pago debe ser mayor a cero.';
  END IF;

  -- 3. Bloquear fila de la factura para evitar condiciones de carrera
  SELECT balance, company_id, subscription_id INTO v_invoice_balance, v_invoice_company, v_sub_id
  FROM saas_invoices
  WHERE id = p_invoice_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada.';
  END IF;

  IF v_invoice_balance <= 0 THEN
    RAISE EXCEPTION 'Esta factura ya está completamente pagada.';
  END IF;

  -- 4. Validar sobrepago
  IF p_amount > v_invoice_balance THEN
    RAISE EXCEPTION 'El monto ingresado ($%) supera el saldo restante de la factura ($%).', p_amount, v_invoice_balance;
  END IF;

  -- 5. Calcular nuevos totales
  v_new_balance := v_invoice_balance - p_amount;

  -- 6. Insertar el pago
  INSERT INTO saas_payments (
    invoice_id, company_id, amount, payment_method, reference, receipt_url, confirmed_by, notes
  ) VALUES (
    p_invoice_id, v_invoice_company, p_amount, p_payment_method, p_reference, p_receipt_url, auth.uid(), p_notes
  ) RETURNING id INTO v_payment_id;

  -- 7. Actualizar factura
  UPDATE saas_invoices
  SET 
    amount_paid = amount_paid + p_amount,
    balance = v_new_balance,
    status = CASE WHEN v_new_balance = 0 THEN 'paid' ELSE 'partial' END,
    paid_at = CASE WHEN v_new_balance = 0 THEN now() ELSE paid_at END,
    updated_at = now()
  WHERE id = p_invoice_id;

  -- 8. Auditar acción
  INSERT INTO audit_logs (company_id, user_id, action, table_name, row_id, new_data)
  VALUES (
    v_invoice_company, 
    auth.uid(), 
    'REGISTER_SAAS_PAYMENT', 
    'saas_payments', 
    v_payment_id, 
    jsonb_build_object('amount', p_amount, 'invoice_id', p_invoice_id)
  );

  RETURN v_payment_id;
END;
$$;

-- Anular factura SaaS
CREATE OR REPLACE FUNCTION mark_saas_invoice_void(
  p_invoice_id uuid,
  p_notes text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_balance numeric;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  SELECT company_id, balance INTO v_company_id, v_balance 
  FROM saas_invoices 
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada.';
  END IF;

  UPDATE saas_invoices
  SET 
    status = 'void',
    balance = 0.00,
    notes = COALESCE(notes, '') || ' | ANULADA: ' || p_notes,
    updated_at = now()
  WHERE id = p_invoice_id;

  -- Auditar
  INSERT INTO audit_logs (company_id, user_id, action, table_name, row_id, new_data)
  VALUES (
    v_company_id, 
    auth.uid(), 
    'VOID_SAAS_INVOICE', 
    'saas_invoices', 
    p_invoice_id, 
    jsonb_build_object('voided_balance', v_balance, 'reason', p_notes)
  );

  RETURN true;
END;
$$;

-- Suspender cooperativa por falta de pago
CREATE OR REPLACE FUNCTION suspend_company_for_nonpayment(
  p_company_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  -- Consultar estado anterior
  SELECT status INTO v_old_status FROM companies WHERE id = p_company_id;

  -- 1. Marcar compañía como inactiva
  UPDATE companies
  SET status = 'inactiva', updated_at = now()
  WHERE id = p_company_id;

  -- 2. Marcar suscripción como suspended
  UPDATE company_subscriptions
  SET status = 'suspended', suspended_at = now(), updated_at = now()
  WHERE company_id = p_company_id AND status IN ('active', 'trial', 'past_due');

  -- 3. Registrar auditoría
  INSERT INTO audit_logs (company_id, user_id, action, table_name, row_id, old_data, new_data)
  VALUES (
    p_company_id, 
    auth.uid(), 
    'SUSPEND_COMPANY_NONPAYMENT', 
    'companies', 
    p_company_id, 
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', 'inactiva')
  );

  RETURN true;
END;
$$;

-- Reactivar cooperativa
CREATE OR REPLACE FUNCTION reactivate_company_after_payment(
  p_company_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  -- Consultar estado anterior
  SELECT status INTO v_old_status FROM companies WHERE id = p_company_id;

  -- 1. Marcar compañía como activa
  UPDATE companies
  SET status = 'activa', updated_at = now()
  WHERE id = p_company_id;

  -- 2. Marcar suscripción como active
  UPDATE company_subscriptions
  SET status = 'active', suspended_at = NULL, updated_at = now()
  WHERE company_id = p_company_id AND status = 'suspended';

  -- 3. Registrar auditoría
  INSERT INTO audit_logs (company_id, user_id, action, table_name, row_id, old_data, new_data)
  VALUES (
    p_company_id, 
    auth.uid(), 
    'REACTIVATE_COMPANY_PAYMENT', 
    'companies', 
    p_company_id, 
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', 'activa')
  );

  RETURN true;
END;
$$;

-- Marcar facturas vencidas (mantenimiento manual)
CREATE OR REPLACE FUNCTION mark_overdue_saas_invoices()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_rows integer;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  UPDATE saas_invoices
  SET status = 'overdue', updated_at = now()
  WHERE status = 'pending' AND due_date < current_date AND balance > 0;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  RETURN v_updated_rows;
END;
$$;

-- Revocar accesos públicos por defecto en RPCs críticas
REVOKE ALL ON FUNCTION get_saas_billing_overview() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION get_company_subscriptions() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION create_or_update_company_subscription(uuid, uuid, text, numeric, date, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION generate_saas_invoice(uuid, uuid, uuid, date, date, date, numeric, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION register_saas_payment(uuid, numeric, text, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION mark_saas_invoice_void(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION suspend_company_for_nonpayment(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION reactivate_company_after_payment(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION mark_overdue_saas_invoices() FROM PUBLIC, anon, authenticated, service_role;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_saas_billing_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_update_company_subscription(uuid, uuid, text, numeric, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_saas_invoice(uuid, uuid, uuid, date, date, date, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION register_saas_payment(uuid, numeric, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_saas_invoice_void(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION suspend_company_for_nonpayment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_company_after_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_overdue_saas_invoices() TO authenticated;
