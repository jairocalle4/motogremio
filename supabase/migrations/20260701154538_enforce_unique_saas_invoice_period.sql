CREATE UNIQUE INDEX IF NOT EXISTS unique_saas_invoice_period_active
ON saas_invoices (subscription_id, period_start, period_end)
WHERE status <> 'void';

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

  -- Validación amigable en RPC para evitar duplicados del período
  IF EXISTS (
    SELECT 1
    FROM saas_invoices
    WHERE subscription_id = p_subscription_id
      AND period_start = p_period_start
      AND period_end = p_period_end
      AND status <> 'void'
  ) THEN
    RAISE EXCEPTION 'Ya existe un cobro interno activo para este período.';
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
