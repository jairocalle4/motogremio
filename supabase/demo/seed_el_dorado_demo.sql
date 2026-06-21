-- SOLO PARA AMBIENTE DEMO / DEV
-- NO EJECUTAR EN PRODUCCIÓN SIN REVISIÓN

DO $$
DECLARE
  v_plan_id UUID;
  v_company_id UUID;
  v_socio_1_id UUID;
  v_socio_2_id UUID;
  v_socio_3_id UUID;
  v_socio_4_id UUID;
  v_socio_5_id UUID;
  v_socio_6_id UUID;
  v_driver_1_id UUID;
  v_driver_2_id UUID;
  v_driver_3_id UUID;
  v_driver_4_id UUID;
  v_driver_5_id UUID;
  v_driver_6_id UUID;
  v_veh_1_id UUID;
  v_veh_2_id UUID;
  v_veh_3_id UUID;
  v_veh_4_id UUID;
  v_veh_5_id UUID;
  v_meet_1_id UUID;
  v_meet_2_id UUID;
BEGIN
  -- 1. Obtener o crear un plan premium (el más alto disponible o crear uno para la demo)
  SELECT id INTO v_plan_id FROM plans WHERE name = 'premium' LIMIT 1;
  
  IF v_plan_id IS NULL THEN
    INSERT INTO plans (name, max_members, max_vehicles, price_monthly)
    VALUES ('premium', 500, 500, 99.99)
    RETURNING id INTO v_plan_id;
  END IF;

  -- 2. Crear compañía demo (idempotente por RUC)
  -- Cooperativa de Transporte Ejecutivo El Dorado S.A.
  -- Usamos un UUID fijo o autogenerado. Para consistencia en scripts, podemos generar uno o buscar si ya existe
  SELECT id INTO v_company_id FROM companies WHERE ruc = '0999999999001' LIMIT 1;
  
  IF v_company_id IS NULL THEN
    INSERT INTO companies (
      id,
      legal_name, 
      trade_name, 
      ruc, 
      plan_id, 
      service_type, 
      custom_service_type,
      address,
      phone,
      email
    )
    VALUES (
      '00000000-0000-4000-8000-000000000049',
      'Cooperativa de Transporte Ejecutivo El Dorado S.A.',
      'Cooperativa El Dorado',
      '0999999999001',
      v_plan_id,
      'taxi',
      NULL,
      'Av. de los Granados y Av. 10 de Agosto, Quito',
      '022555666',
      'contacto@eldorado.demo.motogremio.local'
    )
    RETURNING id INTO v_company_id;
  END IF;

  -- 3. Crear socios demo (Members) - Idempotente por Cédula (document_id)
  -- Socio 1 (Activo)
  INSERT INTO members (company_id, document_id, first_name, last_name, phone, whatsapp, email, status, admission_date)
  VALUES (v_company_id, '1711111111', 'Alejandro', 'Mendoza', '0991111111', '0991111111', 'alejandro.mendoza@eldorado.demo.motogremio.local', 'activo', CURRENT_DATE - INTERVAL '365 days')
  ON CONFLICT (company_id, document_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, status = EXCLUDED.status
  RETURNING id INTO v_socio_1_id;

  -- Socio 2 (Activo)
  INSERT INTO members (company_id, document_id, first_name, last_name, phone, whatsapp, email, status, admission_date)
  VALUES (v_company_id, '1722222222', 'Beatriz', 'Gómez', '0992222222', '0992222222', 'beatriz.gomez@eldorado.demo.motogremio.local', 'activo', CURRENT_DATE - INTERVAL '300 days')
  ON CONFLICT (company_id, document_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, status = EXCLUDED.status
  RETURNING id INTO v_socio_2_id;

  -- Socio 3 (Activo)
  INSERT INTO members (company_id, document_id, first_name, last_name, phone, whatsapp, email, status, admission_date)
  VALUES (v_company_id, '1733333333', 'Carlos', 'Andrade', '0993333333', '0993333333', 'carlos.andrade@eldorado.demo.motogremio.local', 'activo', CURRENT_DATE - INTERVAL '250 days')
  ON CONFLICT (company_id, document_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, status = EXCLUDED.status
  RETURNING id INTO v_socio_3_id;

  -- Socio 4 (Activo)
  INSERT INTO members (company_id, document_id, first_name, last_name, phone, whatsapp, email, status, admission_date)
  VALUES (v_company_id, '1744444444', 'Diana', 'Peralta', '0994444444', '0994444444', 'diana.peralta@eldorado.demo.motogremio.local', 'activo', CURRENT_DATE - INTERVAL '180 days')
  ON CONFLICT (company_id, document_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, status = EXCLUDED.status
  RETURNING id INTO v_socio_4_id;

  -- Socio 5 (Suspendido / Moroso)
  INSERT INTO members (company_id, document_id, first_name, last_name, phone, whatsapp, email, status, admission_date)
  VALUES (v_company_id, '1755555555', 'Eduardo', 'Castro', '0995555555', '0995555555', 'eduardo.castro@eldorado.demo.motogremio.local', 'suspendido', CURRENT_DATE - INTERVAL '120 days')
  ON CONFLICT (company_id, document_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, status = EXCLUDED.status
  RETURNING id INTO v_socio_5_id;

  -- Socio 6 (Inactivo / Retirado)
  INSERT INTO members (company_id, document_id, first_name, last_name, phone, whatsapp, email, status, admission_date)
  VALUES (v_company_id, '1766666666', 'Francisco', 'Ortiz', '0996666666', '0996666666', 'francisco.ortiz@eldorado.demo.motogremio.local', 'inactivo', CURRENT_DATE - INTERVAL '90 days')
  ON CONFLICT (company_id, document_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, status = EXCLUDED.status
  RETURNING id INTO v_socio_6_id;

  -- 4. Crear conductores vinculados (Drivers) - Idempotentes por document_id
  -- Conductor 1 (Socio 1)
  INSERT INTO drivers (company_id, document_id, first_name, last_name, phone, status, member_id)
  VALUES (v_company_id, '1711111111', 'Alejandro', 'Mendoza', '0991111111', 'activo', v_socio_1_id)
  ON CONFLICT (company_id, document_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO v_driver_1_id;

  -- Conductor 2 (Socio 2)
  INSERT INTO drivers (company_id, document_id, first_name, last_name, phone, status, member_id)
  VALUES (v_company_id, '1722222222', 'Beatriz', 'Gómez', '0992222222', 'activo', v_socio_2_id)
  ON CONFLICT (company_id, document_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO v_driver_2_id;

  -- Conductor 3 (Socio 3)
  INSERT INTO drivers (company_id, document_id, first_name, last_name, phone, status, member_id)
  VALUES (v_company_id, '1733333333', 'Carlos', 'Andrade', '0993333333', 'activo', v_socio_3_id)
  ON CONFLICT (company_id, document_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO v_driver_3_id;

  -- Conductor 4 (Socio 4)
  INSERT INTO drivers (company_id, document_id, first_name, last_name, phone, status, member_id)
  VALUES (v_company_id, '1744444444', 'Diana', 'Peralta', '0994444444', 'activo', v_socio_4_id)
  ON CONFLICT (company_id, document_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO v_driver_4_id;

  -- Conductor 5 (Externo - Vinculado a Socio 5)
  INSERT INTO drivers (company_id, document_id, first_name, last_name, phone, status, member_id)
  VALUES (v_company_id, '1777777777', 'Gabriel', 'Villalba', '0997777777', 'activo', NULL)
  ON CONFLICT (company_id, document_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO v_driver_5_id;

  -- Conductor 6 (Socio 6)
  INSERT INTO drivers (company_id, document_id, first_name, last_name, phone, status, member_id)
  VALUES (v_company_id, '1766666666', 'Francisco', 'Ortiz', '0996666666', 'inactivo', v_socio_6_id)
  ON CONFLICT (company_id, document_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO v_driver_6_id;

  -- 5. Crear licencias variadas (idempotentes por driver_id y license_number)
  -- Licencia clase C vigente (Taxi) para Conductor 1
  INSERT INTO licenses (company_id, driver_id, license_type, license_number, issue_date, expiry_date, status)
  VALUES (v_company_id, v_driver_1_id, 'C', '1711111111', CURRENT_DATE - INTERVAL '730 days', CURRENT_DATE + INTERVAL '1000 days', 'vigente')
  ON CONFLICT (company_id, license_number) DO NOTHING;

  -- Licencia clase B vigente (Auto) para Conductor 2
  INSERT INTO licenses (company_id, driver_id, license_type, license_number, issue_date, expiry_date, status)
  VALUES (v_company_id, v_driver_2_id, 'B', '1722222222', CURRENT_DATE - INTERVAL '365 days', CURRENT_DATE + INTERVAL '730 days', 'vigente')
  ON CONFLICT (company_id, license_number) DO NOTHING;

  -- Licencia clase C por vencer para Conductor 3
  INSERT INTO licenses (company_id, driver_id, license_type, license_number, issue_date, expiry_date, status)
  VALUES (v_company_id, v_driver_3_id, 'C', '1733333333', CURRENT_DATE - INTERVAL '1800 days', CURRENT_DATE + INTERVAL '15 days', 'vigente')
  ON CONFLICT (company_id, license_number) DO NOTHING;

  -- Licencia clase C vencida para Conductor 5
  INSERT INTO licenses (company_id, driver_id, license_type, license_number, issue_date, expiry_date, status)
  VALUES (v_company_id, v_driver_5_id, 'C', '1777777777', CURRENT_DATE - INTERVAL '2000 days', CURRENT_DATE - INTERVAL '45 days', 'vencido')
  ON CONFLICT (company_id, license_number) DO NOTHING;

  -- Conductor 4 se queda sin licencia registrada para la demo de alertas

  -- 6. Crear vehículos (Taxis) - Idempotente por disco y placa
  -- Vehículo 1 (Nissan Sentra - Conductor 1 - Activo)
  INSERT INTO vehicles (company_id, disk_number, plate, brand, model, year, color, status, member_id, driver_id, vehicle_type)
  VALUES (v_company_id, '001', 'PBA-1001', 'Nissan', 'Sentra', 2022, 'Amarillo/Negro', 'activa', v_socio_1_id, v_driver_1_id, 'auto')
  ON CONFLICT (company_id, disk_number) DO UPDATE SET brand = EXCLUDED.brand, model = EXCLUDED.model, status = EXCLUDED.status
  RETURNING id INTO v_veh_1_id;

  -- Vehículo 2 (Hyundai Accent - Conductor 2 - Activo)
  INSERT INTO vehicles (company_id, disk_number, plate, brand, model, year, color, status, member_id, driver_id, vehicle_type)
  VALUES (v_company_id, '002', 'PBA-1002', 'Hyundai', 'Accent', 2021, 'Amarillo/Negro', 'activa', v_socio_2_id, v_driver_2_id, 'auto')
  ON CONFLICT (company_id, disk_number) DO UPDATE SET brand = EXCLUDED.brand, model = EXCLUDED.model, status = EXCLUDED.status
  RETURNING id INTO v_veh_2_id;

  -- Vehículo 3 (Chevrolet Sail - Conductor 3 - Activo)
  INSERT INTO vehicles (company_id, disk_number, plate, brand, model, year, color, status, member_id, driver_id, vehicle_type)
  VALUES (v_company_id, '003', 'PBA-1003', 'Chevrolet', 'Sail', 2020, 'Amarillo/Negro', 'activa', v_socio_3_id, v_driver_3_id, 'auto')
  ON CONFLICT (company_id, disk_number) DO UPDATE SET brand = EXCLUDED.brand, model = EXCLUDED.model, status = EXCLUDED.status
  RETURNING id INTO v_veh_3_id;

  -- Vehículo 4 (Kia Rio - Conductor 4 - Activo)
  INSERT INTO vehicles (company_id, disk_number, plate, brand, model, year, color, status, member_id, driver_id, vehicle_type)
  VALUES (v_company_id, '004', 'PBA-1004', 'Kia', 'Rio', 2023, 'Amarillo/Negro', 'activa', v_socio_4_id, v_driver_4_id, 'auto')
  ON CONFLICT (company_id, disk_number) DO UPDATE SET brand = EXCLUDED.brand, model = EXCLUDED.model, status = EXCLUDED.status
  RETURNING id INTO v_veh_4_id;

  -- Vehículo 5 (Toyota Yaris - Conductor 5 - En mantenimiento)
  INSERT INTO vehicles (company_id, disk_number, plate, brand, model, year, color, status, member_id, driver_id, vehicle_type)
  VALUES (v_company_id, '005', 'PBA-1005', 'Toyota', 'Yaris', 2019, 'Amarillo/Negro', 'mantenimiento', v_socio_5_id, v_driver_5_id, 'auto')
  ON CONFLICT (company_id, disk_number) DO UPDATE SET brand = EXCLUDED.brand, model = EXCLUDED.model, status = EXCLUDED.status
  RETURNING id INTO v_veh_5_id;

  -- 7. Crear documentos de vehículos con vencimientos simulados
  -- Matrícula vigente Vehículo 1
  INSERT INTO documents (company_id, title, type_name, entity_type, entity_id, issue_date, expiry_date, status)
  VALUES (v_company_id, 'Matrícula PBA-1001', 'Matrícula', 'vehicle', v_veh_1_id, CURRENT_DATE - INTERVAL '180 days', CURRENT_DATE + INTERVAL '185 days', 'vigente')
  ON CONFLICT DO NOTHING;

  -- Matrícula por vencer Vehículo 2
  INSERT INTO documents (company_id, title, type_name, entity_type, entity_id, issue_date, expiry_date, status)
  VALUES (v_company_id, 'Matrícula PBA-1002', 'Matrícula', 'vehicle', v_veh_2_id, CURRENT_DATE - INTERVAL '350 days', CURRENT_DATE + INTERVAL '15 days', 'vigente')
  ON CONFLICT DO NOTHING;

  -- Matrícula vencida Vehículo 5
  INSERT INTO documents (company_id, title, type_name, entity_type, entity_id, issue_date, expiry_date, status)
  VALUES (v_company_id, 'Matrícula PBA-1005', 'Matrícula', 'vehicle', v_veh_5_id, CURRENT_DATE - INTERVAL '400 days', CURRENT_DATE - INTERVAL '35 days', 'vencido')
  ON CONFLICT DO NOTHING;

  -- 8. Crear pagos y deudas (cuotas mensuales recientes)
  -- Socio 1: Al día (pagado)
  INSERT INTO payments (company_id, member_id, description, amount, balance, due_date, status, charge_type)
  VALUES (v_company_id, v_socio_1_id, 'Cuota Mensual Junio', 25.00, 0.00, CURRENT_DATE - INTERVAL '5 days', 'pagado', 'administrativa')
  ON CONFLICT DO NOTHING;

  -- Socio 2: Al día (pagado)
  INSERT INTO payments (company_id, member_id, description, amount, balance, due_date, status, charge_type)
  VALUES (v_company_id, v_socio_2_id, 'Cuota Mensual Junio', 25.00, 0.00, CURRENT_DATE - INTERVAL '5 days', 'pagado', 'administrativa')
  ON CONFLICT DO NOTHING;

  -- Socio 3: Abono parcial (pendiente)
  INSERT INTO payments (company_id, member_id, description, amount, balance, due_date, status, charge_type)
  VALUES (v_company_id, v_socio_3_id, 'Cuota Mensual Junio', 25.00, 10.00, CURRENT_DATE - INTERVAL '5 days', 'pendiente', 'administrativa')
  ON CONFLICT DO NOTHING;

  -- Socio 4: Moroso (dos meses vencidos)
  INSERT INTO payments (company_id, member_id, description, amount, balance, due_date, status, charge_type)
  VALUES 
    (v_company_id, v_socio_4_id, 'Cuota Mensual Mayo', 25.00, 25.00, CURRENT_DATE - INTERVAL '35 days', 'moroso', 'administrativa'),
    (v_company_id, v_socio_4_id, 'Cuota Mensual Junio', 25.00, 25.00, CURRENT_DATE - INTERVAL '5 days', 'pendiente', 'administrativa')
  ON CONFLICT DO NOTHING;

  -- Socio 5: Moroso suspendido
  INSERT INTO payments (company_id, member_id, description, amount, balance, due_date, status, charge_type)
  VALUES 
    (v_company_id, v_socio_5_id, 'Cuota Mensual Abril', 25.00, 25.00, CURRENT_DATE - INTERVAL '65 days', 'moroso', 'administrativa'),
    (v_company_id, v_socio_5_id, 'Cuota Mensual Mayo', 25.00, 25.00, CURRENT_DATE - INTERVAL '35 days', 'moroso', 'administrativa'),
    (v_company_id, v_socio_5_id, 'Cuota Mensual Junio', 25.00, 25.00, CURRENT_DATE - INTERVAL '5 days', 'pendiente', 'administrativa')
  ON CONFLICT DO NOTHING;

  -- 9. Sanciones demo
  -- Atraso a asamblea para Socio 4
  INSERT INTO sanctions (company_id, member_id, sanction_type, date, reason, severity, status, fine_amount, fine_balance)
  VALUES (v_company_id, v_socio_4_id, 'atraso_reunion', CURRENT_DATE - INTERVAL '15 days', 'Atraso de 40 minutos a la Asamblea Ordinaria del mes de Junio.', 'leve', 'resuelta', 5.00, 0.00)
  ON CONFLICT DO NOTHING;

  -- Incumplimiento de turno para Socio 5
  INSERT INTO sanctions (company_id, member_id, sanction_type, date, reason, severity, status, fine_amount, fine_balance)
  VALUES (v_company_id, v_socio_5_id, 'indisciplina', CURRENT_DATE - INTERVAL '30 days', 'No cumplir con el turno de guardia programado del fin de semana.', 'grave', 'pendiente', 20.00, 20.00)
  ON CONFLICT DO NOTHING;

  -- 10. Reuniones y Asistencia
  -- Reunión 1: Pasada (finalizada con asistencia)
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

  -- Registrar asistencia de la reunión pasada si se creó
  IF v_meet_1_id IS NOT NULL THEN
    INSERT INTO meeting_attendances (meeting_id, member_id, status, justification_notes)
    VALUES 
      (v_meet_1_id, v_socio_1_id, 'asistio', NULL),
      (v_meet_1_id, v_socio_2_id, 'asistio', NULL),
      (v_meet_1_id, v_socio_3_id, 'asistio', NULL),
      (v_meet_1_id, v_socio_4_id, 'tarde', 'Llegó con atraso'),
      (v_meet_1_id, v_socio_5_id, 'ausente', NULL),
      (v_meet_1_id, v_socio_6_id, 'justificado', 'Permiso médico de reposo')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Reunión 2: Convocatoria Futura
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

  -- Invitar a los socios activos a la nueva reunión
  IF v_meet_2_id IS NOT NULL THEN
    INSERT INTO meeting_invites (meeting_id, member_id, email_status, whatsapp_status)
    VALUES
      (v_meet_2_id, v_socio_1_id, 'enviado', 'pendiente'),
      (v_meet_2_id, v_socio_2_id, 'enviado', 'pendiente'),
      (v_meet_2_id, v_socio_3_id, 'enviado', 'pendiente'),
      (v_meet_2_id, v_socio_4_id, 'enviado', 'pendiente'),
      (v_meet_2_id, v_socio_5_id, 'pendiente', 'pendiente')
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
