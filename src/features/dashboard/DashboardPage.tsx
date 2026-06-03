import { useEffect, useState } from 'react'
import {
  Users, Bike, Wallet,
  ShieldAlert, Calendar, AlertTriangle, CheckCircle,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatCard } from './components/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabaseClient'
import { formatDate } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'

// ─── Tipos de métricas ────────────────────────────────
interface DashboardMetrics {
  totalMembers:     number
  activeMembers:    number
  totalVehicles:    number
  activeVehicles:   number
  pendingPayments:  number
  docsExpiringSoon: number
  docsExpired:      number
  pendingSanctions: number
  nextMeeting:      { title: string; date: string; location: string } | null
}

const EMPTY_METRICS: DashboardMetrics = {
  totalMembers:     0,
  activeMembers:    0,
  totalVehicles:    0,
  activeVehicles:   0,
  pendingPayments:  0,
  docsExpiringSoon: 0,
  docsExpired:      0,
  pendingSanctions: 0,
  nextMeeting:      null,
}

// ─── Componente ───────────────────────────────────────
export function DashboardPage() {
  const { profile } = useAuth()
  const { isSuperAdmin } = usePermissions()
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS)
  const [loading, setLoading] = useState(true)

  const companyId   = profile?.company_id
  const companyName = profile?.company?.trade_name ?? profile?.company?.legal_name ?? APP_NAME
  const hour        = new Date().getHours()
  const greeting    = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName   = profile?.first_name ?? 'Usuario'

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    loadMetrics(companyId)
  }, [companyId])

  const loadMetrics = async (cid: string) => {
    setLoading(true)
    try {
      const [membersRes, vehiclesRes, paymentsRes, docsRes, sanctionsRes, meetingsRes] =
        await Promise.allSettled([
          supabase.from('members').select('id,status', { count: 'exact' }).eq('company_id', cid),
          supabase.from('vehicles').select('id,status', { count: 'exact' }).eq('company_id', cid),
          supabase.from('payments').select('id', { count: 'exact' })
            .eq('company_id', cid).in('status', ['pendiente', 'moroso']).is('deleted_at', null),
          supabase.from('documents').select('id,status', { count: 'exact' }).eq('company_id', cid),
          supabase.from('sanctions').select('id', { count: 'exact' })
            .eq('company_id', cid).eq('status', 'pendiente').is('deleted_at', null),
          supabase.from('meetings').select('id,title,date,time,location')
            .eq('company_id', cid).eq('status', 'programada')
            .gte('date', new Date().toISOString().split('T')[0])
            .order('date', { ascending: true }).limit(1),
        ])

      const membersData   = membersRes.status   === 'fulfilled' ? membersRes.value.data   ?? [] : []
      const vehiclesData  = vehiclesRes.status  === 'fulfilled' ? vehiclesRes.value.data  ?? [] : []
      const docsData      = docsRes.status      === 'fulfilled' ? docsRes.value.data      ?? [] : []
      const nextMeetingData = meetingsRes.status === 'fulfilled' ? meetingsRes.value.data?.[0] : null

      setMetrics({
        totalMembers:    membersData.length,
        activeMembers:   membersData.filter(m => m.status === 'activo').length,
        totalVehicles:   vehiclesData.length,
        activeVehicles:  vehiclesData.filter(v => v.status === 'activa').length,
        pendingPayments: paymentsRes.status === 'fulfilled' ? (paymentsRes.value.count ?? 0) : 0,
        docsExpiringSoon: docsData.filter(d => d.status === 'por_vencer').length,
        docsExpired:     docsData.filter(d => d.status === 'vencido').length,
        pendingSanctions: sanctionsRes.status === 'fulfilled' ? (sanctionsRes.value.count ?? 0) : 0,
        nextMeeting: nextMeetingData
          ? { title: nextMeetingData.title, date: nextMeetingData.date, location: nextMeetingData.location ?? '' }
          : null,
      })
    } catch {
      // La BD aún no tiene tablas (Fase 2 pendiente) — mostrar ceros
    } finally {
      setLoading(false)
    }
  }

  // Si es super admin, redirigir a panel admin
  if (isSuperAdmin) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-500 text-sm mt-1">Vista general del SaaS {APP_NAME}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard title="Compañías activas"  value="—" icon={<Users className="h-5 w-5 text-primary-600" />}   loading={loading} />
          <StatCard title="Total suscripciones" value="—" icon={<CheckCircle className="h-5 w-5 text-success-600" />} iconBg="bg-success-50" loading={loading} />
          <StatCard title="Socios registrados" value="—" icon={<Users className="h-5 w-5 text-blue-600" />}     iconBg="bg-blue-50"    loading={loading} />
          <StatCard title="Unidades registradas" value="—" icon={<Bike className="h-5 w-5 text-indigo-600" />}  iconBg="bg-indigo-50"  loading={loading} />
        </div>
        <div className="mt-6">
          <Card padding="md">
            <p className="text-sm text-gray-500 text-center py-4">
              El panel de administración SaaS se construirá en la <strong>Fase 5</strong>.
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Saludo */}
      <div className="mb-7">
        <h1 className="text-xl font-bold text-gray-900">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {companyName} · {formatDate(new Date().toISOString(), "EEEE d 'de' MMMM, yyyy")}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Socios activos"
          value={loading ? '—' : metrics.activeMembers}
          subtitle={`de ${metrics.totalMembers} registrados`}
          icon={<Users className="h-5 w-5 text-primary-600" />}
          loading={loading}
        />
        <StatCard
          title="Unidades activas"
          value={loading ? '—' : metrics.activeVehicles}
          subtitle={`de ${metrics.totalVehicles} registradas`}
          icon={<Bike className="h-5 w-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
          loading={loading}
        />
        <StatCard
          title="Pagos pendientes"
          value={loading ? '—' : metrics.pendingPayments}
          subtitle="cuotas y deudas"
          icon={<Wallet className="h-5 w-5 text-warning-600" />}
          iconBg="bg-warning-50"
          alert={metrics.pendingPayments > 0}
          loading={loading}
        />
        <StatCard
          title="Sanciones pendientes"
          value={loading ? '—' : metrics.pendingSanctions}
          subtitle="por resolver"
          icon={<ShieldAlert className="h-5 w-5 text-danger-600" />}
          iconBg="bg-danger-50"
          alert={metrics.pendingSanctions > 0}
          loading={loading}
        />
      </div>

      {/* Fila secundaria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Alertas de documentos ── */}
        <Card padding="md" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Alertas de vencimiento</CardTitle>
            <Link to="/documentos">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Ver todos
              </Button>
            </Link>
          </CardHeader>

          {loading ? (
            <div className="space-y-2.5">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 rounded-lg animate-skeleton bg-gray-100" />
              ))}
            </div>
          ) : (metrics.docsExpired + metrics.docsExpiringSoon) === 0 ? (
            <div className="flex items-center gap-3 py-6 px-4 bg-success-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-success-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-success-700">Todo al día</p>
                <p className="text-xs text-success-600">No hay documentos vencidos ni próximos a vencer.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {metrics.docsExpired > 0 && (
                <div className="flex items-center gap-3 p-3.5 bg-danger-50 rounded-lg border border-danger-100">
                  <AlertTriangle className="h-5 w-5 text-danger-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-danger-700">
                      {metrics.docsExpired} documento{metrics.docsExpired > 1 ? 's' : ''} vencido{metrics.docsExpired > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-danger-600">Requieren renovación urgente</p>
                  </div>
                  <Badge variant="danger">{metrics.docsExpired}</Badge>
                </div>
              )}
              {metrics.docsExpiringSoon > 0 && (
                <div className="flex items-center gap-3 p-3.5 bg-warning-50 rounded-lg border border-warning-100">
                  <AlertTriangle className="h-5 w-5 text-warning-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-warning-700">
                      {metrics.docsExpiringSoon} documento{metrics.docsExpiringSoon > 1 ? 's' : ''} por vencer
                    </p>
                    <p className="text-xs text-warning-600">Vencen en menos de 30 días</p>
                  </div>
                  <Badge variant="warning">{metrics.docsExpiringSoon}</Badge>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ── Próxima reunión ── */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>Próxima reunión</CardTitle>
            <Link to="/convocatorias">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Ver
              </Button>
            </Link>
          </CardHeader>

          {loading ? (
            <div className="h-28 rounded-lg animate-skeleton bg-gray-100" />
          ) : metrics.nextMeeting ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{metrics.nextMeeting.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(metrics.nextMeeting.date, "d 'de' MMMM, yyyy")}
                  </p>
                  {metrics.nextMeeting.location && (
                    <p className="text-xs text-gray-400 mt-0.5">{metrics.nextMeeting.location}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <Calendar className="h-8 w-8 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Sin reuniones programadas</p>
              <Link to="/convocatorias">
                <Button variant="outline" size="sm" className="mt-3">
                  Crear convocatoria
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Nota de fase */}
      {!loading && metrics.totalMembers === 0 && (
        <div className="mt-6 p-4 bg-primary-50 border border-primary-100 rounded-xl flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-primary-600 text-xs font-bold">i</span>
          </div>
          <div>
            <p className="text-sm font-medium text-primary-800">Base de datos pendiente de configuración</p>
            <p className="text-xs text-primary-600 mt-0.5">
              El esquema de base de datos se creará en la Fase 2. Los datos aparecerán aquí una vez configurado Supabase.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
