import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ShieldAlert, Save, RefreshCw } from 'lucide-react'
import { useBranding } from '@/context/BrandingContext'
import {
  getMyCompanyBranding,
  updateMyCompanyBranding,
  type CompanyBranding
} from '@/hooks/useCompanyBranding'

const brandingSchema = z.object({
  commercial_name: z.string().max(120, 'El nombre comercial no puede superar 120 caracteres.').nullable().optional().or(z.literal('')),
  slogan: z.string().max(160, 'El eslogan no puede superar 160 caracteres.').nullable().optional().or(z.literal('')),
  logo_url: z.string().nullable().optional().or(z.literal('')),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color primario debe tener formato HEX #RRGGBB (ej. #1E3A5F)')
    .nullable()
    .optional()
    .or(z.literal('')),
  secondary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color secundario debe tener formato HEX #RRGGBB (ej. #4A90D9)')
    .nullable()
    .optional()
    .or(z.literal('')),
  contact_phone: z.string().max(30, 'El teléfono de contacto no puede superar 30 caracteres.').nullable().optional().or(z.literal('')),
  contact_email: z
    .string()
    .email('Ingresa un correo de contacto válido.')
    .max(100)
    .nullable()
    .optional()
    .or(z.literal('')),
  public_address: z.string().max(250, 'La dirección pública no puede superar 250 caracteres.').nullable().optional().or(z.literal('')),
  report_header_text: z.string().max(500, 'El encabezado de reportes no puede superar 500 caracteres.').nullable().optional().or(z.literal('')),
})

type BrandingFormData = z.infer<typeof brandingSchema>

interface CompanyBrandingTabProps {
  userRole?: string
}

export function CompanyBrandingTab({ userRole }: CompanyBrandingTabProps) {
  const [branding, setBranding] = useState<CompanyBranding | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { reload: reloadBrandingContext } = useBranding()

  // check if user has edit permissions
  const canEdit = userRole && ['admin', 'gerente', 'presidente', 'secretaria', 'tesorero'].includes(userRole)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<BrandingFormData>({
    resolver: zodResolver(brandingSchema),
  })

  // Watch color variables to display visual preview live
  const watchCommercialName = watch('commercial_name')
  const watchSlogan = watch('slogan')
  const watchLogoUrl = watch('logo_url')
  const watchPrimaryColor = watch('primary_color')
  const watchSecondaryColor = watch('secondary_color')
  const watchPhone = watch('contact_phone')
  const watchEmail = watch('contact_email')
  const watchAddress = watch('public_address')
  const watchHeader = watch('report_header_text')

  const fetchBranding = async () => {
    setLoading(true)
    try {
      const data = await getMyCompanyBranding()
      setBranding(data)
      reset({
        commercial_name: data.commercial_name || '',
        slogan: data.slogan || '',
        logo_url: data.logo_url || '',
        primary_color: data.primary_color || '#1e3a5f',
        secondary_color: data.secondary_color || '#4a90d9',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        public_address: data.public_address || '',
        report_header_text: data.report_header_text || '',
      })
    } catch (err: any) {
      toast.error('Error al cargar la identidad visual: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBranding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = async (data: BrandingFormData) => {
    if (!canEdit) return
    setIsSaving(true)
    const toastId = toast.loading('Guardando branding de compañía...')
    try {
      // Map empty strings to empty strings or fallbacks
      const payload = {
        commercial_name: data.commercial_name || '',
        slogan: data.slogan || '',
        logo_url: data.logo_url || '',
        primary_color: data.primary_color || '#1e3a5f',
        secondary_color: data.secondary_color || '#4a90d9',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        public_address: data.public_address || '',
        report_header_text: data.report_header_text || '',
      }

      const res = await updateMyCompanyBranding(payload)
      setBranding(res)
      // Refresh global branding context so sidebar/UI colors update immediately
      await reloadBrandingContext()
      toast.success('Branding actualizado exitosamente.', { id: toastId })
    } catch (err: any) {
      let msg = err.message || 'Error al guardar configuración'
      if (msg.includes('Nombre comercial') || msg.includes('commercial_name')) {
        msg = 'El nombre comercial no puede superar 120 caracteres.'
      } else if (msg.includes('eslogan') || msg.includes('slogan')) {
        msg = 'El eslogan no puede superar 160 caracteres.'
      } else if (msg.includes('Color primario') || msg.includes('primary_color')) {
        msg = 'Color primario inválido. Debe ser formato HEX #RRGGBB.'
      } else if (msg.includes('Color secundario') || msg.includes('secondary_color')) {
        msg = 'Color secundario inválido. Debe ser formato HEX #RRGGBB.'
      } else if (msg.includes('Correo') || msg.includes('email')) {
        msg = 'Correo de contacto inválido.'
      }
      toast.error(msg, { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulario */}
      <Card className="lg:col-span-2 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Parámetros de Identidad</h3>
          <p className="text-xs text-slate-500 mt-1">Configura los logotipos, colores y textos comerciales de tu cooperativa</p>
        </div>

        {!canEdit && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 flex items-start gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>Tu rol puede ver esta información, pero no editarla.</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre Comercial"
              disabled={!canEdit}
              placeholder="Ej. Cooperativa MotoExpress"
              error={errors.commercial_name?.message}
              {...register('commercial_name')}
            />
            <Input
              label="Eslogan Comercial"
              disabled={!canEdit}
              placeholder="Ej. Rapidez y seguridad a su alcance"
              error={errors.slogan?.message}
              {...register('slogan')}
            />
          </div>

          <Input
            label="URL del Logo (Imágenes)"
            disabled={!canEdit}
            placeholder="https://ejemplo.com/logo.png"
            error={errors.logo_url?.message}
            {...register('logo_url')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Color Primario</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  disabled={!canEdit}
                  value={watchPrimaryColor || '#1e3a5f'}
                  onChange={(e) => setValue('primary_color', e.target.value, { shouldDirty: true })}
                  className="w-10 h-9 rounded border border-slate-350 p-1 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="#1E3A5F"
                  className="flex-1 rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-slate-500 focus:outline-none"
                  {...register('primary_color')}
                />
              </div>
              {errors.primary_color?.message && (
                <span className="text-xs text-red-600 block mt-1">{errors.primary_color.message}</span>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Color Secundario</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  disabled={!canEdit}
                  value={watchSecondaryColor || '#4a90d9'}
                  onChange={(e) => setValue('secondary_color', e.target.value, { shouldDirty: true })}
                  className="w-10 h-9 rounded border border-slate-300 p-1 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="#4A90D9"
                  className="flex-1 rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-slate-500 focus:outline-none"
                  {...register('secondary_color')}
                />
              </div>
              {errors.secondary_color?.message && (
                <span className="text-xs text-red-600 block mt-1">{errors.secondary_color.message}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Teléfono de Contacto Público"
              disabled={!canEdit}
              placeholder="+593 999 999 999"
              error={errors.contact_phone?.message}
              {...register('contact_phone')}
            />
            <Input
              label="Correo de Contacto Público"
              disabled={!canEdit}
              placeholder="contacto@cooperativa.com"
              error={errors.contact_email?.message}
              {...register('contact_email')}
            />
          </div>

          <Input
            label="Dirección Pública"
            disabled={!canEdit}
            placeholder="Av. Principal y Calle Secundaria, Guayaquil, Ecuador"
            error={errors.public_address?.message}
            {...register('public_address')}
          />

          <Textarea
            label="Encabezado de Reportes y Comprobantes"
            disabled={!canEdit}
            placeholder="Escriba aquí los términos legales, RUC o leyendas secundarias que aparecerán al inicio de las exportaciones o reportes."
            error={errors.report_header_text?.message}
            rows={3}
            {...register('report_header_text')}
          />

          {canEdit && (
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button type="submit" disabled={!isDirty || isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Guardando...' : 'Guardar Identidad'}
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Preview Visual */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">
            Previsualización en tiempo real
          </span>
          <Button variant="outline" size="sm" onClick={fetchBranding} className="h-7 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Recargar
          </Button>
        </div>

        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden relative">
          {/* Top colored visual bar */}
          <div
            className="h-3 absolute top-0 left-0 right-0"
            style={{ backgroundColor: watchPrimaryColor || '#1e3a5f' }}
          />

          <div className="space-y-4 mt-2">
            {/* Header info */}
            <div className="flex items-center gap-3">
              {watchLogoUrl ? (
                <img
                  src={watchLogoUrl}
                  alt="Logo Cooperativa"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none'
                  }}
                  className="w-12 h-12 rounded object-cover border border-slate-100 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-slate-100 text-[10px] text-slate-400 font-bold border border-slate-200 flex items-center justify-center flex-shrink-0">
                  Sin logo
                </div>
              )}
              <div className="min-w-0">
                <h4 className="font-bold text-slate-800 text-sm truncate">
                  {watchCommercialName || branding?.commercial_name || 'Nombre Comercial'}
                </h4>
                <p className="text-xs text-slate-500 italic truncate">
                  {watchSlogan || branding?.slogan || 'Eslogan comercial'}
                </p>
              </div>
            </div>

            {/* Colors visual swatch */}
            <div className="grid grid-cols-2 gap-2 text-center text-[10px] pt-2 border-t border-slate-100">
              <div className="rounded p-1.5 text-white" style={{ backgroundColor: watchPrimaryColor || '#1e3a5f' }}>
                Primario <span className="font-mono block text-[9px]">{watchPrimaryColor || '#1E3A5F'}</span>
              </div>
              <div className="rounded p-1.5 text-white" style={{ backgroundColor: watchSecondaryColor || '#4a90d9' }}>
                Secundario <span className="font-mono block text-[9px]">{watchSecondaryColor || '#4A90D9'}</span>
              </div>
            </div>

            {/* Contact swatches */}
            <div className="text-[11px] space-y-1.5 pt-2 border-t border-slate-100 text-slate-600">
              <div>
                <span className="font-medium text-slate-400 uppercase text-[9px] block">Teléfono:</span>
                <span>{watchPhone || branding?.contact_phone || 'No registrado'}</span>
              </div>
              <div>
                <span className="font-medium text-slate-400 uppercase text-[9px] block">Correo:</span>
                <span className="truncate block">{watchEmail || branding?.contact_email || 'No registrado'}</span>
              </div>
              <div>
                <span className="font-medium text-slate-400 uppercase text-[9px] block">Dirección Pública:</span>
                <span className="line-clamp-2 block">{watchAddress || branding?.public_address || 'No registrado'}</span>
              </div>
            </div>

            {/* Document output headers */}
            <div className="pt-2 border-t border-slate-100">
              <span className="font-medium text-slate-400 uppercase text-[9px] block">Encabezado de reportes:</span>
              <p className="text-[10px] text-slate-500 line-clamp-3 leading-relaxed mt-0.5">
                {watchHeader || branding?.report_header_text || 'Escriba leyendas legales o RUC en el formulario...'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
