import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import type { Company } from '@/types'
import type { Database } from '@/types/database.types'

export type CompanyUpdate = Database['public']['Tables']['companies']['Update']

export function useCompany() {
  const { profile } = useAuth()
  const [company, setCompany] = useState<Company | null>(profile?.company || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCompany = useCallback(async () => {
    if (!profile?.company_id) return

    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single()

      if (fetchError) throw fetchError
      setCompany(data as Company)
    } catch (err: unknown) {
      console.error('Error fetching company:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los datos de la compañía.')
    } finally {
      setLoading(false)
    }
  }, [profile?.company_id])

  const updateCompany = async (updates: CompanyUpdate) => {
    if (!profile?.company_id) return { error: 'No company ID found' }

    setLoading(true)
    setError(null)
    try {
      const { data, error: updateError } = await supabase
        .from('companies')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.company_id)
        .select()
        .single()

      if (updateError) throw updateError
      setCompany(data as Company)
      return { data: data as Company, error: null }
    } catch (err: unknown) {
      console.error('Error updating company:', err)
      const msg = err instanceof Error ? err.message : 'Error al actualizar la compañía.'
      setError(msg)
      return { data: null, error: msg }
    } finally {
      setLoading(false)
    }
  }

  return {
    company,
    loading,
    error,
    fetchCompany,
    updateCompany,
  }
}
