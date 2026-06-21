import { supabase } from '@/lib/supabaseClient'

export interface CompanyBranding {
  id: string | null
  company_id: string
  commercial_name: string | null
  slogan: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  contact_phone: string | null
  contact_email: string | null
  public_address: string | null
  report_header_text: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CompanyBrandingPayload {
  commercial_name: string | null
  slogan: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  contact_phone: string | null
  contact_email: string | null
  public_address: string | null
  report_header_text: string | null
}

export const getMyCompanyBranding = async (): Promise<CompanyBranding> => {
  const { data, error } = await supabase.rpc('get_my_company_branding')
  if (error) throw error
  return (data as unknown) as CompanyBranding
}

export const updateMyCompanyBranding = async (
  payload: CompanyBrandingPayload
): Promise<CompanyBranding> => {
  const { data, error } = await supabase.rpc('update_my_company_branding', {
    p_commercial_name: payload.commercial_name ?? undefined,
    p_slogan: payload.slogan ?? undefined,
    p_logo_url: payload.logo_url ?? undefined,
    p_primary_color: payload.primary_color ?? undefined,
    p_secondary_color: payload.secondary_color ?? undefined,
    p_contact_phone: payload.contact_phone ?? undefined,
    p_contact_email: payload.contact_email ?? undefined,
    p_public_address: payload.public_address ?? undefined,
    p_report_header_text: payload.report_header_text ?? undefined,
  })

  if (error) throw error
  return (data as unknown) as CompanyBranding
}

export const getSuperAdminCompanyBranding = async (
  companyId: string
): Promise<CompanyBranding> => {
  const { data, error } = await supabase.rpc('get_super_admin_company_branding', {
    p_company_id: companyId,
  })
  if (error) throw error
  return (data as unknown) as CompanyBranding
}

export const updateSuperAdminCompanyBranding = async (
  companyId: string,
  payload: CompanyBrandingPayload
): Promise<CompanyBranding> => {
  const { data, error } = await supabase.rpc('update_super_admin_company_branding', {
    p_company_id: companyId,
    p_commercial_name: payload.commercial_name ?? undefined,
    p_slogan: payload.slogan ?? undefined,
    p_logo_url: payload.logo_url ?? undefined,
    p_primary_color: payload.primary_color ?? undefined,
    p_secondary_color: payload.secondary_color ?? undefined,
    p_contact_phone: payload.contact_phone ?? undefined,
    p_contact_email: payload.contact_email ?? undefined,
    p_public_address: payload.public_address ?? undefined,
    p_report_header_text: payload.report_header_text ?? undefined,
  })

  if (error) throw error
  return (data as unknown) as CompanyBranding
}
