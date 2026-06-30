import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabaseClient'
import {
  DollarSign, Activity,
  AlertCircle, ShieldCheck, Plus, CreditCard,
  Ban, ShieldAlert, Key, Edit
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
}

export function SuperAdminSubscriptions() {
  const [overview, setOverview] = useState<BillingOverview | null>(null)
  const [subscriptions, setSubscriptions] = useState<CompanySubscriptionRow[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [overviewRes, subsRes, plansRes] = await Promise.all([
        supabase.rpc('get_saas_billing_overview'),
        supabase.rpc('get_company_subscriptions'),
        supabase.from('plans').select('id, name, price_monthly').eq('is_active', true)
      ])

      if (overviewRes.error) throw overviewRes.error
      if (subsRes.error) throw subsRes.error
      if (plansRes.error) throw plansRes.error

      setOverview(overviewRes.data as unknown as BillingOverview)
      setSubscriptions((subsRes.data as unknown as CompanySubscriptionRow[]) || [])
      setPlans((plansRes.data as unknown as Plan[]) || [])
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

  const handleOpenInvModal = (row: CompanySubscriptionRow) => {
    if (!row.sub_id) {
      toast.error('La compañía debe tener una suscripción activa antes de facturar.')
      return
    }
    setSelectedRow(row)
    setInvAmount(row.price_amount || 0)
    const today = new Date().toISOString().split('T')[0]
    setInvPeriodStart(today)
    setInvPeriodEnd('')
    setInvDueDate('')
    setInvNotes('')
    setShowInvModal(true)
  }

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRow || !selectedRow.sub_id || !selectedRow.plan_id) return

    try {
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
      toast.success('Factura generada exitosamente.')
      setShowInvModal(false)
      loadData()
    } catch (err: any) {
      toast.error('Error al generar factura: ' + err.message)
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
        .select('id, invoice_number, amount, amount_paid, balance, status, due_date')
        .eq('company_id', row.company_id)
        .neq('status', 'void')
        .gt('balance', 0)
        .order('due_date', { ascending: true })

      if (error) throw error
      setPayInvoices(data || [])
    } catch (err: any) {
      toast.error('Error al cargar facturas pendientes: ' + err.message)
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
        .select('id, invoice_number, amount, amount_paid, balance, status, due_date')
        .eq('company_id', row.company_id)
        .neq('status', 'void')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPayInvoices(data || [])
    } catch (err: any) {
      toast.error('Error al cargar facturas: ' + err.message)
    }
  }

  const handleVoidInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoiceId || !voidNotes) return

    try {
      const { error } = await supabase.rpc('mark_saas_invoice_void', {
        p_invoice_id: selectedInvoiceId,
        p_notes: voidNotes
      })

      if (error) throw error
      toast.success('Factura anulada.')
      setShowVoidModal(false)
      loadData()
    } catch (err: any) {
      toast.error('Error al anular factura: ' + err.message)
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
            { label: 'MRR Estimado', val: `$${Number(overview.mrr).toFixed(2)}`, icon: DollarSign, color: 'text-blue-600 bg-blue-50 border-l-blue-500' },
            { label: 'Cobrado del Mes', val: `$${Number(overview.collected_month).toFixed(2)}`, icon: ShieldCheck, color: 'text-green-600 bg-green-50 border-l-green-500' },
            { label: 'Pendiente Cobro', val: `$${Number(overview.pending_total).toFixed(2)}`, icon: Activity, color: 'text-orange-600 bg-orange-50 border-l-orange-500' },
            { label: 'Facturas Vencidas', val: `$${Number(overview.overdue_total).toFixed(2)}`, icon: AlertCircle, color: 'text-red-600 bg-red-50 border-l-red-500' },
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
                      {row.price_amount !== null ? `$${Number(row.price_amount).toFixed(2)}` : '—'}
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
                        <span className="text-red-600">${Number(row.outstanding_balance).toFixed(2)}</span>
                      ) : (
                        <span className="text-green-600">$0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="xs" variant="outline" title="Ajustar suscripción" onClick={() => handleOpenSubModal(row)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="xs" variant="outline" title="Facturar cobro" onClick={() => handleOpenInvModal(row)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="xs" variant="outline" title="Registrar Pago" onClick={() => handleOpenPayModal(row)}>
                          <CreditCard className="h-3 w-3" />
                        </Button>
                        <Button size="xs" variant="outline" title="Anular Factura" onClick={() => handleOpenVoidModal(row)}>
                          <Ban className="h-3 w-3 text-amber-600" />
                        </Button>
                        {isCompanyActive ? (
                          <Button size="xs" variant="danger" title="Suspender por falta de pago" onClick={() => handleSuspendCompany(row)}>
                            <ShieldAlert className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button size="xs" variant="primary" title="Reactivar servicio" onClick={() => handleReactivateCompany(row)}>
                            <Key className="h-3 w-3" />
                          </Button>
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
                <select value={subPlan} onChange={(e) => setSubPlan(e.target.value)} required className="w-full mt-1 p-2 text-xs border rounded">
                  <option value="">Seleccione un plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Ciclo de Facturación</label>
                <select value={subCycle} onChange={(e) => setSubCycle(e.target.value)} className="w-full mt-1 p-2 text-xs border rounded">
                  <option value="monthly">Mensual</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Precio Pactado</label>
                <input type="number" step="0.01" value={subPrice} onChange={(e) => setSubPrice(Number(e.target.value))} required className="w-full mt-1 p-2 text-xs border rounded" />
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Generar Cobro / Factura SaaS</h3>
            <p className="text-xs text-slate-500">Emite una nueva factura manual a {selectedRow.legal_name}.</p>
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
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowInvModal(false)}>Cancelar</Button>
                <Button type="submit" variant="primary">Generar Factura</Button>
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
                <label className="block text-xs font-bold text-slate-700">Factura Pendiente</label>
                <select value={selectedInvoiceId} onChange={(e) => {
                  setSelectedInvoiceId(e.target.value)
                  const chosen = payInvoices.find(i => i.id === e.target.value)
                  if (chosen) setPayAmount(chosen.balance)
                }} required className="w-full mt-1 p-2 text-xs border rounded">
                  <option value="">Seleccione una factura</option>
                  {payInvoices.map((i) => (
                    <option key={i.id} value={i.id}>{i.invoice_number} (Saldo: ${Number(i.balance).toFixed(2)})</option>
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Anular Factura SaaS</h3>
            <p className="text-xs text-slate-500">Cancela deudas activas de {selectedRow.legal_name}. Esta acción es irreversible.</p>
            <form onSubmit={handleVoidInvoice} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Factura a Anular</label>
                <select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} required className="w-full mt-1 p-2 text-xs border rounded">
                  <option value="">Seleccione una factura</option>
                  {payInvoices.map((i) => (
                    <option key={i.id} value={i.id}>{i.invoice_number} (Saldo: ${Number(i.balance).toFixed(2)}) - {i.status.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Razón de Anulación</label>
                <textarea value={voidNotes} onChange={(e) => setVoidNotes(e.target.value)} required className="w-full mt-1 p-2 text-xs border rounded h-16" placeholder="Explique por qué se anula esta factura..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowVoidModal(false)}>Cancelar</Button>
                <Button type="submit" variant="danger">Anular Factura</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
