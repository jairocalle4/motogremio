-- ═══════════════════════════════════════════════════════════════════════
-- Fase 3.6: Índice anti-duplicado en charges + Seed de tipo de cobro base
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Índice único parcial para evitar generar dos cuotas del mismo disco
--    en el mismo periodo y tipo de cobro dentro de una compañía.
--    Permite regenerar si la cuota fue anulada.
CREATE UNIQUE INDEX IF NOT EXISTS idx_charges_prevent_duplicate_period
  ON public.charges(company_id, member_id, vehicle_id, charge_type_id, period_month, period_year)
  WHERE status != 'anulada';

-- 2. Función auxiliar para hacer upsert del tipo de cobro "Cuota administrativa"
--    Solo inserta si la compañía no tiene ningún charge_type aún.
--    Esto NO sobreescribe configuraciones existentes.
CREATE OR REPLACE FUNCTION public.seed_default_charge_type_for_company(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.charge_types (company_id, name, description, default_amount, is_recurring)
  VALUES (
    p_company_id,
    'Cuota administrativa mensual',
    'Cuota mensual obligatoria por unidad activa',
    15.00,
    true
  )
  ON CONFLICT (company_id, name) DO NOTHING;
END;
$$;
