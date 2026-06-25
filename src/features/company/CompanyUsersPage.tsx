import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Users, Plus, Mail, Copy, Check, Trash2, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import type { Database } from '@/types/database.types'
import { ROLE_LABELS } from '@/lib/constants'

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
// Admin de compañía solo puede invitar a secretaria y socio
const adminInvitationSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  role: z.enum(['secretaria']),
})

// Super admin puede invitar también admin (si acceden a esta página)
const superAdminInvitationSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  role: z.enum(['admin', 'secretaria']),
})

type InvitationForm = z.infer<typeof superAdminInvitationSchema>

export function CompanyUsersPage() {
  const { profile } = useAuth()
  const companyId = profile?.company_id

  const [users, setUsers] = useState<CompanyUser[]>([])
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([])
  const [loading, setLoading] = useState(true)

  // Control de Modales
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const isSuperAdmin = profile?.role === 'super_admin'
  const activeSchema = isSuperAdmin ? superAdminInvitationSchema : adminInvitationSchema

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvitationForm>({
    resolver: zodResolver(activeSchema as z.ZodTypeAny),
    defaultValues: {
      role: 'secretaria',
    },
  })

  const loadData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const [usersRes, invitesRes] = await Promise.all([
        supabase.rpc('get_company_users', { p_company_id: companyId }),
        supabase.rpc('get_company_invitations', { p_company_id: companyId })
      ])

      if (usersRes.error) throw usersRes.error
      if (invitesRes.error) throw invitesRes.error

      setUsers((usersRes.data as unknown as CompanyUser[]) || [])
      setInvitations((invitesRes.data as unknown as CompanyInvitation[]) || [])
    } catch (err: any) {
      toast.error('Error al cargar datos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    loadData()
  }, [loadData])

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
        loadData()
      } else {
        toast.success('Invitación creada con éxito')
        setIsInviteOpen(false)
        reset()
        loadData()
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
        loadData()
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
        loadData()
      } else {
        toast.error('No se pudo actualizar el estado')
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

  const roleOptions = [
    ...(isSuperAdmin ? [{ value: 'admin', label: ROLE_LABELS['admin'] }] : []),
    { value: 'secretaria', label: ROLE_LABELS['secretaria'] },
  ]

  return (
    <div className="space-y-6 page-container">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios de la compañía</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona el acceso del equipo interno de tu compañía.</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-500" />
              Gestión de Equipo
            </h2>
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

        <div className="space-y-8">
          {/* Lista de Usuarios Activos */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              Personal Registrado ({users.length})
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
                    const isSelf = profile?.id === u.id
                    const canEdit = !isSelf && u.role !== 'super_admin' && (isSuperAdmin || (u.role !== 'admin' && profile?.role === 'admin'))

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {u.first_name} {u.last_name} {isSelf && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold ml-1">Tú</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3 text-slate-800">{ROLE_LABELS[u.role] || u.role}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={u.is_active ? 'success' : 'danger'}>
                            {u.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => updateUserStatus(u.id, u.is_active)}
                              disabled={!canEdit}
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
                    <th className="px-4 py-2.5 font-medium">Rol Asignado</th>
                    <th className="px-4 py-2.5 font-medium text-center">Estado</th>
                    <th className="px-4 py-2.5 font-medium">Expira</th>
                    <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {inv.first_name} {inv.last_name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{inv.email}</td>
                      <td className="px-4 py-3 text-slate-800">{ROLE_LABELS[inv.role] || inv.role}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            inv.status === 'pending' ? 'warning' :
                            inv.status === 'accepted' ? 'success' :
                            'danger'
                          }
                        >
                          {inv.status === 'pending' ? 'Pendiente' :
                           inv.status === 'accepted' ? 'Aceptada' :
                           inv.status === 'expired' ? 'Expirada' :
                           'Cancelada'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.status === 'pending' ? (
                          <button
                            onClick={() => {
                              if (window.confirm('¿Seguro que deseas cancelar esta invitación?')) {
                                cancelInvitation(inv.id)
                              }
                            }}
                            className="p-1.5 text-danger-500 hover:bg-danger-50 rounded"
                            title="Cancelar invitación"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invitations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        No hay invitaciones registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Modal de Invitación ── */}
      <Modal isOpen={isInviteOpen} onClose={() => { setIsInviteOpen(false); reset() }} title="Invitar Nuevo Usuario">
        <form onSubmit={handleSubmit(handleInviteSubmit as any)} className="space-y-4">
          <p className="text-sm text-slate-500">
            Se generará un enlace único para que el usuario complete su registro. El rol determinará sus permisos.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <Input {...register('first_name')} placeholder="Ej. Juan" />
              {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
              <Input {...register('last_name')} placeholder="Ej. Pérez" />
              {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
            <Input {...register('email')} type="email" placeholder="juan@ejemplo.com" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Select 
              label="Rol a asignar"
              {...register('role')} 
              options={roleOptions} 
            />
            {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => { setIsInviteOpen(false); reset() }}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Generando...' : 'Generar Invitación'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal de Éxito de Invitación ── */}
      <Modal isOpen={isSuccessOpen} onClose={() => setIsSuccessOpen(false)} title="Invitación Creada">
        <div className="space-y-4">
          <div className="bg-success-50 p-4 rounded-lg flex items-start gap-3 border border-success-100">
            <div className="bg-success-100 p-2 rounded-full">
              <Check className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-success-800">¡Enlace de invitación generado!</h4>
              <p className="text-xs text-success-700 mt-1">Copia el siguiente enlace y compártelo con el usuario para que complete su registro.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Input value={inviteLink} readOnly className="font-mono text-xs" />
            <Button variant="outline" onClick={copyToClipboard} title="Copiar enlace">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="pt-4 flex justify-end">
            <Button variant="primary" onClick={() => setIsSuccessOpen(false)}>
              Entendido
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
