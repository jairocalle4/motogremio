-- 1. Agregar protección real para que charges.balance no pueda quedar negativo
ALTER TABLE public.charges
  ADD CONSTRAINT charges_balance_non_negative CHECK (balance >= 0);

-- 2. Crear trigger para evitar sobreasignación de allocations
CREATE OR REPLACE FUNCTION public.check_payment_allocation_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_charge_balance numeric(10,2);
  v_charge_amount numeric(10,2);
  v_total_allocated numeric(10,2);
BEGIN
  -- Obtener el balance y monto actual de la cuota
  SELECT balance, amount INTO v_charge_balance, v_charge_amount
  FROM public.charges WHERE id = NEW.charge_id;

  -- Obtener la suma ya asignada a la cuota (excluyendo el nuevo allocation si es update)
  SELECT COALESCE(SUM(amount_allocated), 0) INTO v_total_allocated
  FROM public.payment_allocations 
  WHERE charge_id = NEW.charge_id AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Si la suma de lo que ya se asignó más el nuevo abono supera el valor total de la cuota
  IF (v_total_allocated + NEW.amount_allocated) > v_charge_amount THEN
    RAISE EXCEPTION 'Sobrepago detectado: el abono de $% supera el monto de la cuota ($%)', 
      NEW.amount_allocated, v_charge_amount;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_payment_allocation_limit_trigger ON public.payment_allocations;
CREATE TRIGGER check_payment_allocation_limit_trigger
  BEFORE INSERT OR UPDATE ON public.payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.check_payment_allocation_limit();

REVOKE ALL ON FUNCTION public.check_payment_allocation_limit() FROM PUBLIC, anon, authenticated, service_role;

-- 3. Crear RPC transaccional única
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

  -- 7. Calcular saldo real pendiente acumulado de las cuotas seleccionadas
  SELECT COALESCE(SUM(balance), 0) INTO v_total_pending
  FROM public.charges
  WHERE id = ANY(p_charge_ids)
    AND company_id = v_company_id;

  -- 8. Rechazar pago mayor al saldo seleccionado
  IF p_amount > v_total_pending THEN
    RAISE EXCEPTION 'Monto excesivo: el abono de $% supera el saldo total pendiente de las cuotas ($%)', 
      p_amount, v_total_pending;
  END IF;

  -- 9. Insertar registro de pago principal
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

  -- 10. Distribuir el abono en cascada/orden sobre las cuotas seleccionadas
  v_remaining_payment := p_amount;
  
  FOREACH v_charge_id IN ARRAY p_charge_ids
  LOOP
    IF v_remaining_payment <= 0 THEN
      EXIT;
    END IF;

    -- Obtener saldo pendiente de esta cuota
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
