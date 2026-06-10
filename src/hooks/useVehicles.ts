import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import type { Vehicle, VehicleStatus, VehicleDriverAssignment, DriverLicense } from '@/types'
import type { Database } from '@/types/database.types'

// ─── Tipos derivados de BD ───────────────────────────────────────────────────
export type VehicleInsert = Omit<
  Database['public']['Tables']['vehicles']['Insert'],
  'company_id'
>

export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update']

// ─── Tipo enriquecido con JOIN al propietario y conductor ──────────────────
export type VehicleWithMember = Vehicle & {
  member: {
    id: string
    first_name: string
    last_name: string
    document_id: string
    phone?: string | null
    email?: string | null
    status?: string | null
  } | null
  driver: {
    id: string
    first_name: string
    last_name: string
    document_id: string
    phone?: string | null
    address?: string | null
    status?: string | null
    licenses?: DriverLicense[]
  } | null
}

export function useVehicles() {
  const { profile } = useAuth()

  const [vehicles, setVehicles] = useState<VehicleWithMember[]>([])
  const [currentVehicle, setCurrentVehicle] = useState<VehicleWithMember | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Listar ──────────────────────────────────────────────────────────────────
  const fetchVehicles = useCallback(
    async (filters?: { search?: string; status?: VehicleStatus }) => {
      if (!profile?.company_id) return

      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('vehicles')
          .select(`
            *,
            member:members!vehicles_member_id_fkey (
              id, first_name, last_name, document_id
            ),
            driver:drivers!vehicles_driver_id_fkey (
              id, first_name, last_name, document_id
            )
          `)
          .eq('company_id', profile.company_id)

        if (filters?.search) {
          const s = filters.search.trim()
          // Busca por disco, placa, marca, modelo o color
          query = query.or(
            `disk_number.ilike.%${s}%,plate.ilike.%${s}%,brand.ilike.%${s}%,model.ilike.%${s}%`
          )
        }

        if (filters?.status) {
          query = query.eq('status', filters.status)
        }

        const { data, error: fetchError } = await query.order('disk_number', { ascending: true })

        if (fetchError) throw fetchError
        setVehicles((data || []) as VehicleWithMember[])
      } catch (err: unknown) {
        console.error('Error fetching vehicles:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar las unidades.')
      } finally {
        setLoading(false)
      }
    },
    [profile?.company_id]
  )

  // ── Obtener una unidad por ID ────────────────────────────────────────────────
  const fetchVehicleById = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('vehicles')
        .select(`
          *,
          member:members!vehicles_member_id_fkey (
            id, first_name, last_name, document_id, phone, email, status
          ),
          driver:drivers!vehicles_driver_id_fkey (
            id, first_name, last_name, document_id, phone, address, status,
            licenses (
              id, driver_id, company_id, license_type, license_number, issue_date, expiry_date, status, file_url, created_at, updated_at
            )
          )
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      setCurrentVehicle(data as VehicleWithMember)
      return data as VehicleWithMember
    } catch (err: unknown) {
      console.error('Error fetching vehicle by ID:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar la unidad.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Helper interno para resolver o crear conductor del socio
  const resolveOwnerDriver = async (memberId: string, companyId: string): Promise<string> => {
    if (!memberId) throw new Error("No hay socio seleccionado")

    // 1. Buscar si ya existe conductor para este socio
    const { data: existing, error: existErr } = await supabase
      .from('drivers')
      .select('id')
      .eq('company_id', companyId)
      .eq('member_id', memberId)
      .maybeSingle()

    if (existErr) throw existErr
    if (existing) {
      return existing.id
    }

    // 2. Si no existe, buscar datos del socio
    const { data: member, error: memErr } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (memErr || !member) throw new Error("No se encontró al socio propietario")

    // 3. Crear conductor
    const { data: newDriver, error: driverErr } = await supabase
      .from('drivers')
      .insert({
        company_id: companyId,
        document_id: member.document_id,
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone || null,
        address: member.address || null,
        status: 'activo',
        member_id: member.id,
      })
      .select('id')
      .single()

    if (driverErr || !newDriver) {
      throw new Error(driverErr?.message || "Error al crear el conductor para el socio")
    }

    return newDriver.id
  }

  // ── Crear ───────────────────────────────────────────────────────────────────
  const createVehicle = async (vehicleData: VehicleInsert) => {
    if (!profile?.company_id) return { data: null, error: 'Sin company_id' }

    setLoading(true)
    setError(null)
    try {
      let driverId = vehicleData.driver_id
      if (driverId === '_owner') {
        if (!vehicleData.member_id) throw new Error("No hay socio seleccionado")
        driverId = await resolveOwnerDriver(vehicleData.member_id, profile.company_id)
      }

      // Validar coherencia de la compañía para el conductor si se provee uno
      if (driverId) {
        const { data: driverData, error: driverErr } = await supabase
          .from('drivers')
          .select('company_id')
          .eq('id', driverId)
          .single()
        
        if (driverErr || !driverData || driverData.company_id !== profile.company_id) {
          throw new Error("El conductor seleccionado no pertenece a la compañía actual.")
        }
      }

      const { data, error: insertError } = await supabase
        .from('vehicles')
        .insert({ ...vehicleData, driver_id: driverId, company_id: profile.company_id })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          // Determinar qué campo duplicado (disco o placa)
          const msg = insertError.message.toLowerCase()
          if (msg.includes('disk_number')) {
            throw new Error('Ya existe una unidad con ese número de disco en esta cooperativa.')
          } else if (msg.includes('plate')) {
            throw new Error('Ya existe una unidad con esa placa en esta cooperativa.')
          }
          throw new Error('Ya existe una unidad con ese número de disco o placa en la cooperativa.')
        }
        throw insertError
      }

      // Registrar historial activo si se asignó conductor por primera vez
      if (data && driverId) {
        const { error: assignErr } = await supabase
          .from('vehicle_driver_assignments')
          .insert({
            company_id: profile.company_id,
            vehicle_id: data.id,
            driver_id: driverId,
            assigned_at: new Date().toISOString(),
            assigned_by: profile.id,
            change_reason: 'Asignación inicial al registrar unidad',
          })
        if (assignErr) {
          console.error("Error creating vehicle driver assignment history:", assignErr)
        }
      }

      return { data: data as Vehicle, error: null }
    } catch (err: unknown) {
      console.error('Error creating vehicle:', err)
      const msg = err instanceof Error ? err.message : 'Error al registrar la unidad.'
      setError(msg)
      return { data: null, error: msg }
    } finally {
      setLoading(false)
    }
  }

  // ── Actualizar ──────────────────────────────────────────────────────────────
  const updateVehicle = async (
    id: string,
    updates: Omit<VehicleUpdate, 'id' | 'company_id'>,
    options?: { changeReason?: string; notes?: string }
  ) => {
    if (!profile?.company_id) return { data: null, error: 'Sin company_id' }
    setLoading(true)
    setError(null)
    try {
      // 1. Obtener estado actual de la unidad para verificar compañía y conductor anterior
      const { data: currentVeh, error: findError } = await supabase
        .from('vehicles')
        .select('company_id, driver_id, member_id')
        .eq('id', id)
        .single()

      if (findError || !currentVeh) {
        throw new Error("No se encontró la unidad especificada.")
      }

      // Coherencia de compañía: la unidad pertenece a la compañía actual
      if (currentVeh.company_id !== profile.company_id) {
        throw new Error("La unidad no pertenece a tu compañía.")
      }

      let driverId = updates.driver_id
      if (driverId === '_owner') {
        const memberId = updates.member_id || currentVeh.member_id
        if (!memberId) throw new Error("No hay socio seleccionado")
        driverId = await resolveOwnerDriver(memberId, profile.company_id)
      }

      // Coherencia de compañía: el conductor pertenece a la compañía actual
      if (driverId) {
        const { data: driverData, error: driverErr } = await supabase
          .from('drivers')
          .select('company_id')
          .eq('id', driverId)
          .single()
        
        if (driverErr || !driverData || driverData.company_id !== profile.company_id) {
          throw new Error("El conductor seleccionado no pertenece a la compañía actual.")
        }
      }

      const isDriverChanging = currentVeh.driver_id !== driverId

      // Si hay cambio de conductor, manejamos el historial
      if (isDriverChanging) {
        // A. Cerrar historial activo anterior si existía
        if (currentVeh.driver_id) {
          const { error: closeErr } = await supabase
            .from('vehicle_driver_assignments')
            .update({
              unassigned_at: new Date().toISOString(),
              unassigned_by: profile.id,
              notes: options?.notes || 'Cambio de conductor / Desasignación',
            })
            .eq('vehicle_id', id)
            .is('unassigned_at', null)

          if (closeErr) {
            console.error("Error closing previous driver assignment:", closeErr)
          }
        }

        // B. Crear nuevo historial activo si se está asignando un conductor nuevo
        if (driverId) {
          const { error: assignErr } = await supabase
            .from('vehicle_driver_assignments')
            .insert({
              company_id: profile.company_id,
              vehicle_id: id,
              driver_id: driverId,
              assigned_at: new Date().toISOString(),
              assigned_by: profile.id,
              change_reason: options?.changeReason || 'Asignación de conductor',
              notes: options?.notes || null,
            })

          if (assignErr) {
            console.error("Error creating new driver assignment:", assignErr)
          }
        }
      }

      const { data, error: updateError } = await supabase
        .from('vehicles')
        .update({ ...updates, driver_id: driverId, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        if (updateError.code === '23505') {
          const msg = updateError.message.toLowerCase()
          if (msg.includes('disk_number')) {
            throw new Error('Ya existe una unidad con ese número de disco en esta cooperativa.')
          } else if (msg.includes('plate')) {
            throw new Error('Ya existe una unidad con esa placa en esta cooperativa.')
          }
          throw new Error('Número de disco o placa ya registrados en otra unidad.')
        }
        throw updateError
      }

      // Actualizar estado local
      setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...(data as Vehicle) } : v)))
      if (currentVehicle?.id === id) {
        setCurrentVehicle((prev) => (prev ? { ...prev, ...(data as Vehicle) } : prev))
      }

      return { data: data as Vehicle, error: null }
    } catch (err: unknown) {
      console.error('Error updating vehicle:', err)
      const msg = err instanceof Error ? err.message : 'Error al actualizar la unidad.'
      setError(msg)
      return { data: null, error: msg }
    } finally {
      setLoading(false)
    }
  }

  // ── Obtener Historial de Conductores ─────────────────────────────────────────
  const fetchVehicleDriverHistory = useCallback(async (vehicleId: string) => {
    if (!profile?.company_id) return []
    try {
      const { data, error: fetchErr } = await supabase
        .from('vehicle_driver_assignments')
        .select(`
          *,
          driver:drivers (
            id, first_name, last_name, document_id
          ),
          assigned_by_profile:profiles!vehicle_driver_assignments_assigned_by_fkey (
            id, first_name, last_name
          ),
          unassigned_by_profile:profiles!vehicle_driver_assignments_unassigned_by_fkey (
            id, first_name, last_name
          )
        `)
        .eq('vehicle_id', vehicleId)
        .order('assigned_at', { ascending: false })

      if (fetchErr) throw fetchErr
      return data as VehicleDriverAssignment[]
    } catch (err) {
      console.error('Error fetching driver history:', err)
      return []
    }
  }, [profile?.company_id])


  return {
    vehicles,
    currentVehicle,
    loading,
    error,
    fetchVehicles,
    fetchVehicleById,
    createVehicle,
    updateVehicle,
    fetchVehicleDriverHistory,
  }
}
