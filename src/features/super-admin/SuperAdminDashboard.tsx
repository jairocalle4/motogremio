import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { supabase } from '@/lib/supabaseClient'
import { Building2, Users, FileText, CheckCircle, XCircle, CreditCard, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

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

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const { data, error } = await supabase.rpc('get_super_admin_dashboard_stats' as any)
        if (error) throw error
        setStats(data as unknown as GlobalStats)
      } catch (err: any) {
        toast.error('Error al cargar métricas: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Global</h1>
        <p className="text-slate-500">Métricas principales de toda la plataforma SaaS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Compañías</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total_companies}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-green-500">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Compañías Activas</p>
            <p className="text-2xl font-bold text-slate-900">{stats.active_companies}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-red-500">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Compañías Inactivas</p>
            <p className="text-2xl font-bold text-slate-900">{stats.inactive_companies}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-purple-500">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Usuarios</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total_users}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-indigo-500">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Socios</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total_members}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-sky-500">
          <div className="p-3 bg-sky-100 text-sky-600 rounded-lg">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Unidades</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total_vehicles}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-orange-500">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Deuda Global</p>
            <p className="text-2xl font-bold text-slate-900">${stats.total_debt.toFixed(2)}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Pagos Registrados</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total_payments}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4">
          <h3 className="text-md font-semibold text-slate-900 mb-4">Top Compañías x Socios</h3>
          <div className="space-y-3">
            {stats.top_companies_by_members.map((c) => (
              <div key={c.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-slate-700 truncate">{c.legal_name}</span>
                <span className="text-sm font-bold bg-slate-100 px-2 py-1 rounded">{c.count}</span>
              </div>
            ))}
            {stats.top_companies_by_members.length === 0 && <p className="text-sm text-slate-500">Sin datos</p>}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-md font-semibold text-slate-900 mb-4">Top Compañías x Unidades</h3>
          <div className="space-y-3">
            {stats.top_companies_by_vehicles.map((c) => (
              <div key={c.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-slate-700 truncate">{c.legal_name}</span>
                <span className="text-sm font-bold bg-slate-100 px-2 py-1 rounded">{c.count}</span>
              </div>
            ))}
            {stats.top_companies_by_vehicles.length === 0 && <p className="text-sm text-slate-500">Sin datos</p>}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-md font-semibold text-slate-900 mb-4">Top Compañías x Deuda</h3>
          <div className="space-y-3">
            {stats.top_companies_by_debt.map((c) => (
              <div key={c.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-slate-700 truncate">{c.legal_name}</span>
                <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                  ${Number(c.total_debt).toFixed(2)}
                </span>
              </div>
            ))}
            {stats.top_companies_by_debt.length === 0 && <p className="text-sm text-slate-500">Sin datos</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}
