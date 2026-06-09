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
export type SanctionStatus  = 'pendiente' | 'aplicada' | 'anulada' | 'cumplida'
export type MeetingType     = 'ordinaria' | 'extraordinaria' | 'urgente'
export type MeetingStatus   = 'programada' | 'realizada' | 'cancelada'
export type AttendanceStatus = 'asistio' | 'ausente' | 'justificado'
export type PlanName        = 'basico' | 'estandar' | 'premium'
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
  canton: string | null
  province: string | null
  phone: string | null
  email: string | null
  legal_rep: string | null
  manager_name: string | null
  president_name: string | null
  secretary_name: string | null
  treasurer_name: string | null
  institutional_info: string | null
  operation_permit: string | null
  max_vehicles: number | null
  plan_id: string | null
  status: CompanyStatus
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
  status: VehicleStatus
  created_at: string
  updated_at: string
  // Relaciones cargadas con JOIN
  member?: Pick<Member, 'id' | 'first_name' | 'last_name' | 'document_id' | 'phone' | 'email' | 'status'> | null
  driver?: Pick<Driver, 'id' | 'first_name' | 'last_name' | 'document_id' | 'status'> | null
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
// PAGOS
// ═══════════════════════════════════════════════════════

export interface PaymentType {
  id: string
  company_id: string
  name: string
  amount_default: number | null
  is_recurring: boolean
  created_at: string
}

export interface Payment {
  id: string
  company_id: string
  member_id: string
  payment_type_id: string | null
  concept: string
  amount: number
  payment_date: string | null
  due_date: string | null
  status: PaymentStatus
  receipt_url: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  member?: Member
  payment_type?: PaymentType
}

// ═══════════════════════════════════════════════════════
// SANCIONES
// ═══════════════════════════════════════════════════════

export interface SanctionType {
  id: string
  company_id: string
  name: string
  description: string | null
  created_at: string
}

export interface Sanction {
  id: string
  company_id: string
  member_id: string
  sanction_type_id: string | null
  reason: string
  date: string
  observations: string | null
  evidence_url: string | null
  generates_fine: boolean
  fine_amount: number | null
  status: SanctionStatus
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  member?: Member
  sanction_type?: SanctionType
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
  documents_url: string | null
  status: MeetingStatus
  created_by: string | null
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
  notified_email: boolean
  notified_whatsapp: boolean
  created_at: string
  member?: Member
}

export interface MeetingAttendance {
  id: string
  meeting_id: string
  member_id: string
  company_id: string
  status: AttendanceStatus
  justification: string | null
  registered_by: string | null
  created_at: string
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
