import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Building2, ArrowLeft, Users, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Database } from '@/types/database.types'

type Company = Database['public']['Tables']['companies']['Row']

export function SuperAdminCompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCompany() {
      if (!id) return
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', id)
          .single()
        
        if (error) throw error
        setCompany(data)
      } catch (err: any) {
        toast.error('Error al cargar detalle de compañía: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    loadCompany()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  if (!company) {
    return <div className="text-center py-12 text-slate-500">Compañía no encontrada</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          to="/super-admin/companies"
          className="p-2 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{company.legal_name}</h1>
            <Badge variant={(company.status === 'activa' || company.status === 'activo') ? 'success' : 'danger'}>
              {company.status}
            </Badge>
          </div>
          <p className="text-slate-500">RUC: {company.ruc} {company.trade_name ? `• ${company.trade_name}` : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-400" />
            Datos Institucionales
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-slate-500">Correo Electrónico</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.email || 'No registrado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Teléfono</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.phone || 'No registrado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Dirección</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.address || 'No registrado'}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            Directiva Registrada
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-slate-500">Presidente</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.president_name || 'No registrado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Gerente</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.manager_name || 'No registrado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Secretaria</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.secretary_name || 'No registrado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Tesorero</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.treasurer_name || 'No registrado'}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4 text-amber-600 bg-amber-50 p-4 rounded-md">
          <ShieldAlert className="h-5 w-5" />
          <p className="text-sm font-medium">
            Por privacidad y seguridad, el acceso a datos operativos detallados (socios, vehículos, finanzas) 
            requiere un rol asignado dentro de esta compañía. Este panel global solo provee información administrativa.
          </p>
        </div>
      </Card>
    </div>
  )
}
