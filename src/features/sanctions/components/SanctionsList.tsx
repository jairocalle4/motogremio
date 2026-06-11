import { useState, useEffect, useCallback } from 'react'
import { useSanctions } from '../hooks/useSanctions'
import { useMembers } from '@/hooks/useMembers'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Search, Filter, Eye, RefreshCw, X, Ban } from 'lucide-react'
import { SanctionDetailModal } from './SanctionDetailModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type { Sanction, SanctionStatus } from '@/types'

interface SanctionsListProps {
  canManage: boolean
  memberId?: string // If passed, locks listing to this member and hides member filter
}

const STATUS_BADGE_VARIANTS = {
  pendiente: 'warning',
  apelacion: 'info',
  resuelta: 'success',
  anulada: 'danger',
} as const

export function SanctionsList({ canManage, memberId }: SanctionsListProps) {
  const {
    sanctions,
    sanctionTypes,
    loading,
    fetchSanctions,
    fetchSanctionTypes,
    nullifySanction,
  } = useSanctions()

  const { members, fetchMembers } = useMembers()

  // Filters State
  const [filterMemberId, setFilterMemberId] = useState(memberId ?? '')
  const [filterTypeId, setFilterTypeId] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [monthYear, setMonthYear] = useState('') // 'YYYY-MM'

  // Modals State
  const [selectedSanction, setSelectedSanction] = useState<Sanction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [confirmNullify, setConfirmNullify] = useState<Sanction | null>(null)
  const [nullifyLoading, setNullifyLoading] = useState(false)

  const loadData = useCallback(() => {
    fetchSanctions({
      memberId: filterMemberId || undefined,
      typeId: filterTypeId || undefined,
      status: (filterStatus || undefined) as SanctionStatus | undefined,
      pendingOnly: pendingOnly || undefined,
      monthYear: monthYear || undefined,
    })
  }, [fetchSanctions, filterMemberId, filterTypeId, filterStatus, pendingOnly, monthYear])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    fetchSanctionTypes()
    if (!memberId) {
      fetchMembers()
    }
  }, [fetchSanctionTypes, fetchMembers, memberId])

  const handleClearFilters = () => {
    if (!memberId) setFilterMemberId('')
    setFilterTypeId('')
    setFilterStatus('')
    setPendingOnly(false)
    setMonthYear('')
  }

  const handleOpenDetail = (sanction: Sanction) => {
    setSelectedSanction(sanction)
    setDetailOpen(true)
  }

  const handleNullify = async () => {
    if (!confirmNullify) return
    setNullifyLoading(true)
    try {
      await nullifySanction(confirmNullify.id, 'Anulado desde el listado general')
      setConfirmNullify(null)
      loadData()
    } catch (e) {
      console.error(e)
    } finally {
      setNullifyLoading(false)
    }
  }

  // Filter options mapping
  const memberOptions = [
    { value: '', label: 'Todos los socios' },
    ...members.map(m => ({
      value: m.id,
      label: `${m.last_name}, ${m.first_name} (${m.document_id})`,
    })),
  ]

  const typeOptions = [
    { value: '', label: 'Todos los tipos' },
    ...sanctionTypes.map(t => ({
      value: t.id,
      label: t.name,
    })),
  ]

  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'apelacion', label: 'Apelación' },
    { value: 'resuelta', label: 'Resuelta' },
    { value: 'anulada', label: 'Anulada' },
  ]

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white p-4 border border-gray-200 rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Filter className="h-4.5 w-4.5 text-primary-500" />
            <span>Filtros de búsqueda</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
              title="Actualizar listado"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {(filterMemberId !== (memberId ?? '') || filterTypeId || filterStatus || pendingOnly || monthYear) && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {!memberId && (
            <Select
              label="Socio"
              options={memberOptions}
              value={filterMemberId}
              onChange={e => setFilterMemberId(e.target.value)}
            />
          )}

          <Select
            label="Tipo de Infracción"
            options={typeOptions}
            value={filterTypeId}
            onChange={e => setFilterTypeId(e.target.value)}
          />

          <Select
            label="Estado"
            options={statusOptions}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            disabled={pendingOnly}
          />

          <Input
            label="Mes / Año"
            type="month"
            value={monthYear}
            onChange={e => setMonthYear(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          <input
            id="pending-only-check"
            type="checkbox"
            className="h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500 cursor-pointer"
            checked={pendingOnly}
            onChange={e => {
              setPendingOnly(e.target.checked)
              if (e.target.checked) setFilterStatus('')
            }}
          />
          <label htmlFor="pending-only-check" className="text-xs font-medium text-gray-700 cursor-pointer select-none">
            Mostrar solo pendientes o en apelación (Acción requerida)
          </label>
        </div>
      </div>

      {/* Tabla / Listado */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading && sanctions.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary-500" />
            <p className="text-sm text-gray-500 font-medium animate-pulse">Cargando sanciones...</p>
          </div>
        ) : sanctions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900">No se encontraron sanciones</h4>
            <p className="text-xs text-gray-500 mt-1">Intenta ajustando los criterios de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  {!memberId && <th className="px-6 py-3.5">Socio</th>}
                  <th className="px-6 py-3.5">Unidad</th>
                  <th className="px-6 py-3.5">Infracción / Suceso</th>
                  <th className="px-6 py-3.5">Fecha</th>
                  <th className="px-6 py-3.5 text-right">Multa / Saldo</th>
                  <th className="px-6 py-3.5 text-center">Estado</th>
                  <th className="px-6 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sanctions.map(sanction => {
                  const hasFine = !!sanction.charge
                  const fine = sanction.charge

                  return (
                    <tr key={sanction.id} className="hover:bg-gray-50/50 transition-colors">
                      {!memberId && (
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {sanction.member ? `${sanction.member.last_name}, ${sanction.member.first_name}` : 'Socio Desconocido'}
                            </p>
                            {sanction.member?.document_id && (
                              <p className="text-xs text-gray-400 font-medium">CI: {sanction.member.document_id}</p>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {sanction.vehicle ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">Disco {sanction.vehicle.disk_number}</span>
                            <span className="text-xs text-gray-400">{sanction.vehicle.plate}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs sm:max-w-sm md:max-w-md">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 truncate">
                              {sanction.sanction_type?.name || 'Sanción'}
                            </span>
                            {sanction.meeting_id && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                Origen: Reunión / Asamblea
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5" title={sanction.reason}>
                            {sanction.reason}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {new Date(sanction.date + 'T00:00:00').toLocaleDateString('es-EC')}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {hasFine && fine ? (
                          <div className="flex flex-col text-right">
                            <span className="font-bold text-gray-900">${Number(fine.amount).toFixed(2)}</span>
                            {Number(fine.balance) > 0 ? (
                              <span className="text-xs text-amber-600 font-medium">Saldo: ${Number(fine.balance).toFixed(2)}</span>
                            ) : (
                              <span className="text-xs text-green-600 font-semibold">Pagado</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Badge variant={STATUS_BADGE_VARIANTS[sanction.status] || 'default'}>
                          {sanction.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(sanction)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canManage && (sanction.status === 'pendiente' || sanction.status === 'apelacion') && (
                            <button
                              onClick={() => setConfirmNullify(sanction)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                              title="Anular Sanción"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <SanctionDetailModal
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedSanction(null)
        }}
        sanction={selectedSanction}
        canManage={canManage}
        onActionSuccess={loadData}
      />

      <ConfirmModal
        isOpen={!!confirmNullify}
        onClose={() => {
          setConfirmNullify(null)
        }}
        onConfirm={handleNullify}
        title="Anular Sanción y Multa"
        message={`¿Estás seguro de anular la sanción de "${confirmNullify?.member ? `${confirmNullify.member.last_name}, ${confirmNullify.member.first_name}` : ''}"? Si tiene una multa asociada que aún está pendiente, también será anulada.`}
        confirmLabel="Anular Sanción"
        loading={nullifyLoading}
        variant="danger"
      />
    </div>
  )
}
