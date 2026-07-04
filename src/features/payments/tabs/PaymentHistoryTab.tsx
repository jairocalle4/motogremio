import { useState, useEffect, useCallback } from 'react'
import { Search, AlertCircle, Receipt } from 'lucide-react'
import type { usePayments } from '@/hooks/usePayments'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo:      'Efectivo',
  transferencia: 'Transferencia',
  deposito:      'Depósito',
  cheque:        'Cheque',
  otro:          'Otro',
}

interface PaymentHistoryTabProps {
  paymentsState: ReturnType<typeof usePayments>
}

export function PaymentHistoryTab({ paymentsState }: PaymentHistoryTabProps) {
  const { payments, loading, error, fetchPayments } = paymentsState
  const [searchTerm, setSearchTerm] = useState('')

  const refresh = useCallback(() => {
    fetchPayments()
  }, [fetchPayments])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered = payments.filter(p => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const memberName = p.member ? `${p.member.first_name} ${p.member.last_name}`.toLowerCase() : ''
    const docId = p.member?.document_id?.toLowerCase() ?? ''
    const ref = p.reference_number?.toLowerCase() ?? ''
    return memberName.includes(term) || docId.includes(term) || ref.includes(term)
  })

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
      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Buscar por socio, cédula o referencia..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Receipt className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm font-medium">No hay pagos registrados</p>
          <p className="text-gray-400 text-xs mt-1">Los pagos aparecerán aquí una vez que se registren</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Socio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider hidden sm:table-cell">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider hidden md:table-cell">Método</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider hidden lg:table-cell">Referencia</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(payment => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {payment.member
                          ? `${payment.member.first_name} ${payment.member.last_name}`
                          : '—'}
                      </p>
                      <p className="text-xs text-gray-500">{payment.member?.document_id ?? ''}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-gray-700">
                      {new Date(payment.payment_date + 'T00:00:00').toLocaleDateString('es-EC')}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-gray-600">
                      {PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-gray-500 text-xs font-mono">
                      {payment.reference_number ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-green-700">${Number(payment.amount).toFixed(2)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Total */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm">
          <span className="text-gray-600">{filtered.length} pago(s)</span>
          <span className="font-bold text-gray-900">
            Total: ${filtered.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}
