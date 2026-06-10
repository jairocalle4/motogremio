-- Migration: Create vehicle_driver_assignments table and setup policies/backfill
CREATE TABLE public.vehicle_driver_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,

  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz NULL,

  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  unassigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  change_reason text NULL,
  notes text NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Partial unique index: only one active driver assignment per vehicle
CREATE UNIQUE INDEX idx_vehicle_driver_assignments_one_active
ON public.vehicle_driver_assignments(vehicle_id)
WHERE unassigned_at IS NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.vehicle_driver_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies matching standard tenant tables
CREATE POLICY "vehicle_driver_assignments_select" ON public.vehicle_driver_assignments
  FOR SELECT USING (company_id = get_my_company_id() OR is_super_admin());

CREATE POLICY "vehicle_driver_assignments_insert" ON public.vehicle_driver_assignments
  FOR INSERT WITH CHECK ((company_id = get_my_company_id() AND NOT is_super_admin()) OR is_super_admin());

CREATE POLICY "vehicle_driver_assignments_update" ON public.vehicle_driver_assignments
  FOR UPDATE USING (company_id = get_my_company_id() OR is_super_admin());

CREATE POLICY "vehicle_driver_assignments_delete" ON public.vehicle_driver_assignments
  FOR DELETE USING (company_id = get_my_company_id() OR is_super_admin());

-- Backfill from currently assigned drivers in vehicles
INSERT INTO public.vehicle_driver_assignments (
  company_id,
  vehicle_id,
  driver_id,
  assigned_at,
  change_reason
)
SELECT 
  company_id,
  id AS vehicle_id,
  driver_id,
  COALESCE(updated_at, created_at, now()) AS assigned_at,
  'Registro inicial generado desde conductor actualmente asignado' AS change_reason
FROM public.vehicles
WHERE driver_id IS NOT NULL;
