-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix: Sanction Charge Lifecycle + Monthly Fee Separation
-- ═══════════════════════════════════════════════════════════════════════════════
-- Cambios:
--   1. Agregar columnas is_system y category a charge_types
--   2. Agregar estado 'suspendida' al enum charge_status
--   3. Backfill de tipos internos de sanción
--   4. Actualizar create_sanction_atomic_v2 para usar clasificación correcta
--   5. Crear RPCs atómicas: appeal_sanction_atomic, resolve_sanction_atomic, nullify_sanction_atomic
--   6. Crear RPC de generación mensual con validaciones: generate_monthly_charges_rpc
--   7. Crear RPC de seed de cuota mensual: seed_monthly_charge_type
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Columnas nuevas en charge_types
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.charge_types
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category  text     NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN public.charge_types.is_system IS
  'true = tipo gestionado internamente (ej: multa por sanción). Oculto en UI de admin.';
COMMENT ON COLUMN public.charge_types.category IS
  'Categoría del tipo: monthly | manual | sanction';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Nuevo estado 'suspendida' en charge_status (apelación)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE public.charge_status ADD VALUE IF NOT EXISTS 'suspendida';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill seguro: marcar tipos de multa vinculados a sanciones como internos
--    Solo aplica si el tipo 'Multa' está realmente referenciado por charges
--    que provienen de sanciones (vía sanctions.charge_id).
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.charge_types ct
SET
  is_system = true,
  category  = 'sanction'
WHERE ct.id IN (
  SELECT DISTINCT c.charge_type_id
  FROM public.charges c
  WHERE c.id IN (
    SELECT charge_id FROM public.sanctions WHERE charge_id IS NOT NULL
  )
)
AND ct.is_system = false;  -- idempotente: no re-procesar ya marcados

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Actualizar create_sanction_atomic_v2
--    Ahora crea/reutiliza el charge_type con is_system=true y category='sanction'
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_sanction_atomic_v2(
  p_member_id              uuid,
  p_sanction_type_id       uuid,
  p_reason                 text,
  p_date                   date,
  p_fine_amount            numeric,
  p_vehicle_id             uuid    DEFAULT NULL,
  p_severity               text    DEFAULT NULL,
  p_due_date               date    DEFAULT NULL,
  p_resolution_notes       text    DEFAULT NULL,
  p_meeting_id             uuid    DEFAULT NULL,
  p_meeting_attendance_id  uuid    DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id         uuid;
  v_user_role          public.user_role;
  v_current_user_id    uuid;
  v_charge_type_id     uuid;
  v_created_charge_id  uuid := NULL;
  v_created_sanction_id uuid;
  v_member_company_id  uuid;
  v_vehicle_company_id uuid;
  v_sanction_type_name text;
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

  -- 4. Validar que el socio sea de la misma compañía
  SELECT company_id INTO v_member_company_id
  FROM public.members WHERE id = p_member_id;

  IF v_member_company_id IS NULL OR v_member_company_id <> v_company_id THEN
    RAISE EXCEPTION 'El socio no pertenece a esta compañía';
  END IF;

  -- 5. Validar que el vehículo sea de la misma compañía
  IF p_vehicle_id IS NOT NULL THEN
    SELECT company_id INTO v_vehicle_company_id
    FROM public.vehicles WHERE id = p_vehicle_id;

    IF v_vehicle_company_id IS NULL OR v_vehicle_company_id <> v_company_id THEN
      RAISE EXCEPTION 'El vehículo no pertenece a esta compañía';
    END IF;
  END IF;

  -- 6. Obtener nombre y validar tipo de sanción
  SELECT name INTO v_sanction_type_name
  FROM public.sanction_types
  WHERE id = p_sanction_type_id AND company_id = v_company_id;

  IF v_sanction_type_name IS NULL THEN
    RAISE EXCEPTION 'Tipo de sanción no encontrado o no autorizado';
  END IF;

  -- 7. Validar motivo
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'El motivo es obligatorio';
  END IF;

  -- 8. Si tiene multa económica, crear el charge
  IF p_fine_amount > 0 THEN
    IF p_due_date IS NULL THEN
      RAISE EXCEPTION 'La fecha de vencimiento es obligatoria para sanciones con multa';
    END IF;

    -- Buscar tipo de cobro interno de sanción para esta compañía
    SELECT id INTO v_charge_type_id
    FROM public.charge_types
    WHERE company_id = v_company_id
      AND is_system = true
      AND category  = 'sanction';

    -- Si no existe, crearlo como tipo interno (is_system=true, is_recurring=false)
    IF v_charge_type_id IS NULL THEN
      INSERT INTO public.charge_types (
        company_id,
        name,
        description,
        default_amount,
        is_recurring,
        is_system,
        category
      ) VALUES (
        v_company_id,
        'Multa por sanción',
        'Cargos generados automáticamente por sanciones disciplinarias. No editable.',
        NULL,
        FALSE,
        TRUE,
        'sanction'
      ) RETURNING id INTO v_charge_type_id;
    END IF;

    -- Crear el cargo (deuda individual)
    INSERT INTO public.charges (
      company_id,
      member_id,
      vehicle_id,
      charge_type_id,
      description,
      amount,
      balance,
      due_date,
      status
    ) VALUES (
      v_company_id,
      p_member_id,
      p_vehicle_id,
      v_charge_type_id,
      'Multa por Sanción: ' || v_sanction_type_name || ' — ' || trim(p_reason),
      p_fine_amount,
      p_fine_amount,
      p_due_date,
      'pendiente'::public.charge_status
    ) RETURNING id INTO v_created_charge_id;
  END IF;

  -- 9. Crear la sanción
  INSERT INTO public.sanctions (
    company_id,
    member_id,
    vehicle_id,
    sanction_type_id,
    charge_id,
    date,
    reason,
    severity,
    status,
    resolution_notes,
    meeting_id,
    meeting_attendance_id
  ) VALUES (
    v_company_id,
    p_member_id,
    p_vehicle_id,
    p_sanction_type_id,
    v_created_charge_id,
    p_date,
    trim(p_reason),
    p_severity,
    'pendiente'::public.sanction_status,
    p_resolution_notes,
    p_meeting_id,
    p_meeting_attendance_id
  ) RETURNING id INTO v_created_sanction_id;

  -- 10. Auditoría
  INSERT INTO public.audit_logs (company_id, user_id, action, table_name, record_id, new_data)
  VALUES (
    v_company_id,
    v_current_user_id,
    'CREATE_SANCTION',
    'sanctions',
    v_created_sanction_id,
    jsonb_build_object(
      'sanction_id', v_created_sanction_id,
      'charge_id',   v_created_charge_id,
      'fine_amount', p_fine_amount,
      'status',      'pendiente'
    )
  );

  -- 11. Retornar estructura JSON informativa
  RETURN json_build_object(
    'sanction_id', v_created_sanction_id,
    'charge_id',   v_created_charge_id,
    'status',      'pendiente'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_sanction_atomic_v2(uuid,uuid,text,date,numeric,uuid,text,date,text,uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_sanction_atomic_v2(uuid,uuid,text,date,numeric,uuid,text,date,text,uuid,uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5a. RPC atómica: apelar sanción (sanción → apelacion, cargo → suspendida)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.appeal_sanction_atomic(
  p_sanction_id uuid,
  p_notes       text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id      uuid;
  v_user_role       public.user_role;
  v_current_user_id uuid;
  v_sanction        record;
  v_old_status      public.sanction_status;
  v_old_charge_status public.charge_status;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT company_id, role INTO v_company_id, v_user_role
  FROM public.profiles WHERE id = v_current_user_id;

  IF v_user_role = 'socio'::public.user_role THEN
    RAISE EXCEPTION 'Sin permiso para apelar sanciones';
  END IF;

  -- Cargar sanción validando aislamiento
  SELECT s.*, c.status AS charge_status
  INTO v_sanction
  FROM public.sanctions s
  LEFT JOIN public.charges c ON c.id = s.charge_id
  WHERE s.id = p_sanction_id AND s.company_id = v_company_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Sanción no encontrada'; END IF;

  v_old_status := v_sanction.status;
  v_old_charge_status := v_sanction.charge_status;

  -- Solo se puede apelar desde 'pendiente'
  IF v_sanction.status <> 'pendiente'::public.sanction_status THEN
    RAISE EXCEPTION 'Solo se puede apelar una sanción en estado pendiente (estado actual: %)', v_sanction.status;
  END IF;

  -- Actualizar sanción
  UPDATE public.sanctions
  SET status = 'apelacion', resolution_notes = p_notes, updated_at = now()
  WHERE id = p_sanction_id;

  -- Suspender cargo asociado (si existe y está pendiente/parcial)
  IF v_sanction.charge_id IS NOT NULL AND v_sanction.charge_status IN ('pendiente'::public.charge_status, 'parcial'::public.charge_status) THEN
    UPDATE public.charges
    SET status = 'suspendida'::public.charge_status, updated_at = now()
    WHERE id = v_sanction.charge_id;
  END IF;

  -- Auditoría
  INSERT INTO public.audit_logs (company_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    v_company_id, v_current_user_id, 'APPEAL_SANCTION', 'sanctions', p_sanction_id,
    jsonb_build_object('sanction_status', v_old_status, 'charge_status', v_old_charge_status),
    jsonb_build_object('sanction_status', 'apelacion', 'charge_status', 'suspendida', 'notes', p_notes)
  );

  RETURN json_build_object('sanction_id', p_sanction_id, 'status', 'apelacion', 'charge_suspended', v_sanction.charge_id IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.appeal_sanction_atomic(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.appeal_sanction_atomic(uuid, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5b. RPC atómica: resolver sanción con resultado explícito
--     p_outcome: 'confirm' | 'modify' | 'annul'
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
    RAISE EXCEPTION 'Resultado inválido. Use: confirm | modify | annul';
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

  -- Actualizar sanción
  UPDATE public.sanctions
  SET status = 'resuelta', resolution_notes = p_notes, updated_at = now()
  WHERE id = p_sanction_id;

  -- Actualizar cargo según outcome
  IF v_sanction.charge_id IS NOT NULL THEN
    IF p_outcome = 'confirm' THEN
      -- Confirmar: cargo vuelve a pendiente si estaba suspendido
      UPDATE public.charges
      SET status = 'pendiente'::public.charge_status, updated_at = now()
      WHERE id = v_sanction.charge_id
        AND status IN ('suspendida'::public.charge_status, 'pendiente'::public.charge_status);

    ELSIF p_outcome = 'modify' THEN
      -- Modificar: validar nuevo monto
      IF p_new_amount IS NULL OR p_new_amount <= 0 THEN
        RAISE EXCEPTION 'El nuevo monto debe ser mayor a cero';
      END IF;
      UPDATE public.charges
      SET amount = p_new_amount, balance = p_new_amount,
          status = 'pendiente'::public.charge_status, updated_at = now()
      WHERE id = v_sanction.charge_id;

    ELSIF p_outcome = 'annul' THEN
      -- Anular: cargo a anulada, balance = 0
      UPDATE public.charges
      SET status = 'anulada'::public.charge_status, balance = 0, updated_at = now()
      WHERE id = v_sanction.charge_id;

      -- Marcar sanción como anulada también (resolución-anulación)
      UPDATE public.sanctions
      SET status = 'anulada'::public.sanction_status
      WHERE id = p_sanction_id;
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

REVOKE ALL ON FUNCTION public.resolve_sanction_atomic(uuid, text, text, numeric) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_sanction_atomic(uuid, text, text, numeric) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5c. RPC atómica: anulación directa de sanción
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.nullify_sanction_atomic(
  p_sanction_id uuid,
  p_notes       text
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
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT company_id, role INTO v_company_id, v_user_role
  FROM public.profiles WHERE id = v_current_user_id;

  IF v_user_role = 'socio'::public.user_role THEN
    RAISE EXCEPTION 'Sin permiso para anular sanciones';
  END IF;

  -- Cargar sanción
  SELECT s.*, c.status AS charge_status
  INTO v_sanction
  FROM public.sanctions s
  LEFT JOIN public.charges c ON c.id = s.charge_id
  WHERE s.id = p_sanction_id AND s.company_id = v_company_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Sanción no encontrada'; END IF;

  v_old_status        := v_sanction.status;
  v_old_charge_status := v_sanction.charge_status;

  -- Verificar si hay pagos aplicados
  IF v_sanction.charge_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.payment_allocations pa
      JOIN public.payments py ON py.id = pa.payment_id
      WHERE pa.charge_id = v_sanction.charge_id AND py.company_id = v_company_id
    ) INTO v_has_payments;

    IF v_has_payments THEN
      RAISE EXCEPTION 'Esta sanción ya tiene pagos aplicados. No se puede anular sin un ajuste formal.';
    END IF;

    -- Anular cargo
    UPDATE public.charges
    SET status = 'anulada'::public.charge_status, balance = 0, updated_at = now()
    WHERE id = v_sanction.charge_id;
  END IF;

  -- Anular sanción
  UPDATE public.sanctions
  SET status = 'anulada'::public.sanction_status,
      resolution_notes = coalesce(p_notes, 'Sanción anulada administrativamente'),
      updated_at = now()
  WHERE id = p_sanction_id;

  -- Auditoría
  INSERT INTO public.audit_logs (company_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    v_company_id, v_current_user_id, 'NULLIFY_SANCTION', 'sanctions', p_sanction_id,
    jsonb_build_object('sanction_status', v_old_status, 'charge_status', v_old_charge_status),
    jsonb_build_object('sanction_status', 'anulada', 'charge_status', 'anulada', 'balance', 0, 'notes', p_notes)
  );

  RETURN json_build_object('sanction_id', p_sanction_id, 'status', 'anulada');
END;
$$;

REVOKE ALL ON FUNCTION public.nullify_sanction_atomic(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.nullify_sanction_atomic(uuid, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC: generar cuotas mensuales con validaciones backend completas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_monthly_charges_rpc(
  p_charge_type_id uuid,
  p_period_month   integer,
  p_period_year    integer,
  p_due_date       date
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
  v_charge_type       record;
  v_vehicle           record;
  v_created_count     integer := 0;
  v_skipped_count     integer := 0;
  v_active_units      integer := 0;
  v_month_name        text;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT company_id, role INTO v_company_id, v_user_role
  FROM public.profiles WHERE id = v_current_user_id;

  IF v_user_role = 'socio'::public.user_role THEN
    RAISE EXCEPTION 'Sin permiso para generar cuotas';
  END IF;

  -- Validar mes/año
  IF p_period_month < 1 OR p_period_month > 12 THEN
    RAISE EXCEPTION 'Mes inválido: %', p_period_month;
  END IF;

  -- Cargar y validar tipo de cobro (debe ser recurrente, no interno, con monto)
  SELECT * INTO v_charge_type
  FROM public.charge_types
  WHERE id = p_charge_type_id
    AND company_id = v_company_id
    AND is_system  = false
    AND is_recurring = true
    AND default_amount IS NOT NULL
    AND default_amount > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tipo de cobro inválido: debe ser recurrente, no interno, con monto mayor a cero';
  END IF;

  -- Nombre del mes
  v_month_name := to_char(make_date(p_period_year, p_period_month, 1), 'TMMonth');

  -- Procesar cada unidad activa
  FOR v_vehicle IN
    SELECT v.id, v.disk_number, v.plate, v.member_id
    FROM public.vehicles v
    WHERE v.company_id = v_company_id AND v.status = 'activa'
  LOOP
    v_active_units := v_active_units + 1;

    -- Intentar insertar (índice único previene duplicados)
    BEGIN
      INSERT INTO public.charges (
        company_id, member_id, vehicle_id, charge_type_id,
        description, amount, balance, due_date, status,
        period_month, period_year
      ) VALUES (
        v_company_id, v_vehicle.member_id, v_vehicle.id, p_charge_type_id,
        v_charge_type.name || ' — Disco ' || v_vehicle.disk_number || ' — ' || v_month_name || ' ' || p_period_year,
        v_charge_type.default_amount, v_charge_type.default_amount,
        p_due_date, 'pendiente'::public.charge_status,
        p_period_month, p_period_year
      );
      v_created_count := v_created_count + 1;
    EXCEPTION
      WHEN unique_violation THEN
        v_skipped_count := v_skipped_count + 1;
    END;
  END LOOP;

  -- Auditoría
  IF v_created_count > 0 THEN
    INSERT INTO public.audit_logs (company_id, user_id, action, table_name, record_id, new_data)
    VALUES (
      v_company_id, v_current_user_id, 'GENERATE_MONTHLY_CHARGES', 'charges', NULL,
      jsonb_build_object(
        'charge_type_id', p_charge_type_id,
        'period_month',   p_period_month,
        'period_year',    p_period_year,
        'created',        v_created_count,
        'skipped',        v_skipped_count
      )
    );
  END IF;

  RETURN json_build_object(
    'created_count',     v_created_count,
    'skipped_count',     v_skipped_count,
    'active_units_count', v_active_units
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_monthly_charges_rpc(uuid, integer, integer, date) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_monthly_charges_rpc(uuid, integer, integer, date) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RPC: seed de cuota mensual para compañías sin tipo recurrente
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.seed_monthly_charge_type(
  p_company_id uuid,
  p_name       text    DEFAULT 'Cuota mensual',
  p_amount     numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.charge_types (company_id, name, description, default_amount, is_recurring, is_system, category)
  VALUES (
    p_company_id,
    p_name,
    'Cuota administrativa mensual por cada unidad activa',
    p_amount,
    true,
    false,
    'monthly'
  )
  ON CONFLICT (company_id, name) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.charge_types WHERE company_id = p_company_id AND name = p_name;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_monthly_charge_type(uuid, text, numeric) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.seed_monthly_charge_type(uuid, text, numeric) TO authenticated;
