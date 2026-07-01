CREATE OR REPLACE FUNCTION get_super_admin_alerts()
RETURNS TABLE (
  id text,
  type text,
  severity text,
  title text,
  description text,
  company_id uuid,
  company_name text,
  amount numeric,
  due_date date,
  status text,
  action_label text,
  action_href text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  RETURN QUERY
  -- 1. Cobros vencidos
  SELECT
    'overdue-' || inv.id::text AS id,
    'billing_overdue'::text AS type,
    'critical'::text AS severity,
    'Cobro Vencido ' || inv.invoice_number AS title,
    'El cobro interno de ' || COALESCE(c.trade_name, c.legal_name, c.id::text) || ' por $' || inv.amount || ' venció el ' || to_char(inv.due_date, 'DD/MM/YYYY') || '.' AS description,
    c.id AS company_id,
    COALESCE(c.trade_name, c.legal_name, c.id::text)::text AS company_name,
    inv.balance AS amount,
    inv.due_date AS due_date,
    inv.status::text AS status,
    'Ir a Suscripciones'::text AS action_label,
    '/super-admin/subscriptions'::text AS action_href,
    inv.created_at AS created_at
  FROM saas_invoices inv
  JOIN companies c ON c.id = inv.company_id
  WHERE inv.due_date < CURRENT_DATE
    AND inv.balance > 0
    AND inv.status <> 'void'

  UNION ALL

  -- 2. Compañías con deuda SaaS pendiente (no vencidas)
  SELECT
    'pending-' || inv.id::text AS id,
    'billing_pending'::text AS type,
    'warning'::text AS severity,
    'Deuda SaaS Pendiente ' || inv.invoice_number AS title,
    'La compañía ' || COALESCE(c.trade_name, c.legal_name, c.id::text) || ' tiene un cobro por vencer de $' || inv.amount || ' para el ' || to_char(inv.due_date, 'DD/MM/YYYY') || '.' AS description,
    c.id AS company_id,
    COALESCE(c.trade_name, c.legal_name, c.id::text)::text AS company_name,
    inv.balance AS amount,
    inv.due_date AS due_date,
    inv.status::text AS status,
    'Ir a Cobros SaaS'::text AS action_label,
    '/super-admin/subscriptions'::text AS action_href,
    inv.created_at AS created_at
  FROM saas_invoices inv
  JOIN companies c ON c.id = inv.company_id
  WHERE inv.due_date >= CURRENT_DATE
    AND inv.balance > 0
    AND inv.status <> 'void'

  UNION ALL

  -- 3. Próximos vencimientos de suscripción (próximos 7 días)
  SELECT
    'subdue-' || sub.id::text AS id,
    'subscription_due_soon'::text AS type,
    'warning'::text AS severity,
    'Suscripción por vencer' AS title,
    'El plan ' || p.name::text || ' contratado por ' || COALESCE(c.trade_name, c.legal_name, c.id::text) || ' tiene su próximo pago programado para el ' || to_char(sub.next_due_date, 'DD/MM/YYYY') || '.' AS description,
    c.id AS company_id,
    COALESCE(c.trade_name, c.legal_name, c.id::text)::text AS company_name,
    sub.price_amount AS amount,
    sub.next_due_date AS due_date,
    sub.status::text AS status,
    'Ir a Cobros SaaS'::text AS action_label,
    '/super-admin/subscriptions'::text AS action_href,
    sub.created_at AS created_at
  FROM company_subscriptions sub
  JOIN companies c ON c.id = sub.company_id
  JOIN plans p ON p.id = sub.plan_id
  WHERE sub.next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    AND sub.status IN ('active', 'trial', 'past_due')

  UNION ALL

  -- 4. Compañías inactivas/suspendidas (status = 'inactiva')
  SELECT
    'inactive-' || c.id::text AS id,
    'company_inactive'::text AS type,
    'critical'::text AS severity,
    'Compañía Suspendida / Inactiva' AS title,
    'La cooperativa ' || COALESCE(c.trade_name, c.legal_name, c.id::text) || ' se encuentra marcada como INACTIVA y sus usuarios tienen bloqueado el acceso.' AS description,
    c.id AS company_id,
    COALESCE(c.trade_name, c.legal_name, c.id::text)::text AS company_name,
    NULL::numeric AS amount,
    NULL::date AS due_date,
    c.status::text AS status,
    'Ver compañía'::text AS action_label,
    '/super-admin/companies/' || c.id AS action_href,
    c.created_at AS created_at
  FROM companies c
  WHERE c.status = 'inactiva'

  UNION ALL

  -- 5 & 6. Alertas de límites
  SELECT
    lims.id,
    lims.type,
    lims.severity,
    lims.title,
    lims.description,
    lims.company_id,
    lims.company_name,
    NULL::numeric AS amount,
    NULL::date AS due_date,
    NULL::text AS status,
    'Cambiar plan'::text AS action_label,
    '/super-admin/companies/' || lims.company_id AS action_href,
    CURRENT_TIMESTAMP AS created_at
  FROM (
    SELECT
      'limit-mem-' || c.id::text AS id,
      'member_limit_warning'::text AS type,
      CASE WHEN (count(m.id)::numeric / p.max_members) >= 0.90 THEN 'critical'::text ELSE 'warning'::text END AS severity,
      'Límite de Socios Crítico'::text AS title,
      'La compañía ' || COALESCE(c.trade_name, c.legal_name, c.id::text) || ' tiene ' || count(m.id) || ' socios de un máximo de ' || p.max_members || ' (' || round((count(m.id)::numeric / p.max_members * 100)) || '%).' AS description,
      c.id AS company_id,
      COALESCE(c.trade_name, c.legal_name, c.id::text)::text AS company_name
    FROM companies c
    JOIN company_subscriptions sub ON sub.company_id = c.id
    JOIN plans p ON p.id = sub.plan_id
    LEFT JOIN members m ON m.company_id = c.id
    WHERE sub.status = 'active'
    GROUP BY c.id, c.trade_name, c.legal_name, p.max_members
    HAVING (count(m.id)::numeric / p.max_members) >= 0.80

    UNION ALL

    SELECT
      'limit-veh-' || c.id::text AS id,
      'vehicle_limit_warning'::text AS type,
      CASE WHEN (count(v.id)::numeric / p.max_vehicles) >= 0.90 THEN 'critical'::text ELSE 'warning'::text END AS severity,
      'Límite de Vehículos Crítico'::text AS title,
      'La compañía ' || COALESCE(c.trade_name, c.legal_name, c.id::text) || ' tiene ' || count(v.id) || ' unidades de un máximo de ' || p.max_vehicles || ' (' || round((count(v.id)::numeric / p.max_vehicles * 100)) || '%).' AS description,
      c.id AS company_id,
      COALESCE(c.trade_name, c.legal_name, c.id::text)::text AS company_name
    FROM companies c
    JOIN company_subscriptions sub ON sub.company_id = c.id
    JOIN plans p ON p.id = sub.plan_id
    LEFT JOIN vehicles v ON v.company_id = c.id
    WHERE sub.status = 'active'
    GROUP BY c.id, c.trade_name, c.legal_name, p.max_vehicles
    HAVING (count(v.id)::numeric / p.max_vehicles) >= 0.80
  ) lims
  ORDER BY severity DESC, created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION get_super_admin_alerts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_super_admin_alerts() TO authenticated;
