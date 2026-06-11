import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import type { Sanction, SanctionType, SanctionStatus } from '@/types'
import toast from 'react-hot-toast'

export interface CreateSanctionTypeParams {
  name: string
  description?: string | null
  default_fine_amount?: number | null
}

export interface CreateSanctionParams {
  memberId: string
  vehicleId?: string | null
  sanctionTypeId: string
  reason: string
  date: string
  severity?: string | null
  fineAmount: number
  dueDate?: string | null // Required if fineAmount > 0
  resolutionNotes?: string | null
}

export interface SanctionsFilterParams {
  memberId?: string
  typeId?: string
  status?: SanctionStatus
  pendingOnly?: boolean
  monthYear?: string // 'YYYY-MM'
}

export interface SanctionKpis {
  totalCount: number
  pendingCount: number
  appealCount: number
  totalFinesAmount: number
  pendingFinesAmount: number
}

export function useSanctions() {
  const { profile } = useAuth()
  const companyId = profile?.company_id

  const [sanctions, setSanctions] = useState<Sanction[]>([])
  const [sanctionTypes, setSanctionTypes] = useState<SanctionType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kpis, setKpis] = useState<SanctionKpis>({
    totalCount: 0,
    pendingCount: 0,
    appealCount: 0,
    totalFinesAmount: 0,
    pendingFinesAmount: 0,
  })

  // ─── Tipos de Sanción ───────────────────────────────────────────────────────

  const fetchSanctionTypes = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('sanction_types')
        .select('*')
        .eq('company_id', companyId)
        .order('name')
      if (err) throw err
      setSanctionTypes((data as SanctionType[]) ?? [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar tipos de sanción'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  const createSanctionType = useCallback(async (params: CreateSanctionTypeParams) => {
    if (!companyId) return null
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('sanction_types')
        .insert({
          company_id: companyId,
          name: params.name,
          description: params.description ?? null,
          default_fine_amount: params.default_fine_amount ?? null,
        })
        .select()
        .single()
      if (err) throw err
      toast.success('Tipo de sanción creado correctamente')
      return data as SanctionType
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear tipo de sanción'
      toast.error(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId])

  const updateSanctionType = useCallback(async (id: string, params: CreateSanctionTypeParams) => {
    if (!companyId) return null
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('sanction_types')
        .update({
          name: params.name,
          description: params.description ?? null,
          default_fine_amount: params.default_fine_amount ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()
      if (err) throw err
      toast.success('Tipo de sanción actualizado')
      return data as SanctionType
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar tipo de sanción'
      toast.error(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId])

  const deleteSanctionType = useCallback(async (id: string) => {
    if (!companyId) return
    setLoading(true)
    try {
      const { error: err } = await supabase
        .from('sanction_types')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)
      if (err) throw err
      toast.success('Tipo de sanción eliminado')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar el tipo de sanción'
      toast.error(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId])

  // ─── Sanciones ─────────────────────────────────────────────────────────────

  const fetchSanctions = useCallback(async (filters: SanctionsFilterParams = {}) => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('sanctions')
        .select(`
          *,
          member:members!sanctions_member_id_fkey(id, first_name, last_name, document_id),
          vehicle:vehicles!sanctions_vehicle_id_fkey(id, disk_number, plate),
          sanction_type:sanction_types!sanctions_sanction_type_id_fkey(id, name, default_fine_amount),
          charge:charges!sanctions_charge_id_fkey(id, amount, balance, status)
        `)
        .eq('company_id', companyId)

      if (filters.memberId) {
        query = query.eq('member_id', filters.memberId)
      }
      if (filters.typeId) {
        query = query.eq('sanction_type_id', filters.typeId)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.pendingOnly) {
        query = query.in('status', ['pendiente', 'apelacion'])
      }
      if (filters.monthYear) {
        // Formato 'YYYY-MM'
        const startDate = `${filters.monthYear}-01`
        // Calcular el último día del mes
        const parts = filters.monthYear.split('-')
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10)
        const lastDay = new Date(year, month, 0).getDate()
        const endDate = `${filters.monthYear}-${String(lastDay).padStart(2, '0')}`

        query = query.gte('date', startDate).lte('date', endDate)
      }

      const { data, error: err } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (err) throw err
      setSanctions((data as Sanction[]) ?? [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar sanciones'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  /**
   * Crea una sanción.
   * Si fineAmount > 0, genera un cargo en la tabla `charges`.
   * Para ello, busca o crea el `charge_type` base para Multas.
   */
  const createSanction = useCallback(async (params: CreateSanctionParams) => {
    if (!companyId) return null
    setLoading(true)
    try {
      let createdChargeId: string | null = null

      if (params.fineAmount > 0) {
        if (!params.dueDate) {
          throw new Error('La fecha de vencimiento es requerida para sanciones con multa.')
        }

        // 1. Asegurar tipo de cobro para Multas
        const { data: ctData, error: ctErr } = await supabase
          .from('charge_types')
          .select('id')
          .eq('company_id', companyId)
          .eq('name', 'Multa')
          .maybeSingle()

        if (ctErr) throw ctErr

        let chargeType = ctData

        if (!chargeType) {
          const { data: newCt, error: createCtErr } = await supabase
            .from('charge_types')
            .insert({
              company_id: companyId,
              name: 'Multa',
              description: 'Cargos generados por sanciones y multas disciplinarias',
              default_amount: null,
              is_recurring: false,
            })
            .select('id')
            .single()

          if (createCtErr) throw createCtErr
          chargeType = newCt
        }

        // Obtener el nombre del tipo de sanción para la descripción del cobro
        const { data: sType } = await supabase
          .from('sanction_types')
          .select('name')
          .eq('id', params.sanctionTypeId)
          .single()

        const sanctionTypeName = sType?.name || 'Sanción'

        // 2. Crear el cargo (charge)
        const { data: charge, error: chargeErr } = await supabase
          .from('charges')
          .insert({
            company_id: companyId,
            member_id: params.memberId,
            vehicle_id: params.vehicleId ?? null,
            charge_type_id: chargeType.id,
            description: `Multa por Sanción: ${sanctionTypeName} - ${params.reason}`,
            amount: params.fineAmount,
            balance: params.fineAmount,
            due_date: params.dueDate,
            status: 'pendiente',
          })
          .select('id')
          .single()

        if (chargeErr) throw chargeErr
        createdChargeId = charge.id
      }

      // 3. Crear la sanción
      const { data: sanction, error: sanctionErr } = await supabase
        .from('sanctions')
        .insert({
          company_id: companyId,
          member_id: params.memberId,
          vehicle_id: params.vehicleId ?? null,
          sanction_type_id: params.sanctionTypeId,
          charge_id: createdChargeId,
          date: params.date,
          reason: params.reason,
          severity: params.severity ?? null,
          status: 'pendiente',
          resolution_notes: params.resolutionNotes ?? null,
        })
        .select()
        .single()

      if (sanctionErr) {
        // Rollback del cargo si la sanción falla
        if (createdChargeId) {
          await supabase.from('charges').delete().eq('id', createdChargeId)
        }
        throw sanctionErr
      }

      toast.success('Sanción registrada correctamente')
      return sanction as Sanction
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al registrar la sanción'
      toast.error(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId])

  /**
   * Anula una sanción.
   * Cambia su estado a 'anulada'. Si tiene una multa (charge) asociada y está pendiente/parcial,
   * también anula la multa correspondiente (status = 'anulada', balance = 0).
   */
  const nullifySanction = useCallback(async (id: string, resolutionNotes?: string) => {
    if (!companyId) return null
    setLoading(true)
    try {
      // 1. Obtener la sanción para conocer el charge_id
      const { data: sanction, error: fetchErr } = await supabase
        .from('sanctions')
        .select('charge_id')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

      if (fetchErr) throw fetchErr

      // 2. Anular el cargo asociado si existe
      if (sanction.charge_id) {
        const { error: chargeErr } = await supabase
          .from('charges')
          .update({
            status: 'anulada',
            balance: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sanction.charge_id)
          .eq('company_id', companyId)

        if (chargeErr) throw chargeErr
      }

      // 3. Actualizar la sanción
      const { data: updatedSanction, error: sanctionErr } = await supabase
        .from('sanctions')
        .update({
          status: 'anulada',
          resolution_notes: resolutionNotes ?? 'Sanción anulada administrativamente',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (sanctionErr) throw sanctionErr

      toast.success('Sanción y multa asociada anuladas correctamente')
      return updatedSanction as Sanction
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al anular la sanción'
      toast.error(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId])

  /**
   * Resuelve una sanción (actualiza estado a 'resuelta').
   */
  const resolveSanction = useCallback(async (id: string, resolutionNotes: string) => {
    if (!companyId) return null
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('sanctions')
        .update({
          status: 'resuelta',
          resolution_notes: resolutionNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (err) throw err
      toast.success('Sanción resuelta correctamente')
      return data as Sanction
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al resolver la sanción'
      toast.error(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId])

  /**
   * Apela una sanción (actualiza estado a 'apelacion').
   */
  const appealSanction = useCallback(async (id: string, notes: string) => {
    if (!companyId) return null
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('sanctions')
        .update({
          status: 'apelacion',
          resolution_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (err) throw err
      toast.success('Estado de sanción cambiado a apelación')
      return data as Sanction
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al apelar la sanción'
      toast.error(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId])

  // ─── KPIs ──────────────────────────────────────────────────────────────────

  const fetchKpis = useCallback(async () => {
    if (!companyId) return
    try {
      // 1. Obtener conteos de sanciones por estado
      const { data: sanctionsData, error: sErr } = await supabase
        .from('sanctions')
        .select('status, charge:charges(amount, balance, status)')
        .eq('company_id', companyId)

      if (sErr) throw sErr

      let totalCount = 0
      let pendingCount = 0
      let appealCount = 0
      let totalFinesAmount = 0
      let pendingFinesAmount = 0

      if (sanctionsData) {
        totalCount = sanctionsData.length
        sanctionsData.forEach((item: any) => {
          if (item.status === 'pendiente') pendingCount++
          if (item.status === 'apelacion') appealCount++

          if (item.charge && item.charge.status !== 'anulada') {
            totalFinesAmount += Number(item.charge.amount || 0)
            pendingFinesAmount += Number(item.charge.balance || 0)
          }
        })
      }

      setKpis({
        totalCount,
        pendingCount,
        appealCount,
        totalFinesAmount,
        pendingFinesAmount,
      })
    } catch (e) {
      console.error('Error al calcular KPIs de sanciones:', e)
    }
  }, [companyId])

  return {
    sanctions,
    sanctionTypes,
    loading,
    error,
    kpis,
    fetchSanctionTypes,
    createSanctionType,
    updateSanctionType,
    deleteSanctionType,
    fetchSanctions,
    createSanction,
    nullifySanction,
    resolveSanction,
    appealSanction,
    fetchKpis,
  }
}
