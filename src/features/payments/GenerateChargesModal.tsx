import { useState, useEffect } from 'react'
import { X, Calendar, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import type { ChargeType } from '@/types'

interface GenerateChargesModalProps {
  isOpen: boolean
  onClose: () => void
  chargeTypes: ChargeType[]
  onGenerate: (params: {
    chargeTypeId: string
    periodMonth: number
    periodYear: number
    dueDate: string
  }) => Promise<{ inserted: number; skipped: number }>
}

const MONTHS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

export function GenerateChargesModal({
  isOpen,
  onClose,
  chargeTypes,
  onGenerate,
}: GenerateChargesModalProps) {
  const now = new Date()
  const [chargeTypeId, setChargeTypeId] = useState('')
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null)

  // Auto-seleccionar el primer tipo recurrente al abrir
  useEffect(() => {
    if (isOpen && chargeTypes.length > 0 && !chargeTypeId) {
      const recurring = chargeTypes.find(ct => ct.is_recurring) ?? chargeTypes[0]
      setChargeTypeId(recurring.id)
    }
    if (!isOpen) {
      setResult(null)
    }
  }, [isOpen, chargeTypes, chargeTypeId])

  // Auto-sugerir fecha de vencimiento (último día del mes seleccionado)
  useEffect(() => {
    if (month && year) {
      const lastDay = new Date(Number(year), Number(month), 0)
      const iso = lastDay.toISOString().split('T')[0]
      setDueDate(iso)
    }
  }, [month, year])

  const selectedType = chargeTypes.find(ct => ct.id === chargeTypeId)

  const handleGenerate = async () => {
    if (!chargeTypeId || !dueDate) return
    setLoading(true)
    try {
      const res = await onGenerate({
        chargeTypeId,
        periodMonth: Number(month),
        periodYear: Number(year),
        dueDate,
      })
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  const yearOptions = Array.from({ length: 4 }, (_, i) => {
    const y = now.getFullYear() - 1 + i
    return { value: String(y), label: String(y) }
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base">Generar cuotas del mes</h3>
              <p className="text-xs text-gray-500">Se crea una cuota por cada unidad activa</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {result ? (
            /* Resultado */
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">{result.inserted} cuota(s) generada(s)</p>
                {result.skipped > 0 && (
                  <p className="text-sm text-gray-500 mt-1">{result.skipped} cuota(s) ya existían y se omitieron</p>
                )}
              </div>
              <Button variant="primary" onClick={onClose} className="mt-2">
                Cerrar
              </Button>
            </div>
          ) : (
            <>
              <Select
                label="Tipo de cobro"
                value={chargeTypeId}
                onChange={e => setChargeTypeId(e.target.value)}
                options={chargeTypes.map(ct => ({
                  value: ct.id,
                  label: `${ct.name}${ct.default_amount ? ` — $${ct.default_amount.toFixed(2)}` : ''}`,
                }))}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Mes"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  options={MONTHS}
                  required
                />
                <Select
                  label="Año"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  options={yearOptions}
                  required
                />
              </div>

              <Input
                label="Fecha de vencimiento"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
              />

              {selectedType && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-3">
                  <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Se generará una cuota de <span className="font-bold">${(selectedType.default_amount ?? 0).toFixed(2)}</span> por cada unidad activa.</p>
                    <p className="text-blue-600 mt-0.5 text-xs">Las cuotas ya existentes para este periodo serán omitidas automáticamente.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={loading || !chargeTypeId || !dueDate}
            >
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Generando...</span>
              ) : 'Generar cuotas'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
