-- ═══════════════════════════════════════════════════════════════════
-- SEED DEMO — Cooperativa de Transporte Ejecutivo El Dorado S.A.
-- SOLO PARA AMBIENTE DEMO / DEV
-- NO EJECUTAR EN PRODUCCIÓN SIN REVISIÓN
-- Es idempotente: se puede ejecutar múltiples veces sin duplicar datos
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_plan_id          UUID;
  v_company_id       UUID;
  v_charge_type_id   UUID;
  v_sanction_type_id UUID;
  v_sanction_type_atraso_id UUID;
  v_doc_type_id      UUID;
  v_socio_1_id UUID; v_socio_2_id UUID; v_socio_3_id UUID;
  v_socio_4_id UUID; v_socio_5_id UUID; v_socio_6_id UUID;
  v_driver_1_id UUID; v_driver_2_id UUID; v_driver_3_id UUID;
  v_driver_4_id UUID; v_driver_5_id UUID; v_driver_6_id UUID;
  v_veh_1_id UUID; v_veh_2_id UUID; v_veh_3_id UUID;
  v_veh_4_id UUID; v_veh_5_id UUID;
  v_charge_1_id UUID; v_charge_2_id UUID; v_charge_3_id UUID;
  v_charge_4a_id UUID; v_charge_4b_id UUID;
  v_charge_5a_id UUID; v_charge_5b_id UUID; v_charge_5c_id UUID;
  v_meet_1_id UUID; v_meet_2_id UUID;
BEGIN

  -- ─── 1. Plan empresarial ──────────────────────────────────────────
  SELECT id INTO v_plan_id FROM plans WHERE name = 'empresarial' LIMIT 1;
  IF v_plan_id IS NULL THEN
    INSERT INTO plans (name, max_members, max_vehicles, price_monthly)
    VALUES ('empresarial', 500, 500, 99.99)
    RETURNING id INTO v_plan_id;
  END IF;

  -- ─── 2. Compañía demo (idempotente por RUC) ───────────────────────
  SELECT id INTO v_company_id FROM companies WHERE ruc = '0999999999001' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO companies (
      id, legal_name, trade_name, ruc, plan_id,
      service_type, address, phone, email
    ) VALUES (
      '00000000-0000-4000-8000-000000000049',
      'Cooperativa de Transporte Ejecutivo El Dorado S.A.',
      'Cooperativa El Dorado',
      '0999999999001',
      v_plan_id,
      'taxi',
      'Av. de los Granados y Av. 10 de Agosto, Quito',
      '022555666',
      'contacto@eldorado.demo.motogremio.local'
    ) RETURNING id INTO v_company_id;
  END IF;

  -- ─── 3. Tipo de cobro base ────────────────────────────────────────
  INSERT INTO charge_types (company_id, name, description, default_amount, is_recurring)
  VALUES (v_company_id, 'Cuota Administrativa Mensual', 'Cuota mensual de administración', 25.00, true)
  ON CONFLICT (company_id, name) DO NOTHING;
  SELECT id INTO v_charge_type_id FROM charge_types WHERE company_id = v_company_id AND name = 'Cuota Administrativa Mensual';

  -- ─── 4. Tipo de sanción base ──────────────────────────────────────
  INSERT INTO sanction_types (company_id, name, description, default_fine_amount)
  VALUES (v_company_id, 'Atraso a Reunión', 'Multa por llegada tardía a reunión obligatoria', 5.00)
  ON CONFLICT (company_id, name) DO NOTHING;

  INSERT INTO sanction_types (company_id, name, description, default_fine_amount)
  VALUES (v_company_id, 'Incumplimiento de Turno', 'Sanción por no cumplir turno programado', 20.00)
  ON CONFLICT (company_id, name) DO NOTHING;

  SELECT id INTO v_sanction_type_id FROM sanction_types
  WHERE company_id = v_company_id AND name = 'Incumplimiento de Turno';

  -- ─── 5. Tipo de documento vehicular ──────────────────────────────
  INSERT INTO document_types (company_id, name, target_entity, requires_expiry)
  VALUES (v_company_id, 'Matrícula', 'vehicle', true)
  ON CONFLICT (company_id, name) DO NOTHING;
  SELECT id INTO v_doc_type_id FROM document_types WHERE company_id = v_company_id AND name = 'Matrícula';

  -- ─── 6. Socios (idempotente por document_id) ──────────────────────
  INSERT INTO members (company_id, document_id, first_name, last_name, phone, email, status, admission_date)
  VALUES (v_company_id, '1711111111', 'Alejandro', 'Mendoza', '0991111111', 'alejandro.mendoza@eldorado.demo', 'activo', CURRENT_DATE - INTERVAL '365 days')
  ON CONFLICT (company_id, document_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, status = EXCLUDED.status
  RETURNING id INTO v_socio_1_id;

  INSERT INTO members (company_id, document_id, first_name, last_name, phone, email, status, admission_date)
  VALUES (v_company_id, '1722222222', 'Beatriz', 'Gómez', '0992222222', 'beatriz.gomez@eldorado.demo', 'activo', CURRENT_DATE - INTERVAL '300 days')
  ON CONFLICT (company_id, document_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, status = EXCLUDED.status
  RETURNING id INTO v_socio_2_id;

  INSERT INTO members (company_id, document_id, first_name, last_name, phone, email, status, admission_date)
  VALUES (v_company_id, '1733333333', 'Carlos', 'Andrade', '0993333333', 'carlos.andrade@eldorado.demo', 'activo', CURRENT_DATE - INTERVAL '250 days')
  ON CONFLICT (company_id, document_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, status = EXCLUDED.status
  RETURNING id INTO v_socio_3_id;

  INSERT INTO members (company_id, document_id, first_name, last_name, phone, email, status, admission_date)
  VALUES (v_company_id, '1744444444', 'Diana', 'Peralta', '0994444444', 'diana.peralta@eldorado.demo', 'activo', CURRENT_DATE - INTERVAL '180 days')
  ON CONFLICT (company_id, document_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, status = EXCLUDED.status
  RETURNING id INTO v_socio_4_id;

  INSERT INTO members (company_id, document_id, first_name, last_name, phone, email, status, admission_date)
  VALUES (v_company_id, '1755555555', 'Eduardo', 'Castro', '0995555555', 'eduardo.castro@eldorado.demo', 'suspendido', CURRENT_DATE - INTERVAL '120 days')
  ON CONFLICT (company_id, document_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, status = EXCLUDED.status
  RETURNING id INTO v_socio_5_id;

  INSERT INTO members (company_id, document_id, first_name, last_name, phone, email, status, admission_date)
  VALUES (v_company_id, '1766666666', 'Francisco', 'Ortiz', '0996666666', 'francisco.ortiz@eldorado.demo', 'inactivo', CURRENT_DATE - INTERVAL '90 days')
  ON CONFLICT (company_id, document_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, status = EXCLUDED.status
  RETURNING id INTO v_socio_6_id;

  -- ─── 7. Conductores (idempotente por document_id) ─────────────────
  INSERT INTO drivers (company_id, document_id, first_name, last_name, phone, status, member_id)
  VALUES (v_company_id, '1711111111', 'Alejandro', 'Mendoza', '0991111111', 'activo', v_socio_1_id)
  ON CONFLICT (company_id, document_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO v_driver_1_id;

  INSERT INTO drivers (company_id, document_id, first_name, last_name, phone, status, member_id)
  VALUES (v_company_id, '1722222222', 'Beatriz', 'Gómez', '0992222222', 'activo', v_socio_2_id)
  ON CONFLICT (company_id, document_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO v_driver_2_id;

  INSERT INTO drivers (company_id, document_id, first_name, last_name, phone, status, member_id)
  VALUES (v_company_id, '1733333333', 'Carlos', 'Andrade', '0993333333', 'activo', v_socio_3_id)
  ON CONFLICT (company_id, document_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO v_driver_3_id;

  INSERT INTO drivers (company_id, document_id, first_name, last_name, phone, status, member_id)
  VALUES (v_company_id, '1744444444', 'Diana', 'Peralta', '0994444444', 'activo', v_socio_4_id)
  ON CONFLICT (company_id, document_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO v_driver_4_id;

  -- Conductor externo (sin socio)
  INSERT INTO drivers (company_id, document_id, first_name, last_name, phone, status, member_id)
  VALUES (v_company_id, '1777777777', 'Gabriel', 'Villalba', '0997777777', 'activo', NULL)
  ON CONFLICT (company_id, document_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO v_driver_5_id;

  INSERT INTO drivers (company_id, document_id, first_name, last_name, phone, status, member_id)
  VALUES (v_company_id, '1766666666', 'Francisco', 'Ortiz', '0996666666', 'inactivo', v_socio_6_id)
  ON CONFLICT (company_id, document_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO v_driver_6_id;

  -- ─── 8. Licencias de conductores ─────────────────────────────────
  -- Licencia clase C vigente — Conductor 1
  INSERT INTO licenses (company_id, driver_id, license_type, license_number, issue_date, expiry_date, status)
  VALUES (v_company_id, v_driver_1_id, 'C', 'LIC-C-1711111111', CURRENT_DATE - INTERVAL '730 days', CURRENT_DATE + INTERVAL '1000 days', 'vigente')
  ON CONFLICT DO NOTHING;

  -- Licencia clase B vigente — Conductor 2
  INSERT INTO licenses (company_id, driver_id, license_type, license_number, issue_date, expiry_date, status)
  VALUES (v_company_id, v_driver_2_id, 'B', 'LIC-B-1722222222', CURRENT_DATE - INTERVAL '365 days', CURRENT_DATE + INTERVAL '730 days', 'vigente')
  ON CONFLICT DO NOTHING;

  -- Licencia clase C por vencer en 15 días — Conductor 3
  INSERT INTO licenses (company_id, driver_id, license_type, license_number, issue_date, expiry_date, status)
  VALUES (v_company_id, v_driver_3_id, 'C', 'LIC-C-1733333333', CURRENT_DATE - INTERVAL '1800 days', CURRENT_DATE + INTERVAL '15 days', 'vigente')
  ON CONFLICT DO NOTHING;

  -- Licencia vencida — Conductor externo (Gabriel)
  INSERT INTO licenses (company_id, driver_id, license_type, license_number, issue_date, expiry_date, status)
  VALUES (v_company_id, v_driver_5_id, 'C', 'LIC-C-1777777777', CURRENT_DATE - INTERVAL '2000 days', CURRENT_DATE - INTERVAL '45 days', 'vencido')
  ON CONFLICT DO NOTHING;

  -- ─── 9. Vehículos (idempotente por disk_number) ───────────────────
  INSERT INTO vehicles (company_id, disk_number, plate, brand, model, year, color, status, member_id, driver_id)
  VALUES (v_company_id, '001', 'PBA-1001', 'Nissan', 'Sentra', 2022, 'Amarillo/Negro', 'activa', v_socio_1_id, v_driver_1_id)
  ON CONFLICT (company_id, disk_number) DO UPDATE SET brand = EXCLUDED.brand, model = EXCLUDED.model, status = EXCLUDED.status
  RETURNING id INTO v_veh_1_id;

  INSERT INTO vehicles (company_id, disk_number, plate, brand, model, year, color, status, member_id, driver_id)
  VALUES (v_company_id, '002', 'PBA-1002', 'Hyundai', 'Accent', 2021, 'Amarillo/Negro', 'activa', v_socio_2_id, v_driver_2_id)
  ON CONFLICT (company_id, disk_number) DO UPDATE SET brand = EXCLUDED.brand, model = EXCLUDED.model, status = EXCLUDED.status
  RETURNING id INTO v_veh_2_id;

  INSERT INTO vehicles (company_id, disk_number, plate, brand, model, year, color, status, member_id, driver_id)
  VALUES (v_company_id, '003', 'PBA-1003', 'Chevrolet', 'Sail', 2020, 'Amarillo/Negro', 'activa', v_socio_3_id, v_driver_3_id)
  ON CONFLICT (company_id, disk_number) DO UPDATE SET brand = EXCLUDED.brand, model = EXCLUDED.model, status = EXCLUDED.status
  RETURNING id INTO v_veh_3_id;

  INSERT INTO vehicles (company_id, disk_number, plate, brand, model, year, color, status, member_id, driver_id)
  VALUES (v_company_id, '004', 'PBA-1004', 'Kia', 'Rio', 2023, 'Amarillo/Negro', 'activa', v_socio_4_id, v_driver_4_id)
  ON CONFLICT (company_id, disk_number) DO UPDATE SET brand = EXCLUDED.brand, model = EXCLUDED.model, status = EXCLUDED.status
  RETURNING id INTO v_veh_4_id;

  INSERT INTO vehicles (company_id, disk_number, plate, brand, model, year, color, status, member_id, driver_id)
  VALUES (v_company_id, '005', 'PBA-1005', 'Toyota', 'Yaris', 2019, 'Amarillo/Negro', 'mantenimiento', v_socio_5_id, v_driver_5_id)
  ON CONFLICT (company_id, disk_number) DO UPDATE SET brand = EXCLUDED.brand, model = EXCLUDED.model, status = EXCLUDED.status
  RETURNING id INTO v_veh_5_id;

  -- ─── 10. Documentos de vehículos ──────────────────────────────────
  IF v_doc_type_id IS NOT NULL AND v_veh_1_id IS NOT NULL THEN
    INSERT INTO documents (company_id, vehicle_id, document_type_id, issue_date, expiry_date, status)
    VALUES (v_company_id, v_veh_1_id, v_doc_type_id, CURRENT_DATE - INTERVAL '180 days', CURRENT_DATE + INTERVAL '185 days', 'vigente')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_doc_type_id IS NOT NULL AND v_veh_2_id IS NOT NULL THEN
    INSERT INTO documents (company_id, vehicle_id, document_type_id, issue_date, expiry_date, status)
    VALUES (v_company_id, v_veh_2_id, v_doc_type_id, CURRENT_DATE - INTERVAL '350 days', CURRENT_DATE + INTERVAL '15 days', 'vigente')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_doc_type_id IS NOT NULL AND v_veh_5_id IS NOT NULL THEN
    INSERT INTO documents (company_id, vehicle_id, document_type_id, issue_date, expiry_date, status)
    VALUES (v_company_id, v_veh_5_id, v_doc_type_id, CURRENT_DATE - INTERVAL '400 days', CURRENT_DATE - INTERVAL '35 days', 'vencido')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 11. Cuotas (charges) y pagos ────────────────────────────────
  IF v_charge_type_id IS NOT NULL THEN

    -- Socio 1: cuota pagada
    INSERT INTO charges (company_id, member_id, charge_type_id, description, amount, balance, due_date, status, period_month, period_year)
    VALUES (v_company_id, v_socio_1_id, v_charge_type_id, 'Cuota Mensual Junio', 25.00, 0.00, CURRENT_DATE - INTERVAL '5 days', 'pagada', 6, EXTRACT(YEAR FROM CURRENT_DATE)::int)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_charge_1_id;

    -- Socio 2: cuota pagada
    INSERT INTO charges (company_id, member_id, charge_type_id, description, amount, balance, due_date, status, period_month, period_year)
    VALUES (v_company_id, v_socio_2_id, v_charge_type_id, 'Cuota Mensual Junio', 25.00, 0.00, CURRENT_DATE - INTERVAL '5 days', 'pagada', 6, EXTRACT(YEAR FROM CURRENT_DATE)::int)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_charge_2_id;

    -- Socio 3: cuota parcialmente pagada
    INSERT INTO charges (company_id, member_id, charge_type_id, description, amount, balance, due_date, status, period_month, period_year)
    VALUES (v_company_id, v_socio_3_id, v_charge_type_id, 'Cuota Mensual Junio', 25.00, 10.00, CURRENT_DATE - INTERVAL '5 days', 'parcial', 6, EXTRACT(YEAR FROM CURRENT_DATE)::int)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_charge_3_id;

    -- Socio 4: moroso — dos meses
    INSERT INTO charges (company_id, member_id, charge_type_id, description, amount, balance, due_date, status, period_month, period_year)
    VALUES (v_company_id, v_socio_4_id, v_charge_type_id, 'Cuota Mensual Mayo', 25.00, 25.00, CURRENT_DATE - INTERVAL '35 days', 'pendiente', 5, EXTRACT(YEAR FROM CURRENT_DATE)::int)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_charge_4a_id;

    INSERT INTO charges (company_id, member_id, charge_type_id, description, amount, balance, due_date, status, period_month, period_year)
    VALUES (v_company_id, v_socio_4_id, v_charge_type_id, 'Cuota Mensual Junio', 25.00, 25.00, CURRENT_DATE - INTERVAL '5 days', 'pendiente', 6, EXTRACT(YEAR FROM CURRENT_DATE)::int)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_charge_4b_id;

    -- Socio 5: moroso — tres meses
    INSERT INTO charges (company_id, member_id, charge_type_id, description, amount, balance, due_date, status, period_month, period_year)
    VALUES (v_company_id, v_socio_5_id, v_charge_type_id, 'Cuota Mensual Abril', 25.00, 25.00, CURRENT_DATE - INTERVAL '65 days', 'pendiente', 4, EXTRACT(YEAR FROM CURRENT_DATE)::int)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_charge_5a_id;

    INSERT INTO charges (company_id, member_id, charge_type_id, description, amount, balance, due_date, status, period_month, period_year)
    VALUES (v_company_id, v_socio_5_id, v_charge_type_id, 'Cuota Mensual Mayo', 25.00, 25.00, CURRENT_DATE - INTERVAL '35 days', 'pendiente', 5, EXTRACT(YEAR FROM CURRENT_DATE)::int)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_charge_5b_id;

    INSERT INTO charges (company_id, member_id, charge_type_id, description, amount, balance, due_date, status, period_month, period_year)
    VALUES (v_company_id, v_socio_5_id, v_charge_type_id, 'Cuota Mensual Junio', 25.00, 25.00, CURRENT_DATE - INTERVAL '5 days', 'pendiente', 6, EXTRACT(YEAR FROM CURRENT_DATE)::int)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_charge_5c_id;

    -- Pagos reales: Socio 1 y Socio 2 pagaron su cuota
    IF v_charge_1_id IS NOT NULL THEN
      INSERT INTO payments (company_id, member_id, amount, payment_date, payment_method, notes)
      VALUES (v_company_id, v_socio_1_id, 25.00, CURRENT_DATE - INTERVAL '4 days', 'efectivo', 'Pago cuota junio')
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_charge_2_id IS NOT NULL THEN
      INSERT INTO payments (company_id, member_id, amount, payment_date, payment_method, notes)
      VALUES (v_company_id, v_socio_2_id, 25.00, CURRENT_DATE - INTERVAL '3 days', 'transferencia', 'Pago cuota junio')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Socio 3 pagó un abono de 15.00
    IF v_charge_3_id IS NOT NULL THEN
      INSERT INTO payments (company_id, member_id, amount, payment_date, payment_method, notes)
      VALUES (v_company_id, v_socio_3_id, 15.00, CURRENT_DATE - INTERVAL '2 days', 'efectivo', 'Abono parcial cuota junio')
      ON CONFLICT DO NOTHING;
    END IF;

  END IF;

  -- ─── 12. Sanciones ───────────────────────────────────────────────
  IF v_sanction_type_id IS NOT NULL THEN
    -- Sanción pendiente para Socio 5
    INSERT INTO sanctions (company_id, member_id, sanction_type_id, date, reason, severity, status)
    VALUES (v_company_id, v_socio_5_id, v_sanction_type_id, CURRENT_DATE - INTERVAL '30 days',
            'No cumplir con el turno de guardia programado del fin de semana.', 'grave', 'pendiente')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Sanción resuelta para Socio 4 (tipo "Atraso a Reunión")
  SELECT id INTO v_sanction_type_atraso_id FROM sanction_types
  WHERE company_id = v_company_id AND name = 'Atraso a Reunión';

  IF v_sanction_type_atraso_id IS NOT NULL THEN
    INSERT INTO sanctions (company_id, member_id, sanction_type_id, date, reason, severity, status, resolution_notes)
    VALUES (v_company_id, v_socio_4_id, v_sanction_type_atraso_id, CURRENT_DATE - INTERVAL '15 days',
            'Atraso de 40 minutos a la Asamblea Ordinaria del mes de Junio.', 'leve', 'resuelta', 'Atraso justificado, multa perdonada.')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 13. Reuniones ────────────────────────────────────────────────
  -- Reunión 1: Pasada (finalizada)
  INSERT INTO meetings (id, company_id, title, description, date, "time", location, status, meeting_type, is_mandatory)
  VALUES (
    '00000000-0000-4000-8000-000000001111',
    v_company_id,
    'Asamblea Ordinaria Junio',
    'Evaluación administrativa del mes de Mayo y balance financiero.',
    CURRENT_DATE - INTERVAL '15 days',
    '15:00:00',
    'Salón de Actos El Dorado',
    'finalizada',
    'ordinaria',
    true
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_meet_1_id;

  IF v_meet_1_id IS NOT NULL THEN
    INSERT INTO meeting_attendances (meeting_id, member_id, status, notes)
    VALUES
      (v_meet_1_id, v_socio_1_id, 'asistio',     NULL),
      (v_meet_1_id, v_socio_2_id, 'asistio',     NULL),
      (v_meet_1_id, v_socio_3_id, 'asistio',     NULL),
      (v_meet_1_id, v_socio_4_id, 'tarde',       'Llegó con atraso de 40 min'),
      (v_meet_1_id, v_socio_5_id, 'ausente',     NULL),
      (v_meet_1_id, v_socio_6_id, 'justificado', 'Permiso médico de reposo')
    ON CONFLICT (meeting_id, member_id) DO NOTHING;
  END IF;

  -- Reunión 2: Futura (programada)
  INSERT INTO meetings (id, company_id, title, description, date, "time", location, status, meeting_type, is_mandatory)
  VALUES (
    '00000000-0000-4000-8000-000000002222',
    v_company_id,
    'Reunión de Seguridad y Rutas',
    'Coordinación de nuevas rutas operativas y revisión de protocolos de seguridad vial.',
    CURRENT_DATE + INTERVAL '5 days',
    '18:00:00',
    'Salón de Actos El Dorado',
    'programada',
    'capacitacion',
    true
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_meet_2_id;

  IF v_meet_2_id IS NOT NULL THEN
    INSERT INTO meeting_invites (company_id, meeting_id, member_id, email_status, whatsapp_status)
    VALUES
      (v_company_id, v_meet_2_id, v_socio_1_id, 'enviado',  'pendiente'),
      (v_company_id, v_meet_2_id, v_socio_2_id, 'enviado',  'pendiente'),
      (v_company_id, v_meet_2_id, v_socio_3_id, 'enviado',  'pendiente'),
      (v_company_id, v_meet_2_id, v_socio_4_id, 'enviado',  'pendiente'),
      (v_company_id, v_meet_2_id, v_socio_5_id, 'pendiente','pendiente')
    ON CONFLICT (meeting_id, member_id) DO NOTHING;
  END IF;

END $$;
