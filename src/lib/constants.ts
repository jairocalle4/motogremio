import type { UserRole, MemberStatus, VehicleStatus, DriverStatus, DocumentStatus, PaymentStatus, SanctionStatus, MeetingType, MeetingStatus, AttendanceStatus, PlanName } from '@/types'

// ─── Aplicación ───────────────────────────────────────
export const APP_NAME = 'MotoGremio'
export const APP_SLOGAN = 'Gestión inteligente para compañías de transporte'
export const APP_VERSION = '0.1.0'

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin:       'Administrador',
  gerente:     'Rol heredado: Gerente',
  presidente:  'Rol heredado: Presidente',
  secretaria:  'Secretario/a',
  tesorero:    'Rol heredado: Tesorero',
  operador:    'Rol heredado: Operador',
  socio:       'Socio / Consulta',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  admin:       'bg-primary-100 text-primary-800',
  gerente:     'bg-gray-100 text-gray-800',
  presidente:  'bg-gray-100 text-gray-800',
  secretaria:  'bg-teal-100 text-teal-800',
  tesorero:    'bg-gray-100 text-gray-800',
  operador:    'bg-gray-100 text-gray-800',
  socio:       'bg-gray-100 text-gray-700',
}

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  activo:     'Activo',
  inactivo:   'Inactivo',
  suspendido: 'Suspendido',
}

export const MEMBER_STATUS_COLORS: Record<MemberStatus, string> = {
  activo:     'bg-success-50 text-success-700 border-success-200',
  inactivo:   'bg-gray-100 text-gray-600 border-gray-200',
  suspendido: 'bg-warning-50 text-warning-700 border-warning-200',
}

// ─── Estados de unidad ────────────────────────────────
export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  activa:        'Activa',
  inactiva:      'Inactiva',
  mantenimiento: 'En mantenimiento',
}

export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  activa:        'bg-success-50 text-success-700 border-success-200',
  inactiva:      'bg-gray-100 text-gray-600 border-gray-200',
  mantenimiento: 'bg-amber-50 text-amber-700 border-amber-200',
}

// ─── Estados de conductor ─────────────────────────────
export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  activo:   'Activo',
  inactivo: 'Inactivo',
}

export const DRIVER_STATUS_COLORS: Record<DriverStatus, string> = {
  activo:   'bg-success-50 text-success-700 border-success-200',
  inactivo: 'bg-gray-100 text-gray-600 border-gray-200',
}

// ─── Estados de documento ─────────────────────────────
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  vigente:   'Vigente',
  por_vencer: 'Por vencer',
  vencido:   'Vencido',
}

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  vigente:   'bg-success-50 text-success-700 border-success-200',
  por_vencer: 'bg-warning-50 text-warning-700 border-warning-200',
  vencido:   'bg-danger-50 text-danger-700 border-danger-200',
}

// ─── Estados de pago ──────────────────────────────────
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pagado:   'Pagado',
  pendiente: 'Pendiente',
  moroso:   'Moroso',
  anulado:  'Anulado',
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pagado:   'bg-success-50 text-success-700 border-success-200',
  pendiente: 'bg-warning-50 text-warning-700 border-warning-200',
  moroso:   'bg-danger-50 text-danger-700 border-danger-200',
  anulado:  'bg-gray-100 text-gray-500 border-gray-200',
}

// ─── Estados de sanción ───────────────────────────────
export const SANCTION_STATUS_LABELS: Record<SanctionStatus, string> = {
  pendiente: 'Pendiente',
  apelacion: 'Apelación',
  resuelta:  'Resuelta',
  anulada:   'Anulada',
}

// ─── Tipos de reunión ─────────────────────────────────
export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  ordinaria:      'Ordinaria',
  extraordinaria: 'Extraordinaria',
  asamblea:       'Asamblea General',
  capacitacion:   'Capacitación',
  otra:           'Otra',
}

export const MEETING_TYPE_COLORS: Record<MeetingType, string> = {
  ordinaria:      'bg-blue-100 text-blue-800',
  extraordinaria: 'bg-amber-100 text-amber-800',
  asamblea:       'bg-purple-100 text-purple-800',
  capacitacion:   'bg-teal-100 text-teal-800',
  otra:           'bg-gray-100 text-gray-800',
}

// ─── Estados de reunión ───────────────────────────────
export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  programada: 'Programada',
  en_curso:   'En curso',
  finalizada: 'Finalizada',
  cancelada:  'Cancelada',
}

export const MEETING_STATUS_COLORS: Record<MeetingStatus, string> = {
  programada: 'bg-primary-50 text-primary-700 border-primary-200',
  en_curso:   'bg-blue-50 text-blue-700 border-blue-200',
  finalizada: 'bg-success-50 text-success-700 border-success-200',
  cancelada:  'bg-danger-50 text-danger-700 border-danger-200',
}

// ─── Estados de asistencia ────────────────────────────
export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  asistio:     'Asistió',
  ausente:     'Faltó',
  tarde:       'Llegó Tarde',
  justificado: 'Justificado',
}

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'info'> = {
  asistio:     'success',
  ausente:     'danger',
  tarde:       'warning',
  justificado: 'info',
}

// ─── Planes ───────────────────────────────────────────
export const PLAN_LABELS: Record<PlanName, string> = {
  basico:       'Básico',
  profesional:  'Profesional',
  empresarial:  'Empresarial',
}

export const PLAN_COLORS: Record<PlanName, string> = {
  basico:      'bg-gray-100 text-gray-700',
  profesional: 'bg-primary-100 text-primary-800',
  empresarial: 'bg-purple-100 text-purple-800',
}

// ─── Paginación ───────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20

// ─── Alertas de vencimiento ───────────────────────────
export const EXPIRY_WARNING_DAYS = 30  // días antes del vencimiento para mostrar alerta
