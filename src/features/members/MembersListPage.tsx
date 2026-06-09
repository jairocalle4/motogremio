import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useMembers, type MemberInsert } from '@/hooks/useMembers'
import { usePermissions } from '@/hooks/usePermissions'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { MemberFormModal, type MemberFormData } from './MemberFormModal'
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Plus,
  Eye,
  Edit2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react'
import type { Member, MemberStatus } from '@/types'

export function MembersListPage() {
  const navigate = useNavigate()
  const { canManageMembers } = usePermissions()
  const { members, loading, error, fetchMembers, createMember, updateMember } = useMembers()

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // ── Modal Formulario ─────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  // Borrador en memoria para formulario de creación
  const memberDraftRef = useRef<Partial<import('./MemberFormModal').MemberFormData> | null>(null)

  // ── Modal Confirmación ───────────────────────────────────────────────────────
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    member: Member | null
    nextStatus: MemberStatus
    loading: boolean
  }>({ open: false, member: null, nextStatus: 'inactivo', loading: false })

  // ── Carga inicial ────────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    fetchMembers({
      search: searchTerm || undefined,
      status: (statusFilter as MemberStatus) || undefined,
    })
  }, [fetchMembers, searchTerm, statusFilter])

  useEffect(() => {
    fetchMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    fetchMembers({
      search: searchTerm || undefined,
      status: (statusFilter as MemberStatus) || undefined,
    })
  }

  // ── Crear / Editar ───────────────────────────────────────────────────────────
  const handleFormSubmit = async (data: MemberFormData) => {
    const toastId = toast.loading('Guardando socio...')
    try {
      // Limpiar strings vacíos → null para la BD
      const clean = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      )

      if (selectedMember) {
        const { error: err } = await updateMember(selectedMember.id, clean)
        if (err) throw new Error(err)
        toast.success('Socio actualizado exitosamente.', { id: toastId })
      } else {
        const { error: err } = await createMember(clean as MemberInsert)
        if (err) throw new Error(err)
        toast.success('Socio registrado exitosamente.', { id: toastId })
      }

      setIsFormOpen(false)
      setSelectedMember(null)
      refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el socio.'
      toast.error(msg, { id: toastId })
      // No cerramos el modal → el usuario ve el error y corrige
    }
  }

  // ── Activar / Desactivar ─────────────────────────────────────────────────────
  const openConfirm = (member: Member) => {
    const nextStatus: MemberStatus = member.status === 'activo' ? 'inactivo' : 'activo'
    setConfirmState({ open: true, member, nextStatus, loading: false })
  }

  const handleConfirmToggle = async () => {
    const { member, nextStatus } = confirmState
    if (!member) return

    setConfirmState((s) => ({ ...s, loading: true }))
    const toastId = toast.loading('Actualizando estado...')
    try {
      const { error: err } = await updateMember(member.id, { status: nextStatus })
      if (err) throw new Error(err)

      toast.success(
        nextStatus === 'inactivo'
          ? 'Socio desactivado. Su historial se conserva íntegro.'
          : 'Socio activado correctamente.',
        { id: toastId }
      )
      setConfirmState({ open: false, member: null, nextStatus: 'inactivo', loading: false })
      refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar el estado.'
      toast.error(msg, { id: toastId })
      setConfirmState((s) => ({ ...s, loading: false }))
    }
  }

  // ── Métricas ─────────────────────────────────────────────────────────────────
  const totalCount    = members.length
  const activeCount   = members.filter((m) => m.status === 'activo').length
  const inactiveCount = members.filter((m) => m.status !== 'activo').length

  const statusColors: Record<MemberStatus, 'success' | 'danger' | 'warning'> = {
    activo:     'success',
    inactivo:   'danger',
    suspendido: 'warning',
  }

  // ── Etiquetas para el ConfirmModal ───────────────────────────────────────────
  const confirmMember  = confirmState.member
  const confirmIsDeact = confirmState.nextStatus === 'inactivo'
  const confirmTitle   = confirmIsDeact ? 'Desactivar socio' : 'Activar socio'
  const confirmMessage = confirmIsDeact
    ? `¿Estás seguro de que deseas desactivar a ${confirmMember?.first_name} ${confirmMember?.last_name}?`
    : `¿Estás seguro de que deseas activar a ${confirmMember?.first_name} ${confirmMember?.last_name}?`
  const confirmDetail = confirmIsDeact
    ? 'El socio pasará a estado inactivo. Su historial de pagos, sanciones y documentos se conservará sin ningún cambio.'
    : 'El socio volverá a estado activo y podrá operar normalmente dentro de la cooperativa.'

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Socios</h1>
          <p className="text-gray-500 mt-1">
            Administra los socios de tu cooperativa, información de contacto y estado de vigencia.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => toast('Función de exportación próximamente disponible.', { icon: '📊' })}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar
          </Button>
          {canManageMembers && (
            <Button
              className="flex items-center gap-2"
              onClick={() => { setSelectedMember(null); setIsFormOpen(true) }}
            >
              <Plus className="w-4 h-4" />
              Nuevo Socio
            </Button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="p-3 bg-primary-50 rounded-xl">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Socios</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="p-3 bg-green-50 rounded-xl">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Socios Activos</p>
              <h3 className="text-2xl font-bold text-gray-900">{activeCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="p-3 bg-red-50 rounded-xl">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Inactivos / Suspendidos</p>
              <h3 className="text-2xl font-bold text-gray-900">{inactiveCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por cédula, nombres o apellidos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="w-full md:w-48">
            <Select
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'activo', label: 'Activos' },
                { value: 'inactivo', label: 'Inactivos' },
                { value: 'suspendido', label: 'Suspendidos' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>

          <Button onClick={handleSearch} variant="secondary" className="w-full md:w-auto">
            Filtrar
          </Button>
        </CardContent>
      </Card>

      {/* ── Tabla Principal ──────────────────────────────────────────────────── */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
              <p className="text-gray-500 mt-4 text-sm">Cargando listado de socios...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">
              <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
              <p className="font-semibold">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => fetchMembers()}>
                Reintentar
              </Button>
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-700 font-semibold mb-1">No se encontraron socios</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                No existen registros que coincidan con la búsqueda, o la cooperativa aún no tiene socios registrados.
              </p>
              {canManageMembers && (
                <Button
                  className="mt-4 flex items-center gap-2 mx-auto"
                  onClick={() => { setSelectedMember(null); setIsFormOpen(true) }}
                >
                  <Plus className="w-4 h-4" />
                  Registrar Primer Socio
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-semibold border-b">
                <tr>
                  <th className="px-6 py-4">Socio / Cédula</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Fecha Ingreso</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {member.last_name}, {member.first_name}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">C.I: {member.document_id}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div>{member.phone || '—'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{member.email || 'Sin correo'}</div>
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {member.admission_date
                        ? new Date(member.admission_date + 'T00:00:00').toLocaleDateString('es-EC', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant={statusColors[member.status || 'activo']}>
                        {member.status === 'activo'
                          ? 'Activo'
                          : member.status === 'inactivo'
                          ? 'Inactivo'
                          : 'Suspendido'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Ver ficha */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="p-1.5"
                          title="Ver Ficha Detallada"
                          onClick={() => navigate(`/socios/${member.id}`)}
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </Button>

                        {canManageMembers && (
                          <>
                            {/* Editar */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="p-1.5"
                              title="Editar Socio"
                              onClick={() => { setSelectedMember(member); setIsFormOpen(true) }}
                            >
                              <Edit2 className="w-4 h-4 text-primary-500" />
                            </Button>

                            {/* Activar / Desactivar — usa ConfirmModal, nunca window.confirm */}
                            <Button
                              variant={member.status === 'activo' ? 'outline' : 'secondary'}
                              size="sm"
                              className="px-2.5 py-1 text-xs"
                              title={member.status === 'activo' ? 'Desactivar Socio' : 'Activar Socio'}
                              onClick={() => openConfirm(member)}
                            >
                              {member.status === 'activo' ? 'Desactivar' : 'Activar'}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* ── Modal Formulario ─────────────────────────────────────────────────── */}
      <MemberFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setSelectedMember(null) }}
        onSubmit={handleFormSubmit}
        member={selectedMember}
        draft={!selectedMember ? memberDraftRef.current : null}
        onDraftChange={(d) => { memberDraftRef.current = d }}
      />

      {/* ── Modal Confirmación Activar/Desactivar ────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, member: null, nextStatus: 'inactivo', loading: false })}
        onConfirm={handleConfirmToggle}
        title={confirmTitle}
        message={confirmMessage}
        detail={confirmDetail}
        confirmLabel={confirmIsDeact ? 'Sí, desactivar' : 'Sí, activar'}
        variant={confirmIsDeact ? 'warning' : 'success'}
        loading={confirmState.loading}
      />
    </div>
  )
}
