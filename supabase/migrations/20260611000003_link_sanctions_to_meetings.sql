-- Migración: Relacionar sanciones con reuniones y asistencias
ALTER TABLE public.sanctions
ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS meeting_attendance_id uuid REFERENCES public.meeting_attendances(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sanctions_unique_meeting_attendance
ON public.sanctions(company_id, member_id, meeting_attendance_id, sanction_type_id)
WHERE status != 'anulada'
AND meeting_attendance_id IS NOT NULL;
