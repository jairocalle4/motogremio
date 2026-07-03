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
import { Upload, File as FileIcon, X, AlertTriangle, Crown } from 'lucide-react'
import toast from 'react-hot-toast'

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
  const { createDocumentType, checkStorageCapability, uploadDocumentFile } = useDocuments()

  // Estados para creación rápida de tipo
  const [isCreatingType, setIsCreatingType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeRequiresExpiry, setNewTypeRequiresExpiry] = useState(true)
  const [quickLoading, setQuickLoading] = useState(false)
  const [typeError, setTypeError] = useState<string | null>(null)

  // Estados de Cloudinary
  const [storageCap, setStorageCap] = useState<any>(null)
  const [capLoading, setCapLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

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
      setCapLoading(true)
      setSelectedFile(null)
      checkStorageCapability().then(cap => {
        setStorageCap(cap)
        setCapLoading(false)
      })

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, document, reset])

  const handleFormSubmit = async (data: any) => {
    let finalFileUrl = data.file_url

    if (selectedFile) {
      setUploading(true)
      const res = await uploadDocumentFile(selectedFile)
      if (res.error) {
        toast.error(res.error)
        setUploading(false)
        return
      }
      finalFileUrl = res.data.url
    }

    // Inject entityId based on targetEntity
    const payload: Partial<DocumentInsert> = {
      ...data,
      file_url: finalFileUrl,
      member_id: targetEntity === 'member' ? entityId : null,
      driver_id: targetEntity === 'driver' ? entityId : null,
      vehicle_id: targetEntity === 'vehicle' ? entityId : null,
      issue_date: data.issue_date || null,
      expiry_date: data.expiry_date || null
    }
    await onSubmit(payload)
    setUploading(false)
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

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Archivo Adjunto</label>
          
          {capLoading ? (
             <div className="p-4 bg-slate-50 animate-pulse rounded border border-slate-200 text-xs text-slate-500 text-center">Verificando almacenamiento...</div>
          ) : storageCap?.can_upload ? (
             <div className="space-y-2">
               {/* Mostrar URL existente si la hay */}
               {watch('file_url') && !selectedFile && (
                  <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700">
                    <div className="flex items-center gap-2">
                      <FileIcon className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">Documento actual vinculado</span>
                    </div>
                    <a href={watch('file_url')} target="_blank" rel="noreferrer" className="underline hover:text-blue-900">Ver original</a>
                  </div>
               )}
               {/* Selector de archivo */}
               <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative">
                 <input 
                    type="file" 
                    id="doc_file"
                    className="hidden"
                    accept={storageCap.allowed_formats?.map((f: string) => `.${f}`).join(',')}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                         setSelectedFile(e.target.files[0])
                      }
                    }}
                 />
                 {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                       <FileIcon className="w-8 h-8 text-brand-600" />
                       <span className="text-sm font-medium">{selectedFile.name}</span>
                       <span className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                       <button type="button" onClick={() => setSelectedFile(null)} className="text-xs text-danger-600 mt-1 flex items-center gap-1"><X className="w-3 h-3"/> Quitar</button>
                    </div>
                 ) : (
                    <label htmlFor="doc_file" className="cursor-pointer flex flex-col items-center gap-2">
                       <Upload className="w-8 h-8 text-slate-400" />
                       <span className="text-sm font-medium text-slate-700">Seleccionar nuevo archivo</span>
                       <span className="text-xs text-slate-500">Formatos: {storageCap.allowed_formats?.join(', ')} • Máx: {storageCap.max_file_size_mb}MB</span>
                    </label>
                 )}
                 {uploading && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-lg z-10 backdrop-blur-[1px]">
                       <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600 mb-2"></div>
                       <span className="text-sm font-medium text-slate-700">Subiendo documento...</span>
                    </div>
                 )}
               </div>
             </div>
          ) : storageCap?.reason === 'plan_restricted' ? (
             <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-col gap-2">
               <div className="flex items-center gap-2 text-indigo-800 font-semibold">
                 <Crown className="w-4 h-4" /> Plan Básico
               </div>
               <p className="text-xs text-indigo-700 leading-relaxed">
                 La carga segura de documentos está disponible desde el Plan Profesional.<br/>
                 Protege licencias, matrículas, permisos y respaldos importantes manteniéndolos siempre accesibles desde la nube.<br/>
                 Actualiza a Profesional o Empresarial para habilitar almacenamiento documental avanzado.
               </p>
               {/* Mostrar file_url manual si ya existia (legacy) */}
               {watch('file_url') && (
                  <div className="mt-2">
                    <Input
                      label="URL del Archivo Existente (Temporal)"
                      error={errors.file_url?.message as string}
                      {...register('file_url')}
                    />
                  </div>
               )}
             </div>
          ) : storageCap?.reason === 'missing_provider_config' ? (
             <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col gap-3">
               <div className="flex items-start gap-2">
                 <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                 <div>
                   <p className="text-sm font-medium text-amber-900">Almacenamiento documental no configurado.</p>
                   <p className="text-xs text-amber-700 mt-1">Tu plan permite carga segura de documentos, pero el Super Admin todavía no ha configurado Cloudinary para esta compañía.</p>
                 </div>
               </div>
               {watch('file_url') && (
                  <Input
                    label="URL de archivo fallback"
                    error={errors.file_url?.message as string}
                    {...register('file_url')}
                  />
               )}
             </div>
          ) : storageCap?.reason === 'no_company' ? (
             <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg flex flex-col gap-2">
               <div className="flex items-center gap-2 text-sky-800 font-semibold">
                 <AlertTriangle className="w-4 h-4" /> Carga documental no disponible para este usuario.
               </div>
               <p className="text-xs text-sky-700">
                 El Super Admin configura el almacenamiento desde el detalle de la compañía, pero la carga de documentos la realizan el admin o secretaria de la compañía.
               </p>
             </div>
          ) : storageCap?.reason === 'blocked_by_role' ? (
             <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex flex-col gap-2">
               <div className="flex items-center gap-2 text-orange-800 font-semibold">
                 <AlertTriangle className="w-4 h-4" /> No tienes permisos para cargar documentos.
               </div>
               <p className="text-xs text-orange-700">
                 La carga documental está disponible para administradores y secretarias de la compañía.
               </p>
             </div>
          ) : storageCap?.reason === 'company_inactive' ? (
             <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex flex-col gap-2">
               <div className="flex items-center gap-2 text-orange-800 font-semibold">
                 <AlertTriangle className="w-4 h-4" /> La compañía no está activa.
               </div>
               <p className="text-xs text-orange-700">
                 No se pueden cargar documentos mientras la compañía esté inactiva.
               </p>
             </div>
          ) : (
             <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-2">
               <div className="flex items-center gap-2 text-red-800 font-semibold">
                 <AlertTriangle className="w-4 h-4" /> No se pudo verificar la configuración de carga documental.
               </div>
               <p className="text-xs text-red-700">
                 Intenta nuevamente o contacta al administrador.
               </p>
               {import.meta.env.DEV && storageCap && (
                 <p className="text-[10px] text-red-500 font-mono mt-1 leading-normal border-t border-red-100 pt-1">
                   [DEV ONLY] Reason: {storageCap.reason} {storageCap.error_details ? `| Error: ${storageCap.error_details}` : ''}
                 </p>
               )}
               {watch('file_url') && (
                  <div className="mt-2">
                    <Input
                      label="URL del Archivo Existente"
                      error={errors.file_url?.message as string}
                      {...register('file_url')}
                    />
                  </div>
               )}
             </div>
          )}
        </div>

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
          <Button type="submit" isLoading={loading || uploading} disabled={uploading}>
            {isEdit ? 'Guardar Cambios' : 'Añadir Documento'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
