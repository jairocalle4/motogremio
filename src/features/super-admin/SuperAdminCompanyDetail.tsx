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
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(true)

  // Control de Modales
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

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
      const [usersRes, invitesRes] = await Promise.all([
        supabase.rpc('get_company_users', { p_company_id: companyId }),
        supabase.rpc('get_company_invitations', { p_company_id: companyId }),
      ])

      if (usersRes.error) throw usersRes.error
      if (invitesRes.error) throw invitesRes.error

      setUsers((usersRes.data as unknown as CompanyUser[]) || [])
      setInvitations((invitesRes.data as unknown as CompanyInvitation[]) || [])
    } catch (err: any) {
      toast.error('Error al cargar usuarios/invitaciones: ' + err.message)
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
    </div>
  )
}
