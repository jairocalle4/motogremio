import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Bike, FileText, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { formatDate } from '@/lib/utils'
import { DocumentBadge } from '@/components/ui/DocumentBadge'

interface SocioInfo {
  member: any
  vehicles: any[]
  documents: any[]
  charges: any[]
  payments: any[]
}

export function SocioPortalPage() {
  const { user, profile } = useAuth()
  const [data, setData] = useState<SocioInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const companyId = profile?.company_id
  const firstName = profile?.first_name ?? 'Socio'
  const lastName = profile?.last_name ?? ''
  const companyName = profile?.company?.trade_name || profile?.company?.legal_name || 'La Compañía'

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

        // 3. Fetch documents of the member and their vehicles
        let documentsData: any[] = []
        
        const { data: memberDocs } = await supabase
          .from('documents')
          .select('*, document_type:document_types(name)')
          .eq('company_id', companyId!)
          .eq('member_id', memberData.id)

        if (memberDocs) documentsData = [...documentsData, ...memberDocs]

        if (vehiclesData && vehiclesData.length > 0) {
          const vehicleIds = vehiclesData.map(v => v.id)
          const { data: vehicleDocs } = await supabase
            .from('documents')
            .select('*, document_type:document_types(name)')
            .eq('company_id', companyId!)
            .in('vehicle_id', vehicleIds)
          
          if (vehicleDocs) documentsData = [...documentsData, ...vehicleDocs]
        }

        // 4. Fetch charges
        const { data: chargesData } = await supabase
          .from('charges')
          .select('*, charge_type:charge_types(name)')
          .eq('company_id', companyId!)
          .eq('member_id', memberData.id)

        // 5. Fetch payments
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('company_id', companyId!)
          .eq('member_id', memberData.id)
          .order('payment_date', { ascending: false })

        setData({
          member: memberData,
          vehicles: vehiclesData || [],
          documents: documentsData,
          charges: chargesData || [],
          payments: paymentsData || []
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
      <div className="space-y-6">
        <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-gray-100 rounded-xl lg:col-span-1 animate-pulse" />
          <div className="h-96 bg-gray-100 rounded-xl lg:col-span-2 animate-pulse" />
        </div>
      </div>
    )
  }

  if (!data?.member) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <Card padding="lg" className="text-center border border-gray-100 shadow-card">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4 border border-primary-100">
            <UserIcon className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Hola, {firstName}!</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm leading-relaxed">
            Aún no existes como socio o no estás registrado en la base de datos de tu compañía. 
            Por favor, comunícate con la administración para que creen tu expediente y lo enlacen a tu correo electrónico ({user?.email || 'actual'}).
          </p>
        </Card>
      </div>
    )
  }

  const { member, vehicles, documents, charges, payments } = data
  const alertsCount = documents.filter(doc => doc.status === 'vencido' || doc.status === 'por_vencer').length
  
  // Calculate total outstanding balance
  const pendingCharges = charges.filter(c => c.status === 'pendiente' || c.status === 'parcial')
  const totalDebt = pendingCharges.reduce((acc, c) => acc + Number(c.balance), 0)

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Cabecera Institucional */}
      <Card padding="lg" className="border border-gray-100 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest bg-primary-50 px-2.5 py-1 rounded border border-primary-100">
              Portal del Socio
            </span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Bienvenido, {firstName} {lastName}
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              Cooperativa / Compañía: <span className="text-gray-700 font-semibold">{companyName}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-left md:text-right text-xs text-gray-500">
              <p>ID Socio: <span className="font-mono text-gray-700 font-semibold">{member.id.substring(0, 8).toUpperCase()}</span></p>
              <p className="mt-0.5">Cédula: <span className="text-gray-700 font-semibold">{member.document_id}</span></p>
            </div>
            <div className="h-8 w-px bg-gray-200 hidden md:block" />
            <Badge variant="success" className="px-3 py-1.5 text-sm font-semibold border-success-200">
              Socio Activo
            </Badge>
          </div>
        </div>
      </Card>

      {/* Resumen de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1: Estado Financiero */}
        <Card className="border border-gray-100 shadow-card" padding="md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">
                Saldo Pendiente
              </p>
              <p className={`text-2xl font-bold mt-2 ${totalDebt > 0 ? 'text-danger-600' : 'text-gray-900'}`}>
                ${totalDebt.toFixed(2)}
              </p>
            </div>
            <div className={`p-2 rounded-lg border ${totalDebt > 0 ? 'bg-danger-50 text-danger-600 border-danger-100' : 'bg-success-50 text-success-700 border-success-100'}`}>
              <span className="text-base font-bold">💰</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Obligaciones de Pago</span>
            {totalDebt > 0 ? (
              <span className="text-danger-600 font-medium bg-danger-50 px-2 py-0.5 rounded border border-danger-100 text-[10px]">
                {pendingCharges.length} {pendingCharges.length === 1 ? 'Pendiente' : 'Pendientes'}
              </span>
            ) : (
              <span className="text-success-600 font-medium bg-success-50 px-2 py-0.5 rounded border border-success-100 text-[10px]">
                Al Día
              </span>
            )}
          </div>
        </Card>

        {/* KPI 2: Unidades Asignadas */}
        <Card className="border border-gray-100 shadow-card" padding="md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">
                Unidades Asignadas
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {vehicles.length} {vehicles.length === 1 ? 'Unidad' : 'Unidades'}
              </p>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <Bike className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Estado Operativo</span>
            <span className="text-gray-700 font-medium">
              {vehicles.filter(v => v.status === 'activa').length} Activas
            </span>
          </div>
        </Card>

        {/* KPI 3: Documentación */}
        <Card className="border border-gray-100 shadow-card" padding="md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">
                Control de Documentos
              </p>
              <p className={`text-2xl font-bold mt-2 ${alertsCount > 0 ? 'text-warning-700' : 'text-gray-900'}`}>
                {alertsCount === 0 ? 'Sin Alertas' : `${alertsCount} ${alertsCount === 1 ? 'Alerta' : 'Alertas'}`}
              </p>
            </div>
            <div className={`p-2 rounded-lg border ${alertsCount > 0 ? 'bg-warning-50 text-warning-700 border-warning-100' : 'bg-success-50 text-success-700 border-success-100'}`}>
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Documentos Cargados</span>
            <span className="text-gray-700 font-medium">{documents.length} en total</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Información del Socio y Unidades */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card: Información del Socio */}
          <Card className="border border-gray-100 shadow-card overflow-hidden" padding="none">
            <div className="p-4 border-b border-gray-100 bg-primary-50/40 flex items-center gap-2 border-l-4 border-primary-500">
              <UserIcon className="h-4.5 w-4.5 text-primary-600" />
              <h2 className="text-sm font-bold text-primary-900">Información del Expediente</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Nombres Completos</p>
                <p className="text-xs font-semibold text-gray-800">{member.first_name} {member.last_name}</p>
              </div>
              <div className="h-px bg-gray-100" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Cédula de Identidad</p>
                <p className="text-xs font-semibold text-gray-800">{member.document_id}</p>
              </div>
              <div className="h-px bg-gray-100" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Teléfono</p>
                <p className="text-xs font-semibold text-gray-800">{member.phone || 'Teléfono no registrado'}</p>
              </div>
              <div className="h-px bg-gray-100" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Correo Electrónico</p>
                <p className="text-xs font-semibold text-gray-800">{member.email || 'Correo no registrado'}</p>
              </div>
            </div>
          </Card>

          {/* Card: Mis Unidades */}
          <Card className="border border-gray-100 shadow-card overflow-hidden" padding="none">
            <div className="p-4 border-b border-gray-100 bg-indigo-50/40 flex items-center gap-2 border-l-4 border-indigo-500">
              <Bike className="h-4.5 w-4.5 text-indigo-600" />
              <h2 className="text-sm font-bold text-indigo-900">Mis Unidades Asignadas</h2>
            </div>
            <div className="p-5">
              {vehicles.length === 0 ? (
                <div className="text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6">
                  <Bike className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-700">No tienes unidades registradas</p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-[200px] mx-auto">
                    Comunícate con la administración de {companyName} para asociar tu vehículo.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vehicles.map(v => (
                    <div key={v.id} className="p-3.5 bg-gray-50/30 rounded-lg border border-gray-100 flex items-center justify-between hover:bg-gray-50/80 hover:border-gray-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center border border-primary-100">
                          <Bike className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">
                            Disco #{v.disk_number}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Placa: <span className="font-mono text-gray-600 font-semibold">{v.plate}</span>
                          </p>
                          <p className="text-[10px] text-gray-500">{v.brand} {v.model}</p>
                        </div>
                      </div>
                      <Badge variant={v.status === 'activa' ? 'success' : 'warning'} className="px-2 py-0.5 text-[10px]">
                        {v.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Columna Derecha: Control de Requisitos e Historial de Documentos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Control de Requisitos y Documentación */}
          <Card className="border border-gray-100 shadow-card overflow-hidden" padding="none">
            <div className="p-4 border-b border-gray-100 bg-success-50/40 flex items-center justify-between border-l-4 border-success-500">
              <div className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-success-600" />
                <h2 className="text-sm font-bold text-success-900">Control de Requisitos y Documentos</h2>
              </div>
              <span className="text-[10px] text-success-700 font-semibold bg-success-50 border border-success-100 px-2 py-0.5 rounded">
                Total: {documents.length}
              </span>
            </div>
            <div className="p-0">
              {documents.length === 0 ? (
                <div className="text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl m-5 p-10">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-700">No hay documentos registrados</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Comunícate con la administración para que carguen tus documentos al sistema.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/20">
                        <th className="px-5 py-3 text-2xs font-semibold text-gray-500 uppercase tracking-wider">
                          Documento / Requisito
                        </th>
                        <th className="px-5 py-3 text-2xs font-semibold text-gray-500 uppercase tracking-wider">
                          Asociado A
                        </th>
                        <th className="px-5 py-3 text-2xs font-semibold text-gray-500 uppercase tracking-wider">
                          Fecha Vencimiento
                        </th>
                        <th className="px-5 py-3 text-2xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {documents.map(doc => {
                        const docVehicle = vehicles.find(v => v.id === doc.vehicle_id)
                        
                        return (
                          <tr key={doc.id} className="hover:bg-gray-50/20 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-xs text-gray-800">
                                {doc.title}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {doc.document_type?.name || 'Documento'}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-gray-600">
                              {docVehicle ? (
                                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-medium border border-indigo-100/50">
                                  Vehículo (Disco #{docVehicle.disk_number})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200/50">
                                  Personal (Socio)
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-gray-600 font-mono">
                              {doc.expiration_date ? formatDate(doc.expiration_date) : 'Sin fecha / Permanente'}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <DocumentBadge status={doc.status} compact />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          {/* Ficha Financiera / Estado de Cuenta */}
          <Card className="border border-gray-100 shadow-card overflow-hidden" padding="none">
            <div className="p-4 border-b border-gray-100 bg-warning-50/40 flex items-center justify-between border-l-4 border-warning-500">
              <div className="flex items-center gap-2">
                <span className="text-base">💳</span>
                <h2 className="text-sm font-bold text-warning-900">Estado de Cuenta (Cuotas y Multas)</h2>
              </div>
              {totalDebt > 0 && (
                <Badge variant="danger" className="px-2 py-0.5 text-[10px] font-semibold border-danger-200">
                  Deuda Pendiente: ${totalDebt.toFixed(2)}
                </Badge>
              )}
            </div>
            <div className="p-5 space-y-6">
              {/* Cargos por pagar */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-3.5 bg-danger-500 rounded-full"></span>
                  <h3 className="text-xs font-bold text-danger-700 uppercase tracking-wider">
                    Cobros y Cuotas Pendientes
                  </h3>
                </div>
                {pendingCharges.length === 0 ? (
                  <div className="text-center bg-success-50/30 border border-dashed border-success-100 rounded-lg p-5">
                    <p className="text-xs font-semibold text-success-700">¡Estás al día con tus pagos!</p>
                    <p className="text-[10px] text-success-600 mt-0.5">No tienes saldos pendientes registrados.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/30">
                          <th className="px-4 py-2.5 text-2xs font-semibold text-gray-500 uppercase tracking-wider">
                            Detalle del Cobro
                          </th>
                          <th className="px-4 py-2.5 text-2xs font-semibold text-gray-500 uppercase tracking-wider">
                            Vencimiento
                          </th>
                          <th className="px-4 py-2.5 text-2xs font-semibold text-gray-500 uppercase tracking-wider">
                            Monto Total
                          </th>
                          <th className="px-4 py-2.5 text-2xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                            Saldo Pendiente
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pendingCharges.map(charge => (
                          <tr key={charge.id} className="hover:bg-gray-50/10">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-xs text-gray-800">
                                {charge.description}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {charge.charge_type?.name || 'Cobro General'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 font-mono">
                              {formatDate(charge.due_date)}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              ${Number(charge.amount).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${charge.status === 'parcial' ? 'bg-warning-50 text-warning-700 border border-warning-100' : 'bg-danger-50 text-danger-700 border border-danger-100'}`}>
                                ${Number(charge.balance).toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Historial de pagos recientes */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-3.5 bg-success-500 rounded-full"></span>
                  <h3 className="text-xs font-bold text-success-700 uppercase tracking-wider">
                    Historial de Pagos Recientes
                  </h3>
                </div>
                {payments.length === 0 ? (
                  <div className="text-center bg-gray-50 border border-dashed border-gray-200 rounded-lg p-5">
                    <p className="text-xs text-gray-500">No se han registrado pagos aún.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/30">
                          <th className="px-4 py-2.5 text-2xs font-semibold text-gray-500 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th className="px-4 py-2.5 text-2xs font-semibold text-gray-500 uppercase tracking-wider">
                            Método
                          </th>
                          <th className="px-4 py-2.5 text-2xs font-semibold text-gray-500 uppercase tracking-wider">
                            Referencia / Detalle
                          </th>
                          <th className="px-4 py-2.5 text-2xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                            Monto Pagado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payments.map(payment => (
                          <tr key={payment.id} className="hover:bg-gray-50/10">
                            <td className="px-4 py-3 text-xs text-gray-600 font-mono">
                              {formatDate(payment.payment_date)}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 capitalize font-medium">
                              {payment.payment_method.replace('_', ' ')}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {payment.reference_number || 'S/N'} {payment.notes ? `(${payment.notes})` : ''}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-xs text-success-600">
                              +${Number(payment.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}


