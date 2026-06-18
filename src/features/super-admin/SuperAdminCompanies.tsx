import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Search, Eye, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

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

export function SuperAdminCompanies() {
  const [companies, setCompanies] = useState<CompanyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchCompanies()
  }, [])

  async function fetchCompanies() {
    try {
      const { data, error } = await supabase.rpc('get_companies_with_stats')
      if (error) throw error
      setCompanies((data as unknown as CompanyStats[]) || [])
    } catch (err: any) {
      toast.error('Error al cargar compañías: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = companies.filter(c =>
    c.legal_name.toLowerCase().includes(search.toLowerCase()) ||
    c.ruc.includes(search)
  )

  const toggleStatus = async (id: string, currentStatus: string | null) => {
    const newStatus = (currentStatus === 'activa' || currentStatus === 'activo') ? 'inactiva' : 'activa'
    try {
      const { error } = await supabase
        .from('companies')
        .update({ status: newStatus })
        .eq('id', id)
      
      if (error) throw error
      toast.success(`Compañía marcada como ${newStatus}`)
      fetchCompanies()
    } catch (err: any) {
      toast.error('Error al cambiar estado: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compañías SaaS</h1>
          <p className="text-slate-500">Gestión global de clientes de MotoGremio</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por RUC o Nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Compañía</th>
                <th className="px-4 py-3 font-medium">RUC</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium text-center">Socios</th>
                <th className="px-4 py-3 font-medium text-center">Unidades</th>
                <th className="px-4 py-3 font-medium text-right">Deuda</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{c.legal_name}</div>
                    {c.trade_name && <div className="text-xs text-slate-500">{c.trade_name}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{c.ruc}</td>
                  <td className="px-4 py-3 capitalize">{c.plan_name || '-'}</td>
                  <td className="px-4 py-3 text-center">{c.members_count}</td>
                  <td className="px-4 py-3 text-center">{c.vehicles_count}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">
                    ${Number(c.total_debt).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={(c.status === 'activa' || c.status === 'activo') ? 'success' : 'danger'}>
                      {c.status || 'desconocido'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link 
                        to={`/super-admin/companies/${c.id}`}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => toggleStatus(c.id, c.status)}
                        className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                        title={(c.status === 'activa' || c.status === 'activo') ? 'Desactivar compañía' : 'Activar compañía'}
                      >
                        <ShieldAlert className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron compañías
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
