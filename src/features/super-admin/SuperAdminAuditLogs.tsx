import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { RefreshCw, Eye, X, ShieldAlert, ArrowLeft, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAuditLogs,
  getAuditLogDetail,
  getAuditFilters,
  type AuditLogItem,
  type AuditLogDetail,
  type AuditFilters
} from './hooks/useSuperAdminAuditLogs'
import { JsonViewer } from './components/JsonViewer'

export function SuperAdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingFilters, setLoadingFilters] = useState(true)

  // Filters State
  const [filters, setFilters] = useState<AuditFilters>({
    actions: [],
    table_names: [],
    companies: [],
    users: []
  })

  // Selected Filter Values
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedTable, setSelectedTable] = useState('')
  const [selectedDateFrom, setSelectedDateFrom] = useState('')
  const [selectedDateTo, setSelectedDateTo] = useState('')

  // Pagination State
  const [limit] = useState(25)
  const [page, setPage] = useState(0)

  // Detail Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedLogDetail, setSelectedLogDetail] = useState<AuditLogDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchFiltersData = useCallback(async () => {
    setLoadingFilters(true)
    try {
      const data = await getAuditFilters()
      setFilters(data)
    } catch (err: any) {
      console.error('Error al cargar filtros de auditoría:', err.message)
    } finally {
      setLoadingFilters(false)
    }
  }, [])

  const fetchLogsData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getAuditLogs({
        companyId: selectedCompany || null,
        userId: selectedUser || null,
        action: selectedAction || null,
        tableName: selectedTable || null,
        dateFrom: selectedDateFrom || null,
        dateTo: selectedDateTo || null,
        limit,
        offset: page * limit,
      })
      setLogs(response.data)
      setTotalCount(response.total_count)
    } catch (err: any) {
      let msg = err.message || 'Error al obtener la bitácora'
      if (msg.includes('No autorizado')) {
        msg = 'No autorizado: Se requieren privilegios de super_admin.'
      } else if (msg.includes('fechas')) {
        msg = 'Rango de fechas inválido: la fecha de inicio no puede ser posterior a la fecha de fin.'
      }
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [selectedCompany, selectedUser, selectedAction, selectedTable, selectedDateFrom, selectedDateTo, page, limit])

  useEffect(() => {
    fetchFiltersData()
  }, [fetchFiltersData])

  useEffect(() => {
    fetchLogsData()
  }, [fetchLogsData])

  const handleClearFilters = () => {
    setSelectedCompany('')
    setSelectedUser('')
    setSelectedAction('')
    setSelectedTable('')
    setSelectedDateFrom('')
    setSelectedDateTo('')
    setPage(0)
    toast.success('Filtros limpiados')
  }

  const handleFilterChange = () => {
    setPage(0)
  }

  const handleOpenDetail = async (logId: string) => {
    setLoadingDetail(true)
    setIsDetailOpen(true)
    setSelectedLogDetail(null)
    try {
      const detail = await getAuditLogDetail(logId)
      setSelectedLogDetail(detail)
    } catch (err: any) {
      toast.error('Error al cargar detalle del log: ' + err.message)
      setIsDetailOpen(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bitácora de Auditoría</h1>
        <p className="text-slate-500">Historial completo de auditoría y operaciones administrativas del SaaS</p>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Compañía</label>
            <select
              value={selectedCompany}
              disabled={loadingFilters}
              onChange={(e) => { setSelectedCompany(e.target.value); handleFilterChange(); }}
              className="w-full text-xs rounded-md border border-slate-300 py-2 px-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Todas</option>
              {filters.companies.map((c) => (
                <option key={c.id} value={c.id}>{c.legal_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Usuario</label>
            <select
              value={selectedUser}
              disabled={loadingFilters}
              onChange={(e) => { setSelectedUser(e.target.value); handleFilterChange(); }}
              className="w-full text-xs rounded-md border border-slate-300 py-2 px-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Todos</option>
              {filters.users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || 'Sistema / No disponible'}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Acción</label>
            <select
              value={selectedAction}
              disabled={loadingFilters}
              onChange={(e) => { setSelectedAction(e.target.value); handleFilterChange(); }}
              className="w-full text-xs rounded-md border border-slate-300 py-2 px-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Todas</option>
              {filters.actions.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Tabla</label>
            <select
              value={selectedTable}
              disabled={loadingFilters}
              onChange={(e) => { setSelectedTable(e.target.value); handleFilterChange(); }}
              className="w-full text-xs rounded-md border border-slate-300 py-2 px-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Todas</option>
              {filters.table_names.map((tbl) => (
                <option key={tbl} value={tbl}>{tbl}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha Desde</label>
            <input
              type="date"
              value={selectedDateFrom}
              onChange={(e) => { setSelectedDateFrom(e.target.value); handleFilterChange(); }}
              className="w-full text-xs rounded-md border border-slate-300 py-1.5 px-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={selectedDateTo}
              onChange={(e) => { setSelectedDateTo(e.target.value); handleFilterChange(); }}
              className="w-full text-xs rounded-md border border-slate-300 py-1.5 px-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs flex items-center gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchLogsData}
            disabled={loading}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </Card>

      {/* Listado de Logs */}
      <Card className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-700">Sin registros de auditoría</h3>
            <p className="text-xs">No se encontraron operaciones en la bitácora con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Compañía</th>
                    <th className="px-4 py-3">Acción</th>
                    <th className="px-4 py-3">Tabla</th>
                    <th className="px-4 py-3">ID Registro</th>
                    <th className="px-4 py-3 text-center">Cambios Previos</th>
                    <th className="px-4 py-3 text-center">Cambios Nuevos</th>
                    <th className="px-4 py-3 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-55/40">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {log.user_full_name || 'Sistema / No disponible'}
                      </td>
                      <td className="px-4 py-3 italic text-slate-500">
                        {log.company_name || 'Global SaaS'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info" className="lowercase">{log.action}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">{log.table_name}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400 max-w-[120px] truncate">
                        {log.record_id || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={log.has_old_data ? 'warning' : 'default'}>
                          {log.has_old_data ? 'Con cambios' : 'Sin datos previos'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={log.has_new_data ? 'success' : 'default'}>
                          {log.has_new_data ? 'Con cambios' : 'Sin datos nuevos'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleOpenDetail(log.id)}
                          className="hover:text-slate-900"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Mostrando página <span className="font-semibold">{page + 1}</span> de <span className="font-semibold">{totalPages || 1}</span> ({totalCount} registros totales)
              </span>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1.5"
                >
                  Siguiente
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Detalle de Log */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detalle del Registro de Auditoría"
        size="lg"
      >
        {loadingDetail ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : selectedLogDetail ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">ID Registro Auditoría</span>
                <span className="font-mono text-slate-800 font-medium select-all">{selectedLogDetail.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Fecha y Hora</span>
                <span className="text-slate-800 font-medium">{new Date(selectedLogDetail.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Usuario Invocador</span>
                <span className="text-slate-800 font-medium">{selectedLogDetail.user_full_name || 'Sistema / No disponible'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Compañía / Cooperativa</span>
                <span className="text-slate-800 font-medium italic">{selectedLogDetail.company_name || 'Global SaaS'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Acción Ejecutada</span>
                <span className="text-slate-850 font-bold block">{selectedLogDetail.action}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tabla Afectada</span>
                <span className="text-slate-800 font-mono">{selectedLogDetail.table_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ID Fila Afectada</span>
                <span className="font-mono text-slate-600 block select-all">{selectedLogDetail.record_id || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Dirección IP</span>
                <span className="font-mono text-slate-600 block">{selectedLogDetail.ip_address || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <JsonViewer title="Datos Anteriores (old_data)" data={selectedLogDetail.old_data} />
              <JsonViewer title="Datos Nuevos (new_data)" data={selectedLogDetail.new_data} />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="primary" onClick={() => setIsDetailOpen(false)}>
                Cerrar Detalle
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 italic">No se pudo cargar el detalle del log.</div>
        )}
      </Modal>
    </div>
  )
}
