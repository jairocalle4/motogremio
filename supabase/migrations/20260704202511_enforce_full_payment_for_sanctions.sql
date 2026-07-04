-- ═══════════════════════════════════════════════════════════════════════════════
-- Restricción de Pagos Completos Obligatorios para Multas por Sanción
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.register_payment_atomic(
  p_member_id uuid,
  p_charge_ids uuid[],
  p_amount numeric,
  p_payment_method public.payment_method,
  p_reference_number text DEFAULT NULL,
  p_receipt_url text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_user_role public.user_role;
  v_payment_id uuid;
  v_current_user_id uuid;
  v_charge_id uuid;
  v_charge_balance numeric(10,2);
  v_charge_amount numeric(10,2);
  v_charge_status public.charge_status;
  v_is_sanction_type boolean;
  v_total_pending numeric(10,2) := 0.00;
  v_remaining_payment numeric(10,2);
  v_alloc_amount numeric(10,2);
  v_allocations_created jsonb := '[]'::jsonb;
BEGIN
  -- 1. Validar usuario autenticado
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- 2. Obtener company_id y rol
  SELECT company_id, role INTO v_company_id, v_user_role
  FROM public.profiles WHERE id = v_current_user_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Compañía no encontrada para el operador actual';
  END IF;

  -- 3. Rechazar rol socio
  IF v_user_role = 'socio'::public.user_role THEN
    RAISE EXCEPTION 'Operación no permitida para socios';
  END IF;

  -- 4. Validar monto mayor a 0
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto del pago debe ser mayor a cero';
  END IF;

  -- 5. Validar que tengamos cuotas seleccionadas
  IF array_length(p_charge_ids, 1) IS NULL OR array_length(p_charge_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Debes seleccionar al menos una cuota';
  END IF;

  -- 6. Bloquear cuotas para evitar condiciones de carrera (FOR UPDATE)
  -- Y validar que todas pertenezcan a la misma compañía y socio
  PERFORM 1 
  FROM public.charges 
  WHERE id = ANY(p_charge_ids) 
    AND company_id = v_company_id 
    AND member_id = p_member_id
  FOR UPDATE;

  -- 7. Validaciones específicas por cada cuota
  FOREACH v_charge_id IN ARRAY p_charge_ids
  LOOP
    SELECT c.balance, c.amount, c.status, (ct.is_system = true AND ct.category = 'sanction') OR EXISTS (SELECT 1 FROM public.sanctions WHERE charge_id = c.id)
    INTO v_charge_balance, v_charge_amount, v_charge_status, v_is_sanction_type
    FROM public.charges c
    JOIN public.charge_types ct ON ct.id = c.charge_type_id
    WHERE c.id = v_charge_id;

    -- Validar estados no cobrables
    IF v_charge_status IN ('suspendida'::public.charge_status, 'anulada'::public.charge_status, 'pagada'::public.charge_status) THEN
      RAISE EXCEPTION 'No se puede cobrar una cuota suspendida, anulada o ya pagada';
    END IF;

    -- Validar si la sanción asociada está en apelación
    IF v_is_sanction_type AND EXISTS (
      SELECT 1 FROM public.sanctions WHERE charge_id = v_charge_id AND status = 'apelacion'::public.sanction_status
    ) THEN
      RAISE EXCEPTION 'No se puede cobrar una multa que está bajo proceso de apelación';
    END IF;

    -- Restricción crítica: Multas por sanciones NO permiten pagos parciales. El monto abonado debe ser el saldo completo.
    -- Dado que register_payment_atomic puede recibir múltiples cargos y p_amount, si es de tipo sanción,
    -- el abono distribuido a este cargo debe ser exactamente su balance.
    -- Para simplificar la validación en la transacción, si la lista de cargos contiene una multa de sanción,
    -- p_amount debe corresponder exactamente al saldo de dicha multa.
    IF v_is_sanction_type THEN
      -- Si se intenta pagar una sanción, rechazamos pagos parciales: p_amount debe ser exactamente igual al balance del cargo
      -- (y por lo tanto, no se permite mezclar en la misma transacción otros cargos o abonos parciales)
      IF array_length(p_charge_ids, 1) > 1 THEN
        RAISE EXCEPTION 'Las multas por sanciones deben pagarse de forma individual en una sola transacción';
      END IF;
      IF p_amount <> v_charge_balance THEN
        RAISE EXCEPTION 'Las multas por sanciones deben pagarse en su totalidad. El saldo pendiente es $% y se recibió $%', v_charge_balance, p_amount;
      END IF;
    END IF;
  END LOOP;

  -- 8. Calcular saldo real pendiente acumulado de las cuotas seleccionadas
  SELECT COALESCE(SUM(balance), 0) INTO v_total_pending
  FROM public.charges
  WHERE id = ANY(p_charge_ids)
    AND company_id = v_company_id;

  -- 9. Rechazar pago mayor al saldo seleccionado
  IF p_amount > v_total_pending THEN
    RAISE EXCEPTION 'Monto excesivo: el abono de $% supera el saldo total pendiente de las cuotas ($%)', 
      p_amount, v_total_pending;
  END IF;

  -- 10. Insertar registro de pago principal
  INSERT INTO public.payments (
    company_id,
    member_id,
    amount,
    payment_date,
    payment_method,
    reference_number,
    receipt_url,
    notes,
    created_by
  ) VALUES (
    v_company_id,
    p_member_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_reference_number,
    p_receipt_url,
    p_notes,
    v_current_user_id
  ) RETURNING id INTO v_payment_id;

  -- 11. Distribuir el abono en cascada/orden sobre las cuotas seleccionadas
  v_remaining_payment := p_amount;
  
  FOREACH v_charge_id IN ARRAY p_charge_ids
  LOOP
    IF v_remaining_payment <= 0 THEN
      EXIT;
    END IF;

    SELECT balance INTO v_charge_balance
    FROM public.charges
    WHERE id = v_charge_id;

    IF v_charge_balance > 0 THEN
      v_alloc_amount := LEAST(v_remaining_payment, v_charge_balance);
      
      -- Insertar la asignación (esto dispara check_payment_allocation_limit y update_charge_balance)
      INSERT INTO public.payment_allocations (
        payment_id,
        charge_id,
        amount_allocated
      ) VALUES (
        v_payment_id,
        v_charge_id,
        v_alloc_amount
      );

      v_allocations_created := v_allocations_created || jsonb_build_object(
        'charge_id', v_charge_id,
        'amount_allocated', v_alloc_amount
      );

      v_remaining_payment := v_remaining_payment - v_alloc_amount;
    END IF;
  END LOOP;

  -- Retornar estructura JSON informativa
  RETURN json_build_object(
    'payment_id', v_payment_id,
    'amount', p_amount,
    'allocations', v_allocations_created
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_payment_atomic(uuid, uuid[], numeric, public.payment_method, text, text, text, date) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_payment_atomic(uuid, uuid[], numeric, public.payment_method, text, text, text, date) TO authenticated;
