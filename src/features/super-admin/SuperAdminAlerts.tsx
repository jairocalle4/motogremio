import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabaseClient'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  TrendingUp,
  Activity,
  DollarSign,
  Building2,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'

interface SuperAdminAlert {
  id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  company_id: string
  company_name: string
  amount: number | null
  due_date: string | null
  status: string | null
  action_label: string
  action_href: string
  created_at: string
}

export function SuperAdminAlerts() {
  const [alerts, setAlerts] = useState<SuperAdminAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const navigate = useNavigate()

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_super_admin_alerts')
      if (error) throw error
      setAlerts((data || []) as unknown as SuperAdminAlert[])
    } catch (err: any) {
      toast.error('Error al cargar alertas: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Count summaries
  const totalAlerts = alerts.length
  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const warningCount = alerts.filter(a => a.severity === 'warning').length
  const infoCount = alerts.filter(a => a.severity === 'info').length

  // Filtered list
  const filteredAlerts = alerts.filter(a => {
    const matchSev = filterSeverity === 'all' || a.severity === filterSeverity
    const matchType = filterType === 'all' || a.type === filterType
    return matchSev && matchType
  })

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-150">
            <AlertCircle className="h-3 w-3 text-red-600" />
            CRÍTICA
          </span>
        )
      case 'warning':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-150">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            ADVERTENCIA
          </span>
        )
      case 'info':
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-150">
            <Info className="h-3 w-3 text-blue-600" />
            INFORMATIVA
          </span>
        )
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'billing_overdue':
      case 'billing_pending':
        return <DollarSign className="h-4 w-4 text-purple-600" />
      case 'subscription_due_soon':
        return <FileText className="h-4 w-4 text-orange-650" />
      case 'company_inactive':
        return <Building2 className="h-4 w-4 text-red-650" />
      case 'member_limit_warning':
      case 'vehicle_limit_warning':
        return <TrendingUp className="h-4 w-4 text-sky-650" />
      default:
        return <Activity className="h-4 w-4 text-slate-500" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="h-4 bg-slate-150 rounded w-2/5"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-80 bg-slate-200 rounded-xl mt-6"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Centro de Alertas Globales</h1>
          <p className="text-sm text-slate-500 mt-1">Supervisión en tiempo real sobre la salud de compañías, límites de planes y cobros.</p>
        </div>
        <Button onClick={loadAlerts} size="sm" variant="outline">
          Actualizar ahora
        </Button>
      </div>

      {/* SUMMARY KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between border-l-4 border-l-slate-400 bg-white">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Alertas</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalAlerts}</p>
          </div>
          <Activity className="h-8 w-8 text-slate-350" />
        </Card>
        <Card className="p-4 flex items-center justify-between border-l-4 border-l-red-500 bg-white">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Críticas</p>
            <p className="text-2xl font-black text-red-600 mt-1">{criticalCount}</p>
          </div>
          <AlertCircle className="h-8 w-8 text-red-300" />
        </Card>
        <Card className="p-4 flex items-center justify-between border-l-4 border-l-amber-500 bg-white">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Advertencias</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{warningCount}</p>
          </div>
          <AlertTriangle className="h-8 w-8 text-amber-300" />
        </Card>
        <Card className="p-4 flex items-center justify-between border-l-4 border-l-blue-500 bg-white">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Informativas</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{infoCount}</p>
          </div>
          <Info className="h-8 w-8 text-blue-300" />
        </Card>
      </div>

      {/* LIST & FILTERS */}
      <Card className="p-6 bg-white space-y-4">
        {/* Filtros */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 border-b border-slate-100 pb-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filtrar alertas:</div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="text-xs p-2 border rounded bg-slate-50 font-semibold"
            >
              <option value="all">Todas las Severidades</option>
              <option value="critical">Críticas</option>
              <option value="warning">Advertencias</option>
              <option value="info">Informativas</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs p-2 border rounded bg-slate-50 font-semibold"
            >
              <option value="all">Todos los Tipos</option>
              <option value="billing_overdue">Cobros Vencidos</option>
              <option value="billing_pending">Cobros Pendientes</option>
              <option value="subscription_due_soon">Suscripciones por Vencer</option>
              <option value="company_inactive">Compañías Inactivas</option>
              <option value="member_limit_warning">Límites de Socios</option>
              <option value="vehicle_limit_warning">Límites de Vehículos</option>
            </select>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-slate-50/50 ${
                alert.severity === 'critical' ? 'border-red-100 bg-red-50/10' :
                alert.severity === 'warning' ? 'border-amber-100 bg-amber-50/10' :
                'border-slate-100 bg-white'
              }`}
            >
              <div className="flex gap-3 items-start min-w-0">
                <div className="p-2.5 rounded-lg bg-white shadow-sm border border-slate-100 shrink-0 mt-0.5">
                  {getTypeIcon(alert.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-black text-slate-800">{alert.title}</h4>
                    {getSeverityBadge(alert.severity)}
                  </div>
                  <p className="text-xs text-slate-650 leading-relaxed mt-1">{alert.description}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Compañía: {alert.company_name} · UUID: {alert.company_id}
                  </p>
                </div>
              </div>
              <Button
                size="xs"
                variant="outline"
                onClick={() => navigate(alert.action_href)}
                className="shrink-0 group hover:border-slate-400"
              >
                <span>{alert.action_label}</span>
                <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          ))}

          {filteredAlerts.length === 0 && (
            <div className="p-12 text-center text-slate-400 italic text-xs">
              No hay alertas globales activas que coincidan con los filtros seleccionados.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
