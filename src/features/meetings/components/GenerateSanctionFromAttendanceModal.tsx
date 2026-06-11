import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSanctions } from '../../sanctions/hooks/useSanctions'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface GenerateSanctionFromAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  meetingId: string
  meetingTitle: string
  meetingDate: string
  memberId: string
  memberFirstName: string
  memberLastName: string
  memberDocumentId: string
  attendanceId: string
  attendanceStatus: 'ausente' | 'tarde'
  onSuccess: () => void
}

export function GenerateSanctionFromAttendanceModal({
  isOpen,
  onClose,
  meetingId,
  meetingTitle,
  meetingDate,
  memberId,
  memberFirstName,
  memberLastName,
  memberDocumentId,
  attendanceId,
  attendanceStatus,
  onSuccess,
}: GenerateSanctionFromAttendanceModalProps) {
  const { sanctionTypes, fetchSanctionTypes, createSanction, loading } = useSanctions()

  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [fineAmount, setFineAmount] = useState(0)
  const [reason, setReason] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  const [alreadyExists, setAlreadyExists] = useState(false)

  // 1. Cargar tipos de sanción
  useEffect(() => {
    if (isOpen) {
      fetchSanctionTypes()
    }
  }, [isOpen, fetchSanctionTypes])

  // 2. Establecer motivo por defecto sugerido según estado
  useEffect(() => {
    if (isOpen) {
      if (attendanceStatus === 'ausente') {
        setReason(`Inasistencia injustificada a la asamblea/reunión: ${meetingTitle}`)
      } else {
        setReason(`Atraso a la asamblea/reunión: ${meetingTitle}`)
      }
      // Limpiar estados anteriores
      setSelectedTypeId('')
      setFineAmount(0)
      setResolutionNotes('')
      setDueDate('')
      setAlreadyExists(false)
    }
  }, [isOpen, attendanceStatus, meetingTitle])

  // 3. Cuando cambia el tipo de sanción, actualizar el monto sugerido y verificar duplicados
  useEffect(() => {
    if (!selectedTypeId) return
    const selectedType = sanctionTypes.find((t) => t.id === selectedTypeId)
    if (selectedType) {
      setFineAmount(selectedType.default_fine_amount || 0)
    }

    // Verificar si ya existe una sanción activa para esta asistencia con este tipo
    const checkDuplicate = async () => {
      setCheckingDuplicate(true)
      try {
        const { data, error } = await supabase
          .from('sanctions')
          .select('id')
          .eq('meeting_attendance_id', attendanceId)
          .eq('sanction_type_id', selectedTypeId)
          .neq('status', 'anulada')
          .maybeSingle()

        if (error) throw error
        setAlreadyExists(!!data)
      } catch (err) {
        console.error('Error al verificar duplicados:', err)
      } finally {
        setCheckingDuplicate(false)
      }
    }

    checkDuplicate()
  }, [selectedTypeId, sanctionTypes, attendanceId])

  // 4. Procesar el envío
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTypeId) {
      toast.error('Por favor, selecciona un tipo de sanción')
      return
    }
    if (alreadyExists) {
      toast.error('Ya existe una sanción aplicada para esta asistencia.')
      return
    }
    if (fineAmount > 0 && !dueDate) {
      toast.error('La fecha de vencimiento es requerida para sanciones con cargo económico.')
      return
    }

    try {
      await createSanction({
        memberId,
        sanctionTypeId: selectedTypeId,
        reason,
        date: meetingDate, // Usar la misma fecha de la reunión para el registro de la sanción
        fineAmount,
        dueDate: fineAmount > 0 ? dueDate : null,
        resolutionNotes: resolutionNotes || null,
        meetingId,
        meetingAttendanceId: attendanceId,
      })

      onSuccess()
      onClose()
    } catch (err) {
      // toast.error ya se dispara dentro de createSanction
    }
  }

  const typeOptions = [
    { value: '', label: 'Seleccionar tipo...' },
    ...sanctionTypes.map((t) => ({
      value: t.id,
      label: `${t.name} (${t.default_fine_amount ? `$${t.default_fine_amount}` : 'Sin multa'})`,
    })),
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generar Sanción desde Asistencia">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm border border-gray-100">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="font-semibold text-gray-500">Reunión/Asamblea:</p>
              <p className="text-gray-900 font-medium">{meetingTitle}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500">Fecha:</p>
              <p className="text-gray-900 font-medium">{meetingDate}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="font-semibold text-gray-500">Socio:</p>
              <p className="text-gray-900 font-medium">
                {memberLastName}, {memberFirstName}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-500">Cédula / C.I:</p>
              <p className="text-gray-900 font-medium">{memberDocumentId}</p>
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-500">Estado de Asistencia:</p>
            <p className={`font-semibold uppercase ${attendanceStatus === 'ausente' ? 'text-red-600' : 'text-warning-600'}`}>
              {attendanceStatus === 'ausente' ? 'Ausente' : 'Tarde / Atraso'}
            </p>
          </div>
        </div>

        {sanctionTypes.length === 0 && !loading && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>
              No existen tipos de sanción registrados. Para proceder, debes crearlos primero en la sección de{' '}
              <span className="font-bold">Sanciones ➜ Tipos de Sanción</span>.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Tipo de Sanción <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            options={typeOptions}
            required
            disabled={loading}
          />
        </div>

        {alreadyExists && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="font-semibold">Ya existe una sanción aplicada para esta asistencia.</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Motivo de la Sanción <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Monto de Multa ($)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={fineAmount}
              onChange={(e) => setFineAmount(parseFloat(e.target.value) || 0)}
              disabled={loading}
            />
          </div>

          {fineAmount > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Fecha Vence Cargo <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}
        </div>

        {fineAmount > 0 && (
          <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-100 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Generará Deuda Financiera</p>
              <p>Esta acción generará un cargo pendiente por ${fineAmount.toFixed(2)} en el módulo de Pagos.</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Observaciones Adicionales
          </label>
          <textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            disabled={loading}
            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500"
            rows={2}
            placeholder="Observación opcional..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || checkingDuplicate || alreadyExists || sanctionTypes.length === 0}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            {loading ? 'Generando...' : 'Generar Multa / Sanción'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
