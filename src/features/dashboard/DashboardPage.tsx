import { useEffect, useState } from 'react'
import {
  Users, Car, Wallet, ShieldAlert, Calendar, AlertTriangle,
  CheckCircle, ArrowRight, DollarSign, PlusCircle, FileText,
  Clock, TrendingUp, AlertOctagon, Info, ArrowUpRight
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { StatCard } from './components/StatCard'
import { SocioPortalPage } from './SocioPortalPage'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'
import { supabase } from '@/lib/supabaseClient'
import { formatDate } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import type { DebtorSummary } from '@/types'

// ─── Tipos de métricas ────────────────────────────────
interface DashboardMetrics {
  totalMembers:     number
  activeMembers:    number
  totalVehicles:    number
  activeVehicles:   number
  pendingCharges:   number
  docsExpiringSoon: number
  docsExpired:      number
  pendingSanctions: number
  licensesExpiring: number
  licensesExpired:  number
  nextMeeting:      { title: string; date: string; location: string } | null
}

const EMPTY_METRICS: DashboardMetrics = {
  totalMembers:     0,
  activeMembers:    0,
  totalVehicles:    0,
  activeVehicles:   0,
  pendingCharges:   0,
  docsExpiringSoon: 0,
  docsExpired:      0,
  pendingSanctions: 0,
  licensesExpiring: 0,
  licensesExpired:  0,
  nextMeeting:      null,
}

export function DashboardPage() {
  const { profile } = useAuth()
  const { isSuperAdmin, isSocio, canViewPayments, role } = usePermissions()
  
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS)
  const [topDebtors, setTopDebtors] = useState<DebtorSummary[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar alertas y notificaciones del hook de notificaciones
  const { alerts, counts, refresh, loading: alertsLoading } = useNotifications()

  const companyId   = profile?.company_id
  const companyName = profile?.company?.trade_name ?? profile?.company?.legal_name ?? APP_NAME
  const hour        = new Date().getHours()
  const greeting    = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName   = profile?.first_name ?? 'Usuario'

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    loadMetrics(companyId)
    refresh()
  }, [companyId, refresh])

  const loadMetrics = async (cid: string) => {
    setLoading(true)
    try {
      const [membersRes, vehiclesRes, chargesRes, docsRes, sanctionsRes, meetingsRes, licensesRes] =
        await Promise.allSettled([
          supabase.from('members').select('id,status', { count: 'exact' }).eq('company_id', cid),
          supabase.from('vehicles').select('id,status', { count: 'exact' }).eq('company_id', cid),
          supabase.from('charges').select('id,member_id,balance,member:members!charges_member_id_fkey(id,first_name,last_name,document_id)', { count: 'exact' })
            .eq('company_id', cid).in('status', ['pendiente', 'parcial']),
          supabase.from('documents').select('id,status', { count: 'exact' }).eq('company_id', cid),
          supabase.from('sanctions').select('id', { count: 'exact' })
            .eq('company_id', cid).eq('status', 'pendiente').is('deleted_at', null),
          supabase.from('meetings').select('id,title,date,time,location')
            .eq('company_id', cid).eq('status', 'programada')
            .gte('date', new Date().toISOString().split('T')[0])
            .order('date', { ascending: true }).limit(1),
          supabase.from('licenses').select('id,status', { count: 'exact' }).eq('company_id', cid),
        ])

      const membersData   = membersRes.status   === 'fulfilled' ? membersRes.value.data   ?? [] : []
      const vehiclesData  = vehiclesRes.status  === 'fulfilled' ? vehiclesRes.value.data  ?? [] : []
      const chargesData   = chargesRes.status   === 'fulfilled' ? chargesRes.value.data   ?? [] : []
      const docsData      = docsRes.status      === 'fulfilled' ? docsRes.value.data      ?? [] : []
      const licensesData  = licensesRes.status  === 'fulfilled' ? licensesRes.value.data  ?? [] : []
      const nextMeetingData = meetingsRes.status === 'fulfilled' ? meetingsRes.value.data?.[0] : null

      // Calcular top deudores
      const debtorMap = new Map<string, DebtorSummary>()
      for (const c of chargesData) {
        const m = c.member as { id: string; first_name: string; last_name: string; document_id: string } | null
        if (!m || Number(c.balance) <= 0) continue
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
      const sorted = Array.from(debtorMap.values())
        .sort((a, b) => b.totalBalance - a.totalBalance)
        .slice(0, 5) // Mostramos solo los top 5 deudores para mantener el dashboard compacto
      setTopDebtors(sorted)

      setMetrics({
        totalMembers:    membersData.length,
        activeMembers:   membersData.filter(m => m.status === 'activo').length,
        totalVehicles:   vehiclesData.length,
        activeVehicles:  vehiclesData.filter(v => v.status === 'activa').length,
        pendingCharges:  chargesRes.status === 'fulfilled' ? (chargesRes.value.count ?? 0) : 0,
        docsExpiringSoon: docsData.filter(d => d.status === 'por_vencer').length,
        docsExpired:     docsData.filter(d => d.status === 'vencido').length,
        pendingSanctions: sanctionsRes.status === 'fulfilled' ? (sanctionsRes.value.count ?? 0) : 0,
        licensesExpiring: licensesData.filter(l => l.status === 'por_vencer').length,
        licensesExpired:  licensesData.filter(l => l.status === 'vencido').length,
        nextMeeting: nextMeetingData
          ? { title: nextMeetingData.title, date: nextMeetingData.date, location: nextMeetingData.location ?? '' }
          : null,
      })
    } catch (err) {
      console.error('Error loading dashboard metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  // Si es super admin, redirigir a panel admin
  if (isSuperAdmin) {
    return <Navigate to="/super-admin" replace />
  }

  // Si es socio, mostrar su propio portal
  if (isSocio) {
    return <SocioPortalPage />
  }

  // Clases informativas de severidad de alertas
  const severityStyles = {
    critica: {
      bg: 'bg-red-50 border-red-200 text-red-700',
      icon: <AlertOctagon className="h-5 w-5 text-red-600 shrink-0" />,
      badge: 'bg-red-100 text-red-800'
    },
    advertencia: {
      bg: 'bg-amber-50 border-amber-200 text-amber-700',
      icon: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
      badge: 'bg-amber-100 text-amber-800'
    },
    informativa: {
      bg: 'bg-blue-50 border-blue-200 text-blue-700',
      icon: <Info className="h-5 w-5 text-blue-600 shrink-0" />,
      badge: 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* ── SECCIÓN 1: ENCABEZADO PROFESIONAL ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 text-white shadow-lg border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary-500 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
              {role === 'admin' ? 'Administrador' : 'Secretaría'}
            </span>
            <span className="text-slate-400 text-xs">• Panel de Operaciones</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            {greeting}, {firstName}
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Cooperativa: <span className="font-semibold text-white">{companyName}</span>
          </p>
        </div>
        <div className="text-left md:text-right border-t border-slate-700 pt-4 md:pt-0 md:border-none shrink-0">
          <p className="text-xs text-slate-400 font-medium">FECHA DE HOY</p>
          <p className="text-lg font-bold text-white mt-0.5">
            {formatDate(new Date().toISOString(), "EEEE, d 'de' MMMM, yyyy")}
          </p>
          <div className="flex items-center gap-1.5 justify-start md:justify-end text-xs text-green-400 font-medium mt-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            Operativo / Conexión exitosa
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 2: KPIs PRINCIPALES (GRID 6 COLUMNAS) ────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Socios activos"
          value={loading ? '—' : metrics.activeMembers}
          subtitle={`Total: ${metrics.totalMembers}`}
          icon={<Users className="h-5 w-5 text-primary-600" />}
          loading={loading}
        />
        <StatCard
          title="Unidades activas"
          value={loading ? '—' : metrics.activeVehicles}
          subtitle={`Total: ${metrics.totalVehicles}`}
          icon={<Car className="h-5 w-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
          loading={loading}
        />
        <StatCard
          title="Docs. Vencidos"
          value={loading ? '—' : metrics.docsExpired}
          subtitle={`Por vencer: ${metrics.docsExpiringSoon}`}
          icon={<FileText className="h-5 w-5 text-red-600" />}
          iconBg="bg-red-50"
          alert={metrics.docsExpired > 0}
          loading={loading}
        />
        <StatCard
          title="Licencias Vencidas"
          value={loading ? '—' : metrics.licensesExpired}
          subtitle={`Por vencer: ${metrics.licensesExpiring}`}
          icon={<ShieldAlert className="h-5 w-5 text-orange-600" />}
          iconBg="bg-orange-50"
          alert={metrics.licensesExpired > 0}
          loading={loading}
        />
        <StatCard
          title="Cuotas Pendientes"
          value={loading ? '—' : metrics.pendingCharges}
          subtitle="Morosas o parciales"
          icon={<Wallet className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50"
          alert={metrics.pendingCharges > 0}
          loading={loading}
        />
        <StatCard
          title="Alertas Críticas"
          value={alertsLoading ? '—' : counts.critical}
          subtitle={`Total alertas: ${counts.total}`}
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
          iconBg="bg-rose-50"
          alert={counts.critical > 0}
          loading={alertsLoading}
        />
      </div>

      {/* ── SECCIÓN 3: ACCIONES RÁPIDAS (ACCESOS DIRECTOS PREMIUM) ─────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4 text-primary-500" />
          Acciones Rápidas del Operador
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link to="/socios?new=true" className="group">
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 bg-slate-50 hover:bg-primary-50 hover:border-primary-200 transition-all text-center h-24">
              <PlusCircle className="h-6 w-6 text-primary-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-gray-700 mt-2">Registrar Socio</span>
            </div>
          </Link>
          <Link to="/unidades?new=true" className="group">
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-center h-24">
              <Car className="h-6 w-6 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-gray-700 mt-2">Registrar Unidad</span>
            </div>
          </Link>
          <Link to="/documentos?upload=true" className="group">
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition-all text-center h-24">
              <FileText className="h-6 w-6 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-gray-700 mt-2">Subir Documento</span>
            </div>
          </Link>
          {canViewPayments && (
            <Link to="/pagos?collect=true" className="group">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 transition-all text-center h-24">
                <DollarSign className="h-6 w-6 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-gray-700 mt-2">Registrar Pago</span>
              </div>
            </Link>
          )}
          <Link to="/reportes" className="group">
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 bg-slate-50 hover:bg-violet-50 hover:border-violet-200 transition-all text-center h-24">
              <TrendingUp className="h-6 w-6 text-violet-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-gray-700 mt-2">Ver Reportes</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── SECCIÓN 4 & 5: ALERTAS CRÍTICAS Y RESUMEN OPERATIVO ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* WIDGET 1: ALERTAS DEL SISTEMA (RPC get_alerts_summary) */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Alertas y Novedades Críticas
                </CardTitle>
                <Link to="/notificaciones">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                    Buzón completo
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col justify-between">
              {alertsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 rounded-lg animate-pulse bg-gray-100" />
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                  <p className="text-sm font-semibold text-gray-800">¡Cooperativa en orden!</p>
                  <p className="text-xs text-gray-500">No se detectan alertas críticas en el sistema en este momento.</p>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {alerts.slice(0, 4).map(alert => {
                    const style = severityStyles[alert.severity] || severityStyles.informativa
                    return (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm ${style.bg}`}
                      >
                        {style.icon}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 justify-between">
                            <p className="text-sm font-bold truncate">{alert.title}</p>
                            <Badge className={`text-[10px] py-0 px-2 uppercase font-semibold ${style.badge}`}>
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-xs mt-0.5 leading-normal opacity-90">{alert.message}</p>
                          {alert.link_url && (
                            <Link
                              to={alert.link_url}
                              className="inline-flex items-center gap-1 text-[11px] font-bold underline mt-2 hover:opacity-80"
                            >
                              Gestionar novedad <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* WIDGET 2: ESTADO OPERATIVO & PRÓXIMA REUNIÓN */}
        <div className="space-y-6">
          {/* Próxima reunión */}
          <Card>
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase text-gray-700">
                <Calendar className="h-4 w-4 text-indigo-500" />
                Próxima Reunión
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {loading ? (
                <div className="h-24 rounded-lg animate-pulse bg-gray-100" />
              ) : metrics.nextMeeting ? (
                <div className="space-y-3">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <p className="text-sm font-bold text-indigo-950">{metrics.nextMeeting.title}</p>
                    <div className="flex items-center gap-2 text-xs text-indigo-800 mt-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDate(metrics.nextMeeting.date, "EEEE, d 'de' MMMM")}</span>
                    </div>
                    {metrics.nextMeeting.location && (
                      <p className="text-[11px] text-indigo-600 mt-1 italic">
                        📍 {metrics.nextMeeting.location}
                      </p>
                    )}
                  </div>
                  <Link to="/convocatorias" className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver convocatoria completa
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <Calendar className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400">Sin reuniones programadas</p>
                  <Link to="/convocatorias" className="mt-3">
                    <Button variant="outline" size="xs">
                      Crear Convocatoria
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estatus Operativo Rápido */}
          <Card>
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase text-gray-700">
                <Clock className="h-4 w-4 text-slate-500" />
                Resumen del Día
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-600 font-medium">Socio Conductores</span>
                <span className="font-bold text-gray-800">{metrics.totalMembers}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-600 font-medium">Unidades Registradas</span>
                <span className="font-bold text-gray-800">{metrics.totalVehicles}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-600 font-medium">Sanciones Pendientes</span>
                <span className={`font-bold ${metrics.pendingSanctions > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {metrics.pendingSanctions}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── SECCIÓN 6: DEUDORES CLAVE (Widget Principal de Cobros) ─────────────── */}
      {canViewPayments && (
        <Card className="shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-red-500" />
                Socios con Mayor Deuda Pendiente
              </CardTitle>
              <Link to="/pagos">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Módulo de Pagos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 rounded-lg animate-pulse bg-gray-100" />
                ))}
              </div>
            ) : topDebtors.length === 0 ? (
              <div className="flex items-center gap-3 py-5 px-4 bg-green-50 rounded-xl">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700">Sin deudas pendientes</p>
                  <p className="text-xs text-green-600">Todos los socios de la cooperativa están al día.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Socio</th>
                      <th className="text-left px-4 py-2.5 font-bold text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">Cédula</th>
                      <th className="text-center px-4 py-2.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Cuotas</th>
                      <th className="text-right px-4 py-2.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Monto Pendiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {topDebtors.map(debtor => (
                      <tr key={debtor.member_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            to={`/socios/${debtor.member_id}`}
                            className="font-bold text-gray-900 hover:text-primary-600 transition-colors"
                          >
                            {debtor.first_name} {debtor.last_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-gray-500 text-xs font-mono">{debtor.document_id}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="warning">{debtor.chargesCount} cuota{debtor.chargesCount !== 1 ? 's' : ''}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-extrabold text-red-600">${debtor.totalBalance.toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
