-- 1. Agregar tipo de reunión a la tabla meetings (por defecto 'ordinaria')
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS meeting_type varchar(50) NOT NULL DEFAULT 'ordinaria';

-- 2. Agregar check_in_time a meeting_attendances
ALTER TABLE public.meeting_attendances 
ADD COLUMN IF NOT EXISTS check_in_time timestamptz;

-- 3. Extender el enum de estados de asistencia para soportar 'tarde'
-- NOTA: PostgreSQL no permite ejecutar ALTER TYPE ADD VALUE dentro de un bloque de transacción
-- a menos que sea en transacciones no anidadas o de forma segura. En Supabase db push, 
-- se ejecuta de forma independiente.
ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'tarde';

-- 4. Crear índices únicos para garantizar unicidad e integridad (necesario para upserts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_invites_unique_member
ON public.meeting_invites(meeting_id, member_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_attendances_unique_member
ON public.meeting_attendances(meeting_id, member_id);
