import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import type { Member, MemberStatus } from '@/types'
import type { Database } from '@/types/database.types'

export type MemberInsert = Omit<Database['public']['Tables']['members']['Insert'], 'company_id'>
export type MemberUpdate = Database['public']['Tables']['members']['Update']

export function useMembers() {
  const { profile } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async (filters?: { search?: string; status?: MemberStatus }) => {
    if (!profile?.company_id) return

    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('members')
        .select('*, licenses(*)')
        .eq('company_id', profile.company_id)

      if (filters?.search) {
        const cleanSearch = filters.search.trim()
        query = query.or(
          `first_name.ilike.%${cleanSearch}%,last_name.ilike.%${cleanSearch}%,document_id.ilike.%${cleanSearch}%`
        )
      }

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error: fetchError } = await query.order('last_name', { ascending: true })

      if (fetchError) throw fetchError
      setMembers((data || []) as Member[])
    } catch (err: unknown) {
      console.error('Error fetching members:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los socios.')
    } finally {
      setLoading(false)
    }
  }, [profile?.company_id])

  const fetchMemberById = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('members')
        .select('*, licenses(*)')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      setCurrentMember(data as Member)
      return data as Member
    } catch (err: unknown) {
      console.error('Error fetching member by ID:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar el socio.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createMember = async (memberData: MemberInsert) => {
    if (!profile?.company_id) return { data: null, error: 'No company ID found' }

    setLoading(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('members')
        .insert({
          ...memberData,
          company_id: profile.company_id,
        })
        .select()
        .single()

      if (insertError) {
        // Manejar de manera amigable el error por cédula/documento duplicado
        if (insertError.code === '23505') {
          throw new Error('Ya existe un socio registrado con este número de documento en la cooperativa.')
        }
        throw insertError
      }

      // Volver a listar para tener la información actualizada
      await fetchMembers()
      return { data: data as Member, error: null }
    } catch (err: unknown) {
      console.error('Error creating member:', err)
      const msg = err instanceof Error ? err.message : 'Error al registrar el socio.'
      setError(msg)
      return { data: null, error: msg }
    } finally {
      setLoading(false)
    }
  }

  const updateMember = async (id: string, updates: Omit<MemberUpdate, 'id' | 'company_id'>) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: updateError } = await supabase
        .from('members')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error('Ya existe un socio registrado con este número de documento.')
        }
        throw updateError
      }

      // Actualizar estado local
      setMembers((prev) => prev.map((m) => (m.id === id ? (data as Member) : m)))
      if (currentMember?.id === id) {
        setCurrentMember(data as Member)
      }

      return { data: data as Member, error: null }
    } catch (err: unknown) {
      console.error('Error updating member:', err)
      const msg = err instanceof Error ? err.message : 'Error al actualizar el socio.'
      setError(msg)
      return { data: null, error: msg }
    } finally {
      setLoading(false)
    }
  }

  const deactivateMember = async (id: string) => {
    // Baja lógica según directriz 2 del usuario: cambiar estado a 'inactivo'
    return updateMember(id, { status: 'inactivo' })
  }

  return {
    members,
    currentMember,
    loading,
    error,
    fetchMembers,
    fetchMemberById,
    createMember,
    updateMember,
    deactivateMember,
  }
}
