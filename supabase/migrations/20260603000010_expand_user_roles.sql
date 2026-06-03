-- Migración para ampliar el enum user_role con los roles institucionales
-- de MotoGremio según las reglas de negocio.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'gerente';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'presidente';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'secretaria';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tesorero';
