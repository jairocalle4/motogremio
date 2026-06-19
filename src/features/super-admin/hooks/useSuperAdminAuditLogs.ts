import { supabase } from '@/lib/supabaseClient'

export interface AuditLogItem {
  id: string
  company_id: string | null
  company_name: string | null
  user_id: string | null
  user_full_name: string | null
  action: string
  table_name: string
  record_id: string | null
  ip_address: string | null
  created_at: string
  has_old_data: boolean
  has_new_data: boolean
}

export interface AuditLogsPaginatedResponse {
  data: AuditLogItem[]
  total_count: number
  limit: number
  offset: number
}

export interface AuditLogDetail {
  id: string
  company_id: string | null
  company_name: string | null
  user_id: string | null
  user_full_name: string | null
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  ip_address: string | null
  created_at: string
}

export interface AuditFilters {
  actions: string[]
  table_names: string[]
  companies: Array<{ id: string; legal_name: string }>
  users: Array<{ id: string; full_name: string }>
}

export interface AuditLogsFetchFilters {
  companyId?: string | null
  userId?: string | null
  action?: string | null
  tableName?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  limit?: number
  offset?: number
}

export const getAuditLogs = async (filters: AuditLogsFetchFilters): Promise<AuditLogsPaginatedResponse> => {
  const { data, error } = await supabase.rpc('get_super_admin_audit_logs', {
    p_company_id: filters.companyId || undefined,
    p_user_id: filters.userId || undefined,
    p_action: filters.action || undefined,
    p_table_name: filters.tableName || undefined,
    p_date_from: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : undefined,
    p_date_to: filters.dateTo ? new Date(filters.dateTo).toISOString() : undefined,
    p_limit: filters.limit ?? 25,
    p_offset: filters.offset ?? 0,
  })

  if (error) throw error
  return (data as unknown) as AuditLogsPaginatedResponse
}

export const getAuditLogDetail = async (auditLogId: string): Promise<AuditLogDetail> => {
  const { data, error } = await supabase.rpc('get_super_admin_audit_log_detail', {
    p_audit_log_id: auditLogId,
  })

  if (error) throw error
  return (data as unknown) as AuditLogDetail
}

export const getAuditFilters = async (): Promise<AuditFilters> => {
  const { data, error } = await supabase.rpc('get_super_admin_audit_filters')
  if (error) throw error
  return (data as unknown) as AuditFilters
}
