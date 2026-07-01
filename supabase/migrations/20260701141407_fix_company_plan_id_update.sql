-- Redefinir create_or_update_company_subscription para actualizar siempre companies.plan_id
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

-- Asegurar permisos de ejecución
REVOKE ALL ON FUNCTION create_or_update_company_subscription(uuid, uuid, text, numeric, date, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_or_update_company_subscription(uuid, uuid, text, numeric, date, text) TO authenticated;
