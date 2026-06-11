import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useMembers } from '@/hooks/useMembers'
import { useSanctions } from '../hooks/useSanctions'
import { supabase } from '@/lib/supabaseClient'
import { Loader2 } from 'lucide-react'

interface SanctionFormModalProps {
  isOpen: boolean
  onClose: () => void
  memberId?: string | null // Pre-selected member if opened from detail page
  onSuccess?: () => void
}

const SEVERITY_OPTIONS = [
  { value: 'leve', label: 'Leve' },
  { value: 'grave', label: 'Grave' },
  { value: 'muy_grave', label: 'Muy Grave' },
]

export function SanctionFormModal({
  isOpen,
  onClose,
  memberId,
  onSuccess,
}: SanctionFormModalProps) {
  const { members, fetchMembers } = useMembers()
  const { sanctionTypes, fetchSanctionTypes, createSanction } = useSanctions()

  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState('')
  const [severity, setSeverity] = useState('leve')
  const [fineAmount, setFineAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  
  const [memberVehicles, setMemberVehicles] = useState<{ id: string; disk_number: string; plate: string }[]>([])
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load members and types
  useEffect(() => {
    if (isOpen) {
      fetchMembers({ status: 'activo' })
      fetchSanctionTypes()
      
      // Reset form fields
      setSelectedMemberId(memberId ?? '')
      setSelectedTypeId('')
      setVehicleId('')
      setDate(new Date().toISOString().split('T')[0])
      setReason('')
      setSeverity('leve')
      setFineAmount('')
      setDueDate('')
      setResolutionNotes('')
      setErrors({})
    }
  }, [isOpen, memberId, fetchMembers, fetchSanctionTypes])

  // Fetch vehicles for selected member
  useEffect(() => {
    if (!selectedMemberId) {
      setMemberVehicles([])
      setVehicleId('')
      return
    }

    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('id, disk_number, plate')
          .eq('member_id', selectedMemberId)
          .eq('status', 'activa')
        if (!error && data) {
          setMemberVehicles(data)
          if (data.length > 0) {
            setVehicleId(data[0].id)
          } else {
            setVehicleId('')
          }
        }
      } catch (err) {
        console.error('Error loading member vehicles:', err)
      }
    }

    fetchVehicles()
  }, [selectedMemberId])

  // Handle sanction type change to auto-fill default amount
  const handleTypeChange = (typeId: string) => {
    setSelectedTypeId(typeId)
    const selectedType = sanctionTypes.find((t) => t.id === typeId)
    if (selectedType) {
      if (selectedType.default_fine_amount != null) {
        setFineAmount(String(selectedType.default_fine_amount))
        // Auto-set due date to 15 days from now by default
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 15)
        setDueDate(futureDate.toISOString().split('T')[0])
      } else {
        setFineAmount('')
        setDueDate('')
      }
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!selectedMemberId) errs.memberId = 'El socio es requerido'
    if (!selectedTypeId) errs.typeId = 'El tipo de sanción es requerido'
    if (!date) errs.date = 'La fecha es requerida'
    if (!reason.trim()) errs.reason = 'El motivo o descripción es requerido'
    
    const amount = Number(fineAmount)
    if (fineAmount && (isNaN(amount) || amount < 0)) {
      errs.fineAmount = 'El monto debe ser un número positivo'
    }
    if (amount > 0 && !dueDate) {
      errs.dueDate = 'La fecha de vencimiento es requerida cuando hay multa'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoadingSubmit(true)
    try {
      await createSanction({
        memberId: selectedMemberId,
        vehicleId: vehicleId || null,
        sanctionTypeId: selectedTypeId,
        reason: reason.trim(),
        date,
        severity: severity || null,
        fineAmount: fineAmount ? Number(fineAmount) : 0,
        dueDate: fineAmount && Number(fineAmount) > 0 ? dueDate : null,
        resolutionNotes: resolutionNotes.trim() || null,
      })
      onSuccess?.()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingSubmit(false)
    }
  }

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: `${m.last_name}, ${m.first_name} (${m.document_id})`,
  }))

  const typeOptions = sanctionTypes.map((t) => ({
    value: t.id,
    label: t.name + (t.default_fine_amount ? ` (Multa sugerida: $${t.default_fine_amount})` : ''),
  }))

  const vehicleOptions = [
    { value: '', label: 'Ninguna (Aplica a socio directamente)' },
    ...memberVehicles.map((v) => ({
      value: v.id,
      label: `Disco ${v.disk_number} - Placa ${v.plate}`,
    })),
  ]

  const hasFine = Number(fineAmount) > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Sanción / Multa"
      size="md"
      footer={
        <div className="flex gap-3 justify-end w-full">
          <Button variant="secondary" onClick={onClose} disabled={loadingSubmit}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loadingSubmit}>
            {loadingSubmit ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
              </span>
            ) : (
              'Registrar Sanción'
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Socio */}
        <Select
          label="Socio Sancionado"
          placeholder="Seleccione un socio..."
          options={memberOptions}
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          disabled={!!memberId || loadingSubmit}
          error={errors.memberId}
          required
        />

        {/* Unidad */}
        {selectedMemberId && (
          <Select
            label="Unidad asociada (Opcional)"
            placeholder="Seleccione la unidad si aplica..."
            options={vehicleOptions}
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            disabled={loadingSubmit}
            error={errors.vehicleId}
          />
        )}

        {/* Tipo de Sanción */}
        <Select
          label="Tipo de Sanción"
          placeholder="Seleccione tipo..."
          options={typeOptions}
          value={selectedTypeId}
          onChange={(e) => handleTypeChange(e.target.value)}
          disabled={loadingSubmit}
          error={errors.typeId}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Fecha */}
          <Input
            label="Fecha del Suceso"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={loadingSubmit}
            error={errors.date}
            required
          />

          {/* Gravedad */}
          <Select
            label="Gravedad"
            options={SEVERITY_OPTIONS}
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            disabled={loadingSubmit}
            error={errors.severity}
          />
        </div>

        {/* Motivo */}
        <Textarea
          label="Motivo / Descripción del Suceso"
          placeholder="Detalle los hechos que motivan la sanción..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loadingSubmit}
          error={errors.reason}
          required
        />

        {/* Multa (Opcional) */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            Multa Económica Asociada
          </h4>
          <p className="text-xs text-gray-500">
            Si especifica un monto mayor a 0, se creará automáticamente una cuenta por cobrar (cargo) en el módulo de pagos asociada a este socio.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monto de la Multa ($)"
              type="number"
              placeholder="0.00"
              value={fineAmount}
              onChange={(e) => setFineAmount(e.target.value)}
              disabled={loadingSubmit}
              error={errors.fineAmount}
              min="0"
              step="0.01"
            />

            {hasFine && (
              <Input
                label="Fecha Vencimiento Pago"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={loadingSubmit}
                error={errors.dueDate}
                required={hasFine}
              />
            )}
          </div>
        </div>

        {/* Notas de resolución */}
        <Textarea
          label="Notas de Resolución (Opcional)"
          placeholder="Ej: Observaciones adicionales o descargo preliminar..."
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          disabled={loadingSubmit}
        />
      </div>
    </Modal>
  )
}
