import { useState, useEffect } from 'react'
import { X, Tag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { ChargeType } from '@/types'

interface ChargeTypeFormModalProps {
  isOpen: boolean
  onClose: () => void
  chargeType?: ChargeType | null  // null = creación, objeto = edición
  monthlyPreset?: boolean         // true = prerellenar como cuota mensual
  onSave: (data: {
    name: string
    description?: string
    default_amount: number
    is_recurring: boolean
  }) => Promise<unknown>
}

export function ChargeTypeFormModal({
  isOpen,
  onClose,
  chargeType,
  monthlyPreset = false,
  onSave,
}: ChargeTypeFormModalProps) {
  const isEdit = !!chargeType

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [defaultAmount, setDefaultAmount] = useState('')
  const [isRecurring, setIsRecurring] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      if (chargeType) {
        // Modo edición: cargar datos existentes
        setName(chargeType.name)
        setDescription(chargeType.description ?? '')
        setDefaultAmount(chargeType.default_amount != null ? String(chargeType.default_amount) : '')
        setIsRecurring(chargeType.is_recurring)
      } else if (monthlyPreset) {
        // Prellenado para cuota mensual
        setName('Cuota mensual')
        setDescription('Cuota administrativa mensual por cada unidad activa')
        setDefaultAmount('')  // monto vacío y obligatorio — no inventar valor
        setIsRecurring(true)
      } else {
        // Nuevo tipo en blanco
        setName('')
        setDescription('')
        setDefaultAmount('')
        setIsRecurring(true)
      }
      setErrors({})
    }
  }, [isOpen, chargeType, monthlyPreset])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'El nombre es requerido'
    if (!defaultAmount || isNaN(Number(defaultAmount)) || Number(defaultAmount) <= 0) {
      errs.defaultAmount = 'Ingresa un monto mayor a 0'
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
        description: description.trim() || undefined,
        default_amount: Number(Number(defaultAmount).toFixed(2)),
        is_recurring: isRecurring,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <Tag className="h-4 w-4 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-base">
              {isEdit ? 'Editar tipo de cobro' : 'Nuevo tipo de cobro'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <Input
            label="Nombre del tipo de cobro"
            placeholder="Ej: Cuota administrativa mensual"
            value={name}
            onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
            error={errors.name}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción (opcional)</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={2}
              placeholder="Descripción breve..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <Input
            label="Monto por defecto ($)"
            type="number"
            placeholder="0.00"
            value={defaultAmount}
            onChange={e => { setDefaultAmount(e.target.value); setErrors(p => ({ ...p, defaultAmount: '' })) }}
            error={errors.defaultAmount}
            required
            min="0.01"
            step="0.01"
          />

          <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl">
            <input
              id="is-recurring"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500"
              checked={isRecurring}
              onChange={e => setIsRecurring(e.target.checked)}
            />
            <label htmlFor="is-recurring" className="cursor-pointer">
              <p className="text-sm font-medium text-gray-900">Cobro recurrente</p>
              <p className="text-xs text-gray-500 mt-0.5">Aparece en la generación masiva de cuotas mensuales</p>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Guardando...</span>
            ) : (isEdit ? 'Actualizar' : 'Crear tipo de cobro')}
          </Button>
        </div>
      </div>
    </div>
  )
}
