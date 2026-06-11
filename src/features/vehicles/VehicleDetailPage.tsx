import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useVehicles } from '@/hooks/useVehicles'
import { useMembers } from '@/hooks/useMembers'
import { useDrivers, getA1License } from '@/hooks/useDrivers'
import { usePermissions } from '@/hooks/usePermissions'
import { usePayments } from '@/hooks/usePayments'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { LicenseBadge } from '@/components/ui/LicenseBadge'
import { VehicleFormModal, type VehicleFormData } from './VehicleFormModal'
import { AssignDriverModal } from './AssignDriverModal'
import {
  ArrowLeft,
  Bike,
  User,
  UserCheck,
  Wrench,
  FileText,
  DollarSign,
  Edit2,
  ShieldAlert,
  Hash,
  Palette,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import type { VehicleStatus, VehicleDriverAssignment } from '@/types'
import { DocumentsList } from '@/features/documents/DocumentsList'

// ─── Subcomponente: cuotas de la unidad ───────────────────────────
function VehicleChargesSection({ vehicleId }: { vehicleId: string }) {
  const { fetchCharges, charges } = usePayments()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchCharges({ vehicleId }).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId])

  const MONTHS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  if (loading) {
    return (
      <div className="space-y-2">
        {[1,2].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (charges.length === 0) {
    return (
      <div className="flex items-center gap-3 py-5 px-4 bg-green-50 rounded-xl">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-700">Sin cuotas registradas</p>
          <p className="text-xs text-green-600">No hay cuotas generadas para esta unidad.</p>
        </div>
      </div>
    )
  }

  const pendingBalance = charges
    .filter(c => c.status === 'pendiente' || c.status === 'parcial')
    .reduce((s, c) => s + Number(c.balance), 0)

  return (
    <div className="space-y-2">
      {charges.slice(0, 8).map(charge => (
        <div key={charge.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{charge.description}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {charge.period_month && charge.period_year
                ? `${MONTHS[charge.period_month]} ${charge.period_year}`
                : `Vence: ${new Date(charge.due_date + 'T00:00:00').toLocaleDateString('es-EC')}`}
            </p>
          </div>
          <div className="text-right ml-3 shrink-0">
            <p className={`text-sm font-bold ${
              charge.status === 'pagada' ? 'text-green-600'
              : charge.status === 'anulada' ? 'text-gray-400'
              : 'text-red-600'
            }`}>
              ${Number(charge.balance).toFixed(2)}
            </p>
            <Badge variant={
              charge.status === 'pagada' ? 'success'
              : charge.status === 'parcial' ? 'warning'
              : charge.status === 'anulada' ? 'default'
              : 'danger'
            } size="sm">
              {charge.status === 'pagada' ? 'Pagada'
              : charge.status === 'parcial' ? 'Parcial'
              : charge.status === 'anulada' ? 'Anulada'
              : 'Pendiente'}
            </Badge>
          </div>
        </div>
      ))}
      {pendingBalance > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-600">Saldo pendiente</span>
          <span className="text-sm font-bold text-red-600">${pendingBalance.toFixed(2)}</span>
        </div>
      )}
      <div className="text-center pt-1">
        <Link to="/pagos" className="text-xs text-primary-600 hover:underline font-medium">
          Ver en módulo de Pagos →
        </Link>
      </div>
    </div>
  )
}

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canManageVehicles } = usePermissions()
  const { currentVehicle, loading, error, fetchVehicleById, updateVehicle, fetchVehicleDriverHistory } = useVehicles()
  const { members, fetchMembers } = useMembers()
  const { fetchDrivers, drivers } = useDrivers()

  // Historial de conductores
  const [driverHistory, setDriverHistory] = useState<VehicleDriverAssignment[]>([])

  // ── Modal edición ────────────────────────────────────────────────────────────
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  // ── Modal Asignación de Conductor ──────────────────────────────────────────────
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false)
  const [assignDriverLoading, setAssignDriverLoading] = useState(false)

  // Confirmación quitar conductor
  const [isRemoveDriverConfirmOpen, setIsRemoveDriverConfirmOpen] = useState(false)

  // ── Modal cambio de estado ───────────────────────────────────────────────────
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    nextStatus: VehicleStatus
    loading: boolean
  }>({ open: false, nextStatus: 'inactiva', loading: false })

  const loadDriverHistory = useCallback(async () => {
    if (id) {
      const history = await fetchVehicleDriverHistory(id)
      setDriverHistory(history)
    }
  }, [id, fetchVehicleDriverHistory])

  useEffect(() => {
    if (id) {
      fetchVehicleById(id)
      fetchMembers()
      fetchDrivers()
      loadDriverHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ── Editar ───────────────────────────────────────────────────────────────────
  const processEditSubmit = async (data: VehicleFormData) => {
    if (!id) return
    setEditLoading(true)
    const toastId = toast.loading('Guardando cambios...')
    try {
      const clean: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(data)) {
        if (v === '' || v === undefined) clean[k] = null
        else if (k === 'year' && typeof v === 'string') clean[k] = parseInt(v, 10)
        else clean[k] = v
      }

      const { error: err } = await updateVehicle(id, clean)
      if (err) throw new Error(err)
      toast.success('Unidad actualizada.', { id: toastId })
      setIsEditOpen(false)
      fetchVehicleById(id)
      loadDriverHistory()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar.', { id: toastId })
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditSubmit = async (data: VehicleFormData) => {
    await processEditSubmit(data)
  }

  // ── Asignar / Quitar Conductor Acción Rápida ───────────────────────────────
  const handleAssignDriverSubmit = async (driverId: string) => {
    if (!id) return
    setAssignDriverLoading(true)
    const toastId = toast.loading('Asignando conductor...')
    try {
      const { error: err } = await updateVehicle(
        id, 
        { driver_id: driverId || null },
        { changeReason: 'Asignación rápida de conductor' }
      )
      if (err) throw new Error(err)
      toast.success('Conductor asignado exitosamente.', { id: toastId })
      setIsAssignDriverOpen(false)
      fetchVehicleById(id)
      loadDriverHistory()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar conductor.', { id: toastId })
    } finally {
      setAssignDriverLoading(false)
    }
  }

  const handleRemoveDriver = async () => {
    if (!id) return
    const toastId = toast.loading('Quitando conductor...')
    try {
      const { error: err } = await updateVehicle(
        id, 
        { driver_id: null },
        { changeReason: 'Conductor desasignado por administración' }
      )
      if (err) throw new Error(err)
      toast.success('Conductor retirado de la unidad.', { id: toastId })
      setIsRemoveDriverConfirmOpen(false)
      fetchVehicleById(id)
      loadDriverHistory()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al retirar conductor.', { id: toastId })
    }
  }

  // ── Cambiar estado ───────────────────────────────────────────────────────────
  const openStatusConfirm = () => {
    const nextStatus: VehicleStatus =
      currentVehicle?.status === 'activa' ? 'inactiva' : 'activa'
    setConfirmState({ open: true, nextStatus, loading: false })
  }

  const handleStatusChange = async () => {
    if (!id || !currentVehicle) return
    setConfirmState((s) => ({ ...s, loading: true }))
    const toastId = toast.loading('Actualizando estado...')
    try {
      const { error: err } = await updateVehicle(id, { status: confirmState.nextStatus })
      if (err) throw new Error(err)
      toast.success(
        confirmState.nextStatus === 'inactiva'
          ? 'Unidad desactivada correctamente.'
          : 'Unidad activada correctamente.',
        { id: toastId }
      )
      setConfirmState({ open: false, nextStatus: 'inactiva', loading: false })
      fetchVehicleById(id)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar estado.', { id: toastId })
      setConfirmState((s) => ({ ...s, loading: false }))
    }
  }

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading && !currentVehicle) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        <p className="text-gray-500 ml-3 text-sm">Cargando ficha de la unidad...</p>
      </div>
    )
  }

  if (error || !currentVehicle) {
    return (
      <div className="text-center p-12 max-w-md mx-auto">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-gray-800 font-semibold mb-1">Error al cargar unidad</h3>
        <p className="text-gray-500 text-sm mb-4">
          {error || 'No se encontró la unidad o no tienes permisos para verla.'}
        </p>
        <Button onClick={() => navigate('/unidades')} variant="outline">
          Volver al listado
        </Button>
      </div>
    )
  }

  const statusVariant = (s: VehicleStatus) => {
    if (s === 'activa') return 'success'
    if (s === 'mantenimiento') return 'warning'
    return 'danger'
  }

  const statusLabel = (s: VehicleStatus) => {
    if (s === 'activa') return 'Activa'
    if (s === 'mantenimiento') return 'En mantenimiento'
    return 'Inactiva'
  }

  const isDeact = currentVehicle.status !== 'inactiva'

  return (
    <div className="space-y-6 pb-12">
      {/* ── Breadcrumb / Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate('/unidades')}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver al listado de unidades
        </button>

        {canManageVehicles && (
          <div className="flex items-center gap-3">
            <Button
              variant={isDeact ? 'outline' : 'secondary'}
              onClick={openStatusConfirm}
              className="text-sm"
            >
              {isDeact ? 'Desactivar unidad' : 'Activar unidad'}
            </Button>
            <Button
              className="flex items-center gap-2 text-sm"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </Button>
          </div>
        )}
      </div>

      {/* ── Hero Card ────────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-amber-400 to-orange-500" />
        <CardContent className="p-6 -mt-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-white shadow border-2 border-amber-100 flex items-center justify-center">
                <Bike className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Disco # {currentVehicle.disk_number}
                </h1>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    {currentVehicle.plate}
                  </span>
                  <Badge variant={statusVariant(currentVehicle.status || 'inactiva')}>
                    {statusLabel(currentVehicle.status || 'inactiva')}
                  </Badge>
                  {currentVehicle.brand && currentVehicle.model && (
                    <span className="text-sm text-gray-500">
                      {currentVehicle.brand} {currentVehicle.model}
                      {currentVehicle.year ? ` (${currentVehicle.year})` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Grid principal ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Col izquierda */}
        <div className="lg:col-span-1 space-y-6">

          {/* Datos técnicos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                Datos Técnicos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Marca', value: currentVehicle.brand },
                { label: 'Modelo', value: currentVehicle.model },
                { label: 'Año', value: currentVehicle.year?.toString() },
                { label: 'Color', value: currentVehicle.color },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-400 uppercase">{label}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{value || '—'}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Identificadores legales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="w-4 h-4 text-amber-500" />
                Identificadores Legales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Número de Motor</p>
                <p className="text-sm font-mono text-gray-800 mt-0.5">
                  {currentVehicle.motor_number || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Número de Chasis</p>
                <p className="text-sm font-mono text-gray-800 mt-0.5">
                  {currentVehicle.chassis_number || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  Color
                </p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  {currentVehicle.color || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Registrado
                </p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  {currentVehicle.created_at
                    ? new Date(currentVehicle.created_at).toLocaleDateString('es-EC', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Col derecha */}
        <div className="lg:col-span-2 space-y-6">

          {/* Propietario */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-amber-500" />
                Socio Propietario
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentVehicle.member ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {currentVehicle.member.last_name}, {currentVehicle.member.first_name}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      C.I: {currentVehicle.member.document_id}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/socios/${currentVehicle.member_id}`)}
                  >
                    Ver ficha del socio
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Sin propietario registrado.</p>
              )}
            </CardContent>
          </Card>

          {/* Conductor Asignado — Real */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-500" />
                Conductor Asignado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-8 bg-gray-150 rounded w-full" />
                </div>
              ) : currentVehicle.driver ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary-700">
                          {currentVehicle.driver.first_name[0]}{currentVehicle.driver.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 leading-tight">
                          {currentVehicle.driver.first_name} {currentVehicle.driver.last_name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">{currentVehicle.driver.document_id}</p>
                        {currentVehicle.driver.phone && (
                          <p className="text-xs text-gray-500 mt-0.5">Tel: {currentVehicle.driver.phone}</p>
                        )}
                        <div className="mt-1.5">
                          <LicenseBadge
                            expiryDate={getA1License(currentVehicle.driver.licenses || [])?.expiry_date}
                            licenseNumber={getA1License(currentVehicle.driver.licenses || [])?.license_number}
                            compact
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/conductores/${currentVehicle.driver!.id}`)}
                    >
                      Ver ficha
                    </Button>
                  </div>

                  {/* Advertencia si falta licencia A1 */}
                  {!getA1License(currentVehicle.driver.licenses || []) && (
                    <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                      <div className="flex-1">
                        <p className="font-semibold">⚠️ Licencia A1 pendiente</p>
                        <p className="text-amber-700 mt-0.5">El conductor no tiene una licencia A1 registrada en su ficha.</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white hover:bg-amber-100 text-amber-800 border-amber-300 text-xs shrink-0 py-1 px-2.5 h-auto"
                        onClick={() => navigate(`/conductores/${currentVehicle.driver!.id}`)}
                      >
                        Completar licencia
                      </Button>
                    </div>
                  )}

                  {/* Acciones rápidas cuando hay conductor */}
                  {canManageVehicles && (
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <Button
                        variant="outline"
                        size="xs"
                        className="w-1/2 text-xs"
                        onClick={() => setIsAssignDriverOpen(true)}
                      >
                        Cambiar conductor
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        className="w-1/2 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setIsRemoveDriverConfirmOpen(true)}
                      >
                        Quitar conductor
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-dashed rounded-lg p-5 text-center text-gray-400">
                  <User className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">Sin conductor asignado.</p>
                  <p className="text-xs mt-1 text-gray-400 mb-4">
                    Asigna un conductor para habilitar el control y cobros.
                  </p>
                  {canManageVehicles && (
                    <Button
                      size="sm"
                      onClick={() => setIsAssignDriverOpen(true)}
                      className="mx-auto flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      Añadir conductor
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial de Conductores */}
          <Card>
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                Historial de Conductores
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {driverHistory.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400 italic">
                  No hay registro de asignaciones previas.
                </div>
              ) : (
                <div className="flow-root p-6">
                  <ul className="-mb-8">
                    {driverHistory.map((assignment, index) => {
                      const isActive = !assignment.unassigned_at
                      const driverName = assignment.driver 
                        ? `${assignment.driver.first_name} ${assignment.driver.last_name}`
                        : 'Socio Propietario / Conductor'
                      const driverDId = assignment.driver?.document_id || '—'
                      const assignedBy = assignment.assigned_by_profile
                        ? `${assignment.assigned_by_profile.first_name} ${assignment.assigned_by_profile.last_name}`
                        : null
                      const unassignedBy = assignment.unassigned_by_profile
                        ? `${assignment.unassigned_by_profile.first_name} ${assignment.unassigned_by_profile.last_name}`
                        : null

                      return (
                        <li key={assignment.id}>
                          <div className="relative pb-8">
                            {index !== driverHistory.length - 1 ? (
                              <span
                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                aria-hidden="true"
                              />
                            ) : null}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                  isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  <User className="w-4 h-4" />
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 pt-1.5">
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800">
                                      {driverName}
                                    </p>
                                    <p className="text-xs font-mono text-gray-500 mt-0.5">
                                      C.I: {driverDId}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      isActive 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {isActive ? 'Actual' : 'Anterior'}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="mt-2 text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <p>
                                    <span className="font-semibold text-gray-500">Inicio:</span>{' '}
                                    {new Date(assignment.assigned_at).toLocaleString('es-EC')}
                                    {assignedBy && (
                                      <span className="text-gray-400"> (por {assignedBy})</span>
                                    )}
                                  </p>
                                  {!isActive && (
                                    <p>
                                      <span className="font-semibold text-gray-500">Fin:</span>{' '}
                                      {new Date(assignment.unassigned_at!).toLocaleString('es-EC')}
                                      {unassignedBy && (
                                        <span className="text-gray-400"> (por {unassignedBy})</span>
                                      )}
                                    </p>
                                  )}
                                  {assignment.change_reason && (
                                    <p>
                                      <span className="font-semibold text-gray-500">Motivo:</span>{' '}
                                      {assignment.change_reason}
                                    </p>
                                  )}
                                  {assignment.notes && (
                                    <p>
                                      <span className="font-semibold text-gray-500">Notas:</span>{' '}
                                      {assignment.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card>
            <CardContent className="p-6">
              <DocumentsList targetEntity="vehicle" entityId={currentVehicle.id} title="Documentos de la Unidad" />
            </CardContent>
          </Card>

          {/* Cuotas de la Unidad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary-500" />
                Cuotas de la Unidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleChargesSection vehicleId={currentVehicle.id} />
            </CardContent>
          </Card>

          {/* Observaciones */}
          {currentVehicle.observations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Observaciones Internas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-4 rounded-lg border">
                  {currentVehicle.observations}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Modal Edición ────────────────────────────────────────────────────── */}
      <VehicleFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        vehicle={currentVehicle}
        members={members}
        drivers={drivers}
        loading={editLoading}
      />

      {/* ── Modal Asignación de Conductor Acción Rápida ────────────────────────── */}
      <AssignDriverModal
        isOpen={isAssignDriverOpen}
        onClose={() => setIsAssignDriverOpen(false)}
        onSubmit={handleAssignDriverSubmit}
        currentDriverId={currentVehicle.driver_id}
        memberId={currentVehicle.member_id}
        members={members}
        drivers={drivers}
        loading={assignDriverLoading}
      />

      {/* ── Modal Confirmación estado ────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, nextStatus: 'inactiva', loading: false })}
        onConfirm={handleStatusChange}
        title={confirmState.nextStatus === 'inactiva' ? 'Desactivar unidad' : 'Activar unidad'}
        message={
          confirmState.nextStatus === 'inactiva'
            ? `¿Desactivar disco #${currentVehicle.disk_number} (${currentVehicle.plate})?`
            : `¿Activar disco #${currentVehicle.disk_number} (${currentVehicle.plate})?`
        }
        detail={
          confirmState.nextStatus === 'inactiva'
            ? 'La unidad pasará a inactiva. Su historial de documentos y cobros no se modifica.'
            : 'La unidad volverá a estado activo.'
        }
        confirmLabel={confirmState.nextStatus === 'inactiva' ? 'Sí, desactivar' : 'Sí, activar'}
        variant={confirmState.nextStatus === 'inactiva' ? 'warning' : 'success'}
        loading={confirmState.loading}
      />

      {/* ── ConfirmModal Quitar Conductor ───────────────────────────────────── */}
      <ConfirmModal
        isOpen={isRemoveDriverConfirmOpen}
        onClose={() => setIsRemoveDriverConfirmOpen(false)}
        onConfirm={handleRemoveDriver}
        title="Quitar Conductor Asignado"
        message="¿Confirmas que deseas retirar al conductor actual de esta unidad?"
        detail="La unidad quedará sin chofer registrado para los reportes y cobros diarios."
        confirmLabel="Sí, quitar conductor"
        variant="warning"
      />
    </div>
  )
}
