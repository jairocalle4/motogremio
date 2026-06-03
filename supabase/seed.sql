-- Datos demo base seguros (Idempotentes)
-- No contiene información real, contraseñas ni perfiles vinculados a Supabase Auth.

-- 1. Planes Demo (Idempotente vía NOT EXISTS)
INSERT INTO plans (name, max_members, max_vehicles, price_monthly) 
SELECT 'basico', 50, 50, 29.99
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'basico');

INSERT INTO plans (name, max_members, max_vehicles, price_monthly) 
SELECT 'profesional', 150, 150, 59.99
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'profesional');

-- 2. Compañías Demo
-- RUC debe ser único.
INSERT INTO companies (legal_name, trade_name, ruc, plan_id) 
VALUES 
  ('Compañía Alfa Demo S.A.', 'Alfa Demo', '0990000000001', (SELECT id FROM plans WHERE name='profesional' LIMIT 1)),
  ('Compañía Beta Demo S.A.', 'Beta Demo', '0990000000002', (SELECT id FROM plans WHERE name='basico' LIMIT 1))
ON CONFLICT (ruc) DO UPDATE 
SET legal_name = EXCLUDED.legal_name,
    trade_name = EXCLUDED.trade_name,
    plan_id = EXCLUDED.plan_id;
