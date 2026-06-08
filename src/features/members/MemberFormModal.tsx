import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import type { Member } from '@/types'

const memberSchema = z.object({
  document_id: z
    .string()
    .min(5, 'El documento debe tener al menos 5 caracteres')
    .max(20, 'Máximo 20 caracteres'),
  first_name: z.string().min(2, 'Los nombres son obligatorios'),
  last_name: z.string().min(2, 'Los apellidos son obligatorios'),
  email: z.string().email('Correo electrónico inválido').nullable().optional().or(z.literal('')),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  status: z.enum(['activo', 'inactivo', 'suspendido'] as const),
  admission_date: z.string().min(10, 'La fecha de admisión es obligatoria'),
  blood_type: z.string().max(5, 'Máximo 5 caracteres').nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

type MemberFormData = z.infer<typeof memberSchema>

interface MemberFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: MemberFormData) => Promise<void>
  member?: Member | null
  loading?: boolean
}

export function MemberFormModal({ isOpen, onClose, onSubmit, member, loading }: MemberFormModalProps) {
  const isEdit = !!member

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      document_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      status: 'activo',
      admission_date: new Date().toISOString().split('T')[0],
      blood_type: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      notes: '',
    },
  })

  // Cargar datos cuando se edita un socio
  useEffect(() => {
    if (member) {
      reset({
        document_id: member.document_id || '',
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        email: member.email || '',
        phone: member.phone || '',
        address: member.address || '',
        status: member.status || 'activo',
        admission_date: member.admission_date || '',
        blood_type: member.blood_type || '',
        emergency_contact_name: member.emergency_contact_name || '',
        emergency_contact_phone: member.emergency_contact_phone || '',
        notes: member.notes || '',
      })
    } else {
      reset({
        document_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        status: 'activo',
        admission_date: new Date().toISOString().split('T')[0],
        blood_type: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        notes: '',
      })
    }
  }, [member, reset, isOpen])

  const handleFormSubmit = async (data: MemberFormData) => {
    // Limpiar strings vacíos a null
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === '' ? null : value])
    ) as MemberFormData

    await onSubmit(cleanedData)
  }

  const bloodTypeOptions = [
    { value: '', label: 'Seleccionar tipo' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
  ]

  const statusOptions = [
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
    { value: 'suspendido', label: 'Suspendido' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Datos del Socio' : 'Registrar Nuevo Socio'}
      size="lg"
      footer={
        <div className="flex justify-end space-x-3 w-full">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting || loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit(handleFormSubmit)} disabled={isSubmitting || loading}>
            {isSubmitting || loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Registrar Socio'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Documento de Identidad / Cédula"
            placeholder="Ej. 0102030405"
            {...register('document_id')}
            error={errors.document_id?.message}
            disabled={isEdit} // Por seguridad no permitimos editar la cédula una vez registrado
          />

          <Input
            label="Fecha de Admisión"
            type="date"
            {...register('admission_date')}
            error={errors.admission_date?.message}
          />

          <Input
            label="Nombres"
            placeholder="Nombres del socio"
            {...register('first_name')}
            error={errors.first_name?.message}
          />

          <Input
            label="Apellidos"
            placeholder="Apellidos del socio"
            {...register('last_name')}
            error={errors.last_name?.message}
          />

          <Input
            label="Teléfono"
            placeholder="Ej. 0987654321"
            {...register('phone')}
            error={errors.phone?.message}
          />

          <Input
            label="Correo Electrónico"
            placeholder="socio@correo.com"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />

          <Select
            label="Estado del Socio"
            options={statusOptions}
            {...register('status')}
            error={errors.status?.message}
          />

          <Select
            label="Tipo de Sangre"
            options={bloodTypeOptions}
            {...register('blood_type')}
            error={errors.blood_type?.message}
          />

          <Input
            label="Dirección Física"
            placeholder="Ej. Av. de las Américas y Gran Colombia"
            {...register('address')}
            error={errors.address?.message}
            className="md:col-span-2"
          />

          <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Contacto de Emergencia</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nombre de Contacto"
                placeholder="Ej. Nombre del cónyuge o familiar"
                {...register('emergency_contact_name')}
                error={errors.emergency_contact_name?.message}
              />
              <Input
                label="Teléfono de Contacto"
                placeholder="Ej. Teléfono del familiar"
                {...register('emergency_contact_phone')}
                error={errors.emergency_contact_phone?.message}
              />
            </div>
          </div>

          <Textarea
            label="Observaciones / Notas"
            placeholder="Escribe aquí cualquier dato informativo adicional sobre el socio..."
            rows={3}
            {...register('notes')}
            error={errors.notes?.message}
            className="md:col-span-2"
          />
        </div>
      </form>
    </Modal>
  )
}
