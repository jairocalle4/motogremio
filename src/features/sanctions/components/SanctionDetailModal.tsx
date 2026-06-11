import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import type { Sanction } from '@/types'
import { Calendar, ShieldAlert, User, Car, DollarSign, X, CheckCircle, Ban } from 'lucide-react'
import { useSanctions } from '../hooks/useSanctions'

interface SanctionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sanction: Sanction | null
  canManage: boolean
  onActionSuccess?: () => void
}

const SEVERITY_COLORS = {
  leve: 'bg-blue-50 text-blue-700 border-blue-100',
  grave: 'bg-amber-50 text-amber-700 border-amber-100',
  muy_grave: 'bg-red-50 text-red-700 border-red-100',
}

const STATUS_COLORS = {
  pendiente: 'bg-amber-100 text-amber-800 border-amber-200',
  apelacion: 'bg-blue-100 text-blue-800 border-blue-200',
  resuelta: 'bg-green-100 text-green-800 border-green-200',
  anulada: 'bg-gray-100 text-gray-800 border-gray-200',
}

export function SanctionDetailModal({
  isOpen,
  onClose,
  sanction,
  canManage,
  onActionSuccess,
}: SanctionDetailModalProps) {
  const { resolveSanction, appealSanction, nullifySanction } = useSanctions()
  const [actionType, setActionType] = useState<'resolve' | 'appeal' | 'nullify' | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !sanction) return null

  const handleAction = async () => {
    if (!notes.trim() && actionType !== 'resolve') {
      setError('Por favor, ingresa una justificación o nota explicativa.')
      return
    }
    setError('')
    setLoading(true)
    try {
      if (actionType === 'resolve') {
        await resolveSanction(sanction.id, notes.trim() || 'Resuelta administrativamente')
      } else if (actionType === 'appeal') {
        await appealSanction(sanction.id, notes.trim())
      } else if (actionType === 'nullify') {
        await nullifySanction(sanction.id, notes.trim())
      }
      onActionSuccess?.()
      setActionType(null)
      setNotes('')
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const hasFine = !!sanction.charge
  const fine = sanction.charge

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) {
          setActionType(null)
          setNotes('')
          onClose()
        }
      }}
      title="Detalle de Sanción"
      size="md"
    >
      <div className="space-y-5">
        {/* Encabezado: Estado y Gravedad */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[sanction.status]}`}>
              {sanction.status.toUpperCase()}
            </span>
          </div>
          {sanction.severity && (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${SEVERITY_COLORS[sanction.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.leve}`}>
              Severidad: {sanction.severity === 'muy_grave' ? 'Muy Grave' : sanction.severity.charAt(0).toUpperCase() + sanction.severity.slice(1)}
            </span>
          )}
        </div>

        {/* Detalles del socio y unidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-3 items-start p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <User className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Socio Sancionado</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {sanction.member ? `${sanction.member.last_name}, ${sanction.member.first_name}` : 'Socio Desconocido'}
              </p>
              {sanction.member?.document_id && (
                <p className="text-xs text-gray-500 mt-0.5">CI/RUC: {sanction.member.document_id}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 items-start p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <Car className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Unidad Asociada</p>
              {sanction.vehicle ? (
                <>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    Disco {sanction.vehicle.disk_number}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Placa: {sanction.vehicle.plate}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500 italic mt-0.5">Ninguna (Aplica directo a socio)</p>
              )}
            </div>
          </div>
        </div>

        {/* Motivo y tipo de sanción */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <ShieldAlert className="h-4.5 w-4.5 text-red-500" />
            <span>Infracción: {sanction.sanction_type?.name || 'Sanción'}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Fecha del Suceso: {new Date(sanction.date + 'T00:00:00').toLocaleDateString('es-EC')}</span>
          </div>

          <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 mt-2">
            <p className="text-xs font-semibold text-red-800 mb-1">Motivo / Descripción</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{sanction.reason}</p>
          </div>
        </div>

        {/* Multa Asociada */}
        {hasFine && fine && (
          <div className="p-4 bg-green-50/50 border border-green-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-green-800 flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> Multa Asociada
              </span>
              <span className="text-xs bg-green-100 border border-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold">
                {fine.status?.toUpperCase() || 'PENDIENTE'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <p className="text-xs text-gray-500">Monto Original</p>
                <p className="text-sm font-bold text-gray-900">${Number(fine.amount).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Saldo Pendiente</p>
                <p className="text-sm font-bold text-green-700">${Number(fine.balance).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notas de resolución existentes */}
        {sanction.resolution_notes && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-xs font-semibold text-gray-700 mb-1">Resolución / Notas de Gestión</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{sanction.resolution_notes}</p>
          </div>
        )}

        {/* Formulario de Acción */}
        {actionType && (
          <div className="p-4 border border-primary-200 bg-primary-50/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-primary-800 uppercase">
                {actionType === 'resolve' && 'Resolver / Cumplir Sanción'}
                {actionType === 'appeal' && 'Registrar Apelación'}
                {actionType === 'nullify' && 'Anular Sanción y Multa'}
              </h4>
              <button
                onClick={() => {
                  setActionType(null)
                  setNotes('')
                  setError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <Textarea
              label={actionType === 'resolve' ? 'Notas de resolución (Opcional)' : 'Notas o justificación (Requerido)'}
              placeholder={
                actionType === 'resolve'
                  ? 'Describa cómo se resolvió la sanción...'
                  : 'Detalle las razones o descargo...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              error={error}
              required={actionType !== 'resolve'}
              disabled={loading}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setActionType(null)
                  setNotes('')
                  setError('')
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                variant={actionType === 'nullify' ? 'danger' : 'primary'}
                size="sm"
                onClick={handleAction}
                disabled={loading}
              >
                {loading ? 'Procesando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        )}

        {/* Botones de gestión */}
        {canManage && !actionType && (
          <div className="flex flex-wrap gap-2 pt-2 justify-end border-t border-gray-100">
            {sanction.status === 'pendiente' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActionType('appeal')}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                Apelar
              </Button>
            )}

            {(sanction.status === 'pendiente' || sanction.status === 'apelacion') && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActionType('nullify')}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                >
                  <Ban className="h-3.5 w-3.5" /> Anular
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActionType('resolve')}
                  className="flex items-center gap-1"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Resolver Sanción
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
