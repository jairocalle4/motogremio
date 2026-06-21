import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useDrivers, type DriverWithRelations } from '@/hooks/useDrivers'
import type { Member } from '@/types'
import { AlertTriangle, User, UserCheck } from 'lucide-react'

// ─── Esquemas Zod ─────────────────────────────────────────────────────────────
const cedula10 = z
  .string()
  .min(1, 'La cédula es obligatoria')
  .regex(/^\d{10}$/, 'La cédula debe tener exactamente 10 dígitos numéricos')

const driverSchema = z
  .object({
    driver_type: z.enum(['externo', 'socio']),
    member_id:   z.string().optional().or(z.literal('')),
    document_id: cedula10,
    first_name:  z.string().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres').trim(),
    last_name:   z.string().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres').trim(),
    phone: z
      .string()
      .regex(/^\d*$/, 'Solo se permiten números')
      .max(15, 'Máximo 15 dígitos')
      .optional()
      .or(z.literal('')),
    address:          z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal('')),
    status:           z.enum(['activo', 'inactivo'] as const),
    notes:            z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
    // Licencia
    register_license: z.boolean(),
    license_number:   z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
    license_type:     z.string().default('A1'),
    issue_date:       z.string().optional().or(z.literal('')),
    expiry_date:      z.string().optional().or(z.literal('')),
  })
  .superRefine((val, ctx) => {
    if (val.driver_type === 'socio' && (!val.member_id || val.member_id === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['member_id'],
        message: 'Debe seleccionar el socio que también conduce',
      })
    }
    if (val.register_license) {
      if (!val.license_number || val.license_number.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['license_number'],
          message: 'El número de licencia es obligatorio cuando se registra la licencia',
        })
      }
      if (!val.expiry_date || val.expiry_date.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiry_date'],
          message: 'La fecha de vencimiento es obligatoria cuando se registra la licencia',
        })
      }
    }
  })

export type DriverFormData = z.infer<typeof driverSchema>

interface DriverFormModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (driverId: string) => void
  driver?: DriverWithRelations | null
  members: Pick<Member, 'id' | 'first_name' | 'last_name' | 'document_id' | 'phone' | 'address'>[]
  /** Borrador en memoria del padre */
  draft?: Partial<DriverFormData> | null
  onDraftChange?: (draft: Partial<DriverFormData> | null) => void
}

const defaultValues: DriverFormData = {
  driver_type:      'externo',
  member_id:        '',
  document_id:      '',
  first_name:       '',
  last_name:        '',
  phone:            '',
  address:          '',
  status:           'activo',
  notes:            '',
  register_license: false,
  license_number:   '',
  license_type:     'A1',
  issue_date:       '',
  expiry_date:      '',
}

export function DriverFormModal({
  isOpen,
  onClose,
  onCreated,
  driver,
  members,
  draft,
  onDraftChange,
}: DriverFormModalProps) {
  const isEdit = !!driver
  const { createDriver, updateDriver, createDriverLicense, getDriverByMemberId } = useDrivers()

  // Confirmación: socio ya tiene conductor
  const [existingDriverConfirm, setExistingDriverConfirm] = useState<{
    open: boolean
    existingDriver: DriverWithRelations | null
  }>({ open: false, existingDriver: null })

  // Confirmación: descartar borrador
  const [discardConfirm, setDiscardConfirm] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues,
  })

  const driverType      = watch('driver_type')
  const selectedMemberId = watch('member_id')
  const registerLicense = watch('register_license')

  // Sincronizar formulario al abrir
  useEffect(() => {
    if (!isOpen) return
    if (driver) {
      reset({
        driver_type:      driver.member_id ? 'socio' : 'externo',
        member_id:        driver.member_id ?? '',
        document_id:      driver.document_id || '',
        first_name:       driver.first_name || '',
        last_name:        driver.last_name || '',
        phone:            driver.phone || '',
        address:          driver.address || '',
        status:           driver.status || 'activo',
        notes:            driver.notes || '',
        register_license: false,
        license_number:   '',
        license_type:     'A1',
        issue_date:       '',
        expiry_date:      '',
      })
    } else if (draft && Object.keys(draft).some((k) => draft[k as keyof typeof draft])) {
      // Restaurar borrador en memoria
      reset({ ...defaultValues, ...draft })
    } else {
      reset(defaultValues)
    }
  }, [driver, reset, isOpen, draft])

  // Persiste borrador al padre mientras escribe (solo modo creación)
  const currentValues = watch()
  useEffect(() => {
    if (!driver && isOpen && isDirty) {
      onDraftChange?.(currentValues)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(currentValues), driver, isOpen, isDirty])

  // Auto-rellenar datos del socio seleccionado (incluye phone y address)
  useEffect(() => {
    if (driverType !== 'socio' || !selectedMemberId || driver) return
    const member = members.find((m) => m.id === selectedMemberId)
    if (member) {
      setValue('document_id', member.document_id || '')
      setValue('first_name',  member.first_name  || '')
      setValue('last_name',   member.last_name   || '')
      setValue('phone',   (member as { phone?: string | null }).phone   || '')
      setValue('address', (member as { address?: string | null }).address || '')
    }
  }, [selectedMemberId, driverType, members, setValue, driver])

  // Reset datos al cambiar de tipo
  const handleDriverTypeChange = (type: 'externo' | 'socio') => {
    setValue('driver_type', type)
    setValue('member_id',   '')
    if (!isEdit) {
      setValue('document_id', '')
      setValue('first_name',  '')
      setValue('last_name',   '')
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleFormSubmit = async (data: DriverFormData) => {
    // Caso: socio conductor → verificar si ya existe conductor para ese socio
    if (!isEdit && data.driver_type === 'socio' && data.member_id) {
      const existing = await getDriverByMemberId(data.member_id)
      if (existing) {
        setExistingDriverConfirm({ open: true, existingDriver: existing })
        return
      }
    }
    try {
      await submitDriver(data)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el conductor.')
    }
  }

  const submitDriver = async (data: DriverFormData) => {
    setSubmitting(true)
    try {
      if (isEdit && driver) {
        // ── EDITAR ──────────────────────────────────────────
        const { error: updateErr } = await updateDriver(driver.id, {
          document_id: data.document_id,
          first_name:  data.first_name.trim(),
          last_name:   data.last_name.trim(),
          phone:       data.phone || null,
          address:     data.address || null,
          status:      data.status,
          notes:       data.notes || null,
          member_id:   data.driver_type === 'socio' ? (data.member_id || null) : null,
        })
        if (updateErr) throw new Error(updateErr)

        // Registrar licencia si se activa en edición
        if (data.register_license && data.license_number && data.expiry_date) {
          await createDriverLicense(driver.id, {
            driver_id:      driver.id,
            license_type:   data.license_type || 'A1',
            license_number: data.license_number.trim(),
            issue_date:     data.issue_date || null,
            expiry_date:    data.expiry_date,
            status:         'vigente',
          })
        }

        onCreated(driver.id)
      } else {
        // ── CREAR ───────────────────────────────────────────
        const { data: newDriver, error: createErr } = await createDriver({
          document_id: data.document_id,
          first_name:  data.first_name.trim(),
          last_name:   data.last_name.trim(),
          phone:       data.phone || null,
          address:     data.address || null,
          status:      data.status,
          notes:       data.notes || null,
          member_id:   data.driver_type === 'socio' ? (data.member_id || null) : null,
        })
        if (createErr || !newDriver) throw new Error(createErr || 'Error al crear conductor')

        // Registrar licencia A1 si se completó
        if (data.register_license && data.license_number && data.expiry_date) {
          const { error: licErr } = await createDriverLicense(newDriver.id, {
            driver_id:      newDriver.id,
            license_type:   data.license_type || 'A1',
            license_number: data.license_number.trim(),
            issue_date:     data.issue_date || null,
            expiry_date:    data.expiry_date,
            status:         'vigente',
          })
          if (licErr) {
            toast.error(`Conductor creado, pero error al guardar licencia: ${licErr}`)
          }
        }

        onCreated(newDriver.id)
      }
    } finally {
      setSubmitting(false)
      setExistingDriverConfirm({ open: false, existingDriver: null })
    }
  }

  // Opción: usar conductor existente (socio ya tiene conductor)
  const handleUseExistingDriver = () => {
    if (existingDriverConfirm.existingDriver) {
      onCreated(existingDriverConfirm.existingDriver.id)
      setExistingDriverConfirm({ open: false, existingDriver: null })
      onClose()
    }
  }

  // Manejar cierre: pedir confirmación si hay cambios sin guardar
  const handleClose = () => {
    if (!submitting && isDirty && !isEdit) {
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

  const memberOptions = [
    { value: '', label: 'Seleccionar socio...' },
    ...members.map((m) => ({
      value: m.id,
      label: `${m.last_name}, ${m.first_name} — C.I: ${m.document_id}`,
    })),
  ]

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={submitting ? undefined : handleClose}
        title={isEdit ? 'Editar Conductor' : 'Registrar Conductor'}
        size="lg"
        closeOnOverlay={!submitting}
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit(handleFormSubmit)}
              disabled={submitting}
            >
              {submitting
                ? 'Guardando...'
                : isEdit
                ? 'Guardar Cambios'
                : 'Registrar Conductor'}
            </Button>
          </div>
        }
      >
        <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-0">

          {/* ── Tipo de conductor ──────────────────────────────────────── */}
          {!isEdit && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Tipo de Conductor
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDriverTypeChange('externo')}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    driverType === 'externo'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <User className={`w-5 h-5 shrink-0 ${driverType === 'externo' ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${driverType === 'externo' ? 'text-primary-700' : 'text-gray-700'}`}>
                      Externo
                    </p>
                    <p className="text-xs text-gray-500">No es socio de la cooperativa</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDriverTypeChange('socio')}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    driverType === 'socio'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <UserCheck className={`w-5 h-5 shrink-0 ${driverType === 'socio' ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${driverType === 'socio' ? 'text-primary-700' : 'text-gray-700'}`}>
                      Socio que conduce
                    </p>
                    <p className="text-xs text-gray-500">El socio también maneja su unidad</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── Socio vinculado (si tipo = socio) ─────────────────────── */}
          {driverType === 'socio' && !isEdit && (
            <div className="border-t border-gray-100 pt-5 mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Socio Vinculado
              </p>
              <Select
                label="Seleccionar Socio"
                options={memberOptions}
                hint="Los datos del socio se cargarán automáticamente"
                {...register('member_id')}
                error={errors.member_id?.message as string | undefined}
              />
            </div>
          )}

          {/* ── Datos personales ───────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Datos Personales
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="md:col-span-2 md:w-1/2">
                <Input
                  label="Cédula / Documento"
                  placeholder="Ingrese los 10 dígitos"
                  maxLength={10}
                  inputMode="numeric"
                  hint="Exactamente 10 dígitos numéricos"
                  {...register('document_id')}
                  error={errors.document_id?.message as string | undefined}
                  readOnly={driverType === 'socio' && !!selectedMemberId && !isEdit}
                />
              </div>

              <Input
                label="Nombres"
                placeholder="Ej. Luis Alberto"
                maxLength={80}
                {...register('first_name')}
                error={errors.first_name?.message as string | undefined}
                readOnly={driverType === 'socio' && !!selectedMemberId && !isEdit}
              />

              <Input
                label="Apellidos"
                placeholder="Ej. Torres Vera"
                maxLength={80}
                {...register('last_name')}
                error={errors.last_name?.message as string | undefined}
                readOnly={driverType === 'socio' && !!selectedMemberId && !isEdit}
              />

              <Input
                label="Teléfono"
                placeholder="Ej. 0987654321"
                maxLength={15}
                inputMode="numeric"
                hint="Solo números, opcional"
                {...register('phone')}
                error={errors.phone?.message as string | undefined}
              />

              <div className="w-full">
                <Select
                  label="Estado"
                  options={[
                    { value: 'activo',   label: 'Activo' },
                    { value: 'inactivo', label: 'Inactivo' },
                  ]}
                  {...register('status')}
                  error={errors.status?.message as string | undefined}
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Dirección"
                  placeholder="Barrio, calle, número..."
                  maxLength={200}
                  {...register('address')}
                  error={errors.address?.message as string | undefined}
                />
              </div>
            </div>
          </div>

          {/* ── Licencia de Conducir ────────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Licencia de Conducir
              </p>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  {...register('register_license')}
                />
                <span className="text-sm text-gray-600">Registrar licencia ahora</span>
              </label>
            </div>

            {!registerLicense && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700">
                  Sin licencia registrada. Se podrá agregar después desde la ficha del conductor.
                </p>
              </div>
            )}

            {registerLicense && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="md:col-span-2 md:w-1/2">
                  <Select
                    label="Tipo de Licencia"
                    options={[
                      { value: 'A', label: 'Tipo A - Motocicletas' },
                      { value: 'A1', label: 'Tipo A1 - Ciclomotores, mototaxis y tricimotos' },
                      { value: 'B', label: 'Tipo B - Automóviles y camionetas' },
                      { value: 'C', label: 'Tipo C - Taxis' },
                      { value: 'C1', label: 'Tipo C1 - Camionetas' },
                      { value: 'D', label: 'Tipo D - Transporte público' },
                      { value: 'E', label: 'Tipo E - Camiones pesados' },
                      { value: 'G', label: 'Tipo G - Maquinaria agrícola' },
                      { value: 'Otro', label: 'Otro' },
                    ]}
                    hint="Selecciona la categoría correspondiente"
                    {...register('license_type')}
                    error={errors.license_type?.message as string | undefined}
                  />
                </div>

                <Input
                  label="Número de Licencia"
                  placeholder="Ej. 1234567890"
                  maxLength={50}
                  {...register('license_number')}
                  error={errors.license_number?.message as string | undefined}
                />

                <Input
                  label="Fecha de Vencimiento"
                  type="date"
                  hint="Obligatoria al registrar la licencia"
                  {...register('expiry_date')}
                  error={errors.expiry_date?.message as string | undefined}
                />

                <Input
                  label="Fecha de Emisión"
                  type="date"
                  hint="Opcional"
                  {...register('issue_date')}
                  error={errors.issue_date?.message as string | undefined}
                />
              </div>
            )}
          </div>

          {/* ── Notas ─────────────────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Notas Internas
            </p>
            <Textarea
              label="Observaciones"
              placeholder="Información adicional del conductor (máx. 500 caracteres)..."
              rows={3}
              maxLength={500}
              {...register('notes')}
              error={errors.notes?.message as string | undefined}
            />
          </div>
        </form>
      </Modal>

      {/* Socio ya tiene conductor vinculado */}
      <ConfirmModal
        isOpen={existingDriverConfirm.open}
        onClose={() => setExistingDriverConfirm({ open: false, existingDriver: null })}
        onConfirm={handleUseExistingDriver}
        title="Este socio ya tiene conductor registrado"
        message={`${existingDriverConfirm.existingDriver?.first_name} ${existingDriverConfirm.existingDriver?.last_name} ya está registrado como conductor.`}
        detail="¿Deseas usar el conductor existente, o crear uno nuevo de todos modos? Usar el existente evita duplicados."
        confirmLabel="Usar conductor existente"
        variant="warning"
        cancelLabel="Crear uno nuevo de todos modos"
      />
      {/* Confirmación: descartar borrador */}
      <ConfirmModal
        isOpen={discardConfirm}
        onClose={() => setDiscardConfirm(false)}
        onConfirm={handleConfirmDiscard}
        title="¿Descartar cambios?"
        message="Hay información sin guardar en el formulario."
        detail="Si descartas, los datos que escribiste se perderán. ¿Deseas continuar?"
        confirmLabel="Sí, descartar"
        cancelLabel="Volver al formulario"
        variant="warning"
      />
    </>
  )
}
