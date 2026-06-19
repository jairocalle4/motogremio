import { supabase } from '@/lib/supabaseClient'

export interface SuperAdminPlan {
  id: string
  name: 'basico' | 'profesional' | 'empresarial'
  description: string | null
  max_members: number
  max_vehicles: number
  price_monthly: number
  features: string[] | Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
  companies_count: number
}

export interface PlanUpdatePreview {
  plan_id: string
  plan_name: string
  current_companies_count: number
  affected_companies_count: number
  affected_companies: Array<{
    company_id: string
    company_name: string
    current_members: number
    new_max_members: number
    exceeds_members: boolean
    current_vehicles: number
    new_max_vehicles: number
    exceeds_vehicles: boolean
  }>
  can_update_without_exceeding: boolean
  warning_message: string
}

export interface CompanyPlanChangePreview {
  company_id: string
  new_plan_id: string
  new_plan_name: string
  new_plan_is_active: boolean
  current_members: number
  current_vehicles: number
  new_max_members: number
  new_max_vehicles: number
  exceeds_members: boolean
  exceeds_vehicles: boolean
  can_change: boolean
  warning_message: string
}

export const getSuperAdminPlans = async (): Promise<SuperAdminPlan[]> => {
  const { data, error } = await supabase.rpc('get_super_admin_plans')
  if (error) throw error
  return (data as unknown) as SuperAdminPlan[]
}

export const createSuperAdminPlan = async (params: {
  name: 'basico' | 'profesional' | 'empresarial'
  description: string
  max_members: number
  max_vehicles: number
  price_monthly: number
  features: string[]
  is_active: boolean
}): Promise<any> => {
  const { data, error } = await supabase.rpc('create_super_admin_plan', {
    p_name: params.name,
    p_description: params.description,
    p_max_members: params.max_members,
    p_max_vehicles: params.max_vehicles,
    p_price_monthly: params.price_monthly,
    p_features: JSON.stringify(params.features) as any, // Cast to any because RPC args expects jsonb
    p_is_active: params.is_active,
  })
  if (error) throw error
  return data
}

export const previewSuperAdminPlanUpdate = async (params: {
  planId: string
  maxMembers: number
  maxVehicles: number
}): Promise<PlanUpdatePreview> => {
  const { data, error } = await supabase.rpc('preview_super_admin_plan_update', {
    p_plan_id: params.planId,
    p_max_members: params.maxMembers,
    p_max_vehicles: params.maxVehicles,
  })
  if (error) throw error
  return (data as unknown) as PlanUpdatePreview
}

export const updateSuperAdminPlan = async (params: {
  planId: string
  description: string
  maxMembers: number
  maxVehicles: number
  priceMonthly: number
  features: string[]
  isActive: boolean
  force?: boolean
}): Promise<any> => {
  const { data, error } = await supabase.rpc('update_super_admin_plan', {
    p_plan_id: params.planId,
    p_description: params.description,
    p_max_members: params.maxMembers,
    p_max_vehicles: params.maxVehicles,
    p_price_monthly: params.priceMonthly,
    p_features: JSON.stringify(params.features) as any,
    p_is_active: params.isActive,
    p_force: params.force ?? false,
  })
  if (error) throw error
  return data
}

export const previewCompanyPlanChange = async (
  companyId: string,
  newPlanId: string
): Promise<CompanyPlanChangePreview> => {
  const { data, error } = await supabase.rpc('preview_company_plan_change', {
    p_company_id: companyId,
    p_new_plan_id: newPlanId,
  })
  if (error) throw error
  return (data as unknown) as CompanyPlanChangePreview
}

export const updateCompanyPlan = async (
  companyId: string,
  newPlanId: string,
  force: boolean = false
): Promise<any> => {
  const { data, error } = await supabase.rpc('update_company_plan', {
    p_company_id: companyId,
    p_new_plan_id: newPlanId,
    p_force: force,
  })
  if (error) throw error
  return data
}
