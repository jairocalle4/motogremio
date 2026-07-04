import { useState, useEffect, useCallback } from 'react'
import { useSanctions } from '../hooks/useSanctions'
import { useMembers } from '@/hooks/useMembers'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
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

const CHARGE_STATUS_BADGE_VARIANTS = {
  pendiente: 'warning',
  parcial: 'warning',
  pagada: 'success',
  suspendida: 'default',
  anulada: 'default',
} as const

const CHARGE_STATUS_LABELS = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagada: 'Pagada',
  suspendida: 'Suspendida',
  anulada: 'Anulada',
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

  const handleOpenDetail = (sanction: Sanction) => {
    setSelectedSanction(sanction)
    setDetailOpen(true)
  }

  const handleNullify = async () => {
    if (!confirmNullify) return
    setNullifyLoading(true)
    try {
      await nullifySanction(confirmNullify.id)
      setConfirmNullify(null)
      loadData()
    } catch (e) {
      console.error(e)
    } finally {
      setNullifyLoading(false)
    }
  }

  const clearFilters = () => {
    setFilterMemberId(memberId ?? '')
    setFilterTypeId('')
    setFilterStatus('')
    setPendingOnly(false)
    setMonthYear('')
  }

  const hasActiveFilters = filterMemberId !== (memberId ?? '') || filterTypeId || filterStatus || pendingOnly || monthYear

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Filters Header */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Filtros de Búsqueda</h3>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-3 w-3" />
                  Limpiar filtros
                </button>
              )}
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {!memberId && (
              <Select
                value={filterMemberId}
                onChange={e => setFilterMemberId(e.target.value)}
                options={[
                  { value: '', label: 'Todos los socios' },
                  ...members.map(m => ({
                    value: m.id,
                    label: `${m.last_name}, ${m.first_name}`,
                  })),
                ]}
                className="w-full"
              />
            )}

            <Select
              value={filterTypeId}
              onChange={e => setFilterTypeId(e.target.value)}
              options={[
                { value: '', label: 'Todas las infracciones' },
                ...sanctionTypes.map(t => ({
                  value: t.id,
                  label: t.name,
                })),
              ]}
              className="w-full"
            />

            <Select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'apelacion', label: 'En apelación' },
                { value: 'resuelta', label: 'Resuelta' },
                { value: 'anulada', label: 'Anulada' },
              ]}
              className="w-full"
            />

            <div className="flex gap-2">
              <input
                type="month"
                value={monthYear}
                onChange={e => setMonthYear(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
              />
              <button
                onClick={() => setPendingOnly(!pendingOnly)}
                className={`px-3 py-2 border rounded-xl text-xs font-semibold transition-colors ${
                  pendingOnly
                    ? 'bg-primary-50 border-primary-200 text-primary-700 font-bold'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Solo Pendientes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="p-0">
        {loading && sanctions.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary-500 mb-3" />
            <p className="text-gray-500 text-sm">Cargando sanciones...</p>
          </div>
        ) : sanctions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900">No se encontraron sanciones</h4>
            <p className="text-xs text-gray-500 mt-1">Intenta ajustando los criterios de búsqueda o registra una nueva.</p>
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
                  <th className="px-6 py-3.5 text-right">Monto</th>
                  <th className="px-6 py-3.5 text-right">Saldo</th>
                  <th className="px-6 py-3.5 text-center">Estado Sanción</th>
                  <th className="px-6 py-3.5 text-center">Estado Pago</th>
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
                                Origen: Reunión
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
                      <td className="px-6 py-4 text-right whitespace-nowrap font-bold text-gray-900">
                        {hasFine && fine ? `$${Number(fine.amount).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-bold">
                        {hasFine && fine ? (
                          <span className={Number(fine.balance) > 0 ? 'text-red-600' : 'text-gray-400'}>
                            ${Number(fine.balance).toFixed(2)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Badge variant={STATUS_BADGE_VARIANTS[sanction.status] || 'default'}>
                          {sanction.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {hasFine && fine ? (
                          <Badge variant={CHARGE_STATUS_BADGE_VARIANTS[fine.status] || 'default'}>
                            {CHARGE_STATUS_LABELS[fine.status]?.toUpperCase() || fine.status.toUpperCase()}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 italic">No aplica</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Tooltip content="Ver detalle">
                            <button
                              onClick={() => handleOpenDetail(sanction)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </Tooltip>
                          {canManage && sanction.status === 'pendiente' && (
                            <Tooltip content="Anular Sanción">
                              <button
                                onClick={() => setConfirmNullify(sanction)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            </Tooltip>
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
