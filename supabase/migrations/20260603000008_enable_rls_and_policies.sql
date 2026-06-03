-- 1. Helper function for Company Isolation (Security Definer avoids infinite recursion)
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

-- 2. Helper function to check super admin role
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- 3. Enable RLS on ALL tables
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Global Data (Plans)
CREATE POLICY "Planes publicos" ON plans FOR SELECT USING (true);
CREATE POLICY "Planes admin" ON plans FOR ALL USING (is_super_admin());

-- 5. Companies Isolation
CREATE POLICY "Cmp_Select" ON companies FOR SELECT USING (id = get_my_company_id() OR is_super_admin());
CREATE POLICY "Cmp_All_Superadmin" ON companies FOR ALL USING (is_super_admin());

-- 6. Profiles
CREATE POLICY "Prof_Select" ON profiles FOR SELECT USING (company_id = get_my_company_id() OR id = auth.uid() OR is_super_admin());
CREATE POLICY "Prof_Update_Self" ON profiles FOR UPDATE USING (id = auth.uid() OR is_super_admin());

-- 7. Macro to generate strictly isolated CRUD policies for tenant tables
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'subscriptions', 'company_settings', 'members', 'drivers', 'licenses', 'vehicles', 
    'document_types', 'documents', 'charge_types', 'charges', 'payments', 
    'sanction_types', 'sanctions', 'meetings', 'meeting_invites', 'notifications', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables
  LOOP
    EXECUTE format('
      CREATE POLICY "%1$s_select" ON %1$s FOR SELECT USING (company_id = get_my_company_id() OR is_super_admin());
      CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT WITH CHECK ((company_id = get_my_company_id() AND NOT is_super_admin()) OR is_super_admin());
      CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE USING (company_id = get_my_company_id() OR is_super_admin());
      CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE USING (company_id = get_my_company_id() OR is_super_admin());
    ', t);
  END LOOP;
END $$;

-- 8. Custom policies for payment_allocations (via payments.company_id)
CREATE POLICY "pay_alloc_select" ON payment_allocations FOR SELECT USING (
  EXISTS (SELECT 1 FROM payments WHERE id = payment_allocations.payment_id AND (company_id = get_my_company_id() OR is_super_admin()))
);
CREATE POLICY "pay_alloc_insert" ON payment_allocations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM payments WHERE id = payment_allocations.payment_id AND ((company_id = get_my_company_id() AND NOT is_super_admin()) OR is_super_admin()))
);
CREATE POLICY "pay_alloc_update" ON payment_allocations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM payments WHERE id = payment_allocations.payment_id AND (company_id = get_my_company_id() OR is_super_admin()))
);
CREATE POLICY "pay_alloc_delete" ON payment_allocations FOR DELETE USING (
  EXISTS (SELECT 1 FROM payments WHERE id = payment_allocations.payment_id AND (company_id = get_my_company_id() OR is_super_admin()))
);
-- 9. Custom policies for meeting_attendances (via meetings.company_id)
CREATE POLICY "meet_att_select" ON meeting_attendances FOR SELECT USING (
  EXISTS (SELECT 1 FROM meetings WHERE id = meeting_attendances.meeting_id AND (company_id = get_my_company_id() OR is_super_admin()))
);
CREATE POLICY "meet_att_insert" ON meeting_attendances FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM meetings WHERE id = meeting_attendances.meeting_id AND ((company_id = get_my_company_id() AND NOT is_super_admin()) OR is_super_admin()))
);
CREATE POLICY "meet_att_update" ON meeting_attendances FOR UPDATE USING (
  EXISTS (SELECT 1 FROM meetings WHERE id = meeting_attendances.meeting_id AND (company_id = get_my_company_id() OR is_super_admin()))
);
CREATE POLICY "meet_att_delete" ON meeting_attendances FOR DELETE USING (
  EXISTS (SELECT 1 FROM meetings WHERE id = meeting_attendances.meeting_id AND (company_id = get_my_company_id() OR is_super_admin()))
);
