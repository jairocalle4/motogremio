import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useDocuments, type DocumentWithRelations, DocumentType, DocumentInsert } from '@/hooks/useDocuments'

interface DocumentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Partial<DocumentInsert>) => Promise<void>
  document?: DocumentWithRelations | null
  documentTypes: DocumentType[]
  targetEntity: 'member' | 'driver' | 'vehicle' | 'company'
  entityId: string
  loading?: boolean
  onTypeCreated?: () => Promise<void> | void
}

export function DocumentFormModal({
  isOpen,
  onClose,
  onSubmit,
  document,
  documentTypes,
  targetEntity,
  entityId,
  loading,
  onTypeCreated
}: DocumentFormModalProps) {
  const isEdit = !!document
  const { createDocumentType } = useDocuments()

  // Estados para creación rápida de tipo
  const [isCreatingType, setIsCreatingType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeRequiresExpiry, setNewTypeRequiresExpiry] = useState(true)
  const [quickLoading, setQuickLoading] = useState(false)
  const [typeError, setTypeError] = useState<string | null>(null)

  // Filtrar tipos de documento por la entidad destino
  const availableTypes = documentTypes.filter(t => t.target_entity === targetEntity)

  // Crear esquema dinámico según si el tipo seleccionado requiere expiry
  const createSchema = (requiresExpiry: boolean) => z.object({
    document_type_id: z.string().min(1, 'Selecciona un tipo de documento'),
    document_number: z.string().max(50).optional().or(z.literal('')),
    issue_date: z.string().optional().or(z.literal('')),
    expiry_date: requiresExpiry
      ? z.string().min(1, 'La fecha de expiración es obligatoria para este tipo')
      : z.string().optional().or(z.literal('')),
    file_url: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
    notes: z.string().max(500).optional().or(z.literal(''))
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: (values, context, options) => {
      // Determinar en runtime si requiere expiry
      const selectedType = documentTypes.find(t => t.id === values.document_type_id)
      const reqExp = selectedType?.requires_expiry ?? false
      return zodResolver(createSchema(reqExp))(values, context, options)
    },
    defaultValues: {
      document_type_id: '',
      document_number: '',
      issue_date: '',
      expiry_date: '',
      file_url: '',
      notes: ''
    }
  })

  // Watch selected type to show/hide expiry field
  const selectedTypeId = watch('document_type_id')
  const selectedType = documentTypes.find(t => t.id === selectedTypeId)
  const requiresExpiry = selectedType?.requires_expiry ?? false

  useEffect(() => {
    if (isOpen) {
      if (document) {
        reset({
          document_type_id: document.document_type_id,
          document_number: document.document_number || '',
          issue_date: document.issue_date || '',
          expiry_date: document.expiry_date || '',
          file_url: document.file_url || '',
          notes: document.notes || ''
        })
      } else {
        reset({
          document_type_id: '',
          document_number: '',
          issue_date: '',
          expiry_date: '',
          file_url: '',
          notes: ''
        })
      }
    }
  }, [isOpen, document, reset])

  const handleFormSubmit = async (data: any) => {
    // Inject entityId based on targetEntity
    const payload: Partial<DocumentInsert> = {
      ...data,
      member_id: targetEntity === 'member' ? entityId : null,
      driver_id: targetEntity === 'driver' ? entityId : null,
      vehicle_id: targetEntity === 'vehicle' ? entityId : null,
      issue_date: data.issue_date || null,
      expiry_date: data.expiry_date || null
    }
    await onSubmit(payload)
  }

  const handleQuickCreateType = async () => {
    if (!newTypeName.trim()) {
      setTypeError('El nombre es obligatorio')
      return
    }
    if (newTypeName.trim().length < 3) {
      setTypeError('El nombre debe tener al menos 3 caracteres')
      return
    }

    setQuickLoading(true)
    setTypeError(null)

    try {
      const { data, error: err } = await createDocumentType(
        newTypeName.trim(),
        targetEntity,
        newTypeRequiresExpiry
      )

      if (err) {
        throw new Error(err)
      }

      if (data) {
        // Refrescar tipos en el componente padre
        if (onTypeCreated) {
          await onTypeCreated()
        }
        // Seleccionar el tipo recién creado
        setValue('document_type_id', data.id)
        // Ocultar formulario inline
        setIsCreatingType(false)
        setNewTypeName('')
      }
    } catch (e: any) {
      setTypeError(e.message || 'Error al crear tipo de documento')
    } finally {
      setQuickLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Documento' : 'Añadir Documento'}
      size="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">
              Tipo de documento <span className="text-danger-500">*</span>
            </label>
            {!isCreatingType && !isEdit && (
              <button
                type="button"
                onClick={() => setIsCreatingType(true)}
                className="text-xs text-brand-600 hover:text-brand-800 font-semibold"
              >
                + Crear tipo rápido
              </button>
            )}
          </div>
          
          {!isCreatingType ? (
            <Select
              error={errors.document_type_id?.message as string}
              options={[
                { label: 'Seleccione un tipo...', value: '' },
                ...availableTypes.map(t => ({ label: t.name, value: t.id }))
              ]}
              {...register('document_type_id')}
            />
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
              <p className="text-xs font-semibold text-gray-700">
                Nuevo Tipo ({
                  targetEntity === 'member' ? 'Socio' :
                  targetEntity === 'driver' ? 'Conductor' :
                  targetEntity === 'vehicle' ? 'Unidad' : 'Compañía'
                })
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Ej. Copia de RUC, Certificado"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="input text-sm w-full bg-white"
                />
                {typeError && <p className="text-xs text-danger-600">{typeError}</p>}
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="new_requires_expiry"
                    checked={newTypeRequiresExpiry}
                    onChange={(e) => setNewTypeRequiresExpiry(e.target.checked)}
                    className="h-4.5 w-4.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="new_requires_expiry" className="text-xs text-gray-600 font-medium select-none">
                    ¿Requiere fecha de vencimiento obligatoria?
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingType(false)
                    setNewTypeName('')
                    setTypeError(null)
                  }}
                  className="px-2.5 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleQuickCreateType}
                  disabled={quickLoading}
                  className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded font-medium disabled:opacity-50"
                >
                  {quickLoading ? 'Creando...' : 'Crear y Seleccionar'}
                </button>
              </div>
            </div>
          )}
        </div>

        <Input
          label="Número de documento / ID"
          placeholder="Ej: 0102030405 o REF-123"
          error={errors.document_number?.message as string}
          {...register('document_number')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            label="Fecha de emisión (Opcional)"
            error={errors.issue_date?.message as string}
            {...register('issue_date')}
          />
          <Input
            type="date"
            label={`Fecha de caducidad${requiresExpiry ? ' *' : ' (Opcional)'}`}
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

        <Textarea
          label="Notas"
          placeholder="Observaciones sobre este documento..."
          rows={3}
          error={errors.notes?.message as string}
          {...register('notes')}
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={loading}>
            {isEdit ? 'Guardar Cambios' : 'Añadir Documento'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
