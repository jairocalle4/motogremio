// ═══════════════════════════════════════════════════════
// ENUMS / UNION TYPES
// ═══════════════════════════════════════════════════════

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'gerente'
  | 'presidente'
  | 'secretaria'
  | 'tesorero'
  | 'operador'
  | 'socio'

export type CompanyStatus = 'activa' | 'suspendida' | 'inactiva'
export type MemberStatus  = 'activo' | 'inactivo' | 'suspendido'
export type VehicleStatus = 'activa' | 'inactiva' | 'mantenimiento'
export type DriverStatus  = 'activo' | 'inactivo'
export type DocumentStatus  = 'vigente' | 'por_vencer' | 'vencido'
export type PaymentStatus   = 'pagado'  | 'pendiente'  | 'moroso'  | 'anulado'
export type ChargeStatus    = 'pendiente' | 'parcial' | 'pagada' | 'anulada'
export type PaymentMethod   = 'efectivo' | 'transferencia' | 'deposito' | 'cheque' | 'otro'
export type SanctionStatus  = 'pendiente' | 'apelacion' | 'resuelta' | 'anulada'
export type MeetingType     = 'ordinaria' | 'extraordinaria' | 'asamblea' | 'capacitacion' | 'otra'
export type MeetingStatus   = 'programada' | 'en_curso' | 'finalizada' | 'cancelada'
export type AttendanceStatus = 'asistio' | 'ausente' | 'justificado' | 'tarde'
export type PlanName        = 'basico' | 'profesional' | 'empresarial'
export type SubscriptionStatus = 'activa' | 'suspendida' | 'cancelada' | 'vencida'

// ═══════════════════════════════════════════════════════
// PLANES
// ═══════════════════════════════════════════════════════

export interface Plan {
  id: string
  name: PlanName
  description: string
  price: number
  features: Record<string, boolean>
  max_members: number | null
  max_vehicles: number | null
  created_at: string
}

// ═══════════════════════════════════════════════════════
// COMPAÑÍAS
// ═══════════════════════════════════════════════════════

export interface Company {
  id: string
  legal_name: string
  trade_name: string
  ruc: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  manager_name: string | null
  president_name: string | null
  secretary_name: string | null
  treasurer_name: string | null
  institutional_info: string | null
  service_type: string
  custom_service_type: string | null
  plan_id: string | null
  status: CompanyStatus
  primary_color?: string | null
  created_at: string
  updated_at: string
  plan?: Plan
}

// ═══════════════════════════════════════════════════════
// PERFILES Y USUARIOS
// ═══════════════════════════════════════════════════════

export interface Profile {
  id: string
  company_id: string | null
  role: UserRole
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  company?: Company
}

// ═══════════════════════════════════════════════════════
// SOCIOS
// ═══════════════════════════════════════════════════════

export interface Member {
  id: string
  company_id: string
  profile_id: string | null
  document_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  status: MemberStatus
  admission_date: string
  blood_type: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
  licenses?: MemberLicense[]
}

export interface MemberLicense {
  id: string
  member_id: string
  company_id: string
  license_type: string
  license_number: string | null
  issue_date: string | null
  expiry_date: string | null
  file_url: string | null
  created_at: string
}

// ═══════════════════════════════════════════════════════
// UNIDADES / MOTOTAXIS
// ═══════════════════════════════════════════════════════

export interface Vehicle {
  id: string
  company_id: string
  member_id: string            // socio propietario — UNIQUE(company_id, disk_number)
  driver_id: string | null     // conductor externo (tabla drivers) — NULL por ahora
  disk_number: string          // UNIQUE(company_id, disk_number)
  plate: string                // UNIQUE(company_id, plate)
  brand: string | null
  model: string | null
  year: number | null
  color: string | null
  motor_number: string | null
  chassis_number: string | null
  observations: string | null  // campo adicional — migración 14
  vehicle_type: string | null
  custom_vehicle_type: string | null
  status: VehicleStatus
  created_at: string
  updated_at: string
  registration_date?: string | null
  // Relaciones cargadas con JOIN
  member?: {
    id: string
    first_name: string
    last_name: string
    document_id: string
    phone?: string | null
    email?: string | null
    status?: string | null
  } | null
  driver?: Pick<Driver, 'id' | 'first_name' | 'last_name' | 'document_id' | 'status'> | null
}

export interface VehicleDriverAssignment {
  id: string
  company_id: string
  vehicle_id: string
  driver_id: string | null
  assigned_at: string
  unassigned_at: string | null
  assigned_by: string | null
  unassigned_by: string | null
  change_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joins
  driver?: Pick<Driver, 'id' | 'first_name' | 'last_name' | 'document_id'> | null
  assigned_by_profile?: {
    id: string
    first_name: string
    last_name: string
  } | null
  unassigned_by_profile?: {
    id: string
    first_name: string
    last_name: string
  } | null
}

// ═══════════════════════════════════════════════════════
// CONDUCTORES
// ═══════════════════════════════════════════════════════

export interface Driver {
  id: string
  company_id: string
  member_id: string | null        // nullable → conductor externo si es NULL
  document_id: string             // UNIQUE(company_id, document_id)
  first_name: string
  last_name: string
  phone: string | null
  address: string | null
  status: DriverStatus
  notes: string | null            // migración 15
  created_at: string
  updated_at: string
  admission_date?: string | null
  // Relaciones cargadas con JOIN
  member?: Pick<Member, 'id' | 'first_name' | 'last_name' | 'document_id'> | null
  licenses?: DriverLicense[]
  vehicles?: Pick<Vehicle, 'id' | 'disk_number' | 'plate' | 'status'>[]  
}

export interface DriverLicense {
  id: string
  driver_id: string
  company_id: string
  license_type: string            // default 'A1'
  license_number: string
  issue_date: string | null
  expiry_date: string
  status: DocumentStatus          // vigente | por_vencer | vencido
  file_url: string | null
  created_at: string
  updated_at: string
}

// ═══════════════════════════════════════════════════════
// DOCUMENTOS
// ═══════════════════════════════════════════════════════

export interface DocumentType {
  id: string
  name: string
  applies_to: 'company' | 'member' | 'vehicle'
  created_at: string
}

export interface Document {
  id: string
  company_id: string
  document_type_id: string | null
  entity_type: 'company' | 'member' | 'vehicle'
  entity_id: string
  title: string
  file_url: string | null
  issue_date: string | null
  expiry_date: string | null
  status: DocumentStatus
  created_by: string | null
  created_at: string
  updated_at: string
  document_type?: DocumentType
}

// ═══════════════════════════════════════════════════════
// PAGOS — Tipos financieros (Fase 3.6)
// ═══════════════════════════════════════════════════════

/** Tipo de cobro configurable por compañía (ej: Cuota administrativa mensual) */
export interface ChargeType {
  id: string
  company_id: string
  name: string
  description: string | null
  default_amount: number | null
  is_recurring: boolean
  created_at: string
  updated_at: string
}

/** Cuota / deuda generada para un socio (opcionalmente vinculada a una unidad) */
export interface Charge {
  id: string
  company_id: string
  member_id: string
  vehicle_id: string | null
  charge_type_id: string
  description: string
  amount: number
  balance: number
  due_date: string
  status: ChargeStatus
  period_month: number | null
  period_year: number | null
  created_at: string
  updated_at: string
  // Joins
  member?: Pick<Member, 'id' | 'first_name' | 'last_name' | 'document_id'>
  vehicle?: Pick<Vehicle, 'id' | 'disk_number' | 'plate'> | null
  charge_type?: Pick<ChargeType, 'id' | 'name'>
}

/** Registro de transacción de pago */
export interface Payment {
  id: string
  company_id: string
  member_id: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  reference_number: string | null
  receipt_url: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joins
  member?: Pick<Member, 'id' | 'first_name' | 'last_name' | 'document_id'>
  allocations?: PaymentAllocation[]
}

/** Distribución de un pago a una o más cuotas */
export interface PaymentAllocation {
  id: string
  payment_id: string
  charge_id: string
  amount_allocated: number
  created_at: string
  charge?: Pick<Charge, 'id' | 'description' | 'period_month' | 'period_year' | 'amount'>
}

/** KPIs financieros del módulo */
export interface DebtorSummary {
  member_id: string
  first_name: string
  last_name: string
  document_id: string
  totalBalance: number
  chargesCount: number
}

export interface PaymentKpis {
  totalPendingBalance: number
  collectedThisMonth: number
  delinquentMembersCount: number
  overdueChargesCount: number
  topDebtors: DebtorSummary[]
}

// ═══════════════════════════════════════════════════════
// SANCIONES
// ═══════════════════════════════════════════════════════

export interface SanctionType {
  id: string
  company_id: string
  name: string
  description: string | null
  default_fine_amount: number | null
  created_at: string
  updated_at: string
}

export interface Sanction {
  id: string
  company_id: string
  member_id: string
  vehicle_id: string | null
  sanction_type_id: string
  charge_id: string | null
  date: string
  reason: string
  severity: string | null
  status: SanctionStatus
  resolution_notes: string | null
  created_at: string
  updated_at: string
  meeting_id: string | null
  meeting_attendance_id: string | null
  member?: Pick<Member, 'id' | 'first_name' | 'last_name' | 'document_id'>
  vehicle?: Pick<Vehicle, 'id' | 'disk_number' | 'plate'> | null
  sanction_type?: Pick<SanctionType, 'id' | 'name' | 'default_fine_amount'>
  charge?: Pick<Charge, 'id' | 'amount' | 'balance' | 'status'> | null
}

// ═══════════════════════════════════════════════════════
// REUNIONES
// ═══════════════════════════════════════════════════════

export interface Meeting {
  id: string
  company_id: string
  title: string
  description: string | null
  meeting_type: MeetingType
  date: string
  time: string
  location: string | null
  is_mandatory: boolean | null
  fine_amount: number | null
  acta_url: string | null
  communications_sent_at: string | null
  status: MeetingStatus
  created_at: string
  updated_at: string
  invites?: MeetingInvite[]
  attendance?: MeetingAttendance[]
}

export interface MeetingInvite {
  id: string
  meeting_id: string
  member_id: string
  company_id: string
  invitation_status: string | null
  email_status: string | null
  email_sent_at: string | null
  whatsapp_status: string | null
  whatsapp_sent_at: string | null
  created_at: string
  member?: Member
}

export interface MeetingAttendance {
  id: string
  meeting_id: string
  member_id: string
  status: AttendanceStatus | null
  notes: string | null
  check_in_time: string | null
  created_at: string
  updated_at: string | null
  member?: Member
}

// ═══════════════════════════════════════════════════════
// SUSCRIPCIONES
// ═══════════════════════════════════════════════════════

export interface Subscription {
  id: string
  company_id: string
  plan_id: string
  start_date: string
  next_renewal: string
  status: SubscriptionStatus
  created_at: string
  company?: Company
  plan?: Plan
}

// ═══════════════════════════════════════════════════════
// AUDITORÍA
// ═══════════════════════════════════════════════════════

export interface AuditLog {
  id: string
  company_id: string | null
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// ═══════════════════════════════════════════════════════
// HELPERS DE UI
// ═══════════════════════════════════════════════════════

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface TableColumn<T> {
  key: keyof T | string
  label: string
  render?: (value: unknown, row: T) => React.ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
}
