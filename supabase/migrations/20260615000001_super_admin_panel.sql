-- 1. Create get_super_admin_dashboard_stats function
CREATE OR REPLACE FUNCTION public.get_super_admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_companies int;
  v_active_companies int;
  v_inactive_companies int;
  v_total_users int;
  v_total_members int;
  v_total_vehicles int;
  v_total_debt numeric;
  v_total_payments int;
  v_top_companies_by_members json;
  v_top_companies_by_vehicles json;
  v_top_companies_by_debt json;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT count(*) INTO v_total_companies FROM public.companies;
  SELECT count(*) INTO v_active_companies FROM public.companies WHERE status = 'activa' OR status = 'activo';
  SELECT count(*) INTO v_inactive_companies FROM public.companies WHERE status = 'inactiva' OR status = 'inactivo';

  SELECT count(*) INTO v_total_users FROM public.profiles;
  SELECT count(*) INTO v_total_members FROM public.members;
  SELECT count(*) INTO v_total_vehicles FROM public.vehicles;
  
  SELECT coalesce(sum(balance), 0) INTO v_total_debt FROM public.charges WHERE status != 'anulada' AND status != 'pagada';
  SELECT count(*) INTO v_total_payments FROM public.payments;

  -- Top companies by members
  SELECT coalesce(json_agg(t), '[]'::json) INTO v_top_companies_by_members
  FROM (
    SELECT c.id, c.legal_name, count(m.id) as count
    FROM public.companies c
    LEFT JOIN public.members m ON m.company_id = c.id
    GROUP BY c.id, c.legal_name
    ORDER BY count DESC
    LIMIT 5
  ) t;

  -- Top companies by vehicles
  SELECT coalesce(json_agg(t), '[]'::json) INTO v_top_companies_by_vehicles
  FROM (
    SELECT c.id, c.legal_name, count(v.id) as count
    FROM public.companies c
    LEFT JOIN public.vehicles v ON v.company_id = c.id
    GROUP BY c.id, c.legal_name
    ORDER BY count DESC
    LIMIT 5
  ) t;

  -- Top companies by debt
  SELECT coalesce(json_agg(t), '[]'::json) INTO v_top_companies_by_debt
  FROM (
    SELECT c.id, c.legal_name, coalesce(sum(ch.balance), 0) as total_debt
    FROM public.companies c
    LEFT JOIN public.charges ch ON ch.company_id = c.id AND ch.status != 'anulada' AND ch.status != 'pagada'
    GROUP BY c.id, c.legal_name
    ORDER BY total_debt DESC
    LIMIT 5
  ) t;

  RETURN json_build_object(
    'total_companies', v_total_companies,
    'active_companies', v_active_companies,
    'inactive_companies', v_inactive_companies,
    'total_users', v_total_users,
    'total_members', v_total_members,
    'total_vehicles', v_total_vehicles,
    'total_debt', v_total_debt,
    'total_payments', v_total_payments,
    'top_companies_by_members', v_top_companies_by_members,
    'top_companies_by_vehicles', v_top_companies_by_vehicles,
    'top_companies_by_debt', v_top_companies_by_debt
  );
END;
$$;

-- 2. Create get_companies_with_stats function
CREATE OR REPLACE FUNCTION public.get_companies_with_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT coalesce(json_agg(t), '[]'::json) INTO v_result
  FROM (
    SELECT 
      c.id,
      c.legal_name,
      c.trade_name,
      c.ruc,
      c.status,
      c.created_at,
      p.name as plan_name,
      (SELECT count(*) FROM public.members m WHERE m.company_id = c.id) as members_count,
      (SELECT count(*) FROM public.vehicles v WHERE v.company_id = c.id) as vehicles_count,
      (SELECT count(*) FROM public.profiles pr WHERE pr.company_id = c.id) as users_count,
      (SELECT coalesce(sum(balance), 0) FROM public.charges ch WHERE ch.company_id = c.id AND ch.status != 'anulada' AND ch.status != 'pagada') as total_debt
    FROM public.companies c
    LEFT JOIN public.plans p ON p.id = c.plan_id
    ORDER BY c.created_at DESC
  ) t;

  RETURN v_result;
END;
$$;
