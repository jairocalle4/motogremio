import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import type { Driver, DriverStatus, DriverLicense } from '@/types'
import type { Database } from '@/types/database.types'

// ─── Tipos derivados de BD ───────────────────────────────────────────────────
export type DriverInsert = Omit<
  Database['public']['Tables']['drivers']['Insert'],
  'company_id'
>
export type DriverUpdate = Database['public']['Tables']['drivers']['Update']
export type LicenseInsert = Omit<
  Database['public']['Tables']['licenses']['Insert'],
  'company_id' | 'member_id'
>

// ─── Tipo enriquecido con JOINs ──────────────────────────────────────────────
export type DriverWithRelations = Driver & {
  member: {
    id: string
    first_name: string
    last_name: string
    document_id: string
  } | null
  licenses: DriverLicense[]
  assigned_vehicle: {
    id: string
    disk_number: string
    plate: string
    status: string
  } | null  // procesado desde array → primer item o null
}

// ─── Selector de JOIN ────────────────────────────────────────────────────────
const DRIVER_SELECT = `
  *,
  member:members!drivers_member_id_fkey (
    id, first_name, last_name, document_id
  ),
  licenses (
    id, driver_id, company_id, license_type, license_number,
    issue_date, expiry_date, status, file_url, created_at, updated_at
  ),
  assigned_vehicle:vehicles!vehicles_driver_id_fkey (
    id, disk_number, plate, status
  )
`

// ─── Helpers de licencia ─────────────────────────────────────────────────────
/** Calcula el estado de una licencia según su fecha de vencimiento */
export function getLicenseStatus(expiryDate: string): 'vigente' | 'por_vencer' | 'vencido' {
  const now  = new Date()
  const exp  = new Date(expiryDate)
  const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) // días

  if (diff < 0) return 'vencido'
  if (diff <= 30) return 'por_vencer'
  return 'vigente'
}

/** Retorna la licencia principal/activa (o la primera si hay varias) */
export function getPrimaryLicense(licenses: DriverLicense[]): DriverLicense | null {
  if (!licenses || licenses.length === 0) return null
  return licenses[0]
}

/** @deprecated Usar getPrimaryLicense en su lugar */
export const getA1License = getPrimaryLicense

// ─── Hook principal ──────────────────────────────────────────────────────────
export function useDrivers() {
  const { profile } = useAuth()

  const [drivers, setDrivers] = useState<DriverWithRelations[]>([])
  const [currentDriver, setCurrentDriver] = useState<DriverWithRelations | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Listar ──────────────────────────────────────────────────────────────────
  const fetchDrivers = useCallback(
    async (filters?: { search?: string; status?: DriverStatus }) => {
      if (!profile?.company_id) return

      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('drivers')
          .select(DRIVER_SELECT)
          .eq('company_id', profile.company_id)

        if (filters?.search) {
          const s = filters.search.trim()
          query = query.or(
            `first_name.ilike.%${s}%,last_name.ilike.%${s}%,document_id.ilike.%${s}%`
          )
        }

        if (filters?.status) {
          query = query.eq('status', filters.status)
        }

        const { data, error: fetchError } = await query.order('last_name', { ascending: true })

        if (fetchError) throw fetchError

        // Normalizar: assigned_vehicle viene como array (FK inversa) → convertir a singular
        const normalized = (data || []).map((d: Record<string, unknown>) => ({
          ...d,
          assigned_vehicle: Array.isArray(d.assigned_vehicle)
            ? (d.assigned_vehicle.length > 0 ? d.assigned_vehicle[0] : null)
            : d.assigned_vehicle ?? null,
        }))
        setDrivers(normalized as unknown as DriverWithRelations[])
      } catch (err: unknown) {
        console.error('Error fetching drivers:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar los conductores.')
      } finally {
        setLoading(false)
      }
    },
    [profile?.company_id]
  )

  // ── Obtener uno por ID ───────────────────────────────────────────────────────
  const fetchDriverById = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('drivers')
        .select(DRIVER_SELECT)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Normalizar assigned_vehicle (array → singular)
      const raw = data as Record<string, unknown>
      const normalized = {
        ...raw,
        assigned_vehicle: Array.isArray(raw.assigned_vehicle)
          ? (raw.assigned_vehicle.length > 0 ? raw.assigned_vehicle[0] : null)
          : raw.assigned_vehicle ?? null,
      } as unknown as DriverWithRelations

      setCurrentDriver(normalized)
      return normalized
    } catch (err: unknown) {
      console.error('Error fetching driver by ID:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar el conductor.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Verificar si socio ya tiene conductor vinculado ──────────────────────────
  const getDriverByMemberId = useCallback(async (memberId: string) => {
    if (!profile?.company_id) return null
    try {
      const { data, error: fetchError } = await supabase
        .from('drivers')
        .select(DRIVER_SELECT)
        .eq('company_id', profile.company_id)
        .eq('member_id', memberId)
        .maybeSingle()

      if (fetchError) throw fetchError
      if (!data) return null
      const raw = data as Record<string, unknown>
      return {
        ...raw,
        assigned_vehicle: Array.isArray(raw.assigned_vehicle)
          ? (raw.assigned_vehicle.length > 0 ? raw.assigned_vehicle[0] : null)
          : raw.assigned_vehicle ?? null,
      } as unknown as DriverWithRelations
    } catch {
      return null
    }
  }, [profile?.company_id])

  // ── Crear conductor ──────────────────────────────────────────────────────────
  const createDriver = async (driverData: DriverInsert) => {
    if (!profile?.company_id) return { data: null, error: 'Sin company_id' }

    setLoading(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('drivers')
        .insert({ ...driverData, company_id: profile.company_id })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error(
            'Ya existe un conductor registrado con esa cédula en esta cooperativa.'
          )
        }
        throw insertError
      }

      return { data: data as Driver, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el conductor.'
      setError(msg)
      return { data: null, error: msg }
    } finally {
      setLoading(false)
    }
  }

  // ── Actualizar conductor ─────────────────────────────────────────────────────
  const updateDriver = async (
    id: string,
    updates: Omit<DriverUpdate, 'id' | 'company_id'>
  ) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: updateError } = await supabase
        .from('drivers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error('Ya existe un conductor con esa cédula en esta cooperativa.')
        }
        throw updateError
      }

      setDrivers((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...(data as Driver) } : d))
      )
      if (currentDriver?.id === id) {
        setCurrentDriver((prev) => (prev ? { ...prev, ...(data as Driver) } : prev))
      }

      return { data: data as Driver, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el conductor.'
      setError(msg)
      return { data: null, error: msg }
    } finally {
      setLoading(false)
    }
  }

  // ── Baja lógica (cambiar a inactivo) ─────────────────────────────────────────
  const deactivateDriver = (id: string) => updateDriver(id, { status: 'inactivo' })
  const activateDriver   = (id: string) => updateDriver(id, { status: 'activo' })

  // ── Crear licencia A1 para conductor ────────────────────────────────────────
  const createDriverLicense = async (driverId: string, licenseData: LicenseInsert) => {
    if (!profile?.company_id) return { data: null, error: 'Sin company_id' }

    try {
      const { data, error: insertError } = await supabase
        .from('licenses')
        .insert({
          ...licenseData,
          company_id: profile.company_id,
          driver_id: driverId,
          member_id: null,
        })
        .select()
        .single()

      if (insertError) throw insertError
      return { data: data as DriverLicense, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la licencia.'
      return { data: null, error: msg }
    }
  }

  // ── Actualizar licencia ──────────────────────────────────────────────────────
  const updateDriverLicense = async (
    licenseId: string,
    updates: Partial<LicenseInsert>
  ) => {
    try {
      const { data, error: updateError } = await supabase
        .from('licenses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', licenseId)
        .select()
        .single()

      if (updateError) throw updateError
      return { data: data as DriverLicense, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la licencia.'
      return { data: null, error: msg }
    }
  }

  return {
    drivers,
    currentDriver,
    loading,
    error,
    fetchDrivers,
    fetchDriverById,
    getDriverByMemberId,
    createDriver,
    updateDriver,
    deactivateDriver,
    activateDriver,
    createDriverLicense,
    updateDriverLicense,
  }
}
