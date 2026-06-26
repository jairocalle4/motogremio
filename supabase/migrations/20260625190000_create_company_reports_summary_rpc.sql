-- Migration: Create Company Reports Summary RPC
-- Created At: 2026-06-26

-- 1. Drop existing function if exists
DROP FUNCTION IF EXISTS public.get_company_reports_summary();

-- 2. Create the RPC function
CREATE OR REPLACE FUNCTION public.get_company_reports_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_role user_role;
  v_is_active boolean;
  v_result jsonb;
  
  -- Metrics variables
  v_members_total int := 0;
  v_members_active int := 0;
  v_vehicles_total int := 0;
  v_vehicles_active int := 0;
  v_drivers_total int := 0;
  v_documents_expired int := 0;
  v_documents_expiring_soon int := 0;
  v_licenses_expired int := 0;
  v_licenses_expiring_soon int := 0;
  v_charges_pending int := 0;
  v_charges_overdue int := 0;
  v_balance_pending numeric(10,2) := 0.00;
  v_sanctions_total int := 0;
  v_meetings_total int := 0;
BEGIN
  -- 1. Get profile status of current authenticated user
  SELECT company_id, role, is_active
  INTO v_company_id, v_role, v_is_active
  FROM public.profiles
  WHERE id = auth.uid();

  -- 2. Security validation: user must be active, have a company and have admin/secretaria role
  IF v_company_id IS NULL OR v_is_active IS NOT TRUE OR v_role NOT IN ('admin', 'secretaria') THEN
    RETURN jsonb_build_object(
      'generated_at', now(),
      'role', v_role,
      'company_id', v_company_id,
      'summary', null
    );
  END IF;

  -- 3. Calculate metrics efficiently
  
  -- A) Members counts
  SELECT 
    COUNT(*), 
    COUNT(CASE WHEN status = 'activo' THEN 1 END)
  INTO v_members_total, v_members_active
  FROM public.members
  WHERE company_id = v_company_id;

  -- B) Vehicles counts
  SELECT 
    COUNT(*), 
    COUNT(CASE WHEN status = 'activa' THEN 1 END)
  INTO v_vehicles_total, v_vehicles_active
  FROM public.vehicles
  WHERE company_id = v_company_id;

  -- C) Drivers count
  SELECT COUNT(*) INTO v_drivers_total
  FROM public.drivers
  WHERE company_id = v_company_id AND status = 'activo';

  -- D) Documents counts
  SELECT 
    COUNT(CASE WHEN expiry_date < CURRENT_DATE THEN 1 END),
    COUNT(CASE WHEN expiry_date >= CURRENT_DATE AND (expiry_date - CURRENT_DATE) <= 30 THEN 1 END)
  INTO v_documents_expired, v_documents_expiring_soon
  FROM public.documents
  WHERE company_id = v_company_id AND expiry_date IS NOT NULL;

  -- E) Licenses counts
  SELECT 
    COUNT(CASE WHEN expiry_date < CURRENT_DATE THEN 1 END),
    COUNT(CASE WHEN expiry_date >= CURRENT_DATE AND (expiry_date - CURRENT_DATE) <= 30 THEN 1 END)
  INTO v_licenses_expired, v_licenses_expiring_soon
  FROM public.licenses
  WHERE company_id = v_company_id AND expiry_date IS NOT NULL;

  -- F) Charges and Balance pending/overdue
  SELECT 
    COUNT(CASE WHEN status = 'pendiente' OR status = 'parcial' THEN 1 END),
    COUNT(CASE WHEN (status = 'pendiente' OR status = 'parcial') AND due_date < CURRENT_DATE THEN 1 END),
    COALESCE(SUM(balance), 0)
  INTO v_charges_pending, v_charges_overdue, v_balance_pending
  FROM public.charges
  WHERE company_id = v_company_id AND status <> 'anulada';

  -- G) Sanctions counts (pending sanctions)
  SELECT COUNT(*) INTO v_sanctions_total
  FROM public.sanctions
  WHERE company_id = v_company_id AND status = 'pendiente';

  -- H) Meetings count (programmed meetings)
  SELECT COUNT(*) INTO v_meetings_total
  FROM public.meetings
  WHERE company_id = v_company_id AND status = 'programada';

  -- 4. Build JSON response
  v_result := jsonb_build_object(
    'generated_at', now(),
    'role', v_role,
    'company_id', v_company_id,
    'summary', jsonb_build_object(
      'members_total', v_members_total,
      'members_active', v_members_active,
      'vehicles_total', v_vehicles_total,
      'vehicles_active', v_vehicles_active,
      'drivers_total', v_drivers_total,
      'documents_expired', v_documents_expired,
      'documents_expiring_soon', v_documents_expiring_soon,
      'licenses_expired', v_licenses_expired,
      'licenses_expiring_soon', v_licenses_expiring_soon,
      'charges_pending', v_charges_pending,
      'charges_overdue', v_charges_overdue,
      'balance_pending', v_balance_pending,
      'sanctions_total', v_sanctions_total,
      'meetings_total', v_meetings_total
    )
  );

  RETURN v_result;
END;
$$;

-- 3. Revoke public execution permissions and grant to authenticated
REVOKE ALL ON FUNCTION public.get_company_reports_summary() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_company_reports_summary() TO authenticated;
