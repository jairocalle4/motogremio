import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMembers } from '@/hooks/useMembers'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  ShieldAlert,
  Car,
  FileText,
  DollarSign,
  FilePenLine,
} from 'lucide-react'
import type { MemberStatus } from '@/types'

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentMember, loading, error, fetchMemberById } = useMembers()

  useEffect(() => {
    if (id) {
      fetchMemberById(id)
    }
  }, [id, fetchMemberById])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="text-gray-500 ml-3 text-sm">Cargando perfil del socio...</p>
      </div>
    )
  }

  if (error || !currentMember) {
    return (
      <div className="text-center p-12 max-w-md mx-auto">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-gray-800 font-semibold mb-1">Error al cargar socio</h3>
        <p className="text-gray-500 text-sm mb-4">
          {error || 'No se encontró el socio solicitado o no tienes permisos para verlo.'}
        </p>
        <Button onClick={() => navigate('/socios')} variant="outline">
          Volver al Listado
        </Button>
      </div>
    )
  }

  const statusColors: Record<MemberStatus, 'success' | 'danger' | 'warning'> = {
    activo: 'success',
    inactivo: 'danger',
    suspendido: 'warning',
  }

  const formattedAdmissionDate = currentMember.admission_date
    ? new Date(currentMember.admission_date + 'T00:00:00').toLocaleDateString('es-EC', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'No registrada'

  return (
    <div className="space-y-6 pb-12">
      {/* Back link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate('/socios')}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver al listado de socios
        </button>
      </div>

      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary-500 to-indigo-600" />
        <CardContent className="p-6 -mt-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-2xl bg-white shadow border flex items-center justify-center text-primary-500 text-3xl font-bold">
                {currentMember.first_name[0]}
                {currentMember.last_name[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {currentMember.first_name} {currentMember.last_name}
                </h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant={statusColors[currentMember.status || 'activo']}>
                    {currentMember.status === 'activo'
                      ? 'Activo'
                      : currentMember.status === 'inactivo'
                      ? 'Inactivo'
                      : 'Suspendido'}
                  </Badge>
                  <span className="text-xs text-gray-400">• C.I: {currentMember.document_id}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - personal and contact info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Personal Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary-500" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Documento / Cédula</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{currentMember.document_id}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Nombres Completos</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  {currentMember.first_name} {currentMember.last_name}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Fecha de Admisión
                </p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{formattedAdmissionDate}</p>
              </div>

              {currentMember.blood_type && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                    Tipo de Sangre
                  </p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{currentMember.blood_type}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-500" />
                Datos de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Teléfono / Móvil</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">
                    {currentMember.phone || 'No registrado'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Correo Electrónico</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">
                    {currentMember.email || 'No registrado'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Dirección Física</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">
                    {currentMember.address || 'No registrada'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Card */}
          {(currentMember.emergency_contact_name || currentMember.emergency_contact_phone) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                  <ShieldAlert className="w-4 h-4" />
                  Contacto de Emergencia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Familiar de Contacto</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">
                    {currentMember.emergency_contact_name || 'No registrado'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Teléfono de Emergencia</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">
                    {currentMember.emergency_contact_phone || 'No registrado'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - operational links/placeholders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicles / Mototaxis tab placeholder */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-4 h-4 text-primary-500" />
                Unidades Vinculadas (Mototaxis)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-dashed rounded-lg p-6 text-center text-gray-400">
                <Car className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">No hay unidades vinculadas a este socio todavía.</p>
                <p className="text-xs mt-1 text-gray-400">
                  Las relaciones se establecerán al configurar el Módulo de Unidades.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Licenses & Documents placeholder */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-500" />
                Licencias y Credenciales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-dashed rounded-lg p-6 text-center text-gray-400">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">No se han cargado licencias o contratos de conductor.</p>
                <p className="text-xs mt-1 text-gray-400">
                  Podrás cargar licencias vigentes, por vencer o vencidas en el Módulo de Documentos.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payments summary placeholder */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary-500" />
                Estado Financiero y Cuotas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-dashed rounded-lg p-6 text-center text-gray-400">
                <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">No se registran cuotas pendientes o pagos en este periodo.</p>
                <p className="text-xs mt-1 text-gray-400">
                  El estado de deudas se cargará de forma automática en el Módulo de Pagos.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Observations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FilePenLine className="w-4 h-4 text-primary-500" />
                Notas y Observaciones Internas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-4 rounded-lg border">
                {currentMember.notes || 'Sin observaciones registradas para este socio.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
