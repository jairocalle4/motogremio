import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Bike, FileText, User as UserIcon, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { formatDate } from '@/lib/utils'

interface SocioInfo {
  member: any
  vehicles: any[]
  documents: any[]
}

export function SocioPortalPage() {
  const { profile } = useAuth()
  const [data, setData] = useState<SocioInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const companyId = profile?.company_id
  const firstName = profile?.first_name ?? 'Socio'

  useEffect(() => {
    if (!profile?.id || !companyId) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      try {
        // 1. Fetch member info matching the current profile ID
        const { data: memberData } = await supabase
          .from('members')
          .select('*')
          .eq('company_id', companyId!)
          .eq('profile_id', profile!.id)
          .single()

        if (!memberData) {
          setLoading(false)
          return
        }

        // 2. Fetch vehicles
        const { data: vehiclesData } = await supabase
          .from('vehicles')
          .select('*')
          .eq('company_id', companyId!)
          .eq('member_id', memberData.id)
          .is('deleted_at', null)

        // 3. Fetch documents of the member and their vehicles
        let documentsData: any[] = []
        
        const { data: memberDocs } = await supabase
          .from('documents')
          .select('*')
          .eq('company_id', companyId!)
          .eq('member_id', memberData.id)

        if (memberDocs) documentsData = [...documentsData, ...memberDocs]

        if (vehiclesData && vehiclesData.length > 0) {
          const vehicleIds = vehiclesData.map(v => v.id)
          const { data: vehicleDocs } = await supabase
            .from('documents')
            .select('*')
            .eq('company_id', companyId!)
            .in('vehicle_id', vehicleIds)
          
          if (vehicleDocs) documentsData = [...documentsData, ...vehicleDocs]
        }

        setData({
          member: memberData,
          vehicles: vehiclesData || [],
          documents: documentsData
        })
      } catch (err) {
        console.error('Error loading socio data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [profile, companyId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 w-1/3 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  if (!data?.member) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <Card padding="lg" className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <UserIcon className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Hola, {firstName}!</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Actualmente tu cuenta no tiene un perfil de socio vinculado en la base de datos de la compañía.
            Por favor, comunícate con la administración para que enlacen tu usuario.
          </p>
        </Card>
      </div>
    )
  }

  const { member, vehicles, documents } = data

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi portal</h1>
        <p className="text-gray-500 mt-1">Consulta tu información registrada en la compañía.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mi Información */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary-600" />
              Mi Información
            </CardTitle>
          </CardHeader>
          <div className="p-5 border-t border-gray-100">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Nombres completos</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{member.first_name} {member.last_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Cédula</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{member.document_id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Estado</p>
                  <div className="mt-1">
                    <Badge variant={member.status === 'activo' ? 'success' : 'danger'}>
                      {member.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Contacto</p>
                <p className="text-sm text-gray-700 mt-0.5">{member.phone || 'No registrado'} · {member.email || ''}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Mis Unidades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bike className="h-5 w-5 text-indigo-600" />
              Mis Unidades
            </CardTitle>
          </CardHeader>
          <div className="p-5 border-t border-gray-100">
            {vehicles.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-sm text-gray-500">No tienes unidades registradas todavía.</p>
                <p className="text-xs text-gray-400 mt-1">Consulta con la administración si falta información.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Disco {v.disk_number} <span className="text-gray-400 font-normal">| {v.plate}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{v.brand} {v.model}</p>
                    </div>
                    <Badge variant={v.status === 'activa' ? 'success' : 'warning'}>
                      {v.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Mis Documentos */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Mis Documentos
            </CardTitle>
          </CardHeader>
          <div className="p-5 border-t border-gray-100">
            {documents.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-sm text-gray-500">No hay documentos disponibles.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map(doc => {
                  const isExpired = doc.status === 'vencido'
                  const isWarning = doc.status === 'por_vencer'
                  
                  return (
                    <div key={doc.id} className={`p-4 rounded-lg border ${isExpired ? 'bg-danger-50 border-danger-100' : isWarning ? 'bg-warning-50 border-warning-100' : 'bg-white border-gray-200'} shadow-sm`}>
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1" title={doc.title}>{doc.title}</p>
                        {(isExpired || isWarning) && (
                          <AlertTriangle className={`h-4 w-4 shrink-0 ${isExpired ? 'text-danger-500' : 'text-warning-500'}`} />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 capitalize mb-3">{doc.document_type.replace(/_/g, ' ')}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {doc.expiration_date ? `Vence: ${formatDate(doc.expiration_date)}` : 'Sin vencimiento'}
                        </span>
                        <Badge variant={isExpired ? 'danger' : isWarning ? 'warning' : 'success'}>
                          {doc.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Estado de Cuenta - Placeholder */}
        <Card className="md:col-span-2 opacity-70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              Estado de Cuenta
            </CardTitle>
          </CardHeader>
          <div className="p-6 border-t border-gray-100 bg-gray-50 text-center">
            <p className="text-sm font-medium text-gray-600 mb-1">Módulo en construcción</p>
            <p className="text-xs text-gray-500">Pronto podrás revisar tu historial de pagos, cuotas y multas en esta sección.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
