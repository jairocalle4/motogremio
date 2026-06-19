import { supabase } from '../../../lib/supabaseClient'

export interface CompanyPlanUsage {
  company_id: string
  company_name: string
  plan_id: string | null
  plan_name: string
  plan_is_active: boolean
  max_members: number
  max_vehicles: number
  current_members: number
  current_vehicles: number
  members_usage_percent: number
  vehicles_usage_percent: number
  members_remaining: number
  vehicles_remaining: number
  is_members_limit_reached: boolean
  is_vehicles_limit_reached: boolean
  is_near_members_limit: boolean
  is_near_vehicles_limit: boolean
}

export interface SuperAdminPlanOverview {
  company_id: string
  company_name: string
  plan_name: string
  plan_is_active: boolean
  status: string
  current_members: number
  max_members: number
  current_vehicles: number
  max_vehicles: number
  members_usage_percent: number
  vehicles_usage_percent: number
}

export const getCompanyPlanUsage = async (companyId: string): Promise<CompanyPlanUsage> => {
  const { data, error } = await supabase.rpc('get_company_plan_usage', {
    p_company_id: companyId,
  })

  if (error) {
    throw error
  }

  // Cast through unknown to avoid 'as any', confirming correct structure
  return (data as unknown) as CompanyPlanUsage
}

export const getMyCompanyPlanUsage = async (): Promise<CompanyPlanUsage> => {
  const { data, error } = await supabase.rpc('get_my_company_plan_usage')

  if (error) {
    throw error
  }

  return (data as unknown) as CompanyPlanUsage
}

export const getSuperAdminPlanUsageOverview = async (): Promise<SuperAdminPlanOverview[]> => {
  const { data, error } = await supabase.rpc('get_super_admin_plan_usage_overview')

  if (error) {
    throw error
  }

  return (data as unknown) as SuperAdminPlanOverview[]
}
