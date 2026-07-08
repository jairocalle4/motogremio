-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix: Sanction and Payment Status Synchronization
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Actualizar el trigger de allocations para actualizar la sanción a 'resuelta'
--    cuando la multa asociada (charge) se pague por completo (balance = 0).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_charge_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_charge_id uuid;
  v_charge_amount numeric(10,2);
  v_total_allocated numeric(10,2);
  v_new_balance numeric(10,2);
  v_new_status public.charge_status;
BEGIN
  v_charge_id := COALESCE(NEW.charge_id, OLD.charge_id);

  -- Obtener el monto total del cargo
  SELECT amount INTO v_charge_amount
  FROM public.charges WHERE id = v_charge_id;

  -- Calcular la suma asignada a este cargo
  SELECT COALESCE(SUM(amount_allocated), 0) INTO v_total_allocated
  FROM public.payment_allocations WHERE charge_id = v_charge_id;

  v_new_balance := v_charge_amount - v_total_allocated;

  -- Definir el estado financiero según el balance
  IF v_new_balance <= 0 THEN
    v_new_status := 'pagada'::public.charge_status;
  ELSIF v_total_allocated > 0 THEN
    v_new_status := 'parcial'::public.charge_status;
  ELSE
    v_new_status := 'pendiente'::public.charge_status;
  END IF;

  -- Actualizar el cargo
  UPDATE public.charges
  SET balance = v_new_balance,
      status = v_new_status,
      updated_at = now()
  WHERE id = v_charge_id;

  -- Sincronización: Si el cargo se pagó por completo, y estaba ligado a una sanción
  -- en estado 'pendiente' o 'resuelta' (evitamos sobreescribir 'apelacion' o 'anulada'),
  -- actualizamos el estado administrativo de la sanción a 'resuelta'.
  IF v_new_status = 'pagada'::public.charge_status THEN
    UPDATE public.sanctions
    SET status = 'resuelta'::public.sanction_status,
        updated_at = now()
    WHERE charge_id = v_charge_id
      AND status IN ('pendiente'::public.sanction_status, 'resuelta'::public.sanction_status);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Actualizar resolve_sanction_atomic para resolver sin crear pagos ficticios
--    Confirmar: Vuelve a 'pendiente' el cargo.
--    Modify: Cambia monto y balance del cargo si no tiene pagos.
--    Annul: Pone cargo en 'anulada' y balance = 0.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.resolve_sanction_atomic(
  p_sanction_id  uuid,
  p_outcome      text,   -- 'confirm' | 'modify' | 'annul'
  p_notes        text,
  p_new_amount   numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id        uuid;
  v_user_role         public.user_role;
  v_current_user_id   uuid;
  v_sanction          record;
  v_has_payments      boolean := false;
  v_old_status        public.sanction_status;
  v_old_charge_status public.charge_status;
  v_old_amount        numeric;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT company_id, role INTO v_company_id, v_user_role
  FROM public.profiles WHERE id = v_current_user_id;

  IF v_user_role = 'socio'::public.user_role THEN
    RAISE EXCEPTION 'Sin permiso para resolver sanciones';
  END IF;

  -- Validar outcome
  IF p_outcome NOT IN ('confirm', 'modify', 'annul') THEN
    RAISE EXCEPTION 'Resultado de resolución inválido. Use: confirm | modify | annul';
  END IF;

  -- Cargar sanción con info del cargo
  SELECT s.*, c.status AS charge_status, c.amount AS charge_amount, c.balance AS charge_balance
  INTO v_sanction
  FROM public.sanctions s
  LEFT JOIN public.charges c ON c.id = s.charge_id
  WHERE s.id = p_sanction_id AND s.company_id = v_company_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Sanción no encontrada'; END IF;

  v_old_status        := v_sanction.status;
  v_old_charge_status := v_sanction.charge_status;
  v_old_amount        := v_sanction.charge_amount;

  -- Solo se puede resolver desde 'pendiente' o 'apelacion'
  IF v_sanction.status NOT IN ('pendiente'::public.sanction_status, 'apelacion'::public.sanction_status) THEN
    RAISE EXCEPTION 'Solo se puede resolver una sanción en estado pendiente o apelación (estado actual: %)', v_sanction.status;
  END IF;

  -- Verificar pagos aplicados (para modify y annul)
  IF v_sanction.charge_id IS NOT NULL AND p_outcome IN ('modify', 'annul') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.payment_allocations pa
      JOIN public.payments py ON py.id = pa.payment_id
      WHERE pa.charge_id = v_sanction.charge_id
        AND py.company_id = v_company_id
    ) INTO v_has_payments;

    IF v_has_payments THEN
      RAISE EXCEPTION 'Esta sanción ya tiene pagos aplicados. No se puede % sin un ajuste formal.', p_outcome;
    END IF;
  END IF;

  -- Actualizar sanción administrativamente
  UPDATE public.sanctions
  SET status = CASE WHEN p_outcome = 'annul' THEN 'anulada'::public.sanction_status ELSE 'resuelta'::public.sanction_status END,
      resolution_notes = p_notes,
      updated_at = now()
  WHERE id = p_sanction_id;

  -- Actualizar cargo según outcome (resolver nunca debe simular un pago o marcar como pagada si no hay allocations)
  IF v_sanction.charge_id IS NOT NULL THEN
    IF p_outcome = 'confirm' THEN
      -- Confirmar: vuelve a pendiente si estaba suspendido (apelación)
      UPDATE public.charges
      SET status = 'pendiente'::public.charge_status,
          updated_at = now()
      WHERE id = v_sanction.charge_id
        AND status IN ('suspendida'::public.charge_status, 'pendiente'::public.charge_status);

    ELSIF p_outcome = 'modify' THEN
      -- Modificar: validar nuevo monto
      IF p_new_amount IS NULL OR p_new_amount <= 0 THEN
        RAISE EXCEPTION 'El nuevo monto debe ser mayor a cero';
      END IF;
      UPDATE public.charges
      SET amount = p_new_amount,
          balance = p_new_amount,
          status = 'pendiente'::public.charge_status,
          updated_at = now()
      WHERE id = v_sanction.charge_id;

    ELSIF p_outcome = 'annul' THEN
      -- Anular: cargo a anulada, balance = 0
      UPDATE public.charges
      SET status = 'anulada'::public.charge_status,
          balance = 0,
          updated_at = now()
      WHERE id = v_sanction.charge_id;
    END IF;
  END IF;

  -- Auditoría
  INSERT INTO public.audit_logs (company_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    v_company_id, v_current_user_id,
    'RESOLVE_SANCTION_' || upper(p_outcome),
    'sanctions', p_sanction_id,
    jsonb_build_object('sanction_status', v_old_status, 'charge_status', v_old_charge_status, 'amount', v_old_amount),
    jsonb_build_object('outcome', p_outcome, 'notes', p_notes, 'new_amount', p_new_amount)
  );

  RETURN json_build_object(
    'sanction_id', p_sanction_id,
    'outcome', p_outcome,
    'sanction_status', CASE WHEN p_outcome = 'annul' THEN 'anulada' ELSE 'resuelta' END,
    'had_payments', v_has_payments
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Normalizar datos inconsistentes existentes en Triton (compañía id 074bb7ba-afaa-4ae0-a979-724f0472d6b9)
--    Pedro Moran: multa $2 pagada (balance = 0) pero sanción 'pendiente'.
-- ─────────────────────────────────────────────────────────────────────────────

-- Regla segura 1: Sincronizar sanciones cuyos cargos estén totalmente pagados con allocations válidos (Solo si la compañía existe)
UPDATE public.sanctions s
SET status = 'resuelta'::public.sanction_status,
    updated_at = now()
FROM public.charges c
WHERE c.id = s.charge_id
  AND c.company_id = '074bb7ba-afaa-4ae0-a979-724f0472d6b9'
  AND c.status = 'pagada'::public.charge_status
  AND c.balance = 0
  AND s.status = 'pendiente'::public.sanction_status
  AND EXISTS (SELECT 1 FROM public.companies WHERE id = '074bb7ba-afaa-4ae0-a979-724f0472d6b9');

-- Registrar auditoría del ajuste para Pedro Moran (Solo si la compañía y la sanción existen)
INSERT INTO public.audit_logs (company_id, action, table_name, record_id, new_data)
SELECT
  '074bb7ba-afaa-4ae0-a979-724f0472d6b9',
  'SANCTION_NORMALIZED',
  'sanctions',
  'ac10d224-6f0e-4938-85af-fa71b6e3eeec',
  jsonb_build_object('reason', 'Normalizar estado a resuelta debido a pago completo verificado de $2.00', 'charge_id', 'ee53f772-ac9c-4893-902d-8a8597294877')
WHERE EXISTS (SELECT 1 FROM public.companies WHERE id = '074bb7ba-afaa-4ae0-a979-724f0472d6b9')
  AND EXISTS (SELECT 1 FROM public.sanctions WHERE id = 'ac10d224-6f0e-4938-85af-fa71b6e3eeec');
