import { useEffect, useState } from 'react'
import {
  Users, Bike, Wallet,
  ShieldAlert, Calendar, AlertTriangle, CheckCircle,
  ArrowRight, DollarSign,
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
import type { DebtorSummary } from '@/types'
import { SuperAdminDashboard } from '@/features/super-admin/SuperAdminDashboard'

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
  nextMeeting:      null,
}

// ─── Componente ───────────────────────────────────────
export function DashboardPage() {
  const { profile } = useAuth()
  const { isSuperAdmin, canViewPayments } = usePermissions()
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS)
  const [topDebtors, setTopDebtors] = useState<DebtorSummary[]>([])
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
      const [membersRes, vehiclesRes, chargesRes, docsRes, sanctionsRes, meetingsRes] =
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
        ])

      const membersData   = membersRes.status   === 'fulfilled' ? membersRes.value.data   ?? [] : []
      const vehiclesData  = vehiclesRes.status  === 'fulfilled' ? vehiclesRes.value.data  ?? [] : []
      const chargesData   = chargesRes.status   === 'fulfilled' ? chargesRes.value.data   ?? [] : []
      const docsData      = docsRes.status      === 'fulfilled' ? docsRes.value.data      ?? [] : []
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
        .slice(0, 10)
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
    return <SuperAdminDashboard />
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
          title="Cuotas pendientes"
          value={loading ? '—' : metrics.pendingCharges}
          subtitle="cuotas sin pagar"
          icon={<Wallet className="h-5 w-5 text-warning-600" />}
          iconBg="bg-warning-50"
          alert={metrics.pendingCharges > 0}
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

      {/* ── Widget: Lista de deudores ── */}
      {canViewPayments && (
        <Card padding="md" className="mt-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-500" />
              Socios con deuda pendiente
            </CardTitle>
            <Link to="/pagos">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Ver en Pagos
              </Button>
            </Link>
          </CardHeader>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 rounded-lg animate-skeleton bg-gray-100" />
              ))}
            </div>
          ) : topDebtors.length === 0 ? (
            <div className="flex items-center gap-3 py-5 px-4 bg-green-50 rounded-xl">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700">Sin deudas pendientes</p>
                <p className="text-xs text-green-600">Todos los socios están al día con sus cuotas.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wider">Socio</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">Cédula</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">Cuotas</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topDebtors.map(debtor => (
                    <tr key={debtor.member_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          to={`/socios/${debtor.member_id}`}
                          className="font-medium text-gray-900 hover:text-primary-600 transition-colors"
                        >
                          {debtor.first_name} {debtor.last_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-gray-500 text-xs font-mono">{debtor.document_id}</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <Badge variant="warning">{debtor.chargesCount} cuota{debtor.chargesCount !== 1 ? 's' : ''}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-red-600">${debtor.totalBalance.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {topDebtors.length === 10 && (
                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-center">
                  <Link to="/pagos" className="text-xs text-primary-600 hover:underline font-medium">
                    Ver todos los deudores →
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

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
