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

// ─── Tipo enriquecido con JOIN al propietario ────────────────────────────────
export type VehicleWithMember = Vehicle & {
  member: {
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

  // ── Crear ───────────────────────────────────────────────────────────────────
  const createVehicle = async (vehicleData: VehicleInsert) => {
    if (!profile?.company_id) return { data: null, error: 'Sin company_id' }

    setLoading(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('vehicles')
        .insert({ ...vehicleData, company_id: profile.company_id })
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
    setLoading(true)
    setError(null)
    try {
      const { data, error: updateError } = await supabase
        .from('vehicles')
        .update({ ...updates, updated_at: new Date().toISOString() })
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
