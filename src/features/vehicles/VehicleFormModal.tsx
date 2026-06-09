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
import type { VehicleWithMember } from '@/hooks/useVehicles'
import type { Driver, Member } from '@/types'
import { AlertTriangle } from 'lucide-react'

const currentYear = new Date().getFullYear()

// ─── Validaciones Zod ────────────────────────────────────────────────────────
const vehicleSchema = z.object({
  disk_number: z
    .string()
    .min(1, 'El número de disco es obligatorio')
    .max(10, 'Máximo 10 caracteres'),

  plate: z
    .string()
    .min(1, 'La placa es obligatoria')
    .max(20, 'Máximo 20 caracteres')
    .transform((v) => v.toUpperCase().trim()),

  member_id: z
    .string()
    .min(1, 'Debe seleccionar un socio propietario'),

  brand: z
    .string()
    .max(50, 'Máximo 50 caracteres')
    .optional()
    .or(z.literal('')),

  model: z
    .string()
    .max(50, 'Máximo 50 caracteres')
    .optional()
    .or(z.literal('')),

  year: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true
      const n = parseInt(val, 10)
      return !isNaN(n) && n >= 1990 && n <= currentYear + 1
    }, `El año debe estar entre 1990 y ${currentYear + 1}`),

  color: z
    .string()
    .max(30, 'Máximo 30 caracteres')
    .optional()
    .or(z.literal('')),

  motor_number: z
    .string()
    .max(50, 'Máximo 50 caracteres')
    .optional()
    .or(z.literal('')),

  chassis_number: z
    .string()
    .max(50, 'Máximo 50 caracteres')
    .optional()
    .or(z.literal('')),

  status: z.enum(['activa', 'inactiva', 'mantenimiento'] as const),

  observations: z
    .string()
    .max(500, 'Las observaciones no pueden superar los 500 caracteres')
    .optional()
    .or(z.literal('')),

  // Conductor de la unidad (opcional)
  driver_id: z.string().optional().or(z.literal('')),
})

export type VehicleFormData = z.infer<typeof vehicleSchema>

interface VehicleFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: VehicleFormData) => Promise<void>
  vehicle?: VehicleWithMember | null
  members: Pick<Member, 'id' | 'first_name' | 'last_name' | 'document_id'>[]
  drivers?: Pick<Driver, 'id' | 'first_name' | 'last_name' | 'document_id' | 'status'>[]
  loading?: boolean
}

const defaultValues: VehicleFormData = {
  disk_number: '',
  plate: '',
  member_id: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  motor_number: '',
  chassis_number: '',
  status: 'activa',
  observations: '',
  driver_id: '',
}

export function VehicleFormModal({
  isOpen,
  onClose,
  onSubmit,
  vehicle,
  members,
  drivers = [],
  loading,
}: VehicleFormModalProps) {
  const isEdit = !!vehicle

  // Estado para confirmar cambio de número de disco
  const [diskChangeConfirm, setDiskChangeConfirm] = useState<{
    open: boolean
    pendingData: VehicleFormData | null
  }>({ open: false, pendingData: null })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues,
  })

  // Sincronizar formulario al abrir
  useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        reset({
          disk_number: vehicle.disk_number || '',
          plate: vehicle.plate || '',
          member_id: vehicle.member_id || '',
          brand: vehicle.brand || '',
          model: vehicle.model || '',
          year: vehicle.year?.toString() || '',
          color: vehicle.color || '',
          motor_number: vehicle.motor_number || '',
          chassis_number: vehicle.chassis_number || '',
          status: vehicle.status || 'activa',
          observations: vehicle.observations || '',
          driver_id: vehicle.driver_id || '',
        })
      } else {
        reset(defaultValues)
      }
    }
  }, [vehicle, reset, isOpen])

  const watchDiskNumber = watch('disk_number')

  const handleFormSubmit = async (data: VehicleFormData) => {
    // Si se está editando y el disco cambió → pedir confirmación
    if (isEdit && vehicle && data.disk_number !== vehicle.disk_number) {
      setDiskChangeConfirm({ open: true, pendingData: data })
      return
    }
    await submitData(data)
  }

  const submitData = async (data: VehicleFormData) => {
    await onSubmit(data)
  }

  const handleDiskChangeConfirmed = async () => {
    if (diskChangeConfirm.pendingData) {
      await submitData(diskChangeConfirm.pendingData)
      setDiskChangeConfirm({ open: false, pendingData: null })
    }
  }

  const statusOptions = [
    { value: 'activa', label: 'Activa' },
    { value: 'inactiva', label: 'Inactiva' },
    { value: 'mantenimiento', label: 'En mantenimiento' },
  ]

  const memberOptions = [
    { value: '', label: 'Seleccionar socio propietario...' },
    ...members.map((m) => ({
      value: m.id,
      label: `${m.last_name}, ${m.first_name} — C.I: ${m.document_id}`,
    })),
  ]

  const isBusy = isSubmitting || !!loading
  const originalDisk = vehicle?.disk_number

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={isBusy ? undefined : onClose}
        title={isEdit ? 'Editar Unidad / Mototaxi' : 'Registrar Nueva Unidad'}
        size="lg"
        closeOnOverlay={!isBusy}
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="outline" type="button" onClick={onClose} disabled={isBusy}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isBusy}
            >
              {isBusy
                ? 'Guardando...'
                : isEdit
                ? 'Guardar Cambios'
                : 'Registrar Unidad'}
            </Button>
          </div>
        }
      >
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(handleFormSubmit)(e) }}
          noValidate
          className="space-y-0"
        >
          {/* ── Sección: Identificación de la unidad ──────────────────── */}
          <div className="mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Identificación de la Unidad
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <Input
                  label="Número de Disco"
                  placeholder="Ej. 001"
                  maxLength={10}
                  hint={
                    isEdit && watchDiskNumber !== originalDisk
                      ? '⚠️ Cambiar el disco requiere confirmación'
                      : 'Identificador único de la unidad en la cooperativa'
                  }
                  {...register('disk_number')}
                  error={errors.disk_number?.message}
                />
              </div>

              <Input
                label="Placa"
                placeholder="Ej. ABC-1234"
                maxLength={20}
                hint="Alfanumérico, se convierte a mayúsculas"
                {...register('plate')}
                error={errors.plate?.message}
              />
            </div>
          </div>

          {/* ── Sección: Propietario ───────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5 mt-1 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Propietario
            </p>
            <Select
              label="Socio Propietario"
              options={memberOptions}
              hint="El socio registrado como dueño legal de esta mototaxi"
              {...register('member_id')}
              error={errors.member_id?.message}
            />
          </div>

          {/* ── Sección: Conductor ────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5 mt-1 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Conductor de la Unidad
            </p>

            {/* Opción 1: Sin conductor */}
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-all">
                <input
                  type="radio"
                  className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  value=""
                  {...register('driver_id')}
                />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Sin conductor asignado por ahora</p>
                  <p className="text-xs text-gray-500">La unidad no tendrá conductor registrado</p>
                </div>
              </label>

              {/* Opción 2: Socio propietario conduce */}
              {watch('member_id') && (
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-all">
                  <input
                    type="radio"
                    className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    value="_owner"
                    {...register('driver_id')}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">El socio propietario también conduce</p>
                    <p className="text-xs text-gray-500">
                      Se vincula el conductor al socio seleccionado. Si aún no tiene conductor creado, hazlo desde el módulo de Conductores.
                    </p>
                  </div>
                </label>
              )}

              {/* Opción 3: Seleccionar conductor existente */}
              {drivers.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Seleccionar conductor existente
                  </p>
                  <Select
                    options={[
                      { value: '', label: 'Elegir conductor de la cooperativa...' },
                      ...drivers
                        .filter((d) => d.status === 'activo')
                        .map((d) => ({
                          value: d.id,
                          label: `${d.last_name}, ${d.first_name} — C.I: ${d.document_id}`,
                        })),
                    ]}
                    {...register('driver_id')}
                  />
                </div>
              )}

              {drivers.length === 0 && (
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    No hay conductores registrados. Ve al módulo de <strong>Conductores</strong> para registrarlos.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Sección: Datos del vehículo ───────────────────────────── */}
          <div className="border-t border-gray-100 pt-5 mt-1 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Datos del Vehículo
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <Input
                label="Marca"
                placeholder="Ej. Honda, Yamaha, Bajaj..."
                maxLength={50}
                {...register('brand')}
                error={errors.brand?.message}
              />

              <Input
                label="Modelo"
                placeholder="Ej. CB 125, FZ, Pulsar..."
                maxLength={50}
                {...register('model')}
                error={errors.model?.message}
              />

              <Input
                label="Año"
                placeholder={`Ej. ${currentYear}`}
                type="number"
                min={1990}
                max={currentYear + 1}
                hint={`Entre 1990 y ${currentYear + 1}`}
                {...register('year')}
                error={errors.year?.message}
              />

              <Input
                label="Color"
                placeholder="Ej. Rojo, Negro, Plateado..."
                maxLength={30}
                {...register('color')}
                error={errors.color?.message}
              />

              <Input
                label="Número de Motor"
                placeholder="Ej. JC110E-7823456"
                maxLength={50}
                {...register('motor_number')}
                error={errors.motor_number?.message}
              />

              <Input
                label="Número de Chasis"
                placeholder="Ej. 9FHFA1850PR123456"
                maxLength={50}
                {...register('chassis_number')}
                error={errors.chassis_number?.message}
              />
            </div>
          </div>

          {/* ── Sección: Estado ───────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5 mt-1 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Estado Operativo
            </p>
            <div className="w-full md:w-1/2">
              <Select
                label="Estado de la Unidad"
                options={statusOptions}
                {...register('status')}
                error={errors.status?.message}
              />
            </div>
          </div>

          {/* ── Sección: Observaciones ────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5 mt-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Observaciones
            </p>
            <Textarea
              label="Observaciones Internas"
              placeholder="Escribe cualquier dato adicional de esta unidad (máx. 500 caracteres)..."
              rows={3}
              maxLength={500}
              {...register('observations')}
              error={errors.observations?.message}
            />
          </div>
        </form>
      </Modal>

      {/* Confirmación de cambio de número de disco */}
      <ConfirmModal
        isOpen={diskChangeConfirm.open}
        onClose={() => setDiskChangeConfirm({ open: false, pendingData: null })}
        onConfirm={handleDiskChangeConfirmed}
        title="Cambiar número de disco"
        message={`¿Confirmas cambiar el número de disco de "${originalDisk}" a "${diskChangeConfirm.pendingData?.disk_number}"?`}
        detail="El número de disco es el identificador operativo de la unidad. Un cambio incorrecto puede afectar reportes y cobros. Asegúrate de que el nuevo número sea correcto."
        confirmLabel="Sí, cambiar disco"
        variant="warning"
        loading={isBusy}
      />
    </>
  )
}
