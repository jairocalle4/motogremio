import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { LicenseInsert, LicenseRow } from '@/hooks/useLicenses'

interface LicenseFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Partial<LicenseInsert>) => Promise<void>
  license?: LicenseRow | null
  driverId: string
  loading?: boolean
}

const licenseSchema = z.object({
  license_number: z.string().min(1, 'El número de licencia es obligatorio'),
  license_type: z.string().min(1, 'El tipo es obligatorio'),
  issue_date: z.string().optional().or(z.literal('')),
  expiry_date: z.string().min(1, 'La fecha de expiración es obligatoria'),
  file_url: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
})

export function LicenseFormModal({
  isOpen,
  onClose,
  onSubmit,
  license,
  driverId,
  loading
}: LicenseFormModalProps) {
  const isEdit = !!license

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      license_number: '',
      license_type: 'A1',
      issue_date: '',
      expiry_date: '',
      file_url: ''
    }
  })

  useEffect(() => {
    if (isOpen) {
      if (license) {
        reset({
          license_number: license.license_number,
          license_type: license.license_type,
          issue_date: license.issue_date || '',
          expiry_date: license.expiry_date,
          file_url: license.file_url || ''
        })
      } else {
        reset({
          license_number: '',
          license_type: 'A1',
          issue_date: '',
          expiry_date: '',
          file_url: ''
        })
      }
    }
  }, [isOpen, license, reset])

  const handleFormSubmit = async (data: any) => {
    const payload: Partial<LicenseInsert> = {
      ...data,
      driver_id: driverId,
    }
    await onSubmit(payload)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Licencia' : 'Añadir Licencia'}
      size="sm"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Select
              label="Tipo"
              options={[
                { value: 'A', label: 'A' },
                { value: 'A1', label: 'A1' },
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
                { value: 'C1', label: 'C1' },
                { value: 'D', label: 'D' },
                { value: 'E', label: 'E' },
                { value: 'G', label: 'G' },
                { value: 'Otro', label: 'Otro' },
              ]}
              error={errors.license_type?.message as string}
              {...register('license_type')}
            />
          </div>
          <div className="col-span-2">
            <Input
              label="Número de licencia"
              placeholder="Ej: 0102030405"
              error={errors.license_number?.message as string}
              {...register('license_number')}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Emisión (Opc.)"
            error={errors.issue_date?.message as string}
            {...register('issue_date')}
          />
          <Input
            type="date"
            label="Caducidad *"
            error={errors.expiry_date?.message as string}
            {...register('expiry_date')}
          />
        </div>

        <Input
          label="URL del Archivo (Temporal)"
          placeholder="Ej: https://drive.google.com/..."
          error={errors.file_url?.message as string}
          {...register('file_url')}
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={loading}>
            {isEdit ? 'Guardar Cambios' : 'Añadir Licencia'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
