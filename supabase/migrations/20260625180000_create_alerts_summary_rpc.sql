-- Migration: Create Alerts Summary RPC and secure notifications SELECT policy
-- Created At: 2026-06-26

-- 1. Drop existing function if exists
DROP FUNCTION IF EXISTS public.get_alerts_summary();

-- 2. Create the RPC function
CREATE OR REPLACE FUNCTION public.get_alerts_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_role user_role;
  v_is_active boolean;
  v_member_id uuid;
  v_result jsonb;
  v_alerts jsonb;
  v_total int := 0;
  v_critical int := 0;
  v_warning int := 0;
  v_info int := 0;
  v_unread int := 0;
BEGIN
  -- 1. Get profiles status of current authenticated user
  SELECT company_id, role, is_active
  INTO v_company_id, v_role, v_is_active
  FROM public.profiles
  WHERE id = auth.uid();

  -- 2. Security validation: user must be active and have a company
  IF v_company_id IS NULL OR v_is_active IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'generated_at', now(),
      'role', null,
      'counts', jsonb_build_object('total', 0, 'critical', 0, 'warning', 0, 'info', 0, 'unread', 0),
      'alerts', '[]'::jsonb
    );
  END IF;

  -- 3. If the user is a member/socio, fetch their member_id
  IF v_role = 'socio' THEN
    SELECT id INTO v_member_id
    FROM public.members
    WHERE profile_id = auth.uid() AND company_id = v_company_id;
  END IF;

  -- 4. Calculate alerts dynamically from multiple sources
  WITH raw_alerts AS (
    -- A) Documents: active documents expiring within 30 days
    SELECT 
      'doc-' || d.id::text AS id,
      'documentos' AS source,
      d.id AS source_id,
      CASE 
        WHEN (d.expiry_date - CURRENT_DATE) <= 7 THEN 'critical'::text
        WHEN (d.expiry_date - CURRENT_DATE) <= 15 THEN 'warning'::text
        ELSE 'info'::text
      END AS severity,
      CASE 
        WHEN d.expiry_date < CURRENT_DATE THEN 'Documento Vencido'::text
        WHEN d.expiry_date = CURRENT_DATE THEN 'Documento Vence Hoy'::text
        ELSE 'Documento por Vencer'::text
      END AS title,
      'El documento "' || COALESCE(dt.name, 'Documento') || '" ' || 
      CASE 
        WHEN d.expiry_date < CURRENT_DATE THEN 'ha vencido hace ' || ABS(d.expiry_date - CURRENT_DATE) || ' días.'
        WHEN d.expiry_date = CURRENT_DATE THEN 'vence hoy.'
        ELSE 'vencerá en ' || (d.expiry_date - CURRENT_DATE) || ' días.'
      END AS message,
      d.expiry_date AS due_date,
      (d.expiry_date - CURRENT_DATE) AS days_remaining,
      CASE 
        WHEN d.member_id IS NOT NULL THEN '/socios/' || d.member_id::text
        WHEN d.vehicle_id IS NOT NULL THEN '/unidades/' || d.vehicle_id::text
        WHEN d.driver_id IS NOT NULL THEN '/conductores/' || d.driver_id::text
        ELSE '/documentos'
      END AS link_url,
      CASE 
        WHEN d.member_id IS NOT NULL THEN 'member'::text
        WHEN d.vehicle_id IS NOT NULL THEN 'vehicle'::text
        WHEN d.driver_id IS NOT NULL THEN 'driver'::text
        ELSE 'company'::text
      END AS scope,
      false AS is_read
    FROM public.documents d
    JOIN public.document_types dt ON d.document_type_id = dt.id
    WHERE d.company_id = v_company_id
      AND d.expiry_date IS NOT NULL
      AND (d.expiry_date - CURRENT_DATE) <= 30
      AND (
        v_role IN ('admin', 'secretaria')
        OR (v_role = 'socio' AND d.member_id = v_member_id)
        OR (v_role = 'socio' AND d.vehicle_id IN (SELECT id FROM public.vehicles WHERE member_id = v_member_id))
        OR (v_role = 'socio' AND d.driver_id IN (SELECT id FROM public.drivers WHERE member_id = v_member_id))
      )

    UNION ALL

    -- B) Licenses: active licenses expiring within 30 days
    SELECT 
      'lic-' || l.id::text AS id,
      'licencias' AS source,
      l.id AS source_id,
      CASE 
        WHEN (l.expiry_date - CURRENT_DATE) <= 7 THEN 'critical'::text
        WHEN (l.expiry_date - CURRENT_DATE) <= 15 THEN 'warning'::text
        ELSE 'info'::text
      END AS severity,
      CASE 
        WHEN l.expiry_date < CURRENT_DATE THEN 'Licencia Vencida'::text
        WHEN l.expiry_date = CURRENT_DATE THEN 'Licencia Vence Hoy'::text
        ELSE 'Licencia por Vencer'::text
      END AS title,
      'La licencia Tipo ' || COALESCE(l.license_type, '—') || ' (No. ' || COALESCE(l.license_number, '—') || ') ' ||
      CASE 
        WHEN l.expiry_date < CURRENT_DATE THEN 'ha vencido hace ' || ABS(l.expiry_date - CURRENT_DATE) || ' días.'
        WHEN l.expiry_date = CURRENT_DATE THEN 'vence hoy.'
        ELSE 'vencerá en ' || (l.expiry_date - CURRENT_DATE) || ' días.'
      END AS message,
      l.expiry_date AS due_date,
      (l.expiry_date - CURRENT_DATE) AS days_remaining,
      CASE 
        WHEN l.member_id IS NOT NULL THEN '/socios/' || l.member_id::text
        ELSE '/conductores/' || l.driver_id::text
      END AS link_url,
      CASE 
        WHEN l.member_id IS NOT NULL THEN 'member'::text
        ELSE 'driver'::text
      END AS scope,
      false AS is_read
    FROM public.licenses l
    WHERE l.company_id = v_company_id
      AND l.expiry_date IS NOT NULL
      AND (l.expiry_date - CURRENT_DATE) <= 30
      AND (
        v_role IN ('admin', 'secretaria')
        OR (v_role = 'socio' AND l.member_id = v_member_id)
        OR (v_role = 'socio' AND l.driver_id IN (SELECT id FROM public.drivers WHERE member_id = v_member_id))
      )

    UNION ALL

    -- C) Active Drivers/Members without Licenses (only for Admin/Secretaria)
    SELECT 
      'dri-sin-lic-' || dr.id::text AS id,
      'licencias' AS source,
      dr.id AS source_id,
      'critical'::text AS severity,
      'Conductor sin Licencia'::text AS title,
      'El conductor "' || dr.first_name || ' ' || dr.last_name || '" está activo pero no posee ninguna licencia registrada.' AS message,
      NULL::date AS due_date,
      NULL::integer AS days_remaining,
      '/conductores/' || dr.id::text AS link_url,
      'driver'::text AS scope,
      false AS is_read
    FROM public.drivers dr
    WHERE dr.company_id = v_company_id
      AND dr.status = 'activo'
      AND v_role IN ('admin', 'secretaria')
      AND NOT EXISTS (SELECT 1 FROM public.licenses WHERE driver_id = dr.id)

    UNION ALL

    SELECT 
      'mem-sin-lic-' || m.id::text AS id,
      'licencias' AS source,
      m.id AS source_id,
      'critical'::text AS severity,
      'Socio sin Licencia'::text AS title,
      'El socio "' || m.first_name || ' ' || m.last_name || '" está activo pero no posee ninguna licencia registrada.' AS message,
      NULL::date AS due_date,
      NULL::integer AS days_remaining,
      '/socios/' || m.id::text AS link_url,
      'member'::text AS scope,
      false AS is_read
    FROM public.members m
    WHERE m.company_id = v_company_id
      AND m.status = 'activo'
      AND v_role IN ('admin', 'secretaria')
      AND NOT EXISTS (SELECT 1 FROM public.licenses WHERE member_id = m.id)

    UNION ALL

    -- D) Charges (Cuotas / Deudas)
    SELECT 
      'cuota-' || c.id::text AS id,
      'finanzas' AS source,
      c.id AS source_id,
      CASE 
        WHEN c.due_date < CURRENT_DATE THEN 'critical'::text
        ELSE 'warning'::text
      END AS severity,
      CASE 
        WHEN c.due_date < CURRENT_DATE THEN 'Cuota Vencida'::text
        WHEN c.due_date = CURRENT_DATE THEN 'Cuota Vence Hoy'::text
        ELSE 'Cuota por Vencer'::text
      END AS title,
      'El cargo "' || c.description || '" con saldo pendiente de $' || c.balance::text || ' ' ||
      CASE 
        WHEN c.due_date < CURRENT_DATE THEN 'venció el ' || c.due_date::text
        ELSE 'vence pronto (' || c.due_date::text || ')'
      END AS message,
      c.due_date AS due_date,
      (CURRENT_DATE - c.due_date) AS days_remaining,
      '/pagos'::text AS link_url,
      'member'::text AS scope,
      false AS is_read
    FROM public.charges c
    WHERE c.company_id = v_company_id
      AND c.balance > 0
      AND c.status <> 'anulada'
      AND (
        v_role IN ('admin', 'secretaria')
        OR (v_role = 'socio' AND c.member_id = v_member_id)
      )
      AND (c.due_date < CURRENT_DATE OR (c.due_date - CURRENT_DATE) <= 7)

    UNION ALL

    -- E) Meetings
    SELECT 
      'meet-' || mt.id::text AS id,
      'reuniones' AS source,
      mt.id AS source_id,
      CASE 
        WHEN mt.date < CURRENT_DATE THEN 'warning'::text
        ELSE 'info'::text
      END AS severity,
      CASE 
        WHEN mt.date < CURRENT_DATE THEN 'Reunión sin Cerrar'::text
        ELSE 'Reunión Próxima'::text
      END AS title,
      CASE 
        WHEN mt.date < CURRENT_DATE THEN 'La reunión "' || mt.title || '" del ' || mt.date::text || ' ya pasó pero no se ha cerrado.'
        ELSE 'La reunión/asamblea "' || mt.title || '" está programada para el ' || mt.date::text || ' a las ' || COALESCE(mt.time::text, '—') || '.'
      END AS message,
      mt.date AS due_date,
      (mt.date - CURRENT_DATE) AS days_remaining,
      '/reuniones/' || mt.id::text AS link_url,
      'meeting'::text AS scope,
      false AS is_read
    FROM public.meetings mt
    WHERE mt.company_id = v_company_id
      AND (
        -- Programmed and near (next 3 days)
        (mt.status = 'programada' AND (mt.date - CURRENT_DATE) >= 0 AND (mt.date - CURRENT_DATE) <= 3)
        OR
        -- Passed without closing (only for Directiva)
        (mt.date < CURRENT_DATE AND mt.status IN ('programada', 'en_curso') AND v_role IN ('admin', 'secretaria'))
      )

    UNION ALL

    -- F) Active vehicles without driver (only for Directiva)
    SELECT 
      'veh-sin-cond-' || v.id::text AS id,
      'unidades' AS source,
      v.id AS source_id,
      'warning'::text AS severity,
      'Unidad sin Conductor'::text AS title,
      'La unidad con Disco ' || COALESCE(v.disk_number, '—') || ' (' || COALESCE(v.plate, '—') || ') está activa pero no tiene conductor asignado.' AS message,
      NULL::date AS due_date,
      NULL::integer AS days_remaining,
      '/unidades/' || v.id::text AS link_url,
      'vehicle'::text AS scope,
      false AS is_read
    FROM public.vehicles v
    WHERE v.company_id = v_company_id
      AND v.status = 'activa'
      AND v.driver_id IS NULL
      AND v_role IN ('admin', 'secretaria')

    UNION ALL

    -- G) Persistent notifications
    SELECT 
      'notif-' || n.id::text AS id,
      'sistema' AS source,
      n.id AS source_id,
      CASE 
        WHEN n.type = 'alerta' THEN 'critical'::text
        ELSE 'info'::text
      END AS severity,
      n.title AS title,
      n.message AS message,
      NULL::date AS due_date,
      NULL::integer AS days_remaining,
      n.link_url AS link_url,
      'notification'::text AS scope,
      n.is_read AS is_read
    FROM public.notifications n
    WHERE n.company_id = v_company_id
      AND (
        (v_role = 'socio' AND n.user_id = auth.uid())
        OR (v_role <> 'socio' AND (n.user_id = auth.uid() OR n.user_id IS NULL))
      )
  ),
  aggregated AS (
    SELECT 
      COALESCE(json_agg(t ORDER BY 
        CASE t.severity 
          WHEN 'critical' THEN 1 
          WHEN 'warning' THEN 2 
          ELSE 3 
        END,
        COALESCE(t.due_date, '9999-12-31'::date) ASC
      ), '[]'::json) AS alerts_list,
      COUNT(t.id) AS total_count,
      COUNT(CASE WHEN t.severity = 'critical' THEN 1 END) AS critical_count,
      COUNT(CASE WHEN t.severity = 'warning' THEN 1 END) AS warning_count,
      COUNT(CASE WHEN t.severity = 'info' THEN 1 END) AS info_count,
      COUNT(CASE WHEN t.source = 'sistema' AND NOT t.is_read THEN 1 END) AS unread_count
    FROM raw_alerts t
  )
  SELECT 
    jsonb_build_object(
      'generated_at', now(),
      'role', v_role,
      'counts', jsonb_build_object(
        'total', total_count,
        'critical', critical_count,
        'warning', warning_count,
        'info', info_count,
        'unread', unread_count
      ),
      'alerts', alerts_list
    )
  INTO v_result
  FROM aggregated;

  RETURN v_result;
END;
$$;

-- 3. Revoke public execution permissions and grant to authenticated
REVOKE ALL ON FUNCTION public.get_alerts_summary() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_alerts_summary() TO authenticated;

-- 4. Replace generated notifications_select policy with a secure version
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;

CREATE POLICY "notifications_select"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = notifications.company_id
      AND p.is_active = true
      AND p.role IN ('admin', 'secretaria')
  )
  OR (
    notifications.user_id = auth.uid()
  )
);
