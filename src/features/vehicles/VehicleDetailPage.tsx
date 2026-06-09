import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useVehicles } from '@/hooks/useVehicles'
import { useMembers } from '@/hooks/useMembers'
import { useDrivers, getA1License } from '@/hooks/useDrivers'
import { usePermissions } from '@/hooks/usePermissions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { LicenseBadge } from '@/components/ui/LicenseBadge'
import { VehicleFormModal, type VehicleFormData } from './VehicleFormModal'
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
} from 'lucide-react'
import type { VehicleStatus } from '@/types'

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canManageVehicles } = usePermissions()
  const { currentVehicle, loading, error, fetchVehicleById, updateVehicle } = useVehicles()
  const { members, fetchMembers } = useMembers()
  const { fetchDriverById, fetchDrivers, createDriver, getDriverByMemberId, drivers } = useDrivers()

  // Driver cargado desde driver_id de la unidad
  const [vehicleDriver, setVehicleDriver] = useState<Awaited<ReturnType<typeof fetchDriverById>>>(null)

  // ── Modal edición ────────────────────────────────────────────────────────────
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  // Confirmación quitar conductor
  const [removeDriverConfirm, setRemoveDriverConfirm] = useState<{
    open: boolean; pendingData: VehicleFormData | null;
  }>({ open: false, pendingData: null })

  // ── Modal cambio de estado ───────────────────────────────────────────────────
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    nextStatus: VehicleStatus
    loading: boolean
  }>({ open: false, nextStatus: 'inactiva', loading: false })

  useEffect(() => {
    if (id) {
      fetchVehicleById(id)
      fetchMembers()
      fetchDrivers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Cargar conductor si la unidad tiene driver_id
  useEffect(() => {
    if (currentVehicle?.driver_id) {
      fetchDriverById(currentVehicle.driver_id).then(setVehicleDriver)
    } else {
      setVehicleDriver(null)
    }
  }, [currentVehicle?.driver_id, fetchDriverById])

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

      if (clean.driver_id === '_owner') {
        const memberId = data.member_id
        if (!memberId) throw new Error("No hay socio seleccionado")
        
        const existing = await getDriverByMemberId(memberId)
        if (existing) {
          clean.driver_id = existing.id
        } else {
          // Crear conductor
          const member = members.find(m => m.id === memberId)
          if (!member) throw new Error("No se encontró al socio")
          const { data: newDriver, error: driverErr } = await createDriver({
            document_id: member.document_id,
            first_name:  member.first_name,
            last_name:   member.last_name,
            phone:       (member as { phone?: string | null }).phone || null,
            address:     (member as { address?: string | null }).address || null,
            status:      'activo',
            notes:       null,
            member_id:   member.id,
          })
          if (driverErr || !newDriver) throw new Error(driverErr || "Error creando conductor")
          clean.driver_id = newDriver.id
        }
      }

      const { error: err } = await updateVehicle(id, clean)
      if (err) throw new Error(err)
      toast.success('Unidad actualizada.', { id: toastId })
      setIsEditOpen(false)
      fetchVehicleById(id)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar.', { id: toastId })
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditSubmit = async (data: VehicleFormData) => {
    if (currentVehicle && currentVehicle.driver_id && data.driver_id === '') {
      setRemoveDriverConfirm({ open: true, pendingData: data })
      return
    }
    await processEditSubmit(data)
  }

  const handleConfirmRemoveDriver = async () => {
    if (removeDriverConfirm.pendingData) {
      setRemoveDriverConfirm(prev => ({ ...prev, open: false }))
      await processEditSubmit(removeDriverConfirm.pendingData)
      setRemoveDriverConfirm({ open: false, pendingData: null })
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
              {vehicleDriver ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary-700">
                        {vehicleDriver.first_name[0]}{vehicleDriver.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 leading-tight">
                        {vehicleDriver.first_name} {vehicleDriver.last_name}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">{vehicleDriver.document_id}</p>
                      <div className="mt-1">
                        <LicenseBadge
                          expiryDate={getA1License(vehicleDriver.licenses || [])?.expiry_date}
                          licenseNumber={getA1License(vehicleDriver.licenses || [])?.license_number}
                          compact
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/conductores/${vehicleDriver.id}`)}
                  >
                    Ver ficha
                  </Button>
                </div>
              ) : (
                <div className="border border-dashed rounded-lg p-5 text-center text-gray-400">
                  <User className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">Sin conductor asignado.</p>
                  <p className="text-xs mt-1 text-gray-400">
                    Edita la unidad para asignar un conductor.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documentos — placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-gray-500">
                <FileText className="w-4 h-4" />
                Documentos y Vencimientos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-dashed rounded-lg p-5 text-center text-gray-400">
                <FileText className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">Sin documentos registrados.</p>
                <p className="text-xs mt-1 text-gray-400">
                  SOAT, matrícula y más en el Módulo de Documentos (Fase 3.4).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Cobros — placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-gray-500">
                <DollarSign className="w-4 h-4" />
                Historial de Cobros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-dashed rounded-lg p-5 text-center text-gray-400">
                <DollarSign className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">Sin cobros registrados para esta unidad.</p>
                <p className="text-xs mt-1 text-gray-400">
                  El historial de pagos estará disponible en el Módulo de Pagos (Fase 3.5).
                </p>
              </div>
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

      <ConfirmModal
        isOpen={removeDriverConfirm.open}
        onClose={() => setRemoveDriverConfirm({ open: false, pendingData: null })}
        onConfirm={handleConfirmRemoveDriver}
        title="Quitar Conductor Asignado"
        message="Has seleccionado 'Sin conductor asignado por ahora'."
        detail="¿Confirmas que deseas retirar al conductor actual de esta unidad? La unidad quedará sin chofer registrado."
        confirmLabel="Sí, quitar conductor"
        variant="warning"
      />
    </div>
  )
}
