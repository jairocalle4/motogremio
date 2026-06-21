import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useCompany } from '@/hooks/useCompany'
import { useDocuments } from '@/hooks/useDocuments'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useAuth } from '@/context/useAuth'
import { getMyCompanyPlanUsage, type CompanyPlanUsage } from '../subscription/hooks/usePlanUsage'
import { PlanUsageCard } from '../subscription/components/PlanUsageCard'
import { CompanyBrandingTab } from './CompanyBrandingTab'
import { 
  Building2, 
  Save, 
  Users, 
  Info, 
  Plus, 
  Edit, 
  ToggleLeft,
  ToggleRight
} from 'lucide-react'

// ─── ESQUEMA CONFIGURACIÓN GENERAL ──────────────────────────────────────────
const companySchema = z.object({
  legal_name: z.string().min(3, 'La razón social es obligatoria'),
  trade_name: z.string().min(1, 'El nombre comercial es obligatorio'),
  ruc: z.string().length(13, 'El RUC debe tener 13 dígitos'),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('Correo inválido').nullable().optional().or(z.literal('')),
  manager_name: z.string().nullable().optional(),
  president_name: z.string().nullable().optional(),
  secretary_name: z.string().nullable().optional(),
  treasurer_name: z.string().nullable().optional(),
  institutional_info: z.string().nullable().optional(),
})

type CompanyFormData = z.infer<typeof companySchema>

// ─── ESQUEMA TIPO DOCUMENTO ────────────────────────────────────────────────
const docTypeSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  target_entity: z.enum(['member', 'driver', 'vehicle'], {
    errorMap: () => ({ message: 'Selecciona una entidad destino válida' }),
  }),
  requires_expiry: z.boolean(),
})

type DocTypeFormData = z.infer<typeof docTypeSchema>

export function CompanyConfigPage() {
  const [activeTab, setActiveTab] = useState<'info' | 'document_types' | 'branding'>('info')
  const { company, loading: companyLoading, updateCompany, fetchCompany } = useCompany()
  const { profile } = useAuth()

  // Estado de uso de plan
  const [myPlanUsage, setMyPlanUsage] = useState<CompanyPlanUsage | null>(null)
  
  const showPlanUsage = profile && ['admin', 'gerente', 'presidente', 'secretaria', 'tesorero'].includes(profile.role)

  useEffect(() => {
    async function loadPlanUsage() {
      if (showPlanUsage) {
        try {
          const usage = await getMyCompanyPlanUsage()
          setMyPlanUsage(usage)
        } catch (err: any) {
          console.error('Error al cargar uso del plan:', err.message)
        }
      }
    }
    loadPlanUsage()
  }, [showPlanUsage])

  // Hook de documentos
  const { 
    fetchAllDocumentTypes, 
    createDocumentType, 
    updateDocumentType 
  } = useDocuments()

  // ─── ESTADOS TIPOS DE DOCUMENTOS ─────────────────────────────────────────
  const [docTypes, setDocTypes] = useState<any[]>([])
  const [docTypesLoading, setDocTypesLoading] = useState(false)
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<any | null>(null)
  
  // ConfirmModal para desactivar
  const [deactivateTarget, setDeactivateTarget] = useState<any | null>(null)

  // ─── FORMULARIO COMPAÑÍA ───────────────────────────────────────────────────
  const {
    register: registerCompany,
    handleSubmit: handleCompanySubmit,
    reset: resetCompany,
    formState: { errors: companyErrors, isSubmitting: companySubmitting, isDirty: companyDirty },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      legal_name: '',
      trade_name: '',
      ruc: '',
      address: '',
      phone: '',
      email: '',
      manager_name: '',
      president_name: '',
      secretary_name: '',
      treasurer_name: '',
      institutional_info: '',
    },
  })

  // ─── FORMULARIO TIPO DOCUMENTO ─────────────────────────────────────────────
  const {
    register: registerType,
    handleSubmit: handleTypeSubmit,
    reset: resetType,
    formState: { errors: typeErrors, isSubmitting: typeSubmitting },
  } = useForm<DocTypeFormData>({
    resolver: zodResolver(docTypeSchema),
    defaultValues: {
      name: '',
      target_entity: 'vehicle',
      requires_expiry: true,
    }
  })

  // Cargar datos de la compañía
  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  // Resetear formulario de compañía
  useEffect(() => {
    if (company) {
      resetCompany({
        legal_name: company.legal_name || '',
        trade_name: company.trade_name || '',
        ruc: company.ruc || '',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        manager_name: company.manager_name || '',
        president_name: company.president_name || '',
        secretary_name: company.secretary_name || '',
        treasurer_name: company.treasurer_name || '',
        institutional_info: company.institutional_info || '',
      })
    }
  }, [company, resetCompany])

  // Cargar tipos de documentos
  const loadDocTypes = useCallback(async () => {
    setDocTypesLoading(true)
    const data = await fetchAllDocumentTypes()
    setDocTypes(data)
    setDocTypesLoading(false)
  }, [fetchAllDocumentTypes])

  useEffect(() => {
    if (activeTab === 'document_types') {
      loadDocTypes()
    }
  }, [activeTab, loadDocTypes])

  // ─── ACCIONES COMPAÑÍA ─────────────────────────────────────────────────────
  const onCompanySubmit = async (data: CompanyFormData) => {
    const toastId = toast.loading('Guardando configuración...')
    try {
      const cleanedData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value === '' ? null : value])
      )
      const { error } = await updateCompany(cleanedData)
      if (error) throw new Error(error)
      toast.success('Configuración guardada exitosamente', { id: toastId })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al guardar la configuración'
      toast.error(msg, { id: toastId })
    }
  }

  // ─── ACCIONES TIPO DOCUMENTO ───────────────────────────────────────────────
  const openAddTypeModal = () => {
    setEditingType(null)
    resetType({
      name: '',
      target_entity: 'vehicle',
      requires_expiry: true,
    })
    setIsTypeModalOpen(true)
  }

  const openEditTypeModal = (type: any) => {
    setEditingType(type)
    resetType({
      name: type.name,
      target_entity: type.target_entity,
      requires_expiry: type.requires_expiry,
    })
    setIsTypeModalOpen(true)
  }

  const onTypeSubmit = async (data: DocTypeFormData) => {
    const toastId = toast.loading('Guardando tipo de documento...')
    try {
      if (editingType) {
        const { error } = await updateDocumentType(editingType.id, {
          name: data.name,
          target_entity: data.target_entity,
          requires_expiry: data.requires_expiry,
        })
        if (error) throw new Error(error)
        toast.success('Tipo de documento actualizado correctamente', { id: toastId })
      } else {
        const { error } = await createDocumentType(
          data.name,
          data.target_entity,
          data.requires_expiry
        )
        if (error) throw new Error(error)
        toast.success('Tipo de documento creado correctamente', { id: toastId })
      }
      setIsTypeModalOpen(false)
      loadDocTypes()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar', { id: toastId })
    }
  }

  const handleToggleActive = async (type: any) => {
    // Si está activo y se va a desactivar, requerimos confirmación vía ConfirmModal
    if (type.is_active) {
      setDeactivateTarget(type)
    } else {
      // Activar directamente
      const toastId = toast.loading('Activando tipo de documento...')
      try {
        const { error } = await updateDocumentType(type.id, { is_active: true })
        if (error) throw new Error(error)
        toast.success('Tipo de documento activado', { id: toastId })
        loadDocTypes()
      } catch (err: any) {
        toast.error(err.message || 'Error al activar', { id: toastId })
      }
    }
  }

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return
    const toastId = toast.loading('Desactivando tipo de documento...')
    try {
      const { error } = await updateDocumentType(deactivateTarget.id, { is_active: false })
      if (error) throw new Error(error)
      toast.success('Tipo de documento desactivado exitosamente', { id: toastId })
      setDeactivateTarget(null)
      loadDocTypes()
    } catch (err: any) {
      toast.error(err.message || 'Error al desactivar', { id: toastId })
    }
  }

  // Helper traducción target_entity
  const translateTarget = (target: string) => {
    if (target === 'member') return 'Socio'
    if (target === 'driver') return 'Conductor'
    if (target === 'vehicle') return 'Unidad / Vehículo'
    return target
  }

  if (companyLoading && !company) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Gestiona los datos de tu cooperativa y administra los tipos de documentos.</p>
      </div>

      {/* Plan Usage Widget inside Configuration (only visible to admins, gerente, presidente, secretaria, tesorero) */}
      {showPlanUsage && myPlanUsage && (
        <PlanUsageCard usage={myPlanUsage} />
      )}

      {/* ─── PESTAÑAS / TABS ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('info')}
          className={`py-2.5 px-5 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'info'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Datos de la Cooperativa
        </button>
        <button
          onClick={() => setActiveTab('document_types')}
          className={`py-2.5 px-5 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'document_types'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Tipos de Documentos
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`py-2.5 px-5 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'branding'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Identidad Visual
        </button>
      </div>

      {/* ─── PESTAÑA: INFORMACIÓN GENERAL ────────────────────────────────────── */}
      {activeTab === 'info' && (
        <form onSubmit={handleCompanySubmit(onCompanySubmit)} className="space-y-6">
          {/* Bloque 1: Información General */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-primary-500" />
                <CardTitle>Información General</CardTitle>
              </div>
              <p className="text-sm text-gray-500 mt-1">Datos básicos legales y de contacto.</p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Razón Social"
                {...registerCompany('legal_name')}
                error={companyErrors.legal_name?.message}
              />
              <Input
                label="Nombre Comercial"
                {...registerCompany('trade_name')}
                error={companyErrors.trade_name?.message}
              />
              <Input
                label="RUC"
                disabled
                {...registerCompany('ruc')}
                error={companyErrors.ruc?.message}
                hint="El RUC no puede modificarse por seguridad."
              />
              <Input
                label="Correo Electrónico"
                type="email"
                {...registerCompany('email')}
                error={companyErrors.email?.message}
              />
              <Input
                label="Teléfono"
                {...registerCompany('phone')}
                error={companyErrors.phone?.message}
              />
              <Input
                label="Dirección Física"
                {...registerCompany('address')}
                error={companyErrors.address?.message}
                className="md:col-span-2"
              />
            </CardContent>
          </Card>

          {/* Bloque 2: Directiva */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary-500" />
                <CardTitle>Cargos Directivos</CardTitle>
              </div>
              <p className="text-sm text-gray-500 mt-1">Nombres de los encargados actuales de la compañía (solo informativo).</p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nombre del Gerente"
                placeholder="Ej. Juan Pérez"
                {...registerCompany('manager_name')}
                error={companyErrors.manager_name?.message}
              />
              <Input
                label="Nombre del Presidente"
                placeholder="Ej. María López"
                {...registerCompany('president_name')}
                error={companyErrors.president_name?.message}
              />
              <Input
                label="Nombre del Secretario/a"
                {...registerCompany('secretary_name')}
                error={companyErrors.secretary_name?.message}
              />
              <Input
                label="Nombre del Tesorero/a"
                {...registerCompany('treasurer_name')}
                error={companyErrors.treasurer_name?.message}
              />
            </CardContent>
          </Card>

          {/* Bloque 3: Información Institucional */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-primary-500" />
                <CardTitle>Información Institucional</CardTitle>
              </div>
              <p className="text-sm text-gray-500 mt-1">Misión, visión, reglamentos internos u otros datos de la compañía.</p>
            </CardHeader>
            <CardContent>
              <Textarea
                label="Detalles adicionales"
                rows={4}
                {...registerCompany('institutional_info')}
                error={companyErrors.institutional_info?.message}
              />
            </CardContent>
            <div className="bg-gray-50 border-t rounded-b-xl flex justify-end py-4 px-6 mt-4">
              <Button 
                type="submit" 
                disabled={!companyDirty || companySubmitting}
                className="w-full sm:w-auto"
              >
                {companySubmitting ? 'Guardando...' : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ─── PESTAÑA: IDENTIDAD VISUAL ───────────────────────────────────────── */}
      {activeTab === 'branding' && (
        <CompanyBrandingTab userRole={profile?.role} />
      )}

      {/* ─── PESTAÑA: TIPOS DE DOCUMENTOS ────────────────────────────────────── */}
      {activeTab === 'document_types' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gestión de Tipos de Documentos</h3>
              <p className="text-xs text-gray-500">Crea o desactiva tipos de documentos para Socios, Conductores o Unidades.</p>
            </div>
            <Button onClick={openAddTypeModal} className="flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4" />
              Nuevo Tipo
            </Button>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {docTypesLoading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                  Cargando tipos de documentos...
                </div>
              ) : docTypes.length === 0 ? (
                <div className="p-8 text-center text-gray-400 italic">
                  No hay tipos de documentos registrados.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-3.5 text-left">Nombre</th>
                      <th className="px-6 py-3.5 text-left">Aplica a</th>
                      <th className="px-6 py-3.5 text-left">¿Requiere Vencimiento?</th>
                      <th className="px-6 py-3.5 text-left">Estado</th>
                      <th className="px-6 py-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                    {docTypes.map(type => (
                      <tr key={type.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-medium text-gray-900">{type.name}</td>
                        <td className="px-6 py-4">{translateTarget(type.target_entity)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            type.requires_expiry ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {type.requires_expiry ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            type.is_active 
                              ? 'bg-success-50 text-success-700 border-success-200' 
                              : 'bg-danger-50 text-danger-700 border-danger-200'
                          }`}>
                            {type.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => openEditTypeModal(type)}
                              className="p-1 text-gray-400 hover:text-primary-600 rounded"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(type)}
                              className="p-1 text-gray-400 hover:text-primary-600 rounded transition-colors"
                              title={type.is_active ? 'Desactivar' : 'Activar'}
                            >
                              {type.is_active ? (
                                <ToggleRight className="w-6 h-6 text-green-500" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-gray-300" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── MODAL TIPO DOCUMENTO ────────────────────────────────────────────── */}
      {isTypeModalOpen && (
        <Modal
          isOpen={isTypeModalOpen}
          onClose={() => setIsTypeModalOpen(false)}
          title={editingType ? 'Editar Tipo de Documento' : 'Añadir Tipo de Documento'}
          size="md"
        >
          <form onSubmit={handleTypeSubmit(onTypeSubmit)} className="space-y-4">
            <Input
              label="Nombre del tipo"
              placeholder="Ej. Matrícula o Solicitud de ingreso"
              error={typeErrors.name?.message}
              {...registerType('name')}
            />

            <Select
              label="Aplica a (Entidad destino)"
              error={typeErrors.target_entity?.message}
              options={[
                { label: 'Socio', value: 'member' },
                { label: 'Conductor', value: 'driver' },
                { label: 'Unidad / Vehículo', value: 'vehicle' },
              ]}
              {...registerType('target_entity')}
            />

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="requires_expiry"
                className="h-4.5 w-4.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                {...registerType('requires_expiry')}
              />
              <label htmlFor="requires_expiry" className="text-sm font-medium text-gray-700">
                ¿Requiere fecha de vencimiento obligatoria?
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsTypeModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={typeSubmitting}>
                {editingType ? 'Guardar Cambios' : 'Crear Tipo'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── CONFIRMAR DESACTIVACIÓN ─────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
        title="Desactivar Tipo de Documento"
        message={`¿Estás seguro de que deseas desactivar el tipo "${deactivateTarget?.name}"?`}
        detail="Los documentos ya registrados con este tipo seguirán siendo válidos y visibles, pero no se podrán crear nuevos documentos de este tipo en los formularios."
        confirmLabel="Sí, desactivar"
        variant="warning"
      />
    </div>
  )
}
