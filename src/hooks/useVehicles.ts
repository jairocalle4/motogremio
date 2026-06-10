import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import type { Vehicle, VehicleStatus } from '@/types'
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
  } | null
  driver: {
    id: string
    first_name: string
    last_name: string
    document_id: string
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
            id, first_name, last_name, document_id
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
    updates: Omit<VehicleUpdate, 'id' | 'company_id'>
  ) => {
    if (!profile?.company_id) return { data: null, error: 'Sin company_id' }
    setLoading(true)
    setError(null)
    try {
      let driverId = updates.driver_id
      if (driverId === '_owner') {
        const memberId = updates.member_id
        if (!memberId) throw new Error("No hay socio seleccionado")
        driverId = await resolveOwnerDriver(memberId, profile.company_id)
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


  return {
    vehicles,
    currentVehicle,
    loading,
    error,
    fetchVehicles,
    fetchVehicleById,
    createVehicle,
    updateVehicle,
  }
}
