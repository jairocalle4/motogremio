import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useCompany } from '@/hooks/useCompany'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Building2, Save, Users, Info } from 'lucide-react'

// Esquema de validación con Zod
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

export function CompanyConfigPage() {
  const { company, loading, updateCompany, fetchCompany } = useCompany()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
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

  // Cargar datos iniciales
  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  // Actualizar formulario cuando se cargue la compañía
  useEffect(() => {
    if (company) {
      reset({
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
  }, [company, reset])

  const onSubmit = async (data: CompanyFormData) => {
    const toastId = toast.loading('Guardando configuración...')
    try {
      // Limpiar strings vacíos a null
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

  if (loading && !company) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración de la Compañía</h1>
        <p className="text-gray-500 mt-1">Gestiona los datos institucionales y directivos de tu cooperativa.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              {...register('legal_name')}
              error={errors.legal_name?.message}
            />
            <Input
              label="Nombre Comercial"
              {...register('trade_name')}
              error={errors.trade_name?.message}
            />
            <Input
              label="RUC"
              disabled
              {...register('ruc')}
              error={errors.ruc?.message}
              hint="El RUC no puede modificarse por seguridad."
            />
            <Input
              label="Correo Electrónico"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label="Teléfono"
              {...register('phone')}
              error={errors.phone?.message}
            />
            <Input
              label="Dirección Física"
              {...register('address')}
              error={errors.address?.message}
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
              {...register('manager_name')}
              error={errors.manager_name?.message}
            />
            <Input
              label="Nombre del Presidente"
              placeholder="Ej. María López"
              {...register('president_name')}
              error={errors.president_name?.message}
            />
            <Input
              label="Nombre del Secretario/a"
              {...register('secretary_name')}
              error={errors.secretary_name?.message}
            />
            <Input
              label="Nombre del Tesorero/a"
              {...register('treasurer_name')}
              error={errors.treasurer_name?.message}
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
              {...register('institutional_info')}
              error={errors.institutional_info?.message}
            />
          </CardContent>
          <div className="bg-gray-50 border-t rounded-b-xl flex justify-end py-4 px-6 mt-4">
            <Button 
              type="submit" 
              disabled={!isDirty || isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Guardando...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
