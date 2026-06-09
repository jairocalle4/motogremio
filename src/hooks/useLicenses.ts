import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import { calculateDocumentStatus } from '@/utils/statusCalculator'
import type { Database } from '@/types/database.types'

export type LicenseRow = Database['public']['Tables']['licenses']['Row']
export type LicenseInsert = Database['public']['Tables']['licenses']['Insert']
export type LicenseUpdate = Database['public']['Tables']['licenses']['Update']

export function useLicenses() {
  const { profile } = useAuth()
  const [licenses, setLicenses] = useState<LicenseRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLicenses = useCallback(async (driverId: string) => {
    if (!profile?.company_id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('licenses')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('driver_id', driverId)

      if (fetchError) throw fetchError

      const licensesWithStatus = data.map((lic: LicenseRow) => ({
        ...lic,
        status: calculateDocumentStatus(lic.expiry_date)
      }))

      setLicenses(licensesWithStatus)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching licenses:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.company_id])

  const createLicense = async (licData: LicenseInsert) => {
    if (!profile?.company_id) return { data: null, error: 'No company' }
    try {
      const computedStatus = calculateDocumentStatus(licData.expiry_date)
      const dataToInsert = {
        ...licData,
        company_id: profile.company_id,
        status: computedStatus
      }

      const { data, error: insertError } = await supabase
        .from('licenses')
        .insert(dataToInsert)
        .select()
        .single()

      if (insertError) throw insertError
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const updateLicense = async (id: string, updates: LicenseUpdate) => {
    try {
      const dataToUpdate = { ...updates }
      if ('expiry_date' in updates) {
        dataToUpdate.status = calculateDocumentStatus(updates.expiry_date || null)
      }

      const { data, error: updateError } = await supabase
        .from('licenses')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const deleteLicense = async (id: string) => {
    try {
      const { error: delError } = await supabase
        .from('licenses')
        .delete()
        .eq('id', id)

      if (delError) throw delError
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return {
    licenses,
    loading,
    error,
    fetchLicenses,
    createLicense,
    updateLicense,
    deleteLicense
  }
}
