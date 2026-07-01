import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { supabase } from '@/lib/supabaseClient'
import { motion } from 'framer-motion'
import {
  Building2, Users, FileText, CheckCircle,
  AlertCircle, TrendingUp, Activity, ArrowUpRight,
  Lock, Settings, ShieldCheck, DollarSign
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts'
import toast from 'react-hot-toast'
import { getSuperAdminPlanUsageOverview, type SuperAdminPlanOverview } from '../subscription/hooks/usePlanUsage'
import { getAuditLogs, type AuditLogItem } from './hooks/useSuperAdminAuditLogs'

interface GlobalStats {
  total_companies: number
  active_companies: number
  inactive_companies: number
  total_users: number
  total_members: number
  total_vehicles: number
  total_debt: number
  total_payments: number
  top_companies_by_members: any[]
  top_companies_by_vehicles: any[]
  top_companies_by_debt: any[]
}

interface CompanyStats {
  id: string
  legal_name: string
  trade_name: string | null
  ruc: string
  status: string | null
  created_at: string | null
  plan_name: string | null
  members_count: number
  vehicles_count: number
  users_count: number
  total_debt: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1']

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [companies, setCompanies] = useState<CompanyStats[]>([])
  const [planOverview, setPlanOverview] = useState<SuperAdminPlanOverview[]>([])
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([])
  const [billingOverview, setBillingOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      try {
        const [statsRes, companiesRes, overviewRes, logsRes, billingRes] = await Promise.all([
          supabase.rpc('get_super_admin_dashboard_stats'),
          supabase.rpc('get_companies_with_stats'),
          getSuperAdminPlanUsageOverview(),
          getAuditLogs({ limit: 5 }),
          supabase.rpc('get_saas_billing_overview')
        ])

        if (statsRes.error) throw statsRes.error
        if (companiesRes.error) throw companiesRes.error
        if (billingRes.error) throw billingRes.error

        setStats(statsRes.data as unknown as GlobalStats)
        setCompanies((companiesRes.data as unknown as CompanyStats[]) || [])
        setPlanOverview(overviewRes)
        setRecentLogs(logsRes.data || [])
        setBillingOverview(billingRes.data)
      } catch (err: any) {
        toast.error('Error al cargar datos del panel: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  // ─── CALCULACIONES EN MEMORIA CON DATOS REALES ───────────────────────────
  
  // 1. Distribución de Compañías por Plan
  const planDistribution = Object.entries(
    companies.reduce<Record<string, number>>((acc, c) => {
      const name = c.plan_name || 'Sin Plan'
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  // 2. Uso de límites promedio
  const resourceLimitsAvg = planOverview.map(po => ({
    name: po.company_name.slice(0, 12) + '...',
    'Socios %': Math.round(po.members_usage_percent),
    'Unidades %': Math.round(po.vehicles_usage_percent)
  })).slice(0, 5)

  // 3. Crecimiento mensual de compañías
  const growthData = Object.entries(
    companies.reduce<Record<string, number>>((acc, c) => {
      if (c.created_at) {
        const month = new Date(c.created_at).toLocaleString('es-EC', { month: 'short', year: '2-digit' })
        acc[month] = (acc[month] || 0) + 1
      }
      return acc
    }, {})
  ).map(([month, count]) => ({ month, 'Compañías': count }))

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="h-4 bg-slate-150 rounded w-2/5"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="h-80 bg-slate-200 rounded-xl lg:col-span-2"></div>
          <div className="h-80 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-8">
      {/* ─── HEADER EJECUTIVO ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Panel Global Super Admin</h1>
            <span className="bg-primary-50 text-primary-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary-200">
              SaaS Admin
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Visión ejecutiva de compañías, planes, uso y actividad de la plataforma.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Hoy</p>
          <p className="text-sm font-bold text-slate-800">{new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
        </div>
      </div>

      {/* ─── KPIs MODERNOS (Framer Motion) ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Compañías', val: stats.total_companies, icon: Building2, color: 'text-blue-600 bg-blue-50 border-l-blue-500' },
          { label: 'Compañías Activas', val: stats.active_companies, icon: CheckCircle, color: 'text-green-600 bg-green-50 border-l-green-500' },
          { label: 'MRR Estimado', val: billingOverview ? `$${Number(billingOverview.mrr).toFixed(2)}` : '-', desc: 'Suma de suscripciones activas', icon: DollarSign, color: 'text-purple-600 bg-purple-50 border-l-purple-500' },
          { label: 'Ingresos SaaS (Mes)', val: billingOverview ? `$${Number(billingOverview.collected_month).toFixed(2)}` : '-', desc: 'Cobros SaaS recaudados en el mes', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 border-l-emerald-500' },
          { label: 'Pendiente SaaS', val: billingOverview ? `$${Number(billingOverview.pending_total).toFixed(2)}` : '-', desc: 'Facturas SaaS pendientes de pago', icon: Activity, color: 'text-orange-600 bg-orange-50 border-l-orange-500' },
          { label: 'Vencido SaaS', val: billingOverview ? `$${Number(billingOverview.overdue_total).toFixed(2)}` : '-', desc: 'Facturas SaaS vencidas', icon: AlertCircle, color: 'text-red-600 bg-red-50 border-l-red-500' },
          { label: 'Socios Totales', val: stats.total_members, icon: Users, color: 'text-indigo-600 bg-indigo-50 border-l-indigo-500' },
          { label: 'Unidades Conectadas', val: stats.total_vehicles, icon: FileText, color: 'text-sky-600 bg-sky-50 border-l-sky-500' }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <Card className={`p-5 flex items-center gap-4 border-l-4 ${item.color} shadow-sm hover:shadow-md transition-shadow h-full`}>
              <div className={`p-3 rounded-xl bg-white/70 shadow-sm text-slate-800 shrink-0`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{item.label}</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{item.val}</p>
                {item.desc && <p className="text-[9px] text-slate-400 mt-1 leading-tight">{item.desc}</p>}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ─── GRÁFICOS INTERACTIVOS (Recharts) ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución por Plan */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Compañías por Plan</h3>
            <p className="text-xs text-slate-400">Distribución de planes contratados en el SaaS</p>
          </div>
          <div className="h-64">
            {planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {planDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} compañías`, 'Uso']} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 italic text-xs">Sin información</div>
            )}
          </div>
        </Card>

        {/* Uso de Recursos Promedio */}
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Uso de Límites por Compañía</h3>
            <p className="text-xs text-slate-400">Porcentaje de consumo de socios y unidades vs límites del plan</p>
          </div>
          <div className="h-64">
            {resourceLimitsAvg.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resourceLimitsAvg}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(val: number) => `${val}%`} />
                  <Tooltip formatter={(value: any) => [`${value}%`, '']} />
                  <Legend />
                  <Bar dataKey="Socios %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Unidades %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 italic text-xs">Sin información de límites</div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crecimiento Mensual */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Crecimiento de Compañías</h3>
            <p className="text-xs text-slate-400">Cooperativas dadas de alta por mes</p>
          </div>
          <div className="h-64">
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="Compañías" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 italic text-xs">Sin datos registrados</div>
            )}
          </div>
        </Card>

        {/* Últimas compañías registradas */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Últimos Registros</h3>
              <p className="text-xs text-slate-400">Cooperativas más recientes incorporadas</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
          <div className="space-y-3">
            {companies.slice(0, 5).map((c) => (
              <div key={c.id} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{c.legal_name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">RUC: {c.ruc}</p>
                </div>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-600">
                  {c.plan_name || 'Sin Plan'}
                </span>
              </div>
            ))}
            {companies.length === 0 && <p className="text-xs text-slate-400 italic">No hay cooperativas registradas.</p>}
          </div>
        </Card>
      </div>

      {/* ─── MÓDULOS SaaS ADICIONALES (Roadmap) ─────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Roadmap ejecutivo del SaaS</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Suscripciones SaaS', desc: 'Gestión de planes, ciclos y control de acceso por suscripción.', icon: DollarSign, badge: 'SA-2C', status: 'Completado' },
            { label: 'Facturación SaaS / Cobros Internos', desc: 'Generación de cobros internos, pagos, vencidos, recibos y suspensión.', icon: FileText, badge: 'SA-2C', status: 'Completado' },
            { label: 'Métricas Globales', desc: 'KPIs base disponibles; pendiente analítica histórica avanzada.', icon: TrendingUp, badge: 'SA-2B', status: 'Parcial' },
            { label: 'Uso de Límites por Plan', desc: 'Uso y límites visibles; pendiente alertas/recomendaciones de upgrade.', icon: ShieldCheck, badge: 'SA-2B', status: 'Parcial' },
            { label: 'Seguridad Global', desc: 'Auditoría base disponible; pendiente controles avanzados de seguridad.', icon: Lock, badge: 'SA-2D', status: 'Parcial' },
            { label: 'Alertas Globales', desc: 'Notificaciones por vencimientos, compañías suspendidas y límites críticos.', icon: AlertCircle, badge: 'SA-2E', status: 'Pendiente' },
            { label: 'Salud de Compañías', desc: 'Indicadores de riesgo, baja actividad, deuda y oportunidades de upgrade.', icon: Activity, badge: 'SA-2B', status: 'Pendiente' },
            { label: 'Configuración Global', desc: 'Parámetros globales del SaaS como días de gracia, textos y reglas generales.', icon: Settings, badge: 'SA-2D', status: 'Pendiente' }
          ].map((m, idx) => (
            <Card key={idx} className="p-5 border border-dashed border-slate-200 bg-slate-50/50 flex flex-col justify-between h-40">
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <m.icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase">
                    {m.badge}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 mt-3">{m.label}</h4>
                <p className="text-[11px] text-slate-500 leading-normal mt-1">{m.desc}</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                  m.status === 'Completado' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
                  m.status === 'Parcial' ? 'text-amber-700 bg-amber-50 border-amber-100' :
                  'text-slate-500 bg-slate-100 border-slate-200'
                }`}>
                  {m.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ─── AUDITORÍA RECIENTE ─────────────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-slate-500" />
              Bitácora de Eventos Reciente
            </h3>
            <p className="text-xs text-slate-400">Últimas acciones realizadas por administradores en las bases de datos</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2">Cooperativa</th>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Acción</th>
                <th className="px-4 py-2">Tabla</th>
                <th className="px-4 py-2 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{log.company_name || 'SaaS'}</td>
                  <td className="px-4 py-2.5">{log.user_full_name || 'Desconocido'}</td>
                  <td className="px-4 py-2.5"><code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">{log.action}</code></td>
                  <td className="px-4 py-2.5 font-mono text-[10px]">{log.table_name}</td>
                  <td className="px-4 py-2.5 text-right text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic">
                    Sin eventos registrados en la bitácora.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
