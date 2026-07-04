import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import type {
  ChargeType,
  Charge,
  Payment,
  PaymentKpis,
  DebtorSummary,
  PaymentMethod,
  ChargeStatus,
} from '@/types'
import toast from 'react-hot-toast'

// ─── Tipos de parámetros para operaciones ───────────────────────────────────

export interface GenerateChargesParams {
  chargeTypeId: string
  periodMonth: number
  periodYear: number
  dueDate: string // ISO date string 'YYYY-MM-DD'
}

export interface RegisterPaymentParams {
  memberId: string
  chargeIds: string[]  // array de IDs de cuotas a pagar
  amount: number
  paymentMethod: PaymentMethod
  referenceNumber?: string
  receiptUrl?: string
  notes?: string
  paymentDate?: string  // ISO date, defaults to today
}

export interface ChargeTypeFormData {
  name: string
  description?: string
  default_amount: number
  is_recurring: boolean
}

export interface FetchChargesParams {
  memberId?: string
  vehicleId?: string
  status?: ChargeStatus
  periodMonth?: number
  periodYear?: number
}

// ─── Hook principal ──────────────────────────────────────────────────────────

export function usePayments() {
  const { profile } = useAuth()
  const companyId = profile?.company_id

  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([])
  const [charges, setCharges] = useState<Charge[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [kpis, setKpis] = useState<PaymentKpis>({
    totalPendingBalance: 0,
    collectedThisMonth: 0,
    delinquentMembersCount: 0,
    overdueChargesCount: 0,
    topDebtors: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Tipos de cobro ─────────────────────────────────────────────────────────

  const fetchChargeTypes = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('charge_types')
        .select('*')
        .eq('company_id', companyId)
        .order('name')
      if (err) throw err
      setChargeTypes((data as ChargeType[]) ?? [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar tipos de cobro'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  const createChargeType = useCallback(async (data: ChargeTypeFormData) => {
    if (!companyId) return null
    const { data: result, error: err } = await supabase
      .from('charge_types')
      .insert({ ...data, company_id: companyId, is_system: false, category: data.is_recurring ? 'monthly' : 'manual' })
      .select()
      .single()
    if (err) {
      toast.error('Error al crear tipo de cobro')
      throw err
    }
    toast.success('Tipo de cobro creado correctamente')
    return result as ChargeType
  }, [companyId])

  const updateChargeType = useCallback(async (id: string, data: Partial<ChargeTypeFormData>) => {
    if (!companyId) return null
    const { data: result, error: err } = await supabase
      .from('charge_types')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .eq('is_system', false)  // nunca editar tipos internos
      .select()
      .single()
    if (err) {
      toast.error('Error al actualizar tipo de cobro')
      throw err
    }
    toast.success('Tipo de cobro actualizado')
    return result as ChargeType
  }, [companyId])

  const deleteChargeType = useCallback(async (id: string) => {
    if (!companyId) return
    const { error: err } = await supabase
      .from('charge_types')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)
      .eq('is_system', false)  // nunca borrar tipos internos
    if (err) {
      toast.error('No se puede eliminar este tipo de cobro (tiene cuotas asociadas)')
      throw err
    }
    toast.success('Tipo de cobro eliminado')
  }, [companyId])

  // ─── Cuotas / Cargos ────────────────────────────────────────────────────────

  const fetchCharges = useCallback(async (params: FetchChargesParams = {}) => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('charges')
        .select(`
          *,
          member:members!charges_member_id_fkey(id, first_name, last_name, document_id),
          vehicle:vehicles!charges_vehicle_id_fkey(id, disk_number, plate),
          charge_type:charge_types!charges_charge_type_id_fkey(id, name)
        `)
        .eq('company_id', companyId)

      if (params.memberId)     query = query.eq('member_id', params.memberId)
      if (params.vehicleId)    query = query.eq('vehicle_id', params.vehicleId)
      if (params.status)       query = query.eq('status', params.status)
      if (params.periodMonth)  query = query.eq('period_month', params.periodMonth)
      if (params.periodYear)   query = query.eq('period_year', params.periodYear)

      const { data, error: err } = await query
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .order('due_date', { ascending: true })

      if (err) throw err
      setCharges((data as Charge[]) ?? [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar cuotas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  /**
   * Genera cuotas mensuales usando la RPC backend con validaciones completas.
   * La RPC valida: tipo recurrente, no interno, con monto, unidades activas, sin duplicados.
   */
  const generateMonthlyChargesRpc = useCallback(async (params: GenerateChargesParams) => {
    if (!companyId) return { inserted: 0, skipped: 0, activeUnits: 0 }
    setLoading(true)
    try {
      const { data, error: rpcErr } = await supabase.rpc('generate_monthly_charges_rpc', {
        p_charge_type_id: params.chargeTypeId,
        p_period_month:   params.periodMonth,
        p_period_year:    params.periodYear,
        p_due_date:       params.dueDate,
      })
      if (rpcErr) throw rpcErr
      const result = typeof data === 'string' ? JSON.parse(data) : data
      const inserted = Number(result?.created_count ?? 0)
      const skipped  = Number(result?.skipped_count  ?? 0)
      const activeUnits = Number(result?.active_units_count ?? 0)
      if (inserted > 0) {
        toast.success(`${inserted} cuota(s) generada(s)${skipped > 0 ? ` (${skipped} ya existían)` : ''}`)
      } else if (skipped > 0) {
        toast.error('Todas las cuotas de este periodo ya existen')
      } else if (activeUnits === 0) {
        toast.error('No hay unidades activas para generar cuotas')
      }
      return { inserted, skipped, activeUnits }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al generar cuotas'
      toast.error(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId])

  /**
   * Anula una cuota (cambia estado a 'anulada').
   */
  const voidCharge = useCallback(async (chargeId: string) => {
    if (!companyId) return
    const { error: err } = await supabase
      .from('charges')
      .update({ status: 'anulada', balance: 0, updated_at: new Date().toISOString() })
      .eq('id', chargeId)
      .eq('company_id', companyId)
    if (err) {
      toast.error('Error al anular la cuota')
      throw err
    }
    toast.success('Cuota anulada correctamente')
  }, [companyId])

  // ─── Pagos ──────────────────────────────────────────────────────────────────

  const fetchPayments = useCallback(async (memberId?: string) => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          member:members!payments_member_id_fkey(id, first_name, last_name, document_id)
        `)
        .eq('company_id', companyId)

      if (memberId) query = query.eq('member_id', memberId)

      const { data, error: err } = await query
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500)

      if (err) throw err
      setPayments((data as Payment[]) ?? [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar pagos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  /**
   * Registra un pago completo contra una o más cuotas mediante RPC atómica.
   */
  const registerPayment = useCallback(async (params: RegisterPaymentParams) => {
    if (!companyId || !profile?.id) return null
    setLoading(true)
    try {
      const { data, error: payErr } = await supabase.rpc('register_payment_atomic', {
        p_member_id: params.memberId,
        p_charge_ids: params.chargeIds,
        p_amount: params.amount,
        p_payment_method: params.paymentMethod,
        p_reference_number: params.referenceNumber ?? undefined,
        p_receipt_url: params.receiptUrl ?? undefined,
        p_notes: params.notes ?? undefined,
        p_payment_date: params.paymentDate ?? new Date().toISOString().split('T')[0]
      })

      if (payErr) throw payErr

      toast.success('Pago registrado correctamente')
      const resultObj = typeof data === 'string' ? JSON.parse(data) : data
      return { id: resultObj?.payment_id, amount: params.amount } as Payment
    } catch (e) {
      let msg = e instanceof Error ? e.message : 'Error al registrar el pago'
      if (msg.includes('Monto excesivo') || msg.includes('excesivo') || msg.includes('supera el saldo')) {
        msg = 'Monto excesivo: el abono ingresado supera el saldo total pendiente de las cuotas seleccionadas.'
      }
      toast.error(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }, [companyId, profile])

  // ─── KPIs ────────────────────────────────────────────────────────────────────

  const fetchKpis = useCallback(async () => {
    if (!companyId) return
    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
      const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

      const { data: pendingData } = await supabase
        .from('charges')
        .select('balance')
        .eq('company_id', companyId)
        .in('status', ['pendiente', 'parcial'])

      const totalPendingBalance = (pendingData ?? []).reduce((sum: number, c: { balance: number }) => sum + Number(c.balance), 0)

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', companyId)
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd)

      const collectedThisMonth = (paymentsData ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)

      const today = now.toISOString().split('T')[0]
      const { data: delinquentData } = await supabase
        .from('charges')
        .select('member_id')
        .eq('company_id', companyId)
        .in('status', ['pendiente', 'parcial'])
        .lt('due_date', today)

      const uniqueDelinquents = new Set((delinquentData ?? []).map((c: { member_id: string }) => c.member_id))
      const overdueChargesCount = (delinquentData ?? []).length

      const { data: chargesWithMembers } = await supabase
        .from('charges')
        .select(`
          member_id, balance,
          member:members!charges_member_id_fkey(id, first_name, last_name, document_id)
        `)
        .eq('company_id', companyId)
        .in('status', ['pendiente', 'parcial'])
        .gt('balance', 0)

      const debtorMap = new Map<string, DebtorSummary>()
      for (const c of (chargesWithMembers ?? [])) {
        const m = c.member as { id: string; first_name: string; last_name: string; document_id: string } | null
        if (!m) continue
        const existing = debtorMap.get(m.id)
        if (existing) {
          existing.totalBalance += Number(c.balance)
          existing.chargesCount += 1
        } else {
          debtorMap.set(m.id, {
            member_id: m.id,
            first_name: m.first_name,
            last_name: m.last_name,
            document_id: m.document_id,
            totalBalance: Number(c.balance),
            chargesCount: 1,
          })
        }
      }
      const topDebtors = Array.from(debtorMap.values())
        .sort((a, b) => b.totalBalance - a.totalBalance)
        .slice(0, 10)

      setKpis({
        totalPendingBalance,
        collectedThisMonth,
        delinquentMembersCount: uniqueDelinquents.size,
        overdueChargesCount,
        topDebtors,
      })
    } catch (e) {
      console.error('Error al calcular KPIs:', e)
    }
  }, [companyId])

  // ─── Exportaciones ───────────────────────────────────────────────────────────

  /** Tipos de cobro válidos para generación mensual: no internos, recurrentes, con monto */
  const chargeTypesRecurring = chargeTypes.filter(
    ct => !ct.is_system && ct.is_recurring && ct.default_amount != null && ct.default_amount > 0
  )

  /** Tipos de cobro visibles al admin: todos los que no son internos del sistema */
  const chargeTypesVisible = chargeTypes.filter(ct => !ct.is_system)

  return {
    // Estado
    chargeTypes,
    chargeTypesRecurring,
    chargeTypesVisible,
    charges,
    payments,
    kpis,
    loading,
    error,
    // Tipos de cobro
    fetchChargeTypes,
    createChargeType,
    updateChargeType,
    deleteChargeType,
    // Cuotas
    fetchCharges,
    generateMonthlyChargesRpc,
    voidCharge,
    // Pagos
    fetchPayments,
    registerPayment,
    // KPIs
    fetchKpis,
  }
}
