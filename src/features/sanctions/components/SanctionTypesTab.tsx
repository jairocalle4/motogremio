import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Tag, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { useSanctions } from '../hooks/useSanctions'
import type { SanctionType } from '@/types'

interface SanctionTypesTabProps {
  canManage: boolean
}

export function SanctionTypesTab({ canManage }: SanctionTypesTabProps) {
  const {
    sanctionTypes,
    loading,
    error,
    fetchSanctionTypes,
    createSanctionType,
    updateSanctionType,
    deleteSanctionType,
  } = useSanctions()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SanctionType | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SanctionType | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const refresh = useCallback(() => {
    fetchSanctionTypes()
  }, [fetchSanctionTypes])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleOpenCreate = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (st: SanctionType) => {
    setEditTarget(st)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleteLoading(true)
    try {
      await deleteSanctionType(confirmDelete.id)
      setConfirmDelete(null)
      refresh()
    } catch (err) {
      console.error(err)
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
            Define las infracciones comunes de la cooperativa. Puedes sugerir un monto de multa predeterminado.
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
              Nuevo Tipo de Sanción
            </Button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading && sanctionTypes.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sanctionTypes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
            <Tag className="h-6 w-6 text-purple-500" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Sin tipos de sanción configurados</p>
          {canManage && (
            <button
              onClick={handleOpenCreate}
              className="mt-3 text-primary-600 text-sm font-medium hover:underline"
            >
              + Crear el primer tipo de sanción
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sanctionTypes.map(st => (
            <div
              key={st.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Tag className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{st.name}</p>
                  {st.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{st.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-500">
                      Multa sugerida:{' '}
                      <span className="font-bold text-gray-700">
                        {st.default_fine_amount != null ? `$${Number(st.default_fine_amount).toFixed(2)}` : 'Sin multa'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <Tooltip content="Editar tipo de sanción">
                    <button
                      onClick={() => handleOpenEdit(st)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Edit2 className="h-4 w-4 text-gray-500" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Eliminar tipo de sanción">
                    <button
                      onClick={() => setConfirmDelete(st)}
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
      <SanctionTypeFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        sanctionType={editTarget}
        onSave={async (data) => {
          if (editTarget) {
            await updateSanctionType(editTarget.id, data)
          } else {
            await createSanctionType(data)
          }
          refresh()
        }}
      />

      {/* Modal confirmación borrado */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar tipo de sanción"
        message={`¿Estás seguro de eliminar "${confirmDelete?.name}"? Si existen registros de sanciones asociados a este tipo, la operación fallará.`}
        confirmLabel="Eliminar"
        loading={deleteLoading}
        variant="danger"
      />
    </div>
  )
}

// ─── Componente Interno del Formulario ───────────────────────────────────────

interface SanctionTypeFormModalProps {
  isOpen: boolean
  onClose: () => void
  sanctionType?: SanctionType | null
  onSave: (data: {
    name: string
    description?: string | null
    default_fine_amount?: number | null
  }) => Promise<unknown>
}

function SanctionTypeFormModal({
  isOpen,
  onClose,
  sanctionType,
  onSave,
}: SanctionTypeFormModalProps) {
  const isEdit = !!sanctionType

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [defaultFineAmount, setDefaultFineAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      setName(sanctionType?.name ?? '')
      setDescription(sanctionType?.description ?? '')
      setDefaultFineAmount(
        sanctionType?.default_fine_amount != null ? String(sanctionType.default_fine_amount) : ''
      )
      setErrors({})
    }
  }, [isOpen, sanctionType])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'El nombre es requerido'
    if (defaultFineAmount && (isNaN(Number(defaultFineAmount)) || Number(defaultFineAmount) < 0)) {
      errs.defaultFineAmount = 'Ingresa un monto válido mayor o igual a 0'
    }
    return errs
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setLoading(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        default_fine_amount: defaultFineAmount ? Number(Number(defaultFineAmount).toFixed(2)) : null,
      })
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar tipo de sanción' : 'Nuevo tipo de sanción'}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
              </span>
            ) : isEdit ? (
              'Actualizar'
            ) : (
              'Crear'
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nombre de la infracción"
          placeholder="Ej: Inasistencia a Asamblea General"
          value={name}
          onChange={e => {
            setName(e.target.value)
            setErrors(p => ({ ...p, name: '' }))
          }}
          error={errors.name}
          required
          disabled={loading}
        />

        <Textarea
          label="Descripción (Opcional)"
          placeholder="Detalles sobre cuándo se aplica esta infracción..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={loading}
        />

        <Input
          label="Monto de multa sugerido ($) - Opcional"
          type="number"
          placeholder="0.00"
          value={defaultFineAmount}
          onChange={e => {
            setDefaultFineAmount(e.target.value)
            setErrors(p => ({ ...p, defaultFineAmount: '' }))
          }}
          error={errors.defaultFineAmount}
          min="0"
          step="0.01"
          disabled={loading}
        />
      </div>
    </Modal>
  )
}
