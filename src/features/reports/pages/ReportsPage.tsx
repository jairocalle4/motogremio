import { useState, useMemo } from 'react'
import {
  Printer, Users, Bike, UserCheck, FileText,
  DollarSign, AlertTriangle, Calendar, Search, TrendingUp,
  BarChart2, FileSpreadsheet, RefreshCw
} from 'lucide-react'
import { useReports } from '../hooks/useReports'
import { exportToCsv } from '../utils/exportCsv'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input } from '@/components/ui'
import { usePermissions } from '@/hooks/usePermissions'

type TabType = 'resumen' | 'socios' | 'unidades' | 'conductores' | 'documentos' | 'finanzas' | 'sanciones' | 'reuniones'

export function ReportsPage() {
  const { loading, error, data, dateRange, setDateRange } = useReports()
  const { canViewReports } = usePermissions()
  const [activeTab, setActiveTab] = useState<TabType>('resumen')
  const [searchTerm, setSearchTerm] = useState('')

  // ─── FILTERED LISTS ────────────────────────────────────────────────────────
  const filteredSocios = useMemo(() => {
    if (!data?.socios.list) return []
    return data.socios.list.filter(item => {
      const search = searchTerm.toLowerCase()
      return (
        item.first_name.toLowerCase().includes(search) ||
        item.last_name.toLowerCase().includes(search) ||
        item.document_id.includes(search)
      )
    })
  }, [data?.socios.list, searchTerm])

  const filteredUnidades = useMemo(() => {
    if (!data?.unidades.list) return []
    return data.unidades.list.filter(item => {
      const search = searchTerm.toLowerCase()
      return (
        item.disk_number.includes(search) ||
        item.plate.toLowerCase().includes(search) ||
        item.member_name.toLowerCase().includes(search) ||
        item.driver_name.toLowerCase().includes(search)
      )
    })
  }, [data?.unidades.list, searchTerm])

  const filteredConductores = useMemo(() => {
    if (!data?.conductores.list) return []
    return data.conductores.list.filter(item => {
      const search = searchTerm.toLowerCase()
      return (
        item.first_name.toLowerCase().includes(search) ||
        item.last_name.toLowerCase().includes(search) ||
        item.document_id.includes(search)
      )
    })
  }, [data?.conductores.list, searchTerm])

  const filteredDocumentos = useMemo(() => {
    if (!data?.documentos.list) return []
    return data.documentos.list.filter(item => {
      const search = searchTerm.toLowerCase()
      return (
        item.title.toLowerCase().includes(search) ||
        item.type_name.toLowerCase().includes(search) ||
        item.entity_name.toLowerCase().includes(search) ||
        item.entity_identifier.toLowerCase().includes(search)
      )
    })
  }, [data?.documentos.list, searchTerm])

  const filteredFinanzas = useMemo(() => {
    if (!data?.financiero.list) return []
    return data.financiero.list.filter(item => {
      const search = searchTerm.toLowerCase()
      return (
        item.member_name.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.charge_type.toLowerCase().includes(search)
      )
    })
  }, [data?.financiero.list, searchTerm])

  const filteredSanciones = useMemo(() => {
    if (!data?.sanciones.list) return []
    return data.sanciones.list.filter(item => {
      const search = searchTerm.toLowerCase()
      return (
        item.member_name.toLowerCase().includes(search) ||
        item.sanction_type.toLowerCase().includes(search) ||
        item.reason.toLowerCase().includes(search)
      )
    })
  }, [data?.sanciones.list, searchTerm])

  const filteredReuniones = useMemo(() => {
    if (!data?.reuniones.list) return []
    return data.reuniones.list.filter(item => {
      const search = searchTerm.toLowerCase()
      return (
        item.title.toLowerCase().includes(search) ||
        item.meeting_type.toLowerCase().includes(search)
      )
    })
  }, [data?.reuniones.list, searchTerm])

  // Reset search term when switching tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setSearchTerm('')
  }

  if (!canViewReports) {
    return (
      <div className="page-container p-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-6 rounded-xl flex flex-col items-center text-center max-w-md mx-auto mt-12 shadow-sm">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-sm text-gray-600">
            No tienes los permisos necesarios para visualizar el módulo de reportes y estadísticas.
          </p>
        </div>
      </div>
    )
  }

  // ─── CSV EXPORTS ───────────────────────────────────────────────────────────
  const exportSocios = () => {
    if (!data) return
    exportToCsv('reporte_socios', [
      { key: 'document_id', label: 'Cédula/RUC' },
      { key: 'last_name', label: 'Apellidos' },
      { key: 'first_name', label: 'Nombres' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'status', label: 'Estado' },
      { key: 'admission_date', label: 'Fecha Admisión' },
      { key: 'vehicle_count', label: 'Nº de Unidades' },
      { key: 'vehicles', label: 'Unidades (Discos)' },
    ], filteredSocios)
  }

  const exportUnidades = () => {
    if (!data) return
    exportToCsv('reporte_unidades', [
      { key: 'disk_number', label: 'Disco' },
      { key: 'plate', label: 'Placa' },
      { key: 'status', label: 'Estado' },
      { key: 'member_name', label: 'Socio Propietario' },
      { key: 'driver_name', label: 'Conductor Asignado' },
      { key: 'brand', label: 'Marca' },
      { key: 'model', label: 'Modelo' },
      { key: 'year', label: 'Año' },
      { key: 'expired_docs_count', label: 'Documentos Vencidos' },
      { key: 'upcoming_docs_count', label: 'Documentos Por Vencer' },
    ], filteredUnidades)
  }

  const exportConductores = () => {
    if (!data) return
    exportToCsv('reporte_conductores', [
      { key: 'document_id', label: 'Cédula' },
      { key: 'last_name', label: 'Apellidos' },
      { key: 'first_name', label: 'Nombres' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'status', label: 'Estado' },
      { key: 'type', label: 'Tipo Conductor' },
      { key: 'socio_name', label: 'Socio Relacionado' },
      { key: 'license_type', label: 'Licencia' },
      { key: 'license_status', label: 'Estado Licencia' },
      { key: 'license_expiry', label: 'Vencimiento Licencia' },
    ], filteredConductores)
  }

  const exportDocumentos = () => {
    if (!data) return
    exportToCsv('reporte_documentos', [
      { key: 'title', label: 'Documento' },
      { key: 'type_name', label: 'Tipo' },
      { key: 'entity_type', label: 'Entidad Relacionada' },
      { key: 'entity_name', label: 'Nombre Entidad' },
      { key: 'entity_identifier', label: 'Identificador Entidad' },
      { key: 'expiry_date', label: 'Fecha Vencimiento' },
      { key: 'status', label: 'Estado' },
    ], filteredDocumentos)
  }

  const exportFinanzas = () => {
    if (!data) return
    exportToCsv('reporte_financiero', [
      { key: 'member_name', label: 'Socio' },
      { key: 'description', label: 'Descripción de Cuota' },
      { key: 'amount', label: 'Monto ($)' },
      { key: 'balance', label: 'Saldo Pendiente ($)' },
      { key: 'due_date', label: 'Fecha Vencimiento' },
      { key: 'status', label: 'Estado' },
      { key: 'charge_type', label: 'Tipo de Cuota' },
      { key: 'vehicle_disk', label: 'Unidad (Disco)' },
    ], filteredFinanzas)
  }

  const exportSanciones = () => {
    if (!data) return
    exportToCsv('reporte_sanciones', [
      { key: 'member_name', label: 'Socio' },
      { key: 'sanction_type', label: 'Infracción/Tipo' },
      { key: 'date', label: 'Fecha Sanción' },
      { key: 'reason', label: 'Razón' },
      { key: 'severity', label: 'Gravedad' },
      { key: 'status', label: 'Estado' },
      { key: 'fine_amount', label: 'Valor Multa ($)' },
      { key: 'fine_balance', label: 'Saldo Multa ($)' },
      { key: 'fine_status', label: 'Estado de Pago' },
    ], filteredSanciones)
  }

  const exportReuniones = () => {
    if (!data) return
    exportToCsv('reporte_reuniones', [
      { key: 'title', label: 'Reunión' },
      { key: 'meeting_type', label: 'Tipo' },
      { key: 'date', label: 'Fecha' },
      { key: 'time', label: 'Hora' },
      { key: 'status', label: 'Estado' },
      { key: 'is_mandatory', label: 'Obligatoria', render: val => val ? 'SÍ' : 'NO' },
      { key: 'attended', label: 'Asistieron' },
      { key: 'absent', label: 'Ausentes' },
      { key: 'justified', label: 'Justificados' },
      { key: 'tarde', label: 'Atrasados' },
      { key: 'total_invited', label: 'Total Convocados' },
    ], filteredReuniones)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-10 w-10 animate-spin text-primary-600 mb-4" />
          <p className="text-gray-500 font-medium">Cargando y calculando métricas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-semibold">Error al cargar reportes</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="page-container p-6 space-y-6 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centro de Reportes e Indicadores</h1>
          <p className="text-sm text-gray-500">
            Analiza el estado general de socios, unidades, documentación, finanzas, sanciones y asistencia.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-2 bg-white shadow-sm">
            <span className="text-xs text-gray-500 font-medium px-1">Rango Recaudaciones:</span>
            <input
              type="date"
              className="text-sm border-none focus:ring-0 p-0 text-gray-700"
              value={dateRange.startDate}
              onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <span className="text-gray-400 text-sm">-</span>
            <input
              type="date"
              className="text-sm border-none focus:ring-0 p-0 text-gray-700"
              value={dateRange.endDate}
              onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <Button onClick={handlePrint} variant="outline" size="sm" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 border-b-2 border-gray-800 pb-2">
          SISTEMA DE GESTIÓN DE TRANSPORTE - INFORME GENERAL
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          Generado el: {new Date().toLocaleDateString('es-EC')} | Rango Recaudaciones: {dateRange.startDate} a {dateRange.endDate}
        </p>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 print:hidden">
        {[
          { id: 'resumen', label: 'Resumen General', icon: BarChart2 },
          { id: 'socios', label: 'Socios', icon: Users },
          { id: 'unidades', label: 'Unidades', icon: Bike },
          { id: 'conductores', label: 'Conductores', icon: UserCheck },
          { id: 'documentos', label: 'Documentos', icon: FileText },
          { id: 'finanzas', label: 'Finanzas y Pagos', icon: DollarSign },
          { id: 'sanciones', label: 'Sanciones', icon: AlertTriangle },
          { id: 'reuniones', label: 'Asistencia y Reuniones', icon: Calendar },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ─── TAB CONTENT: RESUMEN GENERAL ──────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Socios Activos</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{data.socios.active}</h3>
                  <p className="text-xs text-gray-400 mt-1">Total registrados: {data.socios.total}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Unidades Operativas</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{data.unidades.active}</h3>
                  <p className="text-xs text-gray-400 mt-1">Mantenimiento: {data.unidades.maintenance}</p>
                </div>
                <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                  <Bike className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Por Recaudar</p>
                  <h3 className="text-2xl font-bold text-red-600 mt-1">${data.financiero.totalPending.toFixed(2)}</h3>
                  <p className="text-xs text-gray-400 mt-1">{data.financiero.debtorMembersCount} socios deudores</p>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                  <DollarSign className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium font-medium">Asistencia Promedio</p>
                  <h3 className="text-2xl font-bold text-purple-600 mt-1">{data.reuniones.attendanceRate}%</h3>
                  <p className="text-xs text-gray-400 mt-1">En {data.reuniones.total} reuniones</p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Calendar className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DETAILED SUMMARY BLOCKS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-100 bg-gray-50">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                  Salud Documental y Conducción
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Documentos Vencidos (Alerta)</span>
                  <Badge variant="danger" className="font-semibold">{data.documentos.expired}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Documentos por vencer (próximos 30 días)</span>
                  <Badge variant="warning" className="font-semibold">{data.documentos.upcoming30}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Documentos por vencer (próximos 30-60 días)</span>
                  <Badge variant="warning" className="font-semibold">{data.documentos.upcoming60}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Conductores con licencia A1 vencida o ausente</span>
                  <Badge variant="danger" className="font-semibold">{data.conductores.licenseA1ExpiredOrMissing}</Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Unidades sin conductor asignado</span>
                  <Badge variant="warning" className="font-semibold">{data.unidades.unassignedDrivers}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-100 bg-gray-50">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary-600" />
                  Resumen de Recaudaciones en el Rango
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Transacciones de pago registradas</span>
                  <span className="font-semibold text-gray-800">{data.financiero.paymentsCount} transacciones</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Monto total recaudado en rango</span>
                  <span className="font-bold text-green-600 text-lg">${data.financiero.paymentsSum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Multas de sanciones pendientes de pago</span>
                  <span className="font-semibold text-amber-600">${data.sanciones.pendingFinesAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Total histórico recaudado en multas</span>
                  <span className="font-semibold text-green-600">${data.sanciones.paidFinesAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: SOCIOS ───────────────────────────────────────────── */}
      {activeTab === 'socios' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 print:grid-cols-4">
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-400 font-medium">Total Socios</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{data.socios.total}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-green-600 font-medium">Activos</p>
              <p className="text-xl font-bold text-green-600 mt-1">{data.socios.active}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Inactivos</p>
              <p className="text-xl font-bold text-gray-500 mt-1">{data.socios.inactive}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-red-500 font-medium">Suspendidos</p>
              <p className="text-xl font-bold text-red-500 mt-1">{data.socios.suspended}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Con 1 Unidad</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{data.socios.singleUnit}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Con +1 Unidad</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{data.socios.multiUnit}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar socios por cédula o nombre..."
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={exportSocios} className="flex items-center gap-2" variant="outline">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Exportar Excel (CSV)
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3">Cédula</th>
                    <th className="px-6 py-3">Socio</th>
                    <th className="px-6 py-3">Teléfono</th>
                    <th className="px-6 py-3">Fecha Admisión</th>
                    <th className="px-6 py-3 text-center">Unidades</th>
                    <th className="px-6 py-3 text-right">Discos</th>
                    <th className="px-6 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {filteredSocios.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                        No se encontraron socios.
                      </td>
                    </tr>
                  ) : (
                    filteredSocios.map(socio => (
                      <tr key={socio.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono font-medium text-xs">{socio.document_id}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{socio.last_name}, {socio.first_name}</td>
                        <td className="px-6 py-4">{socio.phone || '-'}</td>
                        <td className="px-6 py-4">{socio.admission_date}</td>
                        <td className="px-6 py-4 text-center font-semibold">{socio.vehicle_count}</td>
                        <td className="px-6 py-4 text-right font-mono text-xs">
                          {socio.vehicles.map(v => (
                            <span key={v} className="inline-block bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 ml-1">
                              #{v}
                            </span>
                          ))}
                          {socio.vehicles.length === 0 && '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={socio.status === 'activo' ? 'success' : socio.status === 'suspendido' ? 'warning' : 'default'}>
                            {socio.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: UNIDADES ─────────────────────────────────────────── */}
      {activeTab === 'unidades' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-400 font-medium font-medium">Total Unidades</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{data.unidades.total}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-green-600 font-medium">Activas</p>
              <p className="text-xl font-bold text-green-600 mt-1">{data.unidades.active}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">En Mantenimiento</p>
              <p className="text-xl font-bold text-orange-500 mt-1">{data.unidades.maintenance}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-red-500 font-medium">Con Documentos Vencidos</p>
              <p className="text-xl font-bold text-red-500 mt-1">{data.unidades.expiredDocs}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-400 font-medium">Sin Conductor</p>
              <p className="text-xl font-bold text-gray-700 mt-1">{data.unidades.unassignedDrivers}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por disco, placa, socio o conductor..."
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={exportUnidades} className="flex items-center gap-2" variant="outline">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Exportar Excel (CSV)
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3">Disco</th>
                    <th className="px-6 py-3">Placa</th>
                    <th className="px-6 py-3">Socio Propietario</th>
                    <th className="px-6 py-3">Conductor</th>
                    <th className="px-6 py-3">Marca / Modelo</th>
                    <th className="px-6 py-3 text-center">Docs. Alerta</th>
                    <th className="px-6 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {filteredUnidades.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                        No se encontraron unidades.
                      </td>
                    </tr>
                  ) : (
                    filteredUnidades.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-bold text-gray-900 font-mono text-sm">#{u.disk_number}</td>
                        <td className="px-6 py-4 font-mono font-medium text-xs">{u.plate}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{u.member_name}</td>
                        <td className="px-6 py-4 text-gray-600">{u.driver_name}</td>
                        <td className="px-6 py-4 text-xs">
                          {u.brand ? `${u.brand} ${u.model || ''} (${u.year || '-'})` : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {u.expired_docs_count > 0 ? (
                            <Badge variant="danger" className="text-[10px] font-bold">
                              {u.expired_docs_count} vencido(s)
                            </Badge>
                          ) : u.upcoming_docs_count > 0 ? (
                            <Badge variant="warning" className="text-[10px] font-bold">
                              {u.upcoming_docs_count} por vencer
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={u.status === 'activa' ? 'success' : u.status === 'mantenimiento' ? 'warning' : 'default'}>
                            {u.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: CONDUCTORES ──────────────────────────────────────── */}
      {activeTab === 'conductores' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-400 font-medium">Total Conductores</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{data.conductores.total}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-green-600 font-medium">Activos</p>
              <p className="text-xl font-bold text-green-600 mt-1">{data.conductores.active}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Externos (Sin unidad/socio)</p>
              <p className="text-xl font-bold text-gray-700 mt-1">{data.conductores.external}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Socios Conductores</p>
              <p className="text-xl font-bold text-gray-700 mt-1">{data.conductores.socioDrivers}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-red-500 font-medium">Licencia A1 Vencida/Ausente</p>
              <p className="text-xl font-bold text-red-600 mt-1">{data.conductores.licenseA1ExpiredOrMissing}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar conductores..."
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={exportConductores} className="flex items-center gap-2" variant="outline">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Exportar Excel (CSV)
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3">Cédula</th>
                    <th className="px-6 py-3">Conductor</th>
                    <th className="px-6 py-3">Teléfono</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Licencia A1</th>
                    <th className="px-6 py-3">Vencimiento</th>
                    <th className="px-6 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {filteredConductores.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                        No se encontraron conductores.
                      </td>
                    </tr>
                  ) : (
                    filteredConductores.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono font-medium text-xs">{c.document_id}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {c.last_name}, {c.first_name}
                          {c.socio_name && (
                            <span className="block text-[11px] text-gray-400">
                              Socio Rel.: {c.socio_name}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">{c.phone || '-'}</td>
                        <td className="px-6 py-4 text-xs font-semibold capitalize">
                          <span className={c.type === 'socio' ? 'text-blue-600' : 'text-gray-600'}>
                            {c.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={
                            c.license_status === 'Vigente' ? 'success' :
                            c.license_status === 'Por vencer' ? 'warning' : 'danger'
                          }>
                            {c.license_status || 'Sin licencia'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{c.license_expiry || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={c.status === 'activo' ? 'success' : 'default'}>
                            {c.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: DOCUMENTOS ───────────────────────────────────────── */}
      {activeTab === 'documentos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-400 font-medium">Total Documentos</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{data.documentos.total}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-red-500 font-medium">Vencidos</p>
              <p className="text-xl font-bold text-red-600 mt-1">{data.documentos.expired}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-orange-500 font-medium">Vencimiento en 30 días</p>
              <p className="text-xl font-bold text-orange-500 mt-1">{data.documentos.upcoming30}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Vencimiento en 30-60 días</p>
              <p className="text-xl font-bold text-gray-700 mt-1">{data.documentos.upcoming60}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar documentos..."
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={exportDocumentos} className="flex items-center gap-2" variant="outline">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Exportar Excel (CSV)
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3">Documento</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Relacionado a</th>
                    <th className="px-6 py-3">Identificador</th>
                    <th className="px-6 py-3">Fecha Vencimiento</th>
                    <th className="px-6 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {filteredDocumentos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                        No se encontraron documentos.
                      </td>
                    </tr>
                  ) : (
                    filteredDocumentos.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-900">{d.title}</td>
                        <td className="px-6 py-4 text-xs font-mono">{d.type_name}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {d.entity_name}
                          <span className="block text-[10px] text-gray-400 capitalize">
                            Entidad: {d.entity_type === 'member' ? 'socio' : d.entity_type === 'vehicle' ? 'unidad' : 'conductor'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{d.entity_identifier}</td>
                        <td className="px-6 py-4 font-mono text-xs">{d.expiry_date || 'No expira'}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={
                            d.status === 'vigente' ? 'success' :
                            d.status === 'por_vencer' ? 'warning' : 'danger'
                          }>
                            {d.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: FINANZAS ─────────────────────────────────────────── */}
      {activeTab === 'finanzas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-red-500 font-medium">Deuda Total Pendiente</p>
              <p className="text-xl font-bold text-red-600 mt-1">${data.financiero.totalPending.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Socios Deudores</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{data.financiero.debtorMembersCount}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-orange-500 font-medium">Deudas Vinculadas a Unidades</p>
              <p className="text-xl font-bold text-orange-600 mt-1">${data.financiero.vehiclePendingFees.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-green-600 font-medium">Recaudado en Rango Seleccionado</p>
              <p className="text-xl font-bold text-green-600 mt-1">${data.financiero.paymentsSum.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por socio, descripción..."
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={exportFinanzas} className="flex items-center gap-2" variant="outline">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Exportar Excel (CSV)
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3">Socio</th>
                    <th className="px-6 py-3">Descripción de Cuota</th>
                    <th className="px-6 py-3">Monto</th>
                    <th className="px-6 py-3">Saldo</th>
                    <th className="px-6 py-3">Vencimiento</th>
                    <th className="px-6 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {filteredFinanzas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                        No se encontraron cuotas financieras.
                      </td>
                    </tr>
                  ) : (
                    filteredFinanzas.map(f => (
                      <tr key={f.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-900">{f.member_name}</td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-700">
                          {f.description}
                          {f.vehicle_disk && (
                            <span className="block text-[10px] text-gray-400 font-mono">
                              Unidad: #{f.vehicle_disk}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono font-medium">${f.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 font-mono font-bold text-red-600">${f.balance.toFixed(2)}</td>
                        <td className="px-6 py-4 font-mono text-xs">{f.due_date}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={
                            f.status === 'pagada' ? 'success' :
                            f.status === 'moroso' ? 'danger' : 'warning'
                          }>
                            {f.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: SANCIONES ────────────────────────────────────────── */}
      {activeTab === 'sanciones' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-400 font-medium">Total Sanciones</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{data.sanciones.total}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-red-500 font-medium">Pendientes de Pago/Resolución</p>
              <p className="text-xl font-bold text-red-600 mt-1">{data.sanciones.byStatus.pendiente}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-orange-500 font-medium font-medium">Total Multas por Sanción</p>
              <p className="text-xl font-bold text-gray-800 mt-1">${data.sanciones.totalFinesAmount.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <p className="text-xs text-green-600 font-medium">Multas Recaudadas</p>
              <p className="text-xl font-bold text-green-600 mt-1">${data.sanciones.paidFinesAmount.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar sanciones..."
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={exportSanciones} className="flex items-center gap-2" variant="outline">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Exportar Excel (CSV)
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3">Socio</th>
                    <th className="px-6 py-3">Tipo Infracción</th>
                    <th className="px-6 py-3">Razón</th>
                    <th className="px-6 py-3">Fecha</th>
                    <th className="px-6 py-3 text-center">Multa</th>
                    <th className="px-6 py-3 text-center">Saldo</th>
                    <th className="px-6 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {filteredSanciones.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                        No se encontraron sanciones registradas.
                      </td>
                    </tr>
                  ) : (
                    filteredSanciones.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-900">{s.member_name}</td>
                        <td className="px-6 py-4 font-medium text-gray-700 text-xs">{s.sanction_type}</td>
                        <td className="px-6 py-4 text-gray-600 text-xs">{s.reason}</td>
                        <td className="px-6 py-4 font-mono text-xs">{s.date}</td>
                        <td className="px-6 py-4 text-center font-mono text-xs font-semibold">
                          {s.fine_amount ? `$${s.fine_amount.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs font-bold text-red-600">
                          {s.fine_balance ? `$${s.fine_balance.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={
                            s.status === 'resuelta' ? 'success' :
                            s.status === 'anulada' ? 'default' : 'warning'
                          }>
                            {s.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: REUNIONES Y ASISTENCIA ───────────────────────────── */}
      {activeTab === 'reuniones' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Asistencia Promedio Acumulada</p>
                <p className="text-2xl font-bold text-primary-600 mt-1">{data.reuniones.attendanceRate}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Reuniones Registradas</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{data.reuniones.total}</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar reuniones por título o tipo..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={exportReuniones} className="flex items-center gap-2" variant="outline">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Exportar Excel (CSV)
              </Button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-3">Reunión</th>
                      <th className="px-6 py-3">Fecha</th>
                      <th className="px-6 py-3">Oblig.</th>
                      <th className="px-6 py-3 text-center">Asist. / Aus. / Just. / Tard.</th>
                      <th className="px-6 py-3 text-center">Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-700">
                    {filteredReuniones.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                          No se encontraron reuniones registradas.
                        </td>
                      </tr>
                    ) : (
                      filteredReuniones.map(r => {
                        const totalPresent = r.attended + r.tarde
                        const percent = r.total_invited > 0 ? Math.round((totalPresent / r.total_invited) * 100) : 100
                        return (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-semibold text-gray-900">
                              {r.title}
                              <span className="block text-[10px] text-gray-400 uppercase font-mono">{r.meeting_type}</span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs">{r.date}</td>
                            <td className="px-6 py-4 text-xs font-bold">{r.is_mandatory ? 'SÍ' : 'NO'}</td>
                            <td className="px-6 py-4 text-center text-xs">
                              <span className="text-green-600 font-bold">{r.attended}</span>{' / '}
                              <span className="text-red-600 font-bold">{r.absent}</span>{' / '}
                              <span className="text-gray-500 font-bold">{r.justified}</span>{' / '}
                              <span className="text-yellow-600 font-bold">{r.tarde}</span>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-xs">
                              <span className={percent >= 80 ? 'text-green-600' : percent >= 60 ? 'text-amber-500' : 'text-red-500'}>
                                {percent}%
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-100 py-4">
                <CardTitle className="text-sm font-bold text-gray-800">
                  Top Inasistencias y Atrasos (Ranking)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {data.reuniones.mostAbsences.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Sin inasistencias registradas.</p>
                ) : (
                  data.reuniones.mostAbsences.map((member, i) => (
                    <div key={member.document_id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-xs">
                      <div>
                        <span className="font-bold text-gray-500 mr-2">#{i + 1}</span>
                        <span className="font-semibold text-gray-800">{member.member_name}</span>
                        <span className="block font-mono text-[10px] text-gray-400">{member.document_id}</span>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold mr-1">
                          {member.absences} Aus.
                        </span>
                        <span className="inline-block bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded font-bold">
                          {member.tardiness} Tard.
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
