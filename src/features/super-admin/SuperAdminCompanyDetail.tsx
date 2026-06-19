import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Building2, ArrowLeft, Users, ShieldAlert, Plus, Mail, Copy, Check, Trash2, ShieldCheck, ToggleLeft, ToggleRight, UserCog } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import type { Database } from '@/types/database.types'
import { getCompanyPlanUsage, type CompanyPlanUsage } from '../subscription/hooks/usePlanUsage'
import {
  getSuperAdminPlans,
  previewCompanyPlanChange,
  updateCompanyPlan,
  type SuperAdminPlan,
  type CompanyPlanChangePreview
} from './hooks/useSuperAdminPlans'

type Company = Database['public']['Tables']['companies']['Row']
type UserRole = Database['public']['Enums']['user_role']

interface CompanyUser {
  id: string
  first_name: string
  last_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
}

interface CompanyInvitation {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  status: string
  expires_at: string
  created_at: string
}

// ─── Validación invitación ───────────────────────────
const invitationSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  role: z.enum([
    'admin',
    'operador',
    'gerente',
    'presidente',
    'secretaria',
    'tesorero',
    'socio',
  ]),
})

type InvitationForm = z.infer<typeof invitationSchema>

export function SuperAdminCompanyDetail() {
  const { id: companyId } = useParams<{ id: string }>()
  const { profile: currentUserProfile } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([])
  const [planUsage, setPlanUsage] = useState<CompanyPlanUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(true)

  // Control de Modales
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  // Cambiar Plan states
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [allPlans, setAllPlans] = useState<SuperAdminPlan[]>([])
  const [selectedNewPlanId, setSelectedNewPlanId] = useState('')
  const [planChangePreview, setPlanChangePreview] = useState<CompanyPlanChangePreview | null>(null)
  const [forcePlanChange, setForcePlanChange] = useState(false)
  const [isSavingPlanChange, setIsSavingPlanChange] = useState(false)

  // Control de Edición de Rol
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvitationForm>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      role: 'operador',
    },
  })

  const loadDetails = useCallback(async () => {
    if (!companyId) return
    setLoadingDetails(true)
    try {
      const [usersRes, invitesRes, planUsageRes] = await Promise.all([
        supabase.rpc('get_company_users', { p_company_id: companyId }),
        supabase.rpc('get_company_invitations', { p_company_id: companyId }),
        getCompanyPlanUsage(companyId),
      ])

      if (usersRes.error) throw usersRes.error
      if (invitesRes.error) throw invitesRes.error

      setUsers((usersRes.data as unknown as CompanyUser[]) || [])
      setInvitations((invitesRes.data as unknown as CompanyInvitation[]) || [])
      setPlanUsage(planUsageRes)
    } catch (err: any) {
      toast.error('Error al cargar detalles: ' + err.message)
    } finally {
      setLoadingDetails(false)
    }
  }, [companyId])

  useEffect(() => {
    async function loadCompany() {
      if (!companyId) return
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single()
        
        if (error) throw error
        setCompany(data)
      } catch (err: any) {
        toast.error('Error al cargar detalle de compañía: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    loadCompany()
    loadDetails()
  }, [companyId, loadDetails])

  const handleInviteSubmit = async (data: InvitationForm) => {
    if (!companyId) return
    try {
      const { data: token, error } = await supabase.rpc('create_pending_invitation', {
        p_company_id: companyId,
        p_email: data.email,
        p_first_name: data.first_name,
        p_last_name: data.last_name,
        p_role: data.role,
      })

      if (error) throw error

      if (token) {
        const link = `${window.location.origin}/register?invite=${token}`
        setInviteLink(link)
        setIsInviteOpen(false)
        setIsSuccessOpen(true)
        reset()
        loadDetails()
      } else {
        toast.success('Invitación creada con éxito')
        setIsInviteOpen(false)
        reset()
        loadDetails()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la invitación')
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { data: success, error } = await supabase.rpc('cancel_pending_invitation', {
        p_invitation_id: invitationId,
      })
      if (error) throw error
      if (success) {
        toast.success('Invitación cancelada con éxito')
        loadDetails()
      } else {
        toast.error('No se pudo cancelar la invitación')
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    }
  }

  const updateUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { data: success, error } = await supabase.rpc('update_company_user_status', {
        p_user_id: userId,
        p_is_active: !currentStatus,
      })
      if (error) throw error
      if (success) {
        toast.success('Estado de usuario actualizado')
        loadDetails()
      } else {
        toast.error('No se pudo actualizar el estado')
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    }
  }

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { data: success, error } = await supabase.rpc('update_company_user_role', {
        p_user_id: userId,
        p_role: newRole,
      })
      if (error) throw error
      if (success) {
        toast.success('Rol de usuario actualizado')
        setEditingUser(null)
        loadDetails()
      } else {
        toast.error('No se pudo actualizar el rol')
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    }
  }

  const handleOpenPlanChange = async () => {
    try {
      const data = await getSuperAdminPlans()
      setAllPlans(data)
      setSelectedNewPlanId('')
      setPlanChangePreview(null)
      setForcePlanChange(false)
      setIsPlanModalOpen(true)
    } catch (err: any) {
      toast.error('Error al cargar planes: ' + err.message)
    }
  }

  const handlePlanSelect = async (planId: string) => {
    setSelectedNewPlanId(planId)
    setForcePlanChange(false)
    if (!planId || !companyId) {
      setPlanChangePreview(null)
      return
    }

    const toastId = toast.loading('Calculando previsualización del cambio...')
    try {
      const preview = await previewCompanyPlanChange(companyId, planId)
      setPlanChangePreview(preview)
    } catch (err: any) {
      toast.error('Error al previsualizar cambio de plan: ' + err.message)
      setPlanChangePreview(null)
    } finally {
      toast.dismiss(toastId)
    }
  }

  const onSubmitPlanChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !selectedNewPlanId) return

    setIsSavingPlanChange(true)
    const toastId = toast.loading('Asignando nuevo plan...')
    try {
      await updateCompanyPlan(companyId, selectedNewPlanId, forcePlanChange)
      toast.success('Plan asignado correctamente.', { id: toastId })
      setIsPlanModalOpen(false)
      loadDetails()
    } catch (err: any) {
      let msg = err.message || 'Error al cambiar de plan'
      if (msg.includes('excede los límites') || msg.includes('cupo') || msg.includes('límite') || msg.includes('supera')) {
        msg = 'Cambio bloqueado: El uso actual de la cooperativa supera los límites del nuevo plan. Marca el checkbox de forzado si deseas continuar.'
      }
      toast.error(msg, { id: toastId })
    } finally {
      setIsSavingPlanChange(false)
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

  if (!company) {
    return <div className="text-center py-12 text-slate-500">Compañía no encontrada</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          to="/super-admin/companies"
          className="p-2 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{company.legal_name}</h1>
            <Badge variant={(company.status === 'activa' || company.status === 'activo') ? 'success' : 'danger'}>
              {company.status}
            </Badge>
          </div>
          <p className="text-slate-500">RUC: {company.ruc} {company.trade_name ? `• ${company.trade_name}` : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-400" />
            Datos Institucionales
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-slate-500">Correo Electrónico</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.email || 'No registrado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Teléfono</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.phone || 'No registrado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Dirección</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.address || 'No registrado'}</dd>
            </div>
          </dl>
        </Card>

        {/* Tarjeta de Uso de Plan */}
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-400" />
              Uso del Plan
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPlanChange}
              className="text-xs"
            >
              Cambiar plan
            </Button>
          </div>
          {planUsage ? (
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-slate-500">Plan Actual:</span>
                <span className="ml-2 font-bold text-slate-800 capitalize">{planUsage.plan_name}</span>
                <span className="ml-2">
                  <Badge variant={planUsage.plan_is_active ? 'success' : 'danger'}>
                    {planUsage.plan_is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </span>
              </div>

              {/* Barra de progreso de socios */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-600">Socios Activos</span>
                  <span className="font-semibold text-slate-700">
                    {planUsage.current_members} / {planUsage.max_members || '∞'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      planUsage.is_members_limit_reached ? 'bg-red-500' : planUsage.is_near_members_limit ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, planUsage.members_usage_percent)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{planUsage.members_usage_percent}% usado</span>
                  {planUsage.is_members_limit_reached && <span className="text-red-500 font-semibold">Límite alcanzado</span>}
                </div>
              </div>

              {/* Barra de progreso de unidades */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-600">Unidades Activas / Mantenimiento</span>
                  <span className="font-semibold text-slate-700">
                    {planUsage.current_vehicles} / {planUsage.max_vehicles || '∞'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      planUsage.is_vehicles_limit_reached ? 'bg-red-500' : planUsage.is_near_vehicles_limit ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, planUsage.vehicles_usage_percent)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{planUsage.vehicles_usage_percent}% usado</span>
                  {planUsage.is_vehicles_limit_reached && <span className="text-red-500 font-semibold">Límite alcanzado</span>}
                </div>
              </div>

              {/* Alert de límites */}
              {(planUsage.is_members_limit_reached || planUsage.is_vehicles_limit_reached) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 space-y-1">
                  {planUsage.is_members_limit_reached && (
                    <p className="font-medium">⚠️ El límite de socios activos ha sido alcanzado.</p>
                  )}
                  {planUsage.is_vehicles_limit_reached && (
                    <p className="font-medium">⚠️ El límite de unidades activas/mantenimiento ha sido alcanzado.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-400">Cargando información del plan...</div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            Directiva Registrada
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-slate-500">Presidente</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.president_name || 'No registrado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Gerente</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.manager_name || 'No registrado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Secretaria</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.secretary_name || 'No registrado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Tesorero</dt>
              <dd className="mt-1 text-sm text-slate-900">{company.treasurer_name || 'No registrado'}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* ── Sección de Usuarios e Invitaciones ── */}
      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-500" />
              Usuarios e Invitaciones
            </h2>
            <p className="text-xs text-slate-500 mt-1">Gestión de acceso de personal a esta cooperativa</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Invitar usuario
          </Button>
        </div>

        {loadingDetails ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Lista de Usuarios Activos */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Personal Activo / Registrado ({users.length})
              </h3>
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-150">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Nombre</th>
                      <th className="px-4 py-2.5 font-medium">Email</th>
                      <th className="px-4 py-2.5 font-medium">Rol</th>
                      <th className="px-4 py-2.5 font-medium text-center">Estado</th>
                      <th className="px-4 py-2.5 font-medium">Creado el</th>
                      <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const isSelf = currentUserProfile?.id === u.id
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {u.first_name} {u.last_name} {isSelf && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold ml-1">Tú</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{u.email}</td>
                          <td className="px-4 py-3 capitalize text-slate-800">{u.role}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={u.is_active ? 'success' : 'danger'}>
                              {u.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setEditingUser(u)}
                                disabled={isSelf}
                                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Cambiar Rol"
                              >
                                <UserCog className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => updateUserStatus(u.id, u.is_active)}
                                disabled={isSelf}
                                className={`p-1.5 rounded disabled:opacity-30 disabled:cursor-not-allowed ${
                                  u.is_active ? 'text-danger-500 hover:bg-danger-50' : 'text-success-600 hover:bg-success-50'
                                }`}
                                title={u.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                              >
                                {u.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                          No hay usuarios registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lista de Invitaciones Pendientes */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Invitaciones Pendientes ({invitations.length})
              </h3>
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-150">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Invitado</th>
                      <th className="px-4 py-2.5 font-medium">Email</th>
                      <th className="px-4 py-2.5 font-medium">Rol</th>
                      <th className="px-4 py-2.5 font-medium text-center">Estado</th>
                      <th className="px-4 py-2.5 font-medium">Expira</th>
                      <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invitations.map((i) => (
                      <tr key={i.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {i.first_name} {i.last_name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{i.email}</td>
                        <td className="px-4 py-3 capitalize text-slate-800">{i.role}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={i.status === 'pending' ? 'warning' : 'danger'}>
                            {i.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{i.expires_at ? new Date(i.expires_at).toLocaleString() : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {i.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelInvitation(i.id)}
                              className="text-danger-600 border-danger-200 hover:bg-danger-50 px-2 py-1 h-auto"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {invitations.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                          No hay invitaciones pendientes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-amber-650 bg-amber-50 p-4 rounded-md border border-amber-100">
          <ShieldAlert className="h-5 w-5" />
          <p className="text-xs leading-relaxed font-medium">
            El sistema de invitaciones asegura que los usuarios configuren sus propias contraseñas mediante enlaces de registro seguro. Nunca comparta accesos globales.
          </p>
        </div>
      </Card>

      {/* ── Modal de Invitar Usuario ── */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => { if (!isSubmitting) setIsInviteOpen(false) }}
        title="Invitar Personal de Compañía"
        size="md"
      >
        <form onSubmit={handleSubmit(handleInviteSubmit)} className="space-y-4">
          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="colaborador@coop.com"
            required
            error={errors.email?.message}
            {...register('email')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              type="text"
              placeholder="Carlos"
              required
              error={errors.first_name?.message}
              {...register('first_name')}
            />
            <Input
              label="Apellido"
              type="text"
              placeholder="Solano"
              required
              error={errors.last_name?.message}
              {...register('last_name')}
            />
          </div>
          <Select
            label="Rol Asignado"
            required
            error={errors.role?.message}
            options={[
              { value: 'admin', label: 'Administrador (Admin)' },
              { value: 'operador', label: 'Operador' },
              { value: 'gerente', label: 'Gerente' },
              { value: 'presidente', label: 'Presidente' },
              { value: 'secretaria', label: 'Secretaria' },
              { value: 'tesorero', label: 'Tesorero' },
              { value: 'socio', label: 'Socio' }
            ]}
            {...register('role')}
          />

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsInviteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Generar Invitación
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal de Éxito de Invitación ── */}
      <Modal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        title="Invitación creada con éxito"
        size="md"
      >
        <div className="space-y-6 py-2">
          <p className="text-sm text-slate-600 leading-relaxed">
            Se ha registrado la invitación en estado pendiente. Comparte el siguiente enlace con el usuario invitado:
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

          <p className="text-xs text-red-650 font-semibold leading-relaxed">
            Importante: Por razones de seguridad, este enlace es de un solo uso y expirará automáticamente.
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

      {/* ── Modal de Edición de Rol ── */}
      {editingUser && (
        <Modal
          isOpen={true}
          onClose={() => setEditingUser(null)}
          title={`Modificar Rol de ${editingUser.first_name} ${editingUser.last_name}`}
          size="sm"
        >
          <div className="space-y-4">
            <Select
              label="Nuevo Rol"
              defaultValue={editingUser.role}
              id="new-role-select"
              options={[
                { value: 'admin', label: 'Administrador (Admin)' },
                { value: 'operador', label: 'Operador' },
                { value: 'gerente', label: 'Gerente' },
                { value: 'presidente', label: 'Presidente' },
                { value: 'secretaria', label: 'Secretaria' },
                { value: 'tesorero', label: 'Tesorero' },
                { value: 'socio', label: 'Socio' }
              ]}
            />
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  const selectEl = document.getElementById('new-role-select') as HTMLSelectElement
                  if (selectEl) {
                    updateUserRole(editingUser.id, selectEl.value as UserRole)
                  }
                }}
              >
                Actualizar Rol
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal de Cambiar Plan ── */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title="Cambiar Plan de Suscripción de Compañía"
        size="md"
      >
        <form onSubmit={onSubmitPlanChange} className="space-y-4 py-2">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">
              Seleccionar Nuevo Plan
            </label>
            <select
              value={selectedNewPlanId}
              onChange={(e) => handlePlanSelect(e.target.value)}
              className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              required
            >
              <option value="">Selecciona un plan activo...</option>
              {allPlans.map((p) => (
                <option 
                  key={p.id} 
                  value={p.id}
                  disabled={!p.is_active || p.id === planUsage?.plan_id}
                >
                  {p.name.toUpperCase()} - ${p.price_monthly}/mes {!p.is_active ? '(Inactivo)' : p.id === planUsage?.plan_id ? '(Actual)' : ''}
                </option>
              ))}
            </select>
          </div>

          {planChangePreview && (
            <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Previsualización de Límites
              </h4>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Plan Destino:</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {planChangePreview.new_plan_name}
                  </span>
                  <div className="mt-0.5">
                    <Badge variant={planChangePreview.new_plan_is_active ? 'success' : 'danger'}>
                      {planChangePreview.new_plan_is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block">Viabilidad:</span>
                  <span className={`font-bold ${planChangePreview.can_change ? 'text-green-600' : 'text-red-600'}`}>
                    {planChangePreview.can_change ? 'Permitido' : 'Excede límites'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Socios Activos:</span>
                  <span className={`font-medium ${planChangePreview.exceeds_members ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
                    {planChangePreview.current_members} / {planChangePreview.new_max_members}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-600">Unidades:</span>
                  <span className={`font-medium ${planChangePreview.exceeds_vehicles ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
                    {planChangePreview.current_vehicles} / {planChangePreview.new_max_vehicles}
                  </span>
                </div>
              </div>

              {planChangePreview.warning_message && (
                <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded leading-relaxed">
                  ⚠️ {planChangePreview.warning_message}
                </div>
              )}

              {!planChangePreview.can_change && (
                <div className="flex items-start gap-2 pt-2 border-t border-slate-200">
                  <input
                    type="checkbox"
                    id="force_plan_change"
                    checked={forcePlanChange}
                    onChange={(e) => setForcePlanChange(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <label htmlFor="force_plan_change" className="text-xs font-semibold text-red-800 cursor-pointer">
                    Entiendo que esta compañía excede los límites del nuevo plan y deseo forzar el cambio.
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPlanModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={planChangePreview && !planChangePreview.can_change ? 'danger' : 'primary'}
              disabled={!!(isSavingPlanChange || (planChangePreview && !planChangePreview.can_change && !forcePlanChange))}
            >
              Confirmar Cambio
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
