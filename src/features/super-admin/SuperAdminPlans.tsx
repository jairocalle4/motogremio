import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Package, CheckCircle2, Edit2, AlertCircle, Plus, ShieldAlert, Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  getSuperAdminPlans,
  createSuperAdminPlan,
  previewSuperAdminPlanUpdate,
  updateSuperAdminPlan,
  type SuperAdminPlan,
  type PlanUpdatePreview
} from './hooks/useSuperAdminPlans'

// Schema validation for plan creation
const createPlanSchema = z.object({
  name: z.enum(['basico', 'profesional', 'empresarial'], {
    errorMap: () => ({ message: 'Selecciona un nombre de plan válido.' }),
  }),
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres.'),
  max_members: z.coerce.number().int().positive('El límite de socios debe ser mayor a 0.'),
  max_vehicles: z.coerce.number().int().positive('El límite de unidades debe ser mayor a 0.'),
  price_monthly: z.coerce.number().nonnegative('El precio no puede ser negativo.'),
  features: z.string().default(''),
  is_active: z.boolean().default(true),
})

type CreatePlanForm = z.infer<typeof createPlanSchema>

// Schema validation for plan editing
const editPlanSchema = z.object({
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres.'),
  max_members: z.coerce.number().int().positive('El límite de socios debe ser mayor a 0.'),
  max_vehicles: z.coerce.number().int().positive('El límite de unidades debe ser mayor a 0.'),
  price_monthly: z.coerce.number().nonnegative('El precio no puede ser negativo.'),
  features: z.string().default(''),
  is_active: z.boolean(),
})

type EditPlanForm = z.infer<typeof editPlanSchema>

export function SuperAdminPlans() {
  const [plans, setPlans] = useState<SuperAdminPlan[]>([])
  const [loading, setLoading] = useState(true)

  // Modal Creation state
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Modal Edit state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SuperAdminPlan | null>(null)

  // Preview Warning state
  const [previewData, setPreviewData] = useState<PlanUpdatePreview | null>(null)
  const [forceChecked, setForceChecked] = useState(false)
  const [editFormData, setEditFormData] = useState<EditPlanForm | null>(null)

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm<CreatePlanForm>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      is_active: true,
      features: '',
    },
  })

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditing },
  } = useForm<EditPlanForm>({
    resolver: zodResolver(editPlanSchema),
  })

  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    setLoading(true)
    try {
      const data = await getSuperAdminPlans()
      setPlans(data)
    } catch (err: any) {
      toast.error('Error al cargar planes: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const onCreatePlan = async (data: CreatePlanForm) => {
    const toastId = toast.loading('Creando plan...')
    try {
      // Split features text by lines to convert to array
      const featuresArray = data.features
        ? data.features.split('\n').map((f) => f.trim()).filter(Boolean)
        : []

      await createSuperAdminPlan({
        name: data.name,
        description: data.description,
        max_members: data.max_members,
        max_vehicles: data.max_vehicles,
        price_monthly: data.price_monthly,
        features: featuresArray,
        is_active: data.is_active,
      })

      toast.success('Plan creado con éxito', { id: toastId })
      setIsCreateOpen(false)
      resetCreate()
      fetchPlans()
    } catch (err: any) {
      toast.error(err.message || 'Error al crear el plan', { id: toastId })
    }
  }

  const handleEditClick = (plan: SuperAdminPlan) => {
    setSelectedPlan(plan)
    
    // Parse features to textarea format
    let featuresText = ''
    if (Array.isArray(plan.features)) {
      featuresText = plan.features.join('\n')
    } else if (plan.features && typeof plan.features === 'object') {
      featuresText = Object.values(plan.features).join('\n')
    }

    resetEdit({
      description: plan.description || '',
      max_members: plan.max_members,
      max_vehicles: plan.max_vehicles,
      price_monthly: plan.price_monthly,
      features: featuresText,
      is_active: plan.is_active,
    })
    setPreviewData(null)
    setForceChecked(false)
    setEditFormData(null)
    setIsEditOpen(true)
  }

  const onEditPlanSubmit = async (data: EditPlanForm) => {
    if (!selectedPlan) return
    const toastId = toast.loading('Procesando cambios...')
    try {
      // Verify preview
      const preview = await previewSuperAdminPlanUpdate({
        planId: selectedPlan.id,
        maxMembers: data.max_members,
        maxVehicles: data.max_vehicles,
      })

      if (!preview.can_update_without_exceeding && !forceChecked) {
        toast.dismiss(toastId)
        setPreviewData(preview)
        setEditFormData(data)
        return
      }

      const featuresArray = data.features
        ? data.features.split('\n').map((f) => f.trim()).filter(Boolean)
        : []

      await updateSuperAdminPlan({
        planId: selectedPlan.id,
        description: data.description,
        maxMembers: data.max_members,
        maxVehicles: data.max_vehicles,
        priceMonthly: data.price_monthly,
        features: featuresArray,
        isActive: data.is_active,
        force: forceChecked,
      })

      toast.success('Plan actualizado con éxito', { id: toastId })
      setIsEditOpen(false)
      setPreviewData(null)
      setForceChecked(false)
      setEditFormData(null)
      fetchPlans()
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el plan', { id: toastId })
    }
  }

  const handleForcedSubmit = async () => {
    if (!editFormData || !selectedPlan) return
    const toastId = toast.loading('Guardando con actualización forzada...')
    try {
      const featuresArray = editFormData.features
        ? editFormData.features.split('\n').map((f) => f.trim()).filter(Boolean)
        : []

      await updateSuperAdminPlan({
        planId: selectedPlan.id,
        description: editFormData.description,
        maxMembers: editFormData.max_members,
        maxVehicles: editFormData.max_vehicles,
        priceMonthly: editFormData.price_monthly,
        features: featuresArray,
        isActive: editFormData.is_active,
        force: true,
      })

      toast.success('Plan actualizado (forzado) con éxito', { id: toastId })
      setIsEditOpen(false)
      setPreviewData(null)
      setForceChecked(false)
      setEditFormData(null)
      fetchPlans()
    } catch (err: any) {
      toast.error(err.message || 'Error al forzar actualización', { id: toastId })
    }
  }

  const namesCreated = plans.map((p) => p.name)
  const allPlanesCreated = ['basico', 'profesional', 'empresarial'].every((name) =>
    namesCreated.includes(name as any)
  )

  const availableOptions = [
    { value: '', label: 'Seleccionar nombre...' },
    ...['basico', 'profesional', 'empresarial']
      .filter((name) => !namesCreated.includes(name as any))
      .map((name) => ({ value: name, label: name.toUpperCase() })),
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Planes SaaS</h1>
          <p className="text-slate-500">Configuración global de precios y límites para MotoGremio</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            disabled={allPlanesCreated}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Crear plan
          </Button>
          {allPlanesCreated && (
            <span className="text-xs text-slate-500 font-medium">
              Ya existen todos los tipos de plan disponibles.
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          let badgeVariant: 'success' | 'danger' | 'info' = 'success'
          if (!plan.is_active) {
            badgeVariant = 'danger'
          }

          // Parse features list
          let featuresList: string[] = []
          if (Array.isArray(plan.features)) {
            featuresList = plan.features
          } else if (plan.features && typeof plan.features === 'object') {
            featuresList = Object.values(plan.features)
          }

          return (
            <Card
              key={plan.id}
              className={`p-6 relative overflow-hidden flex flex-col justify-between ${
                plan.name === 'profesional' ? 'border-2 border-blue-500 shadow-md' : 'border border-slate-200'
              }`}
            >
              <div>
                {plan.name === 'profesional' && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    RECOMENDADO
                  </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        plan.name === 'profesional' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 capitalize">{plan.name}</h2>
                      <span className="text-[10px] text-slate-400">
                        Creado: {new Date(plan.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Badge variant={badgeVariant}>{plan.is_active ? 'Activo' : 'Inactivo'}</Badge>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-slate-900">${plan.price_monthly}</span>
                  <span className="text-slate-500">/mes</span>
                </div>

                {plan.description && (
                  <p className="text-xs text-slate-500 mb-4 italic">{plan.description}</p>
                )}

                <div className="space-y-2 border-t border-slate-100 pt-4 mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-slate-700">
                      Socios Activos Máx: <span className="font-semibold">{plan.max_members}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-slate-700">
                      Unidades Activas Máx: <span className="font-semibold">{plan.max_vehicles}</span>
                    </span>
                  </div>

                  {featuresList.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Características
                      </span>
                      {featuresList.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                          <Check className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center gap-3 mb-3">
                  <span className="text-xs font-medium text-slate-500">Compañías asignadas:</span>
                  <Badge variant={plan.companies_count > 0 ? 'info' : 'default'}>
                    {plan.companies_count === 1 ? '1 compañía' : `${plan.companies_count} compañías`}
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  onClick={() => handleEditClick(plan)}
                  className="w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Edit2 className="h-4 w-4" />
                  Editar Plan
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {plans.length === 0 && (
        <Card className="p-12 text-center border border-slate-200">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No hay planes configurados</h3>
          <p className="text-slate-500 mt-2">Crea un plan para habilitar el registro de compañías.</p>
        </Card>
      )}

      {/* Modal Creación de Plan */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Crear Plan SaaS">
        <form onSubmit={handleCreateSubmit(onCreatePlan)} className="space-y-4">
          <Select
            label="Tipo de Plan (Enum)"
            required
            error={createErrors.name?.message}
            options={availableOptions}
            {...registerCreate('name')}
          />

          <Input
            label="Descripción"
            required
            placeholder="Ej. Plan intermedio para cooperativas medianas"
            error={createErrors.description?.message}
            {...registerCreate('description')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Máx. Socios Activos"
              type="number"
              required
              placeholder="50"
              error={createErrors.max_members?.message}
              {...registerCreate('max_members')}
            />
            <Input
              label="Máx. Unidades Activas"
              type="number"
              required
              placeholder="50"
              error={createErrors.max_vehicles?.message}
              {...registerCreate('max_vehicles')}
            />
          </div>

          <Input
            label="Precio Mensual ($USD)"
            type="number"
            step="0.01"
            required
            placeholder="29.99"
            error={createErrors.price_monthly?.message}
            {...registerCreate('price_monthly')}
          />

          <Textarea
            label="Características (Una por línea)"
            placeholder="Soporte técnico 24/7&#10;Reportes ilimitados&#10;Módulo de Sanciones"
            error={createErrors.features?.message}
            rows={4}
            {...registerCreate('features')}
          />

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="is_active_create"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              {...registerCreate('is_active')}
            />
            <label htmlFor="is_active_create" className="text-sm font-medium text-slate-700">
              Habilitar plan (Disponible para asignación)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={isCreating}>
              Crear Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Edición de Plan */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Editar Plan: ${selectedPlan?.name?.toUpperCase()}`}>
        <form onSubmit={handleEditSubmit(onEditPlanSubmit)} className="space-y-4">
          {selectedPlan && selectedPlan.companies_count > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 flex items-start gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Plan en uso:</span> Este plan está asignado a {selectedPlan.companies_count} compañías.
                Si modificas los límites hacia abajo, se realizará una comprobación de excedidos.
              </div>
            </div>
          )}

          <Input
            label="Descripción"
            required
            error={editErrors.description?.message}
            {...registerEdit('description')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Máx. Socios Activos"
              type="number"
              required
              error={editErrors.max_members?.message}
              {...registerEdit('max_members')}
            />
            <Input
              label="Máx. Unidades Activas"
              type="number"
              required
              error={editErrors.max_vehicles?.message}
              {...registerEdit('max_vehicles')}
            />
          </div>

          <Input
            label="Precio Mensual ($USD)"
            type="number"
            step="0.01"
            required
            error={editErrors.price_monthly?.message}
            {...registerEdit('price_monthly')}
          />

          <Textarea
            label="Características (Una por línea)"
            rows={4}
            error={editErrors.features?.message}
            {...registerEdit('features')}
          />

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="is_active_edit"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              {...registerEdit('is_active')}
            />
            <label htmlFor="is_active_edit" className="text-sm font-medium text-slate-700">
              Plan Activo (Si se desactiva, las cooperativas asignadas siguen operando, pero no se podrá asignar a nuevas)
            </label>
          </div>

          {previewData && !previewData.can_update_without_exceeding && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md space-y-3">
              <div className="flex items-start gap-2 text-xs text-red-800">
                <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold">Advertencia de límites excedidos:</h4>
                  <p>{previewData.warning_message}</p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-40 border border-red-100 rounded bg-white">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-red-100/50 text-red-900 border-b border-red-100 font-semibold">
                    <tr>
                      <th className="p-2">Compañía</th>
                      <th className="p-2 text-center">Socios</th>
                      <th className="p-2 text-center">Unidades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50 text-slate-700">
                    {previewData.affected_companies.map((c) => (
                      <tr key={c.company_id}>
                        <td className="p-2 font-medium">{c.company_name}</td>
                        <td className={`p-2 text-center ${c.exceeds_members ? 'text-red-600 font-bold' : ''}`}>
                          {c.current_members} / {c.new_max_members}
                        </td>
                        <td className={`p-2 text-center ${c.exceeds_vehicles ? 'text-red-600 font-bold' : ''}`}>
                          {c.current_vehicles} / {c.new_max_vehicles}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="force_check"
                  checked={forceChecked}
                  onChange={(e) => setForceChecked(e.target.checked)}
                  className="rounded border-red-300 text-red-600 focus:ring-red-500 mt-0.5"
                />
                <label htmlFor="force_check" className="text-xs font-semibold text-red-800 cursor-pointer">
                  Entiendo que este cambio dejará compañías excedidas y deseo forzar la actualización.
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            {previewData && !previewData.can_update_without_exceeding ? (
              <Button
                variant="danger"
                type="button"
                disabled={!forceChecked || isEditing}
                onClick={handleForcedSubmit}
              >
                Forzar Guardado
              </Button>
            ) : (
              <Button variant="primary" type="submit" disabled={isEditing}>
                Guardar Cambios
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}
