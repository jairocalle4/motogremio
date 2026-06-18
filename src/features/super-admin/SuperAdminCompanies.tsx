import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Search, Eye, ShieldAlert, Plus, Copy, Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import type { Database } from '@/types/database.types'

interface CompanyStats {
  id: string
  legal_name: string
  trade_name: string | null
  ruc: string
  status: string | null
  created_at: string | null
  plan_name: string | null
  members_count: number
  vehicles_count: number
  users_count: number
  total_debt: number
}

type Plan = Database['public']['Tables']['plans']['Row']

// ─── Validación del formulario ────────────────────────
const companySchema = z.object({
  legal_name: z.string().min(3, 'El nombre legal debe tener al menos 3 caracteres.'),
  trade_name: z.string().default(''),
  ruc: z.string().length(13, 'El RUC debe tener exactamente 13 caracteres.'),
  plan_id: z.string().min(1, 'Selecciona un plan.'),
  status: z.enum(['activa', 'inactiva']),
  admin_first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  admin_last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  admin_email: z.string().email('Ingresa un correo de administrador válido.'),
})

type CompanyForm = z.infer<typeof companySchema>

export function SuperAdminCompanies() {
  const [companies, setCompanies] = useState<CompanyStats[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Control de Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      status: 'activa',
      trade_name: '',
    },
  })

  useEffect(() => {
    fetchCompanies()
    fetchPlans()
  }, [])

  async function fetchCompanies() {
    try {
      const { data, error } = await supabase.rpc('get_companies_with_stats')
      if (error) throw error
      setCompanies((data as unknown as CompanyStats[]) || [])
    } catch (err: any) {
      toast.error('Error al cargar compañías: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPlans() {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price_monthly', { ascending: true })
      if (error) throw error
      setPlans(data || [])
    } catch (err: any) {
      console.error('Error al cargar planes:', err.message)
    }
  }

  const filtered = companies.filter(c =>
    c.legal_name.toLowerCase().includes(search.toLowerCase()) ||
    c.ruc.includes(search)
  )

  const toggleStatus = async (id: string, currentStatus: string | null) => {
    const newStatus = (currentStatus === 'activa' || currentStatus === 'activo') ? 'inactiva' : 'activa'
    try {
      const { error } = await supabase
        .from('companies')
        .update({ status: newStatus })
        .eq('id', id)
      
      if (error) throw error
      toast.success(`Compañía marcada como ${newStatus}`)
      fetchCompanies()
    } catch (err: any) {
      toast.error('Error al cambiar estado: ' + err.message)
    }
  }

  const onSubmit = async (data: CompanyForm) => {
    try {
      const { data: res, error } = await supabase.rpc('create_super_admin_company', {
        p_legal_name: data.legal_name,
        p_trade_name: data.trade_name,
        p_ruc: data.ruc,
        p_plan_id: data.plan_id,
        p_status: data.status,
        p_admin_first_name: data.admin_first_name,
        p_admin_last_name: data.admin_last_name,
        p_admin_email: data.admin_email,
      })

      if (error) throw error

      const resJson = res as any
      if (resJson && resJson.invite_token) {
        const link = `${window.location.origin}/register?invite=${resJson.invite_token}`
        setInviteLink(link)
        setIsCreateOpen(false)
        setIsSuccessOpen(true)
        reset()
        fetchCompanies()
      } else {
        toast.success('Compañía creada con éxito')
        setIsCreateOpen(false)
        reset()
        fetchCompanies()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la compañía')
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success('¡Enlace copiado al portapapeles!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('No se pudo copiar el enlace')
    }
  }

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
          <h1 className="text-2xl font-bold text-slate-900">Compañías SaaS</h1>
          <p className="text-slate-500">Gestión global de clientes de MotoGremio</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva compañía
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por RUC o Nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Compañía</th>
                <th className="px-4 py-3 font-medium">RUC</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium text-center">Socios</th>
                <th className="px-4 py-3 font-medium text-center">Unidades</th>
                <th className="px-4 py-3 font-medium text-right">Deuda</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{c.legal_name}</div>
                    {c.trade_name && <div className="text-xs text-slate-500">{c.trade_name}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{c.ruc}</td>
                  <td className="px-4 py-3 capitalize">{c.plan_name || '-'}</td>
                  <td className="px-4 py-3 text-center">{c.members_count}</td>
                  <td className="px-4 py-3 text-center">{c.vehicles_count}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">
                    ${Number(c.total_debt).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={(c.status === 'activa' || c.status === 'activo') ? 'success' : 'danger'}>
                      {c.status || 'desconocido'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link 
                        to={`/super-admin/companies/${c.id}`}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => toggleStatus(c.id, c.status)}
                        className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                        title={(c.status === 'activa' || c.status === 'activo') ? 'Desactivar compañía' : 'Activar compañía'}
                      >
                        <ShieldAlert className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron compañías
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Modal Creación de Compañía ── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => { if (!isSubmitting) setIsCreateOpen(false) }}
        title="Crear Nueva Compañía SaaS"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Datos de la Compañía</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre Legal"
                type="text"
                placeholder="Compañía S.A."
                required
                error={errors.legal_name?.message}
                {...register('legal_name')}
              />
              <Input
                label="Nombre Comercial"
                type="text"
                placeholder="MotoExpress"
                error={errors.trade_name?.message}
                {...register('trade_name')}
              />
              <Input
                label="RUC"
                type="text"
                placeholder="0999999999001"
                required
                error={errors.ruc?.message}
                {...register('ruc')}
              />
              <Select
                label="Plan Contratado"
                required
                error={errors.plan_id?.message}
                options={[
                  { value: '', label: 'Selecciona un plan...' },
                  ...plans.map(p => ({ value: p.id, label: `${p.name.toUpperCase()} - $${p.price_monthly}/mes` }))
                ]}
                {...register('plan_id')}
              />
              <Select
                label="Estado Inicial"
                required
                error={errors.status?.message}
                options={[
                  { value: 'activa', label: 'Activa' },
                  { value: 'inactiva', label: 'Inactiva' }
                ]}
                {...register('status')}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Administrador Inicial</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                type="text"
                placeholder="Juan"
                required
                error={errors.admin_first_name?.message}
                {...register('admin_first_name')}
              />
              <Input
                label="Apellido"
                type="text"
                placeholder="Pérez"
                required
                error={errors.admin_last_name?.message}
                {...register('admin_last_name')}
              />
              <div className="md:col-span-2">
                <Input
                  label="Correo Electrónico"
                  type="email"
                  placeholder="admin@coop.com"
                  required
                  error={errors.admin_email?.message}
                  {...register('admin_email')}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Crear Compañía y Generar Invitación
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal de Éxito (Link de Invitación) ── */}
      <Modal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        title="Compañía creada con éxito"
        size="md"
      >
        <div className="space-y-6 py-2">
          <p className="text-sm text-slate-600 leading-relaxed">
            La compañía ha sido registrada en el sistema. Comparte el siguiente enlace con el administrador inicial para que complete su registro:
          </p>

          <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-3">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 bg-transparent border-none text-xs font-mono text-slate-700 focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="p-2 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors"
              title="Copiar enlace"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <p className="text-xs text-red-600 font-semibold leading-relaxed">
            Importante: Por razones de seguridad, este enlace contiene un token de un solo uso que expira en 24 horas y no podrá visualizarse nuevamente.
          </p>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={() => setIsSuccessOpen(false)}
            >
              Cerrar y Continuar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
