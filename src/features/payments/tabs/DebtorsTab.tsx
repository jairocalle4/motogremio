import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, Search, Eye, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { RegisterPaymentModal } from '../RegisterPaymentModal'
import { usePayments } from '@/hooks/usePayments'
import type { Charge, Member, ChargeStatus } from '@/types'

const CHARGE_STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'anulada', label: 'Anulada' },
]

const MONTHS_LABELS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function getStatusBadge(status: ChargeStatus) {
  switch (status) {
    case 'pendiente': return <Badge variant="warning">Pendiente</Badge>
    case 'parcial':   return <Badge variant="warning">Parcial</Badge>
    case 'pagada':    return <Badge variant="success">Pagada</Badge>
    case 'anulada':   return <Badge variant="default">Anulada</Badge>
    default:          return <Badge variant="default">{status}</Badge>
  }
}

interface DebtorsTabProps {
  canManage: boolean
}

export function DebtorsTab({ canManage }: DebtorsTabProps) {
  const navigate = useNavigate()
  const { charges, loading, error, fetchCharges, registerPayment, fetchKpis } = usePayments()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('pendiente')

  // Modal de pago
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Pick<Member, 'id' | 'first_name' | 'last_name' | 'document_id'> | null>(null)
  const [memberPendingCharges, setMemberPendingCharges] = useState<Charge[]>([])

  const refresh = useCallback(() => {
    fetchCharges({
      status: (statusFilter as ChargeStatus) || undefined,
    })
  }, [fetchCharges, statusFilter])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Filtrado local por búsqueda
  const filtered = charges.filter(c => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const memberName = c.member ? `${c.member.first_name} ${c.member.last_name}`.toLowerCase() : ''
    const docId = c.member?.document_id?.toLowerCase() ?? ''
    const plate = c.vehicle?.plate?.toLowerCase() ?? ''
    const disk = c.vehicle?.disk_number?.toLowerCase() ?? ''
    return memberName.includes(term) || docId.includes(term) || plate.includes(term) || disk.includes(term)
  })

  const handleOpenPayModal = (charge: Charge) => {
    if (!charge.member) return
    setSelectedMember(charge.member)
    // Cargar todas las cuotas pendientes de ese socio del array actual
    const memberCharges = charges.filter(
      c => c.member_id === charge.member_id && (c.status === 'pendiente' || c.status === 'parcial')
    )
    setMemberPendingCharges(memberCharges)
    setPayModalOpen(true)
  }

  const handlePaymentSuccess = () => {
    refresh()
    fetchKpis()
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Buscar por socio, cédula, disco, placa..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          options={CHARGE_STATUS_OPTIONS}
          className="sm:w-48"
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-gray-500 text-sm font-medium">No hay cuotas con este filtro</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Socio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider hidden md:table-cell">Unidad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider hidden lg:table-cell">Periodo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Saldo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(charge => {
                const isOverdue = charge.status !== 'pagada' && charge.status !== 'anulada' &&
                  new Date(charge.due_date) < new Date()
                return (
                  <tr key={charge.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {charge.member ? `${charge.member.first_name} ${charge.member.last_name}` : '—'}
                        </p>
                        <p className="text-xs text-gray-500">{charge.member?.document_id ?? ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {charge.vehicle ? (
                        <div>
                          <p className="font-medium text-gray-700">Disco {charge.vehicle.disk_number}</p>
                          <p className="text-xs text-gray-500">{charge.vehicle.plate}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin unidad</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-gray-700">
                        {charge.period_month && charge.period_year
                          ? `${MONTHS_LABELS[charge.period_month]} ${charge.period_year}`
                          : '—'}
                      </span>
                      {isOverdue && (
                        <span className="ml-2 text-xs text-red-600 font-medium">Vencida</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(charge.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${Number(charge.balance) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        ${Number(charge.balance).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {charge.member?.id && (
                          <button
                            onClick={() => navigate(`/socios/${charge.member_id}`)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Ver socio"
                          >
                            <Eye className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                        )}
                        {canManage && (charge.status === 'pendiente' || charge.status === 'parcial') && (
                          <button
                            onClick={() => handleOpenPayModal(charge)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <DollarSign className="h-3 w-3" />
                            Cobrar
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

      {/* Resumen total */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm">
          <span className="text-gray-600">{filtered.length} cuota(s) mostradas</span>
          <span className="font-bold text-gray-900">
            Saldo total: ${filtered.reduce((sum, c) => sum + Number(c.balance), 0).toFixed(2)}
          </span>
        </div>
      )}

      {/* Modal de pago */}
      <RegisterPaymentModal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        member={selectedMember}
        pendingCharges={memberPendingCharges}
        onRegister={registerPayment}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}
