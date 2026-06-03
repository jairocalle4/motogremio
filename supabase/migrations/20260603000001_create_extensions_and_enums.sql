-- Extension uuid-ossp is no longer required as gen_random_uuid() is native

CREATE TYPE plan_name AS ENUM ('basico', 'profesional', 'empresarial');
CREATE TYPE subscription_status AS ENUM ('activa', 'vencida', 'cancelada');
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'operador', 'socio');
CREATE TYPE member_status AS ENUM ('activo', 'inactivo', 'suspendido');
CREATE TYPE driver_status AS ENUM ('activo', 'inactivo');
CREATE TYPE vehicle_status AS ENUM ('activa', 'inactiva', 'mantenimiento');
CREATE TYPE document_status AS ENUM ('vigente', 'por_vencer', 'vencido');
CREATE TYPE charge_status AS ENUM ('pendiente', 'parcial', 'pagada', 'anulada');
CREATE TYPE payment_method AS ENUM ('efectivo', 'transferencia', 'deposito', 'cheque', 'otro');
CREATE TYPE sanction_status AS ENUM ('pendiente', 'apelacion', 'resuelta', 'anulada');
CREATE TYPE meeting_status AS ENUM ('programada', 'en_curso', 'finalizada', 'cancelada');
CREATE TYPE attendance_status AS ENUM ('asistio', 'ausente', 'justificado');
CREATE TYPE notification_type AS ENUM ('alerta', 'recordatorio', 'sistema', 'convocatoria');
CREATE TYPE communication_status AS ENUM ('pendiente', 'preparado', 'enviado', 'fallido');
