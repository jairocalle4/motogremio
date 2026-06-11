import { useState, useEffect } from 'react'
import { X, DollarSign, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import type { Charge, Member, PaymentMethod } from '@/types'

interface RegisterPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  member: Pick<Member, 'id' | 'first_name' | 'last_name' | 'document_id'> | null
  pendingCharges: Charge[]  // cuotas pendientes del socio
  onRegister: (params: {
    memberId: string
    chargeIds: string[]
    amount: number
    paymentMethod: PaymentMethod
    referenceNumber?: string
    notes?: string
    paymentDate?: string
  }) => Promise<unknown>
  onSuccess?: () => void
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo',     label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'deposito',     label: 'Depósito bancario' },
  { value: 'cheque',       label: 'Cheque' },
  { value: 'otro',         label: 'Otro' },
]

export function RegisterPaymentModal({
  isOpen,
  onClose,
  member,
  pendingCharges,
  onRegister,
  onSuccess,
}: RegisterPaymentModalProps) {
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Inicializar con todas las cuotas seleccionadas
  useEffect(() => {
    if (isOpen) {
      setSelectedChargeIds(pendingCharges.map(c => c.id))
      setPaymentMethod('efectivo')
      setReferenceNumber('')
      setNotes('')
      setPaymentDate(new Date().toISOString().split('T')[0])
    }
  }, [isOpen, pendingCharges])

  const toggleCharge = (id: string) => {
    setSelectedChargeIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const selectedCharges = pendingCharges.filter(c => selectedChargeIds.includes(c.id))
  const totalAmount = selectedCharges.reduce((sum, c) => sum + Number(c.balance), 0)

  const handleSubmit = async () => {
    if (!member || selectedChargeIds.length === 0) return
    setLoading(true)
    try {
      await onRegister({
        memberId: member.id,
        chargeIds: selectedChargeIds,
        amount: Number(totalAmount.toFixed(2)),
        paymentMethod,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
        paymentDate,
      })
      onSuccess?.()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !member) return null

  const MONTHS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base">Registrar pago</h3>
              <p className="text-xs text-gray-500">
                {member.first_name} {member.last_name} · CI {member.document_id}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Cuotas seleccionables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cuotas a pagar <span className="text-red-500">*</span>
            </label>
            {pendingCharges.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-500">
                Este socio no tiene cuotas pendientes
              </div>
            ) : (
              <div className="space-y-2">
                {pendingCharges.map(charge => (
                  <label
                    key={charge.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedChargeIds.includes(charge.id)
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500"
                      checked={selectedChargeIds.includes(charge.id)}
                      onChange={() => toggleCharge(charge.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{charge.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {charge.period_month && charge.period_year && (
                          <span className="text-xs text-gray-500">
                            {MONTHS[charge.period_month]} {charge.period_year}
                          </span>
                        )}
                        {charge.status === 'parcial' && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                            Parcial
                          </span>
                        )}
                        <span className="text-xs text-gray-400">vence {new Date(charge.due_date + 'T00:00:00').toLocaleDateString('es-EC')}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">${Number(charge.balance).toFixed(2)}</p>
                      {charge.balance !== charge.amount && (
                        <p className="text-xs text-gray-400 line-through">${Number(charge.amount).toFixed(2)}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Resumen */}
          {selectedCharges.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">
                  Total a cobrar ({selectedCharges.length} cuota{selectedCharges.length !== 1 ? 's' : ''})
                </span>
                <span className="text-xl font-bold text-green-700">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Método de pago */}
          <Select
            label="Método de pago"
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
            options={PAYMENT_METHOD_OPTIONS}
            required
          />

          {/* Fecha */}
          <Input
            label="Fecha de pago"
            type="date"
            value={paymentDate}
            onChange={e => setPaymentDate(e.target.value)}
            required
          />

          {/* Referencia (opcional) */}
          {(paymentMethod === 'transferencia' || paymentMethod === 'deposito' || paymentMethod === 'cheque') && (
            <Input
              label="Número de referencia / comprobante"
              placeholder="Ej: TRN-20240611-001"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
            />
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={2}
              placeholder="Observaciones adicionales..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {selectedCharges.length === 0 && pendingCharges.length > 0 && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p className="text-sm">Selecciona al menos una cuota para continuar</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || selectedChargeIds.length === 0 || totalAmount <= 0}
          >
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Registrando...</span>
            ) : `Registrar $${totalAmount.toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
