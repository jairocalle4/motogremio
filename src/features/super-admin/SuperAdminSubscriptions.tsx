import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button, Tooltip } from '@/components/ui'
import { supabase } from '@/lib/supabaseClient'
import {
  DollarSign, Activity,
  AlertCircle, ShieldCheck, Plus, CreditCard,
  Ban, ShieldAlert, Key, Edit, History, Printer
} from 'lucide-react'
import toast from 'react-hot-toast'

interface BillingOverview {
  mrr: number
  collected_month: number
  pending_total: number
  overdue_total: number
  suspended_companies: number
}

interface CompanySubscriptionRow {
  company_id: string
  legal_name: string
  trade_name: string | null
  ruc: string
  company_status: string
  sub_id: string | null
  plan_id: string | null
  plan_name: string | null
  billing_cycle: string | null
  price_amount: number | null
  sub_status: string | null
  next_due_date: string | null
  outstanding_balance: number
  last_payment_date: string | null
}

interface Plan {
  id: string
  name: string
  price_monthly: number
}

interface Invoice {
  id: string
  invoice_number: string
  amount: number
  amount_paid: number | null
  balance: number
  status: string
  due_date: string
  period_start?: string
  period_end?: string
}

export function SuperAdminSubscriptions() {
  const [overview, setOverview] = useState<BillingOverview | null>(null)
  const [subscriptions, setSubscriptions] = useState<CompanySubscriptionRow[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [globalSettings, setGlobalSettings] = useState<any>(null)

  const currencySymbol = globalSettings?.currency_symbol || '$'
  const receiptNote = globalSettings?.internal_receipt_note || 'Este documento es un comprobante interno de cobro del SaaS. No corresponde a una factura electrónica SRI.'

  // Modales
  const [showSubModal, setShowSubModal] = useState(false)
  const [showInvModal, setShowInvModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [selectedRow, setSelectedRow] = useState<CompanySubscriptionRow | null>(null)

  // Form Subscriptions
  const [subPlan, setSubPlan] = useState('')
  const [subCycle, setSubCycle] = useState('monthly')
  const [subPrice, setSubPrice] = useState(0)
  const [subNotes, setSubNotes] = useState('')

  // Form Invoices
  const [invAmount, setInvAmount] = useState(0)
  const [invPeriodStart, setInvPeriodStart] = useState('')
  const [invPeriodEnd, setInvPeriodEnd] = useState('')
  const [invDueDate, setInvDueDate] = useState('')
  const [invNotes, setInvNotes] = useState('')

  // Form Payments
  const [payInvoices, setPayInvoices] = useState<Invoice[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [payAmount, setPayAmount] = useState(0)
  const [payMethod, setPayMethod] = useState('transfer')
  const [payReference, setPayReference] = useState('')
  const [payNotes, setPayNotes] = useState('')

  // Form Void Invoice
  const [voidNotes, setVoidNotes] = useState('')

  // Form History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyInvoices, setHistoryInvoices] = useState<any[]>([])
  const [historyPayments, setHistoryPayments] = useState<any[]>([])
  const [activeHistoryTab, setActiveHistoryTab] = useState<'invoices' | 'payments'>('invoices')

  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)

  const handleOpenReceiptModal = (inv: any) => {
    setSelectedInvoice(inv)
    setShowReceiptModal(true)
  }

  const formatPeriodLabel = (startStr: string | null | undefined, endStr: string | null | undefined, invoiceNumber: string, balance: number) => {
    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return ''
      const parts = dateStr.split('-')
      if (parts.length !== 3) return dateStr
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      const day = parts[2]
      const month = months[parseInt(parts[1], 10) - 1]
      const year = parts[0]
      return `${day} ${month} ${year}`
    }
    
    const start = startStr ? formatDate(startStr) : '—'
    const end = endStr ? formatDate(endStr) : '—'
    return `${start} - ${end} · ${invoiceNumber} · Saldo ${currencySymbol}${Number(balance).toFixed(2)}`
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [overviewRes, subsRes, plansRes, settingsRes] = await Promise.all([
        supabase.rpc('get_saas_billing_overview'),
        supabase.rpc('get_company_subscriptions'),
        supabase.from('plans').select('id, name, price_monthly').eq('is_active', true),
        supabase.rpc('get_saas_settings')
      ])

      if (overviewRes.error) throw overviewRes.error
      if (subsRes.error) throw subsRes.error
      if (plansRes.error) throw plansRes.error

      setOverview(overviewRes.data as unknown as BillingOverview)
      setSubscriptions((subsRes.data as unknown as CompanySubscriptionRow[]) || [])
      setPlans((plansRes.data as unknown as Plan[]) || [])
      if (settingsRes.data && settingsRes.data.length > 0) {
        setGlobalSettings(settingsRes.data[0])
      }
    } catch (err: any) {
      toast.error('Error al cargar datos de cobros: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenSubModal = (row: CompanySubscriptionRow) => {
    setSelectedRow(row)
    setSubPlan(row.plan_id || '')
    setSubCycle(row.billing_cycle || 'monthly')
    setSubPrice(row.price_amount || 0)
    setSubNotes('')
    setShowSubModal(true)
  }

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRow || !subPlan) return

    try {
      const { error } = await supabase.rpc('create_or_update_company_subscription', {
        p_company_id: selectedRow.company_id,
        p_plan_id: subPlan,
        p_billing_cycle: subCycle,
        p_price_amount: subPrice,
        p_starts_at: new Date().toISOString().split('T')[0],
        p_notes: subNotes
      })

      if (error) throw error
      toast.success('Suscripción establecida correctamente.')
      setShowSubModal(false)
      loadData()
    } catch (err: any) {
      toast.error('Error al guardar suscripción: ' + err.message)
    }
  }

  const handleOpenInvModal = async (row: CompanySubscriptionRow) => {
    if (!row.sub_id) {
      toast.error('La compañía debe tener una suscripción activa antes de facturar.')
      return
    }
    setSelectedRow(row)
    setInvAmount(row.price_amount || 0)
    setInvNotes('')

    try {
      const { data: sub, error } = await supabase
        .from('company_subscriptions')
        .select('starts_at, current_period_start, current_period_end, next_due_date, billing_cycle')
        .eq('id', row.sub_id)
        .single()

      if (error) throw error

      if (sub) {
        const baseStart = sub.next_due_date || sub.current_period_start || new Date().toISOString().split('T')[0]
        let calculatedEnd = ''
        const startDt = new Date(baseStart + 'T00:00:00')
        if (sub.billing_cycle === 'annual') {
          const endDt = new Date(startDt)
          endDt.setFullYear(endDt.getFullYear() + 1)
          endDt.setDate(endDt.getDate() - 1)
          calculatedEnd = endDt.toISOString().split('T')[0]
        } else {
          const endDt = new Date(startDt)
          endDt.setMonth(endDt.getMonth() + 1)
          endDt.setDate(endDt.getDate() - 1)
          calculatedEnd = endDt.toISOString().split('T')[0]
        }

        setInvPeriodStart(baseStart)
        setInvPeriodEnd(calculatedEnd)
        setInvDueDate(sub.next_due_date || baseStart)
      } else {
        const today = new Date().toISOString().split('T')[0]
        setInvPeriodStart(today)
        setInvPeriodEnd('')
        setInvDueDate('')
      }
    } catch (err: any) {
      toast.error('Error al precargar fechas de suscripción: ' + err.message)
      const today = new Date().toISOString().split('T')[0]
      setInvPeriodStart(today)
      setInvPeriodEnd('')
      setInvDueDate('')
    }

    setShowInvModal(true)
  }

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRow || !selectedRow.sub_id || !selectedRow.plan_id) return

    try {
      // Validar duplicados de período activo
      const { data: existing, error: checkError } = await supabase
        .from('saas_invoices')
        .select('id, invoice_number')
        .eq('subscription_id', selectedRow.sub_id)
        .eq('period_start', invPeriodStart)
        .eq('period_end', invPeriodEnd)
        .neq('status', 'void')
        .limit(1)

      if (checkError) throw checkError

      if (existing && existing.length > 0) {
        toast.error(`Ya existe un cobro interno activo para este período (${existing[0].invoice_number}).`)
        return
      }

      const { error } = await supabase.rpc('generate_saas_invoice', {
        p_company_id: selectedRow.company_id,
        p_subscription_id: selectedRow.sub_id,
        p_plan_id: selectedRow.plan_id,
        p_period_start: invPeriodStart,
        p_period_end: invPeriodEnd,
        p_due_date: invDueDate,
        p_amount: invAmount,
        p_notes: invNotes
      })

      if (error) throw error
      toast.success('Cobro interno generado exitosamente.')
      setShowInvModal(false)
      loadData()
    } catch (err: any) {
      toast.error('Error al generar cobro: ' + err.message)
    }
  }

  const handleOpenPayModal = async (row: CompanySubscriptionRow) => {
    setSelectedRow(row)
    setSelectedInvoiceId('')
    setPayAmount(0)
    setPayReference('')
    setPayNotes('')
    setPayInvoices([])
    setShowPayModal(true)

    try {
      const { data, error } = await supabase
        .from('saas_invoices')
        .select('id, invoice_number, amount, amount_paid, balance, status, due_date, period_start, period_end')
        .eq('company_id', row.company_id)
        .neq('status', 'void')
        .gt('balance', 0)
        .order('due_date', { ascending: true })

      if (error) throw error
      setPayInvoices((data || []) as unknown as Invoice[])
    } catch (err: any) {
      toast.error('Error al cargar cobros pendientes: ' + err.message)
    }
  }

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoiceId || payAmount <= 0) return

    try {
      const { error } = await supabase.rpc('register_saas_payment', {
        p_invoice_id: selectedInvoiceId,
        p_amount: payAmount,
        p_payment_method: payMethod,
        p_reference: payReference,
        p_receipt_url: null as any,
        p_notes: payNotes
      })

      if (error) throw error
      toast.success('Pago registrado exitosamente.')
      setShowPayModal(false)
      loadData()
    } catch (err: any) {
      toast.error('Error al registrar pago: ' + err.message)
    }
  }

  const handleOpenVoidModal = async (row: CompanySubscriptionRow) => {
    setSelectedRow(row)
    setVoidNotes('')
    setPayInvoices([])
    setSelectedInvoiceId('')
    setShowVoidModal(true)

    try {
      const { data, error } = await supabase
        .from('saas_invoices')
        .select('id, invoice_number, amount, amount_paid, balance, status, due_date, period_start, period_end')
        .eq('company_id', row.company_id)
        .neq('status', 'void')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPayInvoices((data || []) as unknown as Invoice[])
    } catch (err: any) {
      toast.error('Error al cargar cobros: ' + err.message)
    }
  }

  const handleVoidInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoiceId || !voidNotes) return

    // Buscar si el cobro tiene pagos antes de intentar anular en UI
    const chosen = payInvoices.find(i => i.id === selectedInvoiceId)
    if (chosen && chosen.amount_paid && Number(chosen.amount_paid) > 0) {
      toast.error('Este cobro ya tiene pagos registrados. No puede anularse directamente para proteger el historial financiero.')
      return
    }

    try {
      const { error } = await supabase.rpc('mark_saas_invoice_void', {
        p_invoice_id: selectedInvoiceId,
        p_notes: voidNotes
      })

      if (error) throw error
      toast.success('Cobro interno anulado exitosamente.')
      setShowVoidModal(false)
      loadData()
    } catch (err: any) {
      toast.error('Error al anular cobro: ' + err.message)
    }
  }

  const handleOpenHistoryModal = async (row: CompanySubscriptionRow) => {
    setSelectedRow(row)
    setHistoryInvoices([])
    setHistoryPayments([])
    setActiveHistoryTab('invoices')
    setShowHistoryModal(true)

    try {
      const [invsRes, paysRes] = await Promise.all([
        supabase
          .from('saas_invoices')
          .select('id, invoice_number, period_start, period_end, amount, amount_paid, balance, status, due_date, notes, created_at')
          .eq('company_id', row.company_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('saas_payments')
          .select('id, invoice_id, amount, payment_method, reference, created_at, notes, saas_invoices(invoice_number)')
          .eq('company_id', row.company_id)
          .order('created_at', { ascending: false })
      ])

      if (invsRes.error) throw invsRes.error
      if (paysRes.error) throw paysRes.error

      setHistoryInvoices(invsRes.data || [])
      setHistoryPayments(paysRes.data || [])
    } catch (err: any) {
      toast.error('Error al cargar historial: ' + err.message)
    }
  }

  const handleSuspendCompany = async (row: CompanySubscriptionRow) => {
    if (!confirm(`¿Está seguro de suspender a la cooperativa "${row.legal_name}"? Sus usuarios no podrán ingresar al sistema.`)) return

    try {
      const { error } = await supabase.rpc('suspend_company_for_nonpayment', {
        p_company_id: row.company_id
      } as any)

      if (error) throw error
      toast.success('Cooperativa suspendida por falta de pago.')
      loadData()
    } catch (err: any) {
      toast.error('Error al suspender cooperativa: ' + err.message)
    }
  }

  const handleReactivateCompany = async (row: CompanySubscriptionRow) => {
    try {
      const { error } = await supabase.rpc('reactivate_company_after_payment', {
        p_company_id: row.company_id
      } as any)

      if (error) throw error
      toast.success('Cooperativa reactivada exitosamente.')
      loadData()
    } catch (err: any) {
      toast.error('Error al reactivar cooperativa: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="h-4 bg-slate-150 rounded w-2/5"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-80 bg-slate-200 rounded-xl mt-6"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER EJECUTIVO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Suscripciones y Cobros SaaS</h1>
          <p className="text-sm text-slate-500 mt-1">Control ejecutivo de facturas, ingresos globales y suspensión de cooperativas.</p>
        </div>
      </div>

      {/* METRICAS / KPIs */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: 'MRR Estimado', val: `${currencySymbol}${Number(overview.mrr).toFixed(2)}`, icon: DollarSign, color: 'text-blue-600 bg-blue-50 border-l-blue-500' },
            { label: 'Cobrado del Mes', val: `${currencySymbol}${Number(overview.collected_month).toFixed(2)}`, icon: ShieldCheck, color: 'text-green-600 bg-green-50 border-l-green-500' },
            { label: 'Pendiente Cobro', val: `${currencySymbol}${Number(overview.pending_total).toFixed(2)}`, icon: Activity, color: 'text-orange-600 bg-orange-50 border-l-orange-500' },
            { label: 'Facturas Vencidas', val: `${currencySymbol}${Number(overview.overdue_total).toFixed(2)}`, icon: AlertCircle, color: 'text-red-600 bg-red-50 border-l-red-500' },
            { label: 'Suspendidas', val: overview.suspended_companies, icon: ShieldAlert, color: 'text-purple-600 bg-purple-50 border-l-purple-500' }
          ].map((item, idx) => (
            <Card key={idx} className={`p-4 border-l-4 ${item.color} shadow-sm`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{item.val}</p>
                </div>
                <item.icon className="h-5 w-5 opacity-60 shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TABLA DE COMPAÑIAS */}
      <Card className="p-6">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Cooperativas Afiliadas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
              <tr>
                <th className="px-4 py-3">Compañía</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Ciclo</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-center">Estado Suscripción</th>
                <th className="px-4 py-3 text-center">Próximo Pago</th>
                <th className="px-4 py-3 text-right">Deuda Pendiente</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((row) => {
                const isCompanyActive = row.company_status === 'activa';
                return (
                  <tr key={row.company_id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-900">{row.legal_name}</p>
                        <p className="text-[10px] text-slate-400">RUC: {row.ruc}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{row.plan_name || <span className="text-slate-400">Sin Plan</span>}</td>
                    <td className="px-4 py-3">{row.billing_cycle === 'annual' ? 'Anual' : row.billing_cycle === 'monthly' ? 'Mensual' : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {row.price_amount !== null ? `${currencySymbol}${Number(row.price_amount).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.sub_status === 'active' ? 'bg-green-50 text-green-700' :
                        row.sub_status === 'suspended' ? 'bg-red-50 text-red-700' :
                        row.sub_status === 'past_due' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {row.sub_status || 'Sin suscripción'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{row.next_due_date || '—'}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">
                      {row.outstanding_balance > 0 ? (
                        <span className="text-red-600">{currencySymbol}${Number(row.outstanding_balance).toFixed(2)}</span>
                      ) : (
                        <span className="text-green-600">{currencySymbol}0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip content="Ajustar suscripción">
                          <Button size="xs" variant="outline" onClick={() => handleOpenSubModal(row)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Generar cobro interno">
                           <Button size="xs" variant="outline" onClick={() => handleOpenInvModal(row)}>
                             <Plus className="h-3 w-3" />
                           </Button>
                         </Tooltip>
                         <Tooltip content="Historial de cobros">
                           <Button size="xs" variant="outline" onClick={() => handleOpenHistoryModal(row)}>
                             <History className="h-3 w-3" />
                           </Button>
                         </Tooltip>
                         <Tooltip content="Registrar Pago">
                           <Button size="xs" variant="outline" onClick={() => handleOpenPayModal(row)}>
                             <CreditCard className="h-3 w-3" />
                           </Button>
                         </Tooltip>
                         <Tooltip content="Anular Cobro Interno">
                           <Button size="xs" variant="outline" onClick={() => handleOpenVoidModal(row)}>
                             <Ban className="h-3 w-3 text-amber-600" />
                           </Button>
                         </Tooltip>
                        {isCompanyActive ? (
                          <Tooltip content="Suspender compañía">
                            <Button size="xs" variant="danger" onClick={() => handleSuspendCompany(row)}>
                              <ShieldAlert className="h-3 w-3" />
                            </Button>
                          </Tooltip>
                        ) : (
                          <Tooltip content="Reactivar compañía">
                            <Button size="xs" variant="primary" onClick={() => handleReactivateCompany(row)}>
                              <Key className="h-3 w-3" />
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODALES */}

      {/* 1. MODAL SUSCRIPCIÓN */}
      {showSubModal && selectedRow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-md w-full bg-white space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Suscripción de Cooperativa</h3>
            <p className="text-xs text-slate-500">Ajusta el plan, ciclo y precio contratado para {selectedRow.legal_name}.</p>
            <form onSubmit={handleSaveSubscription} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Plan</label>
                <select
                  value={subPlan}
                  onChange={(e) => {
                    const val = e.target.value
                    setSubPlan(val)
                    const chosen = plans.find(p => p.id === val)
                    if (chosen) {
                      setSubPrice(subCycle === 'annual' ? Number(chosen.price_monthly) * 12 : Number(chosen.price_monthly))
                    }
                  }}
                  required
                  className="w-full mt-1 p-2 text-xs border rounded"
                >
                  <option value="">Seleccione un plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Ciclo de Facturación</label>
                <select
                  value={subCycle}
                  onChange={(e) => {
                    const val = e.target.value
                    setSubCycle(val)
                    const chosen = plans.find(p => p.id === subPlan)
                    if (chosen) {
                      setSubPrice(val === 'annual' ? Number(chosen.price_monthly) * 12 : Number(chosen.price_monthly))
                    }
                  }}
                  className="w-full mt-1 p-2 text-xs border rounded"
                >
                  <option value="monthly">Mensual</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Precio Pactado</label>
                <input type="number" step="0.01" value={subPrice} onChange={(e) => setSubPrice(Number(e.target.value))} required className="w-full mt-1 p-2 text-xs border rounded" />
                <p className="text-[10px] text-slate-500 mt-1">
                  El precio de la suscripción es el valor pactado con esta compañía. Cambiar el precio del catálogo de planes no modifica facturas ya emitidas.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Notas / Referencias</label>
                <textarea value={subNotes} onChange={(e) => setSubNotes(e.target.value)} className="w-full mt-1 p-2 text-xs border rounded h-16" placeholder="Detalles de la contratación..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowSubModal(false)}>Cancelar</Button>
                <Button type="submit" variant="primary">Guardar Suscripción</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 2. MODAL GENERAR FACTURA */}
      {showInvModal && selectedRow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-md w-full bg-white space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Generar Cobro Interno SaaS</h3>
            <p className="text-xs text-slate-500">Emite un nuevo recibo interno manual a {selectedRow.legal_name}.</p>
            <form onSubmit={handleGenerateInvoice} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Monto</label>
                <input type="number" step="0.01" value={invAmount} onChange={(e) => setInvAmount(Number(e.target.value))} required className="w-full mt-1 p-2 text-xs border rounded" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Inicio Periodo</label>
                  <input type="date" value={invPeriodStart} onChange={(e) => setInvPeriodStart(e.target.value)} required className="w-full mt-1 p-2 text-xs border rounded" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Fin Periodo</label>
                  <input type="date" value={invPeriodEnd} onChange={(e) => setInvPeriodEnd(e.target.value)} required className="w-full mt-1 p-2 text-xs border rounded" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Fecha Vence</label>
                <input type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} required className="w-full mt-1 p-2 text-xs border rounded" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Notas</label>
                <textarea value={invNotes} onChange={(e) => setInvNotes(e.target.value)} className="w-full mt-1 p-2 text-xs border rounded h-16" placeholder="Detalles de facturación..." />
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Las fechas se calculan desde la suscripción y pueden ajustarse antes de guardar.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowInvModal(false)}>Cancelar</Button>
                <Button type="submit" variant="primary">Generar Cobro Interno</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 3. MODAL REGISTRAR PAGO */}
      {showPayModal && selectedRow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-md w-full bg-white space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Registrar Pago SaaS</h3>
            <p className="text-xs text-slate-500">Registrar abono de cobros para {selectedRow.legal_name}.</p>
            <form onSubmit={handleRegisterPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Cobro/Recibo Pendiente</label>
                <select value={selectedInvoiceId} onChange={(e) => {
                  setSelectedInvoiceId(e.target.value)
                  const chosen = payInvoices.find(i => i.id === e.target.value)
                  if (chosen) setPayAmount(chosen.balance)
                }} required className="w-full mt-1 p-2 text-xs border rounded">
                  <option value="">Seleccione un cobro pendiente</option>
                  {payInvoices.map((i) => (
                    <option key={i.id} value={i.id}>{formatPeriodLabel(i.period_start, i.period_end, i.invoice_number, i.balance)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Monto del Pago</label>
                <input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} required className="w-full mt-1 p-2 text-xs border rounded" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Método de Pago</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full mt-1 p-2 text-xs border rounded">
                  <option value="transfer">Transferencia bancaria</option>
                  <option value="deposit">Depósito</option>
                  <option value="cash">Efectivo</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Referencia de Pago</label>
                <input type="text" value={payReference} onChange={(e) => setPayReference(e.target.value)} className="w-full mt-1 p-2 text-xs border rounded" placeholder="Número de depósito/transferencia" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Notas</label>
                <textarea value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className="w-full mt-1 p-2 text-xs border rounded h-16" placeholder="Comentarios sobre el pago..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowPayModal(false)}>Cancelar</Button>
                <Button type="submit" variant="primary">Registrar Pago</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 4. MODAL ANULAR FACTURA */}
      {showVoidModal && selectedRow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-md w-full bg-white space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Anular Cobro Interno SaaS</h3>
            <p className="text-xs text-slate-500">Cancela deudas activas de {selectedRow.legal_name}. Esta acción es irreversible.</p>
            <form onSubmit={handleVoidInvoice} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Cobro/Recibo a Anular</label>
                <select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} required className="w-full mt-1 p-2 text-xs border rounded">
                  <option value="">Seleccione una factura</option>
                  {payInvoices.map((i) => (
                    <option key={i.id} value={i.id}>{formatPeriodLabel(i.period_start, i.period_end, i.invoice_number, i.balance)} - {i.status.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Razón de Anulación</label>
                <textarea value={voidNotes} onChange={(e) => setVoidNotes(e.target.value)} required className="w-full mt-1 p-2 text-xs border rounded h-16" placeholder="Explique por qué se anula esta factura..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowVoidModal(false)}>Cancelar</Button>
                <Button type="submit" variant="danger">Anular Cobro Interno</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 5. MODAL HISTORIAL DE COBROS */}
      {showHistoryModal && selectedRow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-4xl w-full bg-white space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Historial de Cobros y Recibos</h3>
                <p className="text-xs text-slate-500 mt-1">Historial completo para la cooperativa {selectedRow.legal_name}.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowHistoryModal(false)}>Cerrar</Button>
            </div>

            {/* Tabs de Historial */}
            <div className="flex gap-2 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setActiveHistoryTab('invoices')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  activeHistoryTab === 'invoices' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Cobros Emitidos ({historyInvoices.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveHistoryTab('payments')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  activeHistoryTab === 'payments' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Pagos Registrados ({historyPayments.length})
              </button>
            </div>

            {activeHistoryTab === 'invoices' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                    <tr>
                      <th className="px-3 py-2">Número Interno</th>
                      <th className="px-3 py-2">Período</th>
                      <th className="px-3 py-2">Emisión</th>
                      <th className="px-3 py-2">Vence</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                      <th className="px-3 py-2 text-right">Pagado</th>
                      <th className="px-3 py-2 text-right">Saldo</th>
                      <th className="px-3 py-2 text-center">Estado</th>
                      <th className="px-3 py-2 text-center">Recibo</th>
                      <th className="px-3 py-2">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-bold text-slate-900">{inv.invoice_number}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {inv.period_start ? `${inv.period_start} al ${inv.period_end}` : '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{inv.due_date}</td>
                        <td className="px-3 py-2 text-right font-semibold">{currencySymbol}${Number(inv.amount).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-green-600">{currencySymbol}${Number(inv.amount_paid || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-black text-slate-800">{currencySymbol}${Number(inv.balance).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            inv.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                            inv.status === 'partial' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            inv.status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                            inv.status === 'void' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            {inv.status === 'paid' ? 'Pagado' :
                             inv.status === 'partial' ? 'Parcial' :
                             inv.status === 'overdue' ? 'Vencido' :
                             inv.status === 'void' ? 'Anulado' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button size="xs" variant="outline" onClick={() => handleOpenReceiptModal(inv)}>
                            <Printer className="h-3 w-3" />
                          </Button>
                        </td>
                        <td className="px-3 py-2 text-slate-500 max-w-xs truncate" title={inv.notes}>{inv.notes || '—'}</td>
                      </tr>
                    ))}
                    {historyInvoices.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-8 text-center text-slate-400">No hay cobros generados para esta compañía.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                    <tr>
                      <th className="px-3 py-2">Recibo Relacionado</th>
                      <th className="px-3 py-2">Monto Pagado</th>
                      <th className="px-3 py-2">Método</th>
                      <th className="px-3 py-2">Referencia</th>
                      <th className="px-3 py-2">Fecha de Registro</th>
                      <th className="px-3 py-2">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-semibold text-slate-800">
                          {pay.saas_invoices?.invoice_number || '—'}
                        </td>
                        <td className="px-3 py-2 font-bold text-green-700">{currencySymbol}${Number(pay.amount).toFixed(2)}</td>
                        <td className="px-3 py-2 capitalize">
                          {pay.payment_method === 'transfer' ? 'Transferencia' :
                           pay.payment_method === 'deposit' ? 'Depósito' :
                           pay.payment_method === 'cash' ? 'Efectivo' : 'Otro'}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{pay.reference || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{pay.created_at ? new Date(pay.created_at).toLocaleString() : '—'}</td>
                        <td className="px-3 py-2 text-slate-500 max-w-xs truncate" title={pay.notes}>{pay.notes || '—'}</td>
                      </tr>
                    ))}
                    {historyPayments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-slate-400">No se han registrado pagos para esta compañía.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Datos de Transferencia SaaS */}
            {globalSettings && (globalSettings.payment_bank_name || globalSettings.payment_instructions) && (
              <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-3 text-[11px] text-slate-700 mt-3 text-left">
                <p className="font-bold text-purple-800 uppercase tracking-wider text-[10px]">Datos de Pago para Renovación SaaS:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                  {globalSettings.payment_bank_name && (
                    <p>
                      <strong>Banco:</strong> {globalSettings.payment_bank_name} {globalSettings.payment_account_type ? `(${globalSettings.payment_account_type})` : ''}
                    </p>
                  )}
                  {globalSettings.payment_account_number && (
                    <p>
                      <strong>Cuenta:</strong> {globalSettings.payment_account_number}
                    </p>
                  )}
                  {globalSettings.payment_account_holder && (
                    <p>
                      <strong>Titular:</strong> {globalSettings.payment_account_holder} {globalSettings.payment_account_holder_id ? `· RUC/CI: ${globalSettings.payment_account_holder_id}` : ''}
                    </p>
                  )}
                  {globalSettings.payment_instructions && (
                    <p className="md:col-span-2 text-slate-650 italic">
                      <strong>Instrucciones:</strong> {globalSettings.payment_instructions}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[10px] text-slate-500 mt-2 text-left">
              <p className="font-bold text-slate-700">Nota Legal Aclaratoria:</p>
              <p className="mt-0.5">{receiptNote}</p>
            </div>
          </Card>
        </div>
      )}

      {/* 6. MODAL RECIBO DETALLADO IMPRIMIBLE */}
      {showReceiptModal && selectedInvoice && selectedRow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-2xl w-full bg-white space-y-4 max-h-[90vh] overflow-y-auto" id="printable-receipt">
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-receipt, #printable-receipt * {
                  visibility: visible;
                }
                #printable-receipt {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                  color: black !important;
                  padding: 10px !important;
                }
                .print-hide {
                  display: none !important;
                }
              }
            `}</style>
            
            {/* Header del modal (oculto en impresión) */}
            <div className="flex justify-between items-center print-hide border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Recibo Interno de Cobro</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => window.print()}>
                  Imprimir Comprobante
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowReceiptModal(false)}>
                  Cerrar
                </Button>
              </div>
            </div>

            {/* CONTENIDO DEL COMPROBANTE */}
            <div className="space-y-6 text-slate-800">
              {/* Encabezado del Comprobante */}
              <div className="flex justify-between items-start border-b-2 border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900">MotoGremio SaaS</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Comprobante de Control Interno Administrativo</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 block uppercase">Cobro Interno Nro.</span>
                  <span className="text-sm font-black text-slate-900 font-mono">{selectedInvoice.invoice_number}</span>
                </div>
              </div>

              {/* Detalles del Cliente / Suscripción */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Cliente:</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedRow.legal_name}</p>
                  <p className="text-slate-500 mt-0.5">RUC: {selectedRow.ruc}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Detalles de Emisión:</p>
                  <p className="mt-0.5 text-slate-700"><strong>Fecha Emisión:</strong> {selectedInvoice.created_at ? new Date(selectedInvoice.created_at).toLocaleDateString() : '—'}</p>
                  <p className="text-slate-700"><strong>Fecha Vencimiento:</strong> {selectedInvoice.due_date}</p>
                  <p className="text-slate-700"><strong>Período:</strong> {selectedInvoice.period_start ? `${selectedInvoice.period_start} al ${selectedInvoice.period_end}` : '—'}</p>
                </div>
              </div>

              {/* Tabla de Concepto y Totales */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Concepto</th>
                      <th className="px-4 py-2 text-right">Monto Emitido</th>
                      <th className="px-4 py-2 text-right">Monto Pagado</th>
                      <th className="px-4 py-2 text-right">Saldo Pendiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Renovación y Soporte Mensual de Plataforma SaaS
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {currencySymbol}${Number(selectedInvoice.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        {currencySymbol}${Number(selectedInvoice.amount_paid || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        {currencySymbol}${Number(selectedInvoice.balance).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Historial de abonos específicos */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Abonos / Pagos Registrados:</h4>
                <div className="border border-slate-150 rounded-lg overflow-hidden">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-50 border-b border-slate-150 font-bold text-slate-500">
                      <tr>
                        <th className="px-3 py-1.5">Fecha</th>
                        <th className="px-3 py-1.5">Método</th>
                        <th className="px-3 py-1.5">Referencia</th>
                        <th className="px-3 py-1.5 text-right">Abono</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyPayments
                        .filter((p) => p.saas_invoice_id === selectedInvoice.id || p.saas_invoices?.invoice_number === selectedInvoice.invoice_number)
                        .map((pay) => (
                          <tr key={pay.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 whitespace-nowrap">
                              {pay.created_at ? new Date(pay.created_at).toLocaleString() : '—'}
                            </td>
                            <td className="px-3 py-2 capitalize">
                              {pay.payment_method === 'transfer' ? 'Transferencia' :
                               pay.payment_method === 'deposit' ? 'Depósito' :
                               pay.payment_method === 'cash' ? 'Efectivo' : 'Otro'}
                            </td>
                            <td className="px-3 py-2 text-slate-700 font-mono">{pay.reference || '—'}</td>
                            <td className="px-3 py-2 text-right font-bold text-green-700">
                              {currencySymbol}${Number(pay.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      {historyPayments.filter((p) => p.saas_invoice_id === selectedInvoice.id || p.saas_invoices?.invoice_number === selectedInvoice.invoice_number).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-slate-400 italic">No se registran abonos o pagos asociados a este cobro.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Información Bancaria (si existe) */}
              {globalSettings && (globalSettings.payment_bank_name || globalSettings.payment_instructions) && (
                <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-3 text-[11px]">
                  <p className="font-bold text-purple-800 uppercase tracking-wider text-[10px]">Datos de Pago para Renovación SaaS:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                    {globalSettings.payment_bank_name && (
                      <p><strong>Banco:</strong> {globalSettings.payment_bank_name} {globalSettings.payment_account_type ? `(${globalSettings.payment_account_type})` : ''}</p>
                    )}
                    {globalSettings.payment_account_number && (
                      <p><strong>Cuenta:</strong> {globalSettings.payment_account_number}</p>
                    )}
                    {globalSettings.payment_account_holder && (
                      <p><strong>Titular:</strong> {globalSettings.payment_account_holder} {globalSettings.payment_account_holder_id ? `· RUC/CI: ${globalSettings.payment_account_holder_id}` : ''}</p>
                    )}
                    {globalSettings.payment_instructions && (
                      <p className="md:col-span-2 text-slate-600 italic"><strong>Instrucciones:</strong> {globalSettings.payment_instructions}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Nota Legal Aclaratoria */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] text-slate-500 text-left">
                <p className="font-bold text-slate-700">Nota Legal Aclaratoria:</p>
                <p className="mt-0.5">{receiptNote}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
