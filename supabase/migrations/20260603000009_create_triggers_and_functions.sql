-- 1. Prevent Normal Users from Escalating Roles or Changing Company
CREATE OR REPLACE FUNCTION protect_profile_escalation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Seguridad: No tienes permiso para cambiar de compañía';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Seguridad: No tienes permiso para cambiar tu rol';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_escalation_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION protect_profile_escalation();

-- 2. Auto Create Profile from Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'socio'::user_role)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Sync Payment Allocations with Charge Balance
CREATE OR REPLACE FUNCTION update_charge_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_charge_amount numeric;
  v_total_allocated numeric;
BEGIN
  SELECT COALESCE(SUM(amount_allocated), 0) INTO v_total_allocated
  FROM payment_allocations WHERE charge_id = COALESCE(NEW.charge_id, OLD.charge_id);
  
  SELECT amount INTO v_charge_amount
  FROM charges WHERE id = COALESCE(NEW.charge_id, OLD.charge_id);
  
  UPDATE charges
  SET balance = v_charge_amount - v_total_allocated,
      status = CASE 
        WHEN (v_charge_amount - v_total_allocated) <= 0 THEN 'pagada'::charge_status
        WHEN v_total_allocated > 0 THEN 'parcial'::charge_status
        ELSE 'pendiente'::charge_status
      END
  WHERE id = COALESCE(NEW.charge_id, OLD.charge_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_charge_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
FOR EACH ROW EXECUTE FUNCTION update_charge_balance();
