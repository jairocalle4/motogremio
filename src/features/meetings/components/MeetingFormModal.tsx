import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import type { Meeting, MeetingType } from '@/types'
import { MEETING_TYPE_LABELS } from '@/lib/constants'

interface MeetingFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    description?: string
    meeting_type: MeetingType
    date: string
    time: string
    location?: string
    is_mandatory?: boolean
  }) => Promise<void>
  meeting: Meeting | null
}

export function MeetingFormModal({ isOpen, onClose, onSubmit, meeting }: MeetingFormModalProps) {
  const [title, setTitle] = useState('')
  const [meetingType, setMeetingType] = useState<MeetingType>('ordinaria')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [isMandatory, setIsMandatory] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title)
      setMeetingType(meeting.meeting_type)
      setDate(meeting.date)
      // time might contain timezone/seconds or HH:MM format, normalize to HH:MM
      const normTime = meeting.time ? meeting.time.substring(0, 5) : ''
      setTime(normTime)
      setLocation(meeting.location || '')
      setDescription(meeting.description || '')
      setIsMandatory(meeting.is_mandatory ?? true)
    } else {
      setTitle('')
      setMeetingType('ordinaria')
      // default date to today
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
      setTime('17:00') // default time
      setLocation('')
      setDescription('')
      setIsMandatory(true)
    }
  }, [meeting, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date || !time) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        title,
        meeting_type: meetingType,
        date,
        time: time + ':00', // ensure HH:MM:SS format
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        is_mandatory: isMandatory,
      })
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectOptions = Object.entries(MEETING_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={meeting ? 'Editar Reunión' : 'Programar Nueva Reunión'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Título de la reunión *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Asamblea General Ordinaria de Junio"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Tipo de reunión *"
            value={meetingType}
            onChange={(e) => setMeetingType(e.target.value as MeetingType)}
            options={selectOptions}
            required
          />

          <Input
            label="Lugar *"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ej: Oficina central o Zoom"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Fecha *"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Input
            type="time"
            label="Hora *"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>

        {date && date < new Date().toISOString().split('T')[0] && (
          <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-100 flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-semibold">Estás registrando una reunión con fecha pasada.</p>
              <p>Verifica que sea correcto antes de guardar.</p>
            </div>
          </div>
        )}

        <Textarea
          label="Orden del día / Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Puntos a tratar en la reunión..."
          rows={3}
        />

        <div className="flex items-center space-x-2 py-2">
          <input
            type="checkbox"
            id="isMandatory"
            checked={isMandatory}
            onChange={(e) => setIsMandatory(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="isMandatory" className="text-sm font-medium text-gray-700 select-none">
            Asistencia obligatoria (genera inasistencia)
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : meeting ? 'Actualizar' : 'Programar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
