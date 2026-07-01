-- =====================================================================
-- SCRIPT DE INICIALIZACIÓN DE DATOS DEMO DE COBROS SAAS EN DESARROLLO (DEV)
-- =====================================================================

-- 1. Limpieza de datos previos de facturación SaaS para las compañías demo
DELETE FROM saas_payments 
WHERE company_id IN (
  '00000000-0000-4000-8000-000000000049', -- El Dorado
  '074bb7ba-afaa-4ae0-a979-724f0472d6b9', -- Triton
  '057c8494-3bda-4bb2-80e4-203eed0854ec'  -- Bravo Peralta
);

DELETE FROM saas_invoices 
WHERE company_id IN (
  '00000000-0000-4000-8000-000000000049', 
  '074bb7ba-afaa-4ae0-a979-724f0472d6b9', 
  '057c8494-3bda-4bb2-80e4-203eed0854ec'
);

DELETE FROM company_subscriptions 
WHERE company_id IN (
  '00000000-0000-4000-8000-000000000049', 
  '074bb7ba-afaa-4ae0-a979-724f0472d6b9', 
  '057c8494-3bda-4bb2-80e4-203eed0854ec'
);

-- Variable Auxiliar para el usuario Super Admin
-- User ID del super_admin existente en DEV: '4ffcafab-b679-414d-add2-36f95218e549'

-- =====================================================================
-- 2. COMPAÑÍA 1: Cooperativa El Dorado (Activa y Pagada)
-- =====================================================================
INSERT INTO company_subscriptions (
  id, company_id, plan_id, billing_cycle, price_amount, status, starts_at, current_period_start, current_period_end, next_due_date
) VALUES (
  'e0000000-0000-0000-0000-000000000001',
  '00000000-0000-4000-8000-000000000049',
  '52b99d8d-e884-41ed-8f98-113a063654b2', -- Plan empresarial ($99.99)
  'monthly',
  99.99,
  'active',
  '2026-06-01',
  '2026-06-01',
  '2026-07-01',
  '2026-07-01'
);

INSERT INTO saas_invoices (
  id, invoice_number, company_id, subscription_id, plan_id, period_start, period_end, due_date, amount, amount_paid, balance, status, paid_at, created_by
) VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'SaaS-2026-000001',
  '00000000-0000-4000-8000-000000000049',
  'e0000000-0000-0000-0000-000000000001',
  '52b99d8d-e884-41ed-8f98-113a063654b2',
  '2026-06-01',
  '2026-07-01',
  '2026-06-15',
  99.99,
  99.99,
  0.00,
  'paid',
  '2026-06-12 10:00:00+00',
  '4ffcafab-b679-414d-add2-36f95218e549'
);

INSERT INTO saas_payments (
  invoice_id, company_id, amount, payment_method, reference, receipt_url, paid_at, confirmed_by, notes
) VALUES (
  'f0000000-0000-0000-0000-000000000001',
  '00000000-0000-4000-8000-000000000049',
  99.99,
  'transfer',
  'DEP-99881122',
  NULL,
  '2026-06-12 10:00:00+00',
  '4ffcafab-b679-414d-add2-36f95218e549',
  'Transferencia Banco Pichincha verificada'
);

UPDATE companies 
SET plan_id = '52b99d8d-e884-41ed-8f98-113a063654b2', status = 'activa' 
WHERE id = '00000000-0000-4000-8000-000000000049';

-- =====================================================================
-- 3. COMPAÑÍA 2: Cooperativa Triton (Activa y Factura Pendiente)
-- =====================================================================
INSERT INTO company_subscriptions (
  id, company_id, plan_id, billing_cycle, price_amount, status, starts_at, current_period_start, current_period_end, next_due_date
) VALUES (
  'e0000000-0000-0000-0000-000000000002',
  '074bb7ba-afaa-4ae0-a979-724f0472d6b9',
  '4cb75323-5762-4267-a48d-8765dc113740', -- Plan basico ($29.99)
  'monthly',
  29.99,
  'active',
  '2026-06-15',
  '2026-06-15',
  '2026-07-15',
  '2026-07-15'
);

INSERT INTO saas_invoices (
  id, invoice_number, company_id, subscription_id, plan_id, period_start, period_end, due_date, amount, amount_paid, balance, status, created_by
) VALUES (
  'f0000000-0000-0000-0000-000000000002',
  'SaaS-2026-000002',
  '074bb7ba-afaa-4ae0-a979-724f0472d6b9',
  'e0000000-0000-0000-0000-000000000002',
  '4cb75323-5762-4267-a48d-8765dc113740',
  '2026-06-15',
  '2026-07-15',
  '2026-07-15',
  29.99,
  0.00,
  29.99,
  'pending',
  '4ffcafab-b679-414d-add2-36f95218e549'
);

UPDATE companies 
SET plan_id = '4cb75323-5762-4267-a48d-8765dc113740', status = 'activa' 
WHERE id = '074bb7ba-afaa-4ae0-a979-724f0472d6b9';

-- =====================================================================
-- 4. COMPAÑÍA 3: Cooperativa Bravo Peralta (Suspendida por Factura Vencida)
-- =====================================================================
INSERT INTO company_subscriptions (
  id, company_id, plan_id, billing_cycle, price_amount, status, starts_at, current_period_start, current_period_end, next_due_date, suspended_at
) VALUES (
  'e0000000-0000-0000-0000-000000000003',
  '057c8494-3bda-4bb2-80e4-203eed0854ec',
  '1226b82d-0483-4e73-a0d9-d03cf3492ad5', -- Plan profesional ($59.99)
  'monthly',
  59.99,
  'suspended',
  '2026-05-01',
  '2026-05-01',
  '2026-06-01',
  '2026-06-01',
  '2026-06-05 14:00:00+00'
);

-- Factura vencida (due_date en el pasado, balance > 0)
INSERT INTO saas_invoices (
  id, invoice_number, company_id, subscription_id, plan_id, period_start, period_end, due_date, amount, amount_paid, balance, status, created_by
) VALUES (
  'f0000000-0000-0000-0000-000000000003',
  'SaaS-2026-000003',
  '057c8494-3bda-4bb2-80e4-203eed0854ec',
  'e0000000-0000-0000-0000-000000000003',
  '1226b82d-0483-4e73-a0d9-d03cf3492ad5',
  '2026-05-01',
  '2026-06-01',
  '2026-06-01',
  59.99,
  0.00,
  59.99,
  'overdue',
  '4ffcafab-b679-414d-add2-36f95218e549'
);

-- Bloqueo de acceso en companies.status
UPDATE companies 
SET plan_id = '1226b82d-0483-4e73-a0d9-d03cf3492ad5', status = 'inactiva' 
WHERE id = '057c8494-3bda-4bb2-80e4-203eed0854ec';
