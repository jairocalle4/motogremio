import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Tag, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ChargeTypeFormModal } from '../ChargeTypeFormModal'
import { usePayments } from '@/hooks/usePayments'
import type { ChargeType } from '@/types'

interface ChargeTypesTabProps {
  canManage: boolean
}

export function ChargeTypesTab({ canManage }: ChargeTypesTabProps) {
  const {
    chargeTypes,
    loading,
    error,
    fetchChargeTypes,
    createChargeType,
    updateChargeType,
    deleteChargeType,
  } = usePayments()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ChargeType | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ChargeType | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const refresh = useCallback(() => {
    fetchChargeTypes()
  }, [fetchChargeTypes])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleOpenCreate = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (ct: ChargeType) => {
    setEditTarget(ct)
    setFormOpen(true)
  }

  const handleSave = async (data: Parameters<typeof createChargeType>[0]) => {
    if (editTarget) {
      await updateChargeType(editTarget.id, data)
    } else {
      await createChargeType(data)
    }
    refresh()
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleteLoading(true)
    try {
      await deleteChargeType(confirmDelete.id)
      setConfirmDelete(null)
      refresh()
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            Configura los tipos de cobro de tu cooperativa. El monto puede ajustarse cuando lo necesites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Recargar"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
          {canManage && (
            <Button variant="primary" onClick={handleOpenCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo tipo
            </Button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : chargeTypes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
            <Tag className="h-6 w-6 text-purple-500" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Sin tipos de cobro configurados</p>
          {canManage && (
            <button
              onClick={handleOpenCreate}
              className="mt-3 text-primary-600 text-sm font-medium hover:underline"
            >
              + Crear el primer tipo de cobro
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {chargeTypes.map(ct => (
            <div
              key={ct.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
            >
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
                      onClick={() => handleOpenEdit(ct)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Edit2 className="h-4 w-4 text-gray-500" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Eliminar tipo de cobro">
                    <button
                      onClick={() => setConfirmDelete(ct)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal formulario */}
      <ChargeTypeFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        chargeType={editTarget}
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
