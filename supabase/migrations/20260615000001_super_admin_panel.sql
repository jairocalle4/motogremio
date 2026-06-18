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
  
  -- Ajustado para solo sumar deudas reales mayores a 0 que no esten anuladas
  SELECT coalesce(sum(balance), 0) INTO v_total_debt FROM public.charges WHERE balance > 0 AND status != 'anulada';
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
    LEFT JOIN public.charges ch ON ch.company_id = c.id AND ch.balance > 0 AND ch.status != 'anulada'
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

REVOKE ALL ON FUNCTION public.get_super_admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_super_admin_dashboard_stats() TO authenticated;


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
      (SELECT coalesce(sum(balance), 0) FROM public.charges ch WHERE ch.company_id = c.id AND ch.balance > 0 AND ch.status != 'anulada') as total_debt
    FROM public.companies c
    LEFT JOIN public.plans p ON p.id = c.plan_id
    ORDER BY c.created_at DESC
  ) t;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_companies_with_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_companies_with_stats() TO authenticated;


-- 3. Create get_super_admin_company_detail function
CREATE OR REPLACE FUNCTION public.get_super_admin_company_detail(p_company_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company record;
  v_users_count int;
  v_members_count int;
  v_vehicles_count int;
  v_drivers_count int;
  v_total_debt numeric;
  v_recent_payments json;
  v_recent_sanctions json;
  v_recent_meetings json;
  v_linked_profiles json;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO v_company FROM public.companies WHERE id = p_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compañía no encontrada';
  END IF;

  SELECT count(*) INTO v_users_count FROM public.profiles WHERE company_id = p_company_id;
  SELECT count(*) INTO v_members_count FROM public.members WHERE company_id = p_company_id;
  SELECT count(*) INTO v_vehicles_count FROM public.vehicles WHERE company_id = p_company_id;
  SELECT count(*) INTO v_drivers_count FROM public.drivers WHERE company_id = p_company_id;
  SELECT coalesce(sum(balance), 0) INTO v_total_debt FROM public.charges WHERE company_id = p_company_id AND balance > 0 AND status != 'anulada';

  SELECT coalesce(json_agg(t), '[]'::json) INTO v_recent_payments FROM (
    SELECT id, amount, payment_date, payment_method
    FROM public.payments
    WHERE company_id = p_company_id
    ORDER BY payment_date DESC
    LIMIT 5
  ) t;

  SELECT coalesce(json_agg(t), '[]'::json) INTO v_recent_sanctions FROM (
    SELECT id, reason, date, status
    FROM public.sanctions
    WHERE company_id = p_company_id
    ORDER BY date DESC
    LIMIT 5
  ) t;

  SELECT coalesce(json_agg(t), '[]'::json) INTO v_recent_meetings FROM (
    SELECT id, title, date, status, meeting_type
    FROM public.meetings
    WHERE company_id = p_company_id
    ORDER BY date DESC
    LIMIT 5
  ) t;

  SELECT coalesce(json_agg(t), '[]'::json) INTO v_linked_profiles FROM (
    SELECT id, first_name, last_name, role, is_active
    FROM public.profiles
    WHERE company_id = p_company_id
  ) t;

  RETURN json_build_object(
    'company', row_to_json(v_company),
    'users_count', v_users_count,
    'members_count', v_members_count,
    'vehicles_count', v_vehicles_count,
    'drivers_count', v_drivers_count,
    'total_debt', v_total_debt,
    'recent_payments', v_recent_payments,
    'recent_sanctions', v_recent_sanctions,
    'recent_meetings', v_recent_meetings,
    'profiles', v_linked_profiles
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_super_admin_company_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_super_admin_company_detail(uuid) TO authenticated;


-- 4. Create update_super_admin_company_status function
CREATE OR REPLACE FUNCTION public.update_super_admin_company_status(p_company_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_status NOT IN ('activa', 'inactiva') THEN
    RAISE EXCEPTION 'Estado no permitido';
  END IF;

  UPDATE public.companies
  SET status = p_status, updated_at = timezone('utc'::text, now())
  WHERE id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compañía no encontrada';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_super_admin_company_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_super_admin_company_status(uuid, text) TO authenticated;


-- 5. Políticas RLS Mínimas para SELECT en tablas base
-- Companies
DROP POLICY IF EXISTS "Super admin can select companies" ON public.companies;
CREATE POLICY "Super admin can select companies" ON public.companies
FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can update companies" ON public.companies;

-- Plans
DROP POLICY IF EXISTS "Super admin can select plans" ON public.plans;
CREATE POLICY "Super admin can select plans" ON public.plans
FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can update plans" ON public.plans;

-- Profiles
DROP POLICY IF EXISTS "Super admin can select profiles" ON public.profiles;
