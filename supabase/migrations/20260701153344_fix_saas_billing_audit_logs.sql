-- Redefine create_or_update_company_subscription to use record_id instead of row_id in audit_logs
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
  END IF;

  -- Actualizar SIEMPRE el plan de la compañía para que apliquen los límites operacionales
  UPDATE companies 
  SET plan_id = p_plan_id, updated_at = now() 
  WHERE id = p_company_id;

  -- Auditar acción
  INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_data)
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

-- Redefine generate_saas_invoice to use record_id
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
  INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_data)
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

-- Redefine register_saas_payment to use record_id
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
  INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_data)
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

-- Redefine mark_saas_invoice_void to use record_id and check for payments
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
  v_amount_paid numeric;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  SELECT company_id, balance, amount_paid INTO v_company_id, v_balance, v_amount_paid 
  FROM saas_invoices 
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada.';
  END IF;

  IF v_amount_paid > 0 THEN
    RAISE EXCEPTION 'Este cobro ya tiene pagos registrados. No puede anularse directamente para proteger el historial financiero.';
  END IF;

  UPDATE saas_invoices
  SET 
    status = 'void',
    balance = 0.00,
    notes = COALESCE(notes, '') || ' | ANULADA: ' || p_notes,
    updated_at = now()
  WHERE id = p_invoice_id;

  -- Auditar
  INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_data)
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

-- Redefine suspend_company_for_nonpayment to use record_id
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
  INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, old_data, new_data)
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

-- Redefine reactivate_company_after_payment to use record_id
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
  INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, old_data, new_data)
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
