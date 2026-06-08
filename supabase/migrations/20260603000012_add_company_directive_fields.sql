-- Añadir campos institucionales a la tabla companies

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS manager_name text,
ADD COLUMN IF NOT EXISTS president_name text,
ADD COLUMN IF NOT EXISTS secretary_name text,
ADD COLUMN IF NOT EXISTS treasurer_name text,
ADD COLUMN IF NOT EXISTS institutional_info text;
