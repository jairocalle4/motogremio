import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import type {
  ChargeType,
  Charge,
  Payment,
  PaymentKpis,
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
      .insert({ ...data, company_id: companyId })
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
   * Genera cuotas mensuales para todas las unidades activas de la compañía.
   * Una cuota por unidad activa, asignada al socio propietario de la unidad.
   * El índice único en BD previene duplicados.
   */
  const generateMonthlyCharges = useCallback(async (params: GenerateChargesParams) => {
    if (!companyId) return { inserted: 0, skipped: 0 }
    setLoading(true)
    try {
      // Cargar unidades activas con su socio propietario
      const { data: vehicles, error: vErr } = await supabase
        .from('vehicles')
        .select('id, disk_number, plate, member_id')
        .eq('company_id', companyId)
        .eq('status', 'activa')
      if (vErr) throw vErr

      // Cargar el tipo de cobro para obtener monto y nombre
      const { data: chargeType, error: ctErr } = await supabase
        .from('charge_types')
        .select('id, name, default_amount')
        .eq('id', params.chargeTypeId)
        .eq('company_id', companyId)
        .single()
      if (ctErr) throw ctErr
      if (!chargeType.default_amount) throw new Error('El tipo de cobro no tiene monto por defecto configurado')

      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ]
      const monthName = monthNames[params.periodMonth - 1]

      if (!vehicles || vehicles.length === 0) {
        toast.error('No hay unidades activas para generar cuotas')
        return { inserted: 0, skipped: 0 }
      }

      let inserted = 0
      let skipped = 0

      // Insertar cuota por unidad (el índice único en BD previene duplicados)
      for (const vehicle of vehicles) {
        const { error: insertErr } = await supabase
          .from('charges')
          .insert({
            company_id: companyId,
            member_id: vehicle.member_id,
            vehicle_id: vehicle.id,
            charge_type_id: params.chargeTypeId,
            description: `${chargeType.name} — Disco ${vehicle.disk_number} — ${monthName} ${params.periodYear}`,
            amount: chargeType.default_amount,
            balance: chargeType.default_amount,
            due_date: params.dueDate,
            status: 'pendiente',
            period_month: params.periodMonth,
            period_year: params.periodYear,
          })
        if (insertErr) {
          // Error de constraint único = cuota ya existe para este periodo
          if (insertErr.code === '23505') {
            skipped++
          } else {
            throw insertErr
          }
        } else {
          inserted++
        }
      }

      if (inserted > 0) {
        toast.success(`${inserted} cuota(s) generada(s) correctamente${skipped > 0 ? ` (${skipped} ya existían)` : ''}`)
      } else if (skipped > 0) {
        toast.error('Todas las cuotas de este periodo ya existen')
      }
      return { inserted, skipped }
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
   * El trigger de BD recalcularía el balance, pero como anulamos manualmente
   * ponemos balance = 0 también.
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
   * Registra un pago completo contra una o más cuotas.
   * Inserta en `payments` y luego en `payment_allocations`.
   * El trigger de BD actualiza automáticamente `charges.balance` y `charges.status`.
   */
  const registerPayment = useCallback(async (params: RegisterPaymentParams) => {
    if (!companyId || !profile?.id) return null
    setLoading(true)
    try {
      // 1. Crear registro de pago
      const { data: payment, error: payErr } = await supabase
        .from('payments')
        .insert({
          company_id: companyId,
          member_id: params.memberId,
          amount: params.amount,
          payment_date: params.paymentDate ?? new Date().toISOString().split('T')[0],
          payment_method: params.paymentMethod,
          reference_number: params.referenceNumber ?? null,
          receipt_url: params.receiptUrl ?? null,
          notes: params.notes ?? null,
          created_by: profile.id,
        })
        .select()
        .single()
      if (payErr) throw payErr

      // 2. Crear allocations para cada cuota seleccionada
      // Cargar cuotas para obtener los balances reales
      const { data: chargesToPay, error: cErr } = await supabase
        .from('charges')
        .select('id, balance, amount')
        .in('id', params.chargeIds)
        .eq('company_id', companyId)
      if (cErr) throw cErr

      // Distribuir el monto pagado entre las cuotas (orden de inserción)
      let remaining = params.amount
      const allocations: { payment_id: string; charge_id: string; amount_allocated: number }[] = []

      for (const charge of (chargesToPay ?? [])) {
        if (remaining <= 0) break
        const allocAmount = Math.min(remaining, charge.balance)
        if (allocAmount > 0) {
          allocations.push({
            payment_id: (payment as Payment).id,
            charge_id: charge.id,
            amount_allocated: Number(allocAmount.toFixed(2)),
          })
          remaining -= allocAmount
        }
      }

      if (allocations.length > 0) {
        const { error: allocErr } = await supabase
          .from('payment_allocations')
          .insert(allocations)
        if (allocErr) throw allocErr
      }

      toast.success('Pago registrado correctamente')
      return payment as Payment
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al registrar el pago'
      toast.error(msg)
      throw e
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

      // Total por cobrar (balance de cuotas pendientes o parciales)
      const { data: pendingData } = await supabase
        .from('charges')
        .select('balance')
        .eq('company_id', companyId)
        .in('status', ['pendiente', 'parcial'])

      const totalPendingBalance = (pendingData ?? []).reduce((sum: number, c: { balance: number }) => sum + Number(c.balance), 0)

      // Recaudado este mes
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', companyId)
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd)

      const collectedThisMonth = (paymentsData ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)

      // Socios morosos (cuotas vencidas con balance > 0)
      const today = now.toISOString().split('T')[0]
      const { data: delinquentData } = await supabase
        .from('charges')
        .select('member_id')
        .eq('company_id', companyId)
        .in('status', ['pendiente', 'parcial'])
        .lt('due_date', today)

      const uniqueDelinquents = new Set((delinquentData ?? []).map((c: { member_id: string }) => c.member_id))

      setKpis({
        totalPendingBalance,
        collectedThisMonth,
        delinquentMembersCount: uniqueDelinquents.size,
      })
    } catch (e) {
      console.error('Error al calcular KPIs:', e)
    }
  }, [companyId])

  // ─── Exportaciones ───────────────────────────────────────────────────────────

  return {
    // Estado
    chargeTypes,
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
    generateMonthlyCharges,
    voidCharge,
    // Pagos
    fetchPayments,
    registerPayment,
    // KPIs
    fetchKpis,
  }
}
