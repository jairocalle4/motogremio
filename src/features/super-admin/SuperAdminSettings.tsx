import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabaseClient'
import { Settings, ShieldAlert, DollarSign, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

interface SaasSettings {
  next_due_warning_days: number
  grace_period_days: number
  limit_warning_percent: number
  limit_critical_percent: number
  currency_code: string
  currency_symbol: string
  payment_bank_name: string | null
  payment_account_number: string | null
  payment_account_type: string | null
  payment_account_holder: string | null
  payment_account_holder_id: string | null
  payment_instructions: string | null
  internal_receipt_note: string
  suspension_mode: 'manual' | 'auto'
}

export function SuperAdminSettings() {
  const [settings, setSettings] = useState<SaasSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_saas_settings')
      if (error) throw error
      if (data && data.length > 0) {
        setSettings(data[0] as SaasSettings)
      } else {
        toast.error('No se encontró configuración global activa.')
      }
    } catch (err: any) {
      toast.error('Error al cargar configuraciones: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: keyof SaasSettings, value: any) => {
    if (!settings) return
    setSettings({
      ...settings,
      [key]: value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return

    // Validations
    if (settings.limit_warning_percent >= settings.limit_critical_percent) {
      toast.error('El umbral de advertencia debe ser estrictamente menor que el umbral crítico.')
      return
    }

    if (settings.next_due_warning_days < 1 || settings.next_due_warning_days > 30) {
      toast.error('Los días de aviso deben estar entre 1 y 30.')
      return
    }

    if (settings.grace_period_days < 0 || settings.grace_period_days > 30) {
      toast.error('Los días de gracia deben estar entre 0 y 30.')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.rpc('update_saas_settings', {
        p_next_due_warning_days: settings.next_due_warning_days,
        p_grace_period_days: settings.grace_period_days,
        p_limit_warning_percent: settings.limit_warning_percent,
        p_limit_critical_percent: settings.limit_critical_percent,
        p_currency_code: settings.currency_code,
        p_currency_symbol: settings.currency_symbol,
        p_payment_bank_name: settings.payment_bank_name || '',
        p_payment_account_number: settings.payment_account_number || '',
        p_payment_account_type: settings.payment_account_type || '',
        p_payment_account_holder: settings.payment_account_holder || '',
        p_payment_account_holder_id: settings.payment_account_holder_id || '',
        p_payment_instructions: settings.payment_instructions || '',
        p_internal_receipt_note: settings.internal_receipt_note,
        p_suspension_mode: settings.suspension_mode
      })

      if (error) throw error
      toast.success('Configuraciones guardadas y auditadas exitosamente.')
    } catch (err: any) {
      toast.error('Error al guardar configuraciones: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="h-4 bg-slate-150 rounded w-2/5"></div>
        <div className="h-96 bg-slate-200 rounded-xl mt-6"></div>
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="space-y-6 max-w-4xl">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configuración Global del SaaS</h1>
          <p className="text-sm text-slate-500 mt-1">Parametrización general de umbrales, cobros, datos financieros y recibos del sistema.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: COBROS Y VENCIMIENTOS */}
        <Card className="p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Settings className="h-5 w-5 text-primary-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">1. Cobros y Vencimientos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Días de aviso (Facturación)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.next_due_warning_days}
                onChange={(e) => handleChange('next_due_warning_days', parseInt(e.target.value))}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Aviso preventivo en alertas.</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Días de gracia (Suspensión)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={settings.grace_period_days}
                onChange={(e) => handleChange('grace_period_days', parseInt(e.target.value))}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Días extra antes de inactividad.</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Modo de suspensión
              </label>
              <select
                value={settings.suspension_mode}
                onChange={(e) => handleChange('suspension_mode', e.target.value)}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
              >
                <option value="manual">Manual (Recomendado)</option>
                <option value="auto">Automático (Planificado)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                La suspensión automática queda preparada, pero por ahora se trabaja en manual.
              </span>
            </div>
          </div>
        </Card>

        {/* SECCIÓN 2: ALERTAS Y LÍMITES */}
        <Card className="p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">2. Alertas y Límites por Plan</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Umbral de Advertencia %
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.limit_warning_percent}
                onChange={(e) => handleChange('limit_warning_percent', parseInt(e.target.value))}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Alerta preventiva de socios/vehículos.</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Umbral Crítico %
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.limit_critical_percent}
                onChange={(e) => handleChange('limit_critical_percent', parseInt(e.target.value))}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Alerta crítica de socios/vehículos.</span>
            </div>
          </div>
        </Card>

        {/* SECCIÓN 3: MONEDA Y DATOS DE COBRO */}
        <Card className="p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <DollarSign className="h-5 w-5 text-purple-650" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">3. Moneda y Datos de Cobro SaaS</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Código de Moneda
              </label>
              <input
                type="text"
                value={settings.currency_code}
                onChange={(e) => handleChange('currency_code', e.target.value)}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Símbolo de Moneda
              </label>
              <input
                type="text"
                value={settings.currency_symbol}
                onChange={(e) => handleChange('currency_symbol', e.target.value)}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Banco
              </label>
              <input
                type="text"
                value={settings.payment_bank_name || ''}
                onChange={(e) => handleChange('payment_bank_name', e.target.value)}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tipo de Cuenta
              </label>
              <input
                type="text"
                value={settings.payment_account_type || ''}
                onChange={(e) => handleChange('payment_account_type', e.target.value)}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Número de Cuenta
              </label>
              <input
                type="text"
                value={settings.payment_account_number || ''}
                onChange={(e) => handleChange('payment_account_number', e.target.value)}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Titular de la Cuenta
              </label>
              <input
                type="text"
                value={settings.payment_account_holder || ''}
                onChange={(e) => handleChange('payment_account_holder', e.target.value)}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Identificación (RUC/CI) del Titular
              </label>
              <input
                type="text"
                value={settings.payment_account_holder_id || ''}
                onChange={(e) => handleChange('payment_account_holder_id', e.target.value)}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Instrucciones de Pago
              </label>
              <textarea
                value={settings.payment_instructions || ''}
                onChange={(e) => handleChange('payment_instructions', e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        </Card>

        {/* SECCIÓN 4: RECIBO INTERNO */}
        <Card className="p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText className="h-5 w-5 text-slate-650" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">4. Leyenda de Recibo Interno</h3>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Nota Legal / Operativa del Recibo Interno
            </label>
            <textarea
              value={settings.internal_receipt_note}
              onChange={(e) => handleChange('internal_receipt_note', e.target.value)}
              rows={3}
              className="w-full text-xs p-2.5 border rounded bg-slate-50 focus:bg-white"
              required
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Se visualiza al pie de los recibos emitidos para evitar confusión con facturas oficiales.
            </span>
          </div>
        </Card>

        {/* SUBMIT */}
        <div className="flex justify-end gap-3 bg-white p-4 rounded-xl border border-slate-100">
          <Button type="button" variant="outline" onClick={loadSettings} disabled={saving}>
            Restaurar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>
      </form>
    </div>
  )
}
