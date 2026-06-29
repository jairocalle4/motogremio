import { useState, useMemo } from 'react'
import {
  Printer, Users, Bike, UserCheck, FileText,
  DollarSign, AlertTriangle, Calendar, Search, TrendingUp,
  BarChart2, FileSpreadsheet, RefreshCw
} from 'lucide-react'
import { useReports, useReportsSummary } from '../hooks/useReports'
import { exportToExcel } from '../utils/exportExcel'
import { printReport } from '../utils/printReport'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input } from '@/components/ui'
import { usePermissions, useAuth } from '@/hooks/usePermissions'
import { useBranding } from '@/context/BrandingContext'

type TabType = 'resumen' | 'socios' | 'unidades' | 'conductores' | 'documentos' | 'finanzas' | 'sanciones' | 'reuniones'

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('resumen')
  const { loading: summaryLoading, error: summaryError, summary } = useReportsSummary()
  const { loading: detailLoading, data: rawData, dateRange, setDateRange } = useReports(activeTab)
  const data = rawData!
  const { canViewReports } = usePermissions()
  const { profile } = useAuth()
  const { branding } = useBranding()
  const companyName = profile?.company?.trade_name ?? profile?.company?.legal_name ?? 'Compañía'
  const [searchTerm, setSearchTerm] = useState('')

  // Local state for date filters
  const [tempStartDate, setTempStartDate] = useState(dateRange.startDate)
  const [tempEndDate, setTempEndDate] = useState(dateRange.endDate)
  const [dateError, setDateError] = useState<string | null>(null)

  const handleApplyFilters = () => {
    if ((tempStartDate && !tempEndDate) || (!tempStartDate && tempEndDate)) {
      setDateError('Ambas fechas son obligatorias si se aplica el filtro.')
      return
    }

    if (tempStartDate && tempEndDate) {
      if (new Date(tempStartDate) > new Date(tempEndDate)) {
        setDateError('La fecha "Desde" no puede ser mayor que la fecha "Hasta".')
        return
      }
    }

    setDateError(null)
    setDateRange({ startDate: tempStartDate, endDate: tempEndDate })
  }

  const handleClearFilters = () => {
    setTempStartDate('')
    setTempEndDate('')
    setDateError(null)
    setDateRange({ startDate: '', endDate: '' })
  }

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

  // ─── METADATA HELPERS ──────────────────────────────────────────────────────
  const getDateRangeLabel = () =>
    dateRange.startDate && dateRange.endDate
      ? `${new Date(dateRange.startDate + 'T00:00:00').toLocaleDateString('es-EC')} — ${new Date(dateRange.endDate + 'T00:00:00').toLocaleDateString('es-EC')}`
      : 'Histórico / Sin Filtro'

  const getExportMeta = (reportName: string) => ({
    companyName,
    reportName,
    dateRange: getDateRangeLabel(),
  })

  const getPrintMeta = (reportName: string) => ({
    companyName,
    reportName,
    dateRange: getDateRangeLabel(),
    logoUrl: branding?.logo_url ?? null,
  })

  // ─── EXCEL EXPORTS ─────────────────────────────────────────────────────────
  const exportSocios = () => {
    if (!data) return
    exportToExcel('reporte_socios', [
      { key: 'document_id', label: 'Cédula/RUC', width: 16 },
      { key: 'last_name', label: 'Apellidos', width: 22 },
      { key: 'first_name', label: 'Nombres', width: 22 },
      { key: 'phone', label: 'Teléfono', width: 14 },
      { key: 'status', label: 'Estado', width: 12 },
      { key: 'admission_date', label: 'Fecha Admisión', width: 16 },
      { key: 'vehicle_count', label: 'Nº Unidades', width: 12 },
      { key: 'vehicles', label: 'Discos', width: 18 },
    ], filteredSocios, getExportMeta('Reporte de Socios'))
  }

  const exportUnidades = () => {
    if (!data) return
    exportToExcel('reporte_unidades', [
      { key: 'disk_number', label: 'Disco', width: 10 },
      { key: 'plate', label: 'Placa', width: 14 },
      { key: 'status', label: 'Estado', width: 14 },
      { key: 'member_name', label: 'Socio Propietario', width: 26 },
      { key: 'driver_name', label: 'Conductor Asignado', width: 26 },
      { key: 'brand', label: 'Marca', width: 12 },
      { key: 'model', label: 'Modelo', width: 14 },
      { key: 'year', label: 'Año', width: 8 },
      { key: 'expired_docs_count', label: 'Docs. Vencidos', width: 14 },
      { key: 'upcoming_docs_count', label: 'Docs. Por Vencer', width: 16 },
    ], filteredUnidades, getExportMeta('Reporte de Unidades'))
  }

  const exportConductores = () => {
    if (!data) return
    exportToExcel('reporte_conductores', [
      { key: 'document_id', label: 'Cédula', width: 16 },
      { key: 'last_name', label: 'Apellidos', width: 22 },
      { key: 'first_name', label: 'Nombres', width: 22 },
      { key: 'phone', label: 'Teléfono', width: 14 },
      { key: 'status', label: 'Estado', width: 12 },
      { key: 'type', label: 'Tipo Conductor', width: 14 },
      { key: 'socio_name', label: 'Socio Relacionado', width: 24 },
      { key: 'license_type', label: 'Tipo Licencia', width: 14 },
      { key: 'license_status', label: 'Estado Licencia', width: 16 },
      { key: 'license_expiry', label: 'Vencimiento', width: 16 },
    ], filteredConductores, getExportMeta('Reporte de Conductores'))
  }

  const exportDocumentos = () => {
    if (!data) return
    exportToExcel('reporte_documentos', [
      { key: 'title', label: 'Documento', width: 28 },
      { key: 'type_name', label: 'Tipo', width: 18 },
      { key: 'entity_type', label: 'Entidad', width: 12 },
      { key: 'entity_name', label: 'Nombre Entidad', width: 26 },
      { key: 'entity_identifier', label: 'Identificador', width: 16 },
      { key: 'expiry_date', label: 'Fecha Vencimiento', width: 18 },
      { key: 'status', label: 'Estado', width: 14 },
    ], filteredDocumentos, getExportMeta('Reporte de Documentos'))
  }

  const exportFinanzas = () => {
    if (!data) return
    exportToExcel('reporte_financiero', [
      { key: 'member_name', label: 'Socio', width: 28 },
      { key: 'description', label: 'Descripción de Cuota', width: 32 },
      { key: 'amount', label: 'Monto ($)', width: 14 },
      { key: 'balance', label: 'Saldo Pendiente ($)', width: 18 },
      { key: 'due_date', label: 'Fecha Vencimiento', width: 18 },
      { key: 'status', label: 'Estado', width: 14 },
      { key: 'charge_type', label: 'Tipo de Cuota', width: 18 },
      { key: 'vehicle_disk', label: 'Unidad (Disco)', width: 14 },
    ], filteredFinanzas, getExportMeta('Reporte Financiero'))
  }

  const exportSanciones = () => {
    if (!data) return
    exportToExcel('reporte_sanciones', [
      { key: 'member_name', label: 'Socio', width: 28 },
      { key: 'sanction_type', label: 'Infracción/Tipo', width: 22 },
      { key: 'date', label: 'Fecha Sanción', width: 14 },
      { key: 'reason', label: 'Razón', width: 32 },
      { key: 'severity', label: 'Gravedad', width: 12 },
      { key: 'status', label: 'Estado', width: 14 },
      { key: 'fine_amount', label: 'Valor Multa ($)', width: 16 },
      { key: 'fine_balance', label: 'Saldo Multa ($)', width: 16 },
      { key: 'fine_status', label: 'Estado de Pago', width: 16 },
    ], filteredSanciones, getExportMeta('Reporte de Sanciones'))
  }

  const exportReuniones = () => {
    if (!data) return
    exportToExcel('reporte_reuniones', [
      { key: 'title', label: 'Reunión', width: 30 },
      { key: 'meeting_type', label: 'Tipo', width: 14 },
      { key: 'date', label: 'Fecha', width: 14 },
      { key: 'time', label: 'Hora', width: 10 },
      { key: 'status', label: 'Estado', width: 14 },
      { key: 'is_mandatory', label: 'Obligatoria', width: 12, render: val => val ? 'SÍ' : 'NO' },
      { key: 'attended', label: 'Asistieron', width: 12 },
      { key: 'absent', label: 'Ausentes', width: 12 },
      { key: 'justified', label: 'Justificados', width: 12 },
      { key: 'tarde', label: 'Atrasados', width: 12 },
      { key: 'total_invited', label: 'Total Convocados', width: 16 },
    ], filteredReuniones, getExportMeta('Reporte de Reuniones'))
  }

  // ─── PDF / PRINT HANDLERS ──────────────────────────────────────────────────
  const handlePrintSocios = () => {
    if (!data) return
    printReport(
      [
        { key: 'document_id', label: 'Cédula', width: '110px' },
        { key: 'last_name', label: 'Apellidos' },
        { key: 'first_name', label: 'Nombres' },
        { key: 'phone', label: 'Teléfono', width: '110px' },
        { key: 'admission_date', label: 'Admisión', width: '100px', align: 'center' },
        { key: 'vehicle_count', label: 'Unidades', width: '70px', align: 'center' },
        { key: 'status', label: 'Estado', width: '80px', align: 'center' },
      ],
      filteredSocios,
      getPrintMeta('Reporte de Socios'),
      [
        { label: 'Total socios', value: data.socios.total },
        { label: 'Activos', value: data.socios.active, highlight: 'success' },
        { label: 'Inactivos', value: data.socios.inactive },
        { label: 'Suspendidos', value: data.socios.suspended, highlight: 'danger' },
      ]
    )
  }

  const handlePrintUnidades = () => {
    if (!data) return
    printReport(
      [
        { key: 'disk_number', label: 'Disco', width: '60px', align: 'center' },
        { key: 'plate', label: 'Placa', width: '90px' },
        { key: 'member_name', label: 'Socio Propietario' },
        { key: 'driver_name', label: 'Conductor' },
        { key: 'brand', label: 'Marca/Modelo', width: '120px', render: (_, row: any) => `${row.brand || ''} ${row.model || ''} (${row.year || '-'})` },
        { key: 'expired_docs_count', label: 'Docs Vencidos', width: '80px', align: 'center' },
        { key: 'status', label: 'Estado', width: '80px', align: 'center' },
      ],
      filteredUnidades,
      getPrintMeta('Reporte de Unidades'),
      [
        { label: 'Total unidades', value: data.unidades.total },
        { label: 'Activas', value: data.unidades.active, highlight: 'success' },
        { label: 'En mantenimiento', value: data.unidades.maintenance, highlight: 'warning' },
        { label: 'Sin conductor', value: data.unidades.unassignedDrivers, highlight: 'warning' },
        { label: 'Con docs. vencidos', value: data.unidades.expiredDocs, highlight: 'danger' },
      ]
    )
  }

  const handlePrintConductores = () => {
    if (!data) return
    printReport(
      [
        { key: 'document_id', label: 'Cédula', width: '110px' },
        { key: 'last_name', label: 'Apellidos' },
        { key: 'first_name', label: 'Nombres' },
        { key: 'phone', label: 'Teléfono', width: '110px' },
        { key: 'type', label: 'Tipo', width: '80px', align: 'center' },
        { key: 'license_status', label: 'Estado Licencia', width: '100px', align: 'center' },
        { key: 'license_expiry', label: 'Vence', width: '100px', align: 'center' },
        { key: 'status', label: 'Estado', width: '80px', align: 'center' },
      ],
      filteredConductores,
      getPrintMeta('Reporte de Conductores'),
      [
        { label: 'Total conductores', value: data.conductores.total },
        { label: 'Activos', value: data.conductores.active, highlight: 'success' },
        { label: 'Licencia vencida o faltante', value: data.conductores.licenseExpiredOrMissing, highlight: 'danger' },
      ]
    )
  }

  const handlePrintDocumentos = () => {
    if (!data) return
    printReport(
      [
        { key: 'title', label: 'Documento' },
        { key: 'type_name', label: 'Tipo', width: '120px' },
        { key: 'entity_name', label: 'Relacionado a' },
        { key: 'entity_identifier', label: 'Identificador', width: '110px' },
        { key: 'expiry_date', label: 'Vencimiento', width: '110px', align: 'center' },
        { key: 'status', label: 'Estado', width: '90px', align: 'center' },
      ],
      filteredDocumentos,
      getPrintMeta('Reporte de Documentos'),
      [
        { label: 'Total documentos', value: data.documentos.total },
        { label: 'Vencidos', value: data.documentos.expired, highlight: 'danger' },
        { label: 'Por vencer (30 días)', value: data.documentos.upcoming30, highlight: 'warning' },
        { label: 'Por vencer (30-60 días)', value: data.documentos.upcoming60 },
      ]
    )
  }

  const handlePrintFinanzas = () => {
    if (!data) return
    printReport(
      [
        { key: 'member_name', label: 'Socio', width: '160px' },
        { key: 'description', label: 'Descripción de Cuota' },
        { key: 'amount', label: 'Monto ($)', width: '90px', align: 'right', render: val => val != null ? `$${Number(val).toFixed(2)}` : '-' },
        { key: 'balance', label: 'Saldo ($)', width: '90px', align: 'right', render: val => val != null ? `$${Number(val).toFixed(2)}` : '-' },
        { key: 'due_date', label: 'Vencimiento', width: '110px', align: 'center' },
        { key: 'status', label: 'Estado', width: '90px', align: 'center' },
        { key: 'charge_type', label: 'Tipo', width: '100px' },
      ],
      filteredFinanzas,
      getPrintMeta('Reporte Financiero'),
      [
        { label: 'Deuda total pendiente', value: `$${data.financiero.totalPending.toFixed(2)}`, highlight: 'danger' },
        { label: 'Socios deudores', value: data.financiero.debtorMembersCount, highlight: 'warning' },
        { label: 'Recaudado en período', value: `$${data.financiero.paymentsSum.toFixed(2)}`, highlight: 'success' },
      ]
    )
  }

  const handlePrintSanciones = () => {
    if (!data) return
    printReport(
      [
        { key: 'member_name', label: 'Socio', width: '160px' },
        { key: 'sanction_type', label: 'Tipo Infracción', width: '130px' },
        { key: 'reason', label: 'Razón' },
        { key: 'date', label: 'Fecha', width: '100px', align: 'center' },
        { key: 'severity', label: 'Gravedad', width: '80px', align: 'center' },
        { key: 'fine_amount', label: 'Multa ($)', width: '90px', align: 'right', render: val => val ? `$${Number(val).toFixed(2)}` : '-' },
        { key: 'fine_balance', label: 'Saldo ($)', width: '90px', align: 'right', render: val => val ? `$${Number(val).toFixed(2)}` : '-' },
        { key: 'status', label: 'Estado', width: '90px', align: 'center' },
      ],
      filteredSanciones,
      getPrintMeta('Reporte de Sanciones'),
      [
        { label: 'Total sanciones', value: data.sanciones.total },
        { label: 'Pendientes', value: data.sanciones.byStatus.pendiente, highlight: 'warning' },
        { label: 'Multas pendientes', value: `$${data.sanciones.pendingFinesAmount.toFixed(2)}`, highlight: 'danger' },
        { label: 'Multas recaudadas', value: `$${data.sanciones.paidFinesAmount.toFixed(2)}`, highlight: 'success' },
      ]
    )
  }

  const handlePrintReuniones = () => {
    if (!data) return
    printReport(
      [
        { key: 'title', label: 'Reunión' },
        { key: 'meeting_type', label: 'Tipo', width: '100px' },
        { key: 'date', label: 'Fecha', width: '100px', align: 'center' },
        { key: 'is_mandatory', label: 'Oblig.', width: '60px', align: 'center', render: val => val ? 'SÍ' : 'NO' },
        { key: 'attended', label: 'Asist.', width: '60px', align: 'center' },
        { key: 'absent', label: 'Ausen.', width: '60px', align: 'center' },
        { key: 'justified', label: 'Justif.', width: '60px', align: 'center' },
        { key: 'tarde', label: 'Tarde', width: '60px', align: 'center' },
        { key: 'total_invited', label: 'Total', width: '60px', align: 'center' },
        { key: 'status', label: 'Estado', width: '90px', align: 'center' },
      ],
      filteredReuniones,
      getPrintMeta('Reporte de Reuniones — Asistencia'),
      [
        { label: 'Total reuniones', value: data.reuniones.total },
        { label: 'Asistencia promedio', value: `${data.reuniones.attendanceRate}%`, highlight: data.reuniones.attendanceRate >= 80 ? 'success' : data.reuniones.attendanceRate >= 60 ? 'warning' : 'danger' },
      ]
    )
  }

  const handlePrintResumen = () => {
    // Para el resumen, imprimimos un documento con KPIs
    if (!summary) return
    const summaryData = [
      { indicador: 'Socios Activos', valor: summary.members_active, total: `de ${summary.members_total} registrados` },
      { indicador: 'Unidades Operativas', valor: summary.vehicles_active, total: `de ${summary.vehicles_total} registradas` },
      { indicador: 'Conductores', valor: summary.drivers_total, total: '' },
      { indicador: 'Documentos Vencidos', valor: summary.documents_expired, total: '⚠ Requieren atención inmediata' },
      { indicador: 'Documentos por Vencer (30 días)', valor: summary.documents_expiring_soon, total: '' },
      { indicador: 'Licencias Vencidas', valor: summary.licenses_expired, total: '' },
      { indicador: 'Balance Pendiente de Cobro', valor: `$${summary.balance_pending.toFixed(2)}`, total: `${summary.charges_pending} cuotas pendientes` },
      { indicador: 'Cuotas Vencidas (Morosas)', valor: summary.charges_overdue, total: '' },
      { indicador: 'Sanciones Totales', valor: summary.sanctions_total, total: '' },
      { indicador: 'Reuniones Registradas', valor: summary.meetings_total, total: '' },
    ]
    printReport(
      [
        { key: 'indicador', label: 'Indicador', width: '55%' },
        { key: 'valor', label: 'Valor', width: '15%', align: 'center' },
        { key: 'total', label: 'Observación', width: '30%' },
      ],
      summaryData as any,
      getPrintMeta('Informe General de Resumen')
    )
  }

  if (summaryLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-10 w-10 animate-spin text-primary-600 mb-4" />
          <p className="text-gray-500 font-medium">Cargando resumen de reportes...</p>
        </div>
      </div>
    )
  }

  if (summaryError) {
    return (
      <div className="page-container p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-semibold">Error al cargar reportes</h3>
            <p className="text-sm">{summaryError}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!summary) return null

  return (
    <div className="page-container p-6 space-y-6 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none">
      <style>{`
        @media print {
          /* Ocultar barra lateral, cabecera de la app y controles interactivos */
          aside, header, nav, button, input, select,
          .no-print, .print\\:hidden, .filters-container, .tabs-container {
            display: none !important;
          }
          body, html, #root, .app-layout, .page-container {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
          }
          .page-container {
            padding: 1.5cm !important;
          }
          .card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 8px !important;
            font-size: 11px !important;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centro de Reportes e Indicadores</h1>
          <p className="text-sm text-gray-500">
            Analiza el estado general de socios, unidades, documentación, finanzas, sanciones y asistencia.
          </p>
        </div>
        {activeTab === 'resumen' && (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handlePrintResumen} variant="outline" size="sm" className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-blue-600" />
              Imprimir Resumen PDF
            </Button>
          </div>
        )}
      </div>

      {/* FILTROS DE FECHA */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm print:hidden space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
            <span className="text-xs text-gray-500 font-medium">Desde:</span>
            <input
              type="date"
              className="text-sm border-none bg-transparent focus:ring-0 p-0 text-gray-700"
              value={tempStartDate}
              onChange={e => setTempStartDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
            <span className="text-xs text-gray-500 font-medium">Hasta:</span>
            <input
              type="date"
              className="text-sm border-none bg-transparent focus:ring-0 p-0 text-gray-700"
              value={tempEndDate}
              onChange={e => setTempEndDate(e.target.value)}
            />
          </div>
          <Button onClick={handleApplyFilters} size="sm" className="bg-primary-600 hover:bg-primary-700 text-white font-medium">
            Aplicar filtros
          </Button>
          {(tempStartDate || tempEndDate || dateRange.startDate || dateRange.endDate) && (
            <Button onClick={handleClearFilters} size="sm" variant="ghost" className="text-gray-500 hover:text-gray-700">
              Limpiar
            </Button>
          )}
        </div>

        {dateError && (
          <p className="text-xs text-red-600 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
            {dateError}
          </p>
        )}

        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span className="font-semibold text-gray-700">Estado del filtro:</span>
          {dateRange.startDate && dateRange.endDate ? (
            <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium">
              Rango aplicado: {new Date(dateRange.startDate + 'T00:00:00').toLocaleDateString('es-EC')} — {new Date(dateRange.endDate + 'T00:00:00').toLocaleDateString('es-EC')}
            </span>
          ) : (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              Sin filtro de fechas aplicado (mostrando todo)
            </span>
          )}
        </div>
      </div>

      {/* NOTA: El encabezado de impresión ahora se gestiona en la ventana emergente de printReport.ts */}

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
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.members_active}</h3>
                  <p className="text-xs text-gray-400 mt-1">Total registrados: {summary.members_total}</p>
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
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.vehicles_active}</h3>
                  <p className="text-xs text-gray-400 mt-1">Mantenimiento: {data ? data.unidades.maintenance : (summary.vehicles_total - summary.vehicles_active)}</p>
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
                  <h3 className="text-2xl font-bold text-red-600 mt-1">${summary.balance_pending.toFixed(2)}</h3>
                  <p className="text-xs text-gray-400 mt-1">{data ? `${data.financiero.debtorMembersCount} socios deudores` : `${summary.charges_pending} cargos pendientes`}</p>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                  <DollarSign className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Asistencia Promedio</p>
                  <h3 className="text-2xl font-bold text-purple-600 mt-1">{data ? `${data.reuniones.attendanceRate}%` : '—'}</h3>
                  <p className="text-xs text-gray-400 mt-1">En {summary.meetings_total} reuniones</p>
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
                  <Badge variant="danger" className="font-semibold">{summary.documents_expired}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Documentos por vencer (próximos 30 días)</span>
                  <Badge variant="warning" className="font-semibold">{summary.documents_expiring_soon}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Documentos por vencer (próximos 30-60 días)</span>
                  <Badge variant="warning" className="font-semibold">{data ? data.documentos.upcoming60 : '—'}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Conductores sin licencia principal vigente</span>
                  <Badge variant="danger" className="font-semibold">{summary.licenses_expired}</Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Unidades sin conductor asignado</span>
                  <Badge variant="warning" className="font-semibold">{data ? data.unidades.unassignedDrivers : '—'}</Badge>
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
                  <span className="font-semibold text-gray-800">{data ? `${data.financiero.paymentsCount} transacciones` : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Monto total recaudado en rango</span>
                  <span className="font-bold text-green-600 text-lg">{data ? `$${data.financiero.paymentsSum.toFixed(2)}` : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Multas de sanciones pendientes de pago</span>
                  <span className="font-semibold text-amber-600">{data ? `$${data.sanciones.pendingFinesAmount.toFixed(2)}` : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Total histórico recaudado en multas</span>
                  <span className="font-semibold text-green-600">{data ? `$${data.sanciones.paidFinesAmount.toFixed(2)}` : '—'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab !== 'resumen' && (detailLoading || !rawData) ? (
        <div className="flex h-[40vh] items-center justify-center bg-white border border-gray-200 rounded-xl p-12 shadow-sm">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary-600 mb-3" />
            <p className="text-gray-500 font-medium">Cargando información detallada...</p>
          </div>
        </div>
      ) : (
        <>
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
            <div className="flex gap-2">
              <Button onClick={handlePrintSocios} className="flex items-center gap-2" variant="outline">
                <Printer className="h-4 w-4 text-blue-600" />
                Imprimir / PDF
              </Button>
              <Button onClick={exportSocios} className="flex items-center gap-2" variant="outline">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Exportar Excel
              </Button>
            </div>
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
            <div className="flex gap-2">
              <Button onClick={handlePrintUnidades} className="flex items-center gap-2" variant="outline">
                <Printer className="h-4 w-4 text-blue-600" />
                Imprimir / PDF
              </Button>
              <Button onClick={exportUnidades} className="flex items-center gap-2" variant="outline">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Exportar Excel
              </Button>
            </div>
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
              <p className="text-xs text-red-500 font-medium">Licencia principal vencida o ausente</p>
              <p className="text-xl font-bold text-red-600 mt-1">{data.conductores.licenseExpiredOrMissing}</p>
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
            <div className="flex gap-2">
              <Button onClick={handlePrintConductores} className="flex items-center gap-2" variant="outline">
                <Printer className="h-4 w-4 text-blue-600" />
                Imprimir / PDF
              </Button>
              <Button onClick={exportConductores} className="flex items-center gap-2" variant="outline">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Exportar Excel
              </Button>
            </div>
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
                    <th className="px-6 py-3">Licencia</th>
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
            <div className="flex gap-2">
              <Button onClick={handlePrintDocumentos} className="flex items-center gap-2" variant="outline">
                <Printer className="h-4 w-4 text-blue-600" />
                Imprimir / PDF
              </Button>
              <Button onClick={exportDocumentos} className="flex items-center gap-2" variant="outline">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Exportar Excel
              </Button>
            </div>
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
            <div className="flex gap-2">
              <Button onClick={handlePrintFinanzas} className="flex items-center gap-2" variant="outline">
                <Printer className="h-4 w-4 text-blue-600" />
                Imprimir / PDF
              </Button>
              <Button onClick={exportFinanzas} className="flex items-center gap-2" variant="outline">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Exportar Excel
              </Button>
            </div>
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
            <div className="flex gap-2">
              <Button onClick={handlePrintSanciones} className="flex items-center gap-2" variant="outline">
                <Printer className="h-4 w-4 text-blue-600" />
                Imprimir / PDF
              </Button>
              <Button onClick={exportSanciones} className="flex items-center gap-2" variant="outline">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Exportar Excel
              </Button>
            </div>
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
              <div className="flex gap-2">
                <Button onClick={handlePrintReuniones} className="flex items-center gap-2" variant="outline">
                  <Printer className="h-4 w-4 text-blue-600" />
                  Imprimir / PDF
                </Button>
                <Button onClick={exportReuniones} className="flex items-center gap-2" variant="outline">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Exportar Excel
                </Button>
              </div>
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
        </>
      )}
    </div>
  )
}
