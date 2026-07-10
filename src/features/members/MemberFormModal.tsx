import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type { Member } from '@/types'

// ─── Validaciones Zod robustas ────────────────────────────────────────────────
const memberSchema = z
  .object({
    // Cédula ecuatoriana: exactamente 10 dígitos numéricos
    document_id: z
      .string()
      .min(1, 'La cédula es obligatoria')
      .regex(/^\d+$/, 'La cédula debe contener solo números, sin letras ni espacios')
      .length(10, 'La cédula debe tener exactamente 10 dígitos numéricos'),

    // Nombres
    first_name: z
      .string()
      .min(1, 'Los nombres son obligatorios')
      .min(2, 'Los nombres deben tener al menos 2 caracteres')
      .max(80, 'Los nombres no pueden superar los 80 caracteres')
      .refine((v) => v.trim().length >= 2, 'Los nombres no pueden estar vacíos o solo con espacios'),

    // Apellidos
    last_name: z
      .string()
      .min(1, 'Los apellidos son obligatorios')
      .min(2, 'Los apellidos deben tener al menos 2 caracteres')
      .max(80, 'Los apellidos no pueden superar los 80 caracteres')
      .refine((v) => v.trim().length >= 2, 'Los apellidos no pueden estar vacíos o solo con espacios'),

    // Correo (opcional, pero si se llena debe ser válido)
    email: z
      .string()
      .email('Ingresa un correo electrónico válido')
      .max(100, 'El correo no puede superar los 100 caracteres')
      .optional()
      .or(z.literal('')),

    // Teléfono (opcional, si se llena: celular de Ecuador de 10 dígitos empezando con 09)
    phone: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        (val) => {
          if (!val || val === '') return true
          const cleanVal = val.replace(/\s+/g, '')
          return /^09\d{8}$/.test(cleanVal)
        },
        'El teléfono debe ser un celular de Ecuador válido (ej. 0998765432) de 10 dígitos'
      ),

    // Dirección (opcional, máx 200 chars)
    address: z
      .string()
      .max(200, 'La dirección no puede superar los 200 caracteres')
      .optional()
      .or(z.literal('')),

    // Estado — solo valores válidos del enum de BD
    status: z.enum(['activo', 'inactivo', 'suspendido'] as const),

    // Fecha de admisión (obligatoria, no futura más de 1 día)
    admission_date: z
      .string()
      .min(10, 'La fecha de admisión es obligatoria')
      .refine((val) => {
        if (!val) return false
        const date = new Date(val)
        const today = new Date()
        today.setDate(today.getDate() + 1) // tolerancia de 1 día
        return !isNaN(date.getTime()) && date <= today
      }, 'La fecha de admisión no puede ser en el futuro'),

    // Tipo de sangre (opcional, solo valores fijos)
    blood_type: z
      .enum(['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const)
      .optional(),

    // Contacto de emergencia
    emergency_contact_name: z
      .string()
      .max(80, 'El nombre del contacto no puede superar los 80 caracteres')
      .optional()
      .or(z.literal('')),

    emergency_contact_phone: z
      .string()
      .regex(/^\d*$/, 'El teléfono de emergencia debe contener solo números')
      .max(15, 'El teléfono no puede superar 15 dígitos')
      .optional()
      .or(z.literal('')),

    // Notas (opcional, máx 500 chars)
    notes: z
      .string()
      .max(500, 'Las notas no pueden superar los 500 caracteres')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      // Si hay teléfono de emergencia, el nombre de contacto es obligatorio
      if (data.emergency_contact_phone && data.emergency_contact_phone.length > 0) {
        return data.emergency_contact_name && data.emergency_contact_name.trim().length > 0
      }
      return true
    },
    {
      message: 'Si ingresas un teléfono de emergencia, el nombre del contacto es obligatorio',
      path: ['emergency_contact_name'],
    }
  )

export type MemberFormData = z.infer<typeof memberSchema>

interface MemberFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: MemberFormData) => Promise<void>
  member?: Member | null
  loading?: boolean
  /** Borrador del formulario (memoória del padre) */
  draft?: Partial<MemberFormData> | null
  onDraftChange?: (draft: Partial<MemberFormData> | null) => void
}

const defaultValues: MemberFormData = {
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
}

export function MemberFormModal({
  isOpen, onClose, onSubmit, member, loading,
  draft, onDraftChange,
}: MemberFormModalProps) {
  const isEdit = !!member

  // Modal de confirmación de descarte
  const [discardConfirm, setDiscardConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues,
  })

  // Sincronizar formulario al abrir/cerrar o cambiar de socio
  useEffect(() => {
    if (isOpen) {
      if (member) {
        // Modo edición: cargar datos del socio
        reset({
          document_id: member.document_id || '',
          first_name: member.first_name || '',
          last_name: member.last_name || '',
          email: member.email || '',
          phone: member.phone || '',
          address: member.address || '',
          status: member.status || 'activo',
          admission_date: member.admission_date || '',
          blood_type: (member.blood_type as MemberFormData['blood_type']) || '',
          emergency_contact_name: member.emergency_contact_name || '',
          emergency_contact_phone: member.emergency_contact_phone || '',
          notes: member.notes || '',
        })
      } else if (draft && Object.keys(draft).some((k) => draft[k as keyof typeof draft])) {
        // Modo creación con borrador en memoria
        reset({ ...defaultValues, ...draft })
      } else {
        reset(defaultValues)
      }
    }
  }, [member, reset, isOpen, draft])

  // Persiste borrador al padre mientras escribe (solo modo creación)
  const currentValues = watch()
  useEffect(() => {
    if (!isEdit && isOpen && isDirty) {
      onDraftChange?.(currentValues)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(currentValues), isEdit, isOpen, isDirty])

  const handleFormSubmit = async (data: MemberFormData) => {
    // Normalizar: strings vacíos → null, nombres con trim
    const cleaned: MemberFormData = {
      ...data,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      address: data.address?.trim() || '',
      emergency_contact_name: data.emergency_contact_name?.trim() || '',
      emergency_contact_phone: data.emergency_contact_phone?.trim() || '',
      notes: data.notes?.trim() || '',
    }
    await onSubmit(cleaned)
    // Guardar exitoso → limpiar borrador
    onDraftChange?.(null)
  }

  // Manejar cierre: pedir confirmación si hay cambios sin guardar
  const handleClose = () => {
    if (!isBusy && isDirty && !isEdit) {
      setDiscardConfirm(true)
    } else {
      onClose()
    }
  }

  const handleConfirmDiscard = () => {
    onDraftChange?.(null)
    setDiscardConfirm(false)
    reset(defaultValues)
    onClose()
  }

  const bloodTypeOptions = [
    { value: '', label: 'Seleccionar tipo de sangre' },
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

  const isBusy = isSubmitting || !!loading

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={isBusy ? undefined : handleClose}
        title={isEdit ? 'Editar Datos del Socio' : 'Registrar Nuevo Socio'}
        size="lg"
        closeOnOverlay={!isBusy}
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="outline" type="button" onClick={handleClose} disabled={isBusy}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isBusy}
            >
              {isBusy ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Registrar Socio'}
            </Button>
          </div>
        }
      >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit(handleFormSubmit)(e)
        }}
        noValidate
        className="space-y-0"
      >
        {/* ── Sección: Identificación ──────────────────────────────────── */}
        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Identificación
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <Input
              label="Cédula de Identidad"
              placeholder="Ej. 0102030405"
              maxLength={10}
              hint="Exactamente 10 dígitos numéricos"
              {...register('document_id')}
              error={errors.document_id?.message}
              disabled={isEdit}
            />

            <Input
              label="Fecha de Admisión"
              type="date"
              max={new Date().toISOString().split('T')[0]}
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
          </div>
        </div>

        {/* ── Sección: Contacto ────────────────────────────────────────── */}
        <div className="border-t border-gray-100 pt-5 mt-1 mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Contacto
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <Input
              label="Teléfono / Celular"
              placeholder="Ej. 0987654321"
              maxLength={15}
              hint="Solo números, sin guiones ni espacios"
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

            <Input
              label="Dirección Física"
              placeholder="Ej. Av. de las Américas y Gran Colombia"
              {...register('address')}
              error={errors.address?.message}
              className="md:col-span-2"
            />
          </div>
        </div>

        {/* ── Sección: Estado y Salud ──────────────────────────────────── */}
        <div className="border-t border-gray-100 pt-5 mt-1 mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Estado y Salud
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
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
          </div>
        </div>

        {/* ── Sección: Contacto de Emergencia ──────────────────────────── */}
        <div className="border-t border-gray-100 pt-5 mt-1 mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Contacto de Emergencia
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <Input
              label="Nombre del Contacto"
              placeholder="Ej. Nombre del cónyuge o familiar"
              {...register('emergency_contact_name')}
              error={errors.emergency_contact_name?.message}
            />
            <Input
              label="Teléfono del Contacto"
              placeholder="Ej. 0991234567"
              maxLength={15}
              hint="Solo números"
              {...register('emergency_contact_phone')}
              error={errors.emergency_contact_phone?.message}
            />
          </div>
        </div>

        {/* ── Sección: Notas ───────────────────────────────────────────── */}
        <div className="border-t border-gray-100 pt-5 mt-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Observaciones
          </p>
          <Textarea
            label="Notas Internas"
            placeholder="Escribe cualquier dato adicional sobre el socio (máx. 500 caracteres)..."
            rows={3}
            maxLength={500}
            {...register('notes')}
            error={errors.notes?.message}
          />
        </div>
      </form>
      </Modal>

      {/* Confirmación de descarte de borrador */}
      <ConfirmModal
        isOpen={discardConfirm}
        onClose={() => setDiscardConfirm(false)}
        onConfirm={handleConfirmDiscard}
        title="¿Descartar cambios?"
        message="Hay información sin guardar en el formulario."
        detail="Si descartás, los datos que escribiste se perderán. ¿Deseas continuar?"
        confirmLabel="Sí, descartar"
        cancelLabel="Volver al formulario"
        variant="warning"
      />
    </>
  )
}
