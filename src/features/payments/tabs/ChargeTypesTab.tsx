import { useState } from 'react'
import { Plus, Edit2, Trash2, Tag, AlertCircle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ChargeTypeFormModal } from '../ChargeTypeFormModal'
import type { ChargeType } from '@/types'
import type { usePayments } from '@/hooks/usePayments'

interface ChargeTypesTabProps {
  canManage: boolean
  paymentsState: ReturnType<typeof usePayments>
}

export function ChargeTypesTab({ canManage, paymentsState }: ChargeTypesTabProps) {
  const {
    chargeTypesVisible,
    loading,
    error,
    fetchChargeTypes,
    createChargeType,
    updateChargeType,
    deleteChargeType,
  } = paymentsState

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ChargeType | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ChargeType | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Prellenado especial para "Configurar cuota mensual"
  const [monthlyPreset, setMonthlyPreset] = useState(false)

  const handleOpenCreate = (monthly = false) => {
    setEditTarget(null)
    setMonthlyPreset(monthly)
    setFormOpen(true)
  }

  const handleOpenEdit = (ct: ChargeType) => {
    setEditTarget(ct)
    setMonthlyPreset(false)
    setFormOpen(true)
  }

  const handleSave = async (data: Parameters<typeof createChargeType>[0]) => {
    if (editTarget) {
      await updateChargeType(editTarget.id, data)
    } else {
      await createChargeType(data)
    }
    fetchChargeTypes()
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleteLoading(true)
    try {
      await deleteChargeType(confirmDelete.id)
      setConfirmDelete(null)
      fetchChargeTypes()
    } finally {
      setDeleteLoading(false)
    }
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  // Separar recurrentes y eventuales
  const recurring = chargeTypesVisible.filter(ct => ct.is_recurring)
  const eventual   = chargeTypesVisible.filter(ct => !ct.is_recurring)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-600">
            Configura los tipos de cobro de tu cooperativa. Los tipos recurrentes aparecen en la generación mensual de cuotas.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            {recurring.length === 0 && (
              <Button
                variant="primary"
                onClick={() => handleOpenCreate(true)}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Configurar cuota mensual
              </Button>
            )}
            <Button
              variant={recurring.length === 0 ? 'secondary' : 'primary'}
              onClick={() => handleOpenCreate(false)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo tipo
            </Button>
          </div>
        )}
      </div>

      {/* Estado vacío */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : chargeTypesVisible.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
            <Tag className="h-6 w-6 text-purple-500" />
          </div>
          <p className="text-gray-700 text-sm font-semibold mb-1">Sin tipos de cobro configurados</p>
          <p className="text-gray-400 text-xs mb-4">
            Primero configura la cuota mensual de tu cooperativa.
          </p>
          {canManage && (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => handleOpenCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Configurar cuota mensual
              </button>
              <button
                onClick={() => handleOpenCreate(false)}
                className="text-gray-400 text-sm hover:underline"
              >
                O crear otro tipo de cobro
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Recurrentes */}
          {recurring.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Recurrentes (generación mensual)
              </p>
              <div className="space-y-2">
                {recurring.map(ct => (
                  <ChargeTypeCard
                    key={ct.id}
                    ct={ct}
                    canManage={canManage}
                    onEdit={() => handleOpenEdit(ct)}
                    onDelete={() => setConfirmDelete(ct)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Eventuales */}
          {eventual.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Eventuales (cobros puntuales)
              </p>
              <div className="space-y-2">
                {eventual.map(ct => (
                  <ChargeTypeCard
                    key={ct.id}
                    ct={ct}
                    canManage={canManage}
                    onEdit={() => handleOpenEdit(ct)}
                    onDelete={() => setConfirmDelete(ct)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal formulario */}
      <ChargeTypeFormModal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setMonthlyPreset(false) }}
        chargeType={editTarget}
        monthlyPreset={monthlyPreset}
        onSave={handleSave}
      />

      {/* Modal confirmación borrado */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar tipo de cobro"
        message={`¿Estás seguro de eliminar "${confirmDelete?.name}"? Si tiene cuotas asociadas, la operación fallará.`}
        confirmLabel="Eliminar"
        loading={deleteLoading}
        variant="danger"
      />
    </div>
  )
}

// ─── Subcomponente de tarjeta de tipo ────────────────────────────────────────

function ChargeTypeCard({
  ct,
  canManage,
  onEdit,
  onDelete,
}: {
  ct: ChargeType
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
          <Tag className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{ct.name}</p>
          {ct.description && (
            <p className="text-xs text-gray-500 mt-0.5">{ct.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {ct.default_amount != null && (
              <span className="text-sm font-bold text-green-700">
                ${Number(ct.default_amount).toFixed(2)}
              </span>
            )}
            {ct.default_amount == null && (
              <span className="text-xs text-amber-600 font-medium">Sin monto configurado</span>
            )}
            {ct.is_recurring ? (
              <Badge variant="success">Recurrente</Badge>
            ) : (
              <Badge variant="default">Eventual</Badge>
            )}
          </div>
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-1">
          <Tooltip content="Editar tipo de cobro">
            <button
              onClick={onEdit}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Edit2 className="h-4 w-4 text-gray-500" />
            </button>
          </Tooltip>
          <Tooltip content="Eliminar tipo de cobro">
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  )
}
