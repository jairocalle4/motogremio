import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useVehicles, type VehicleInsert, type VehicleWithMember } from '@/hooks/useVehicles'
import { useMembers } from '@/hooks/useMembers'
import { useDrivers } from '@/hooks/useDrivers'
import { usePermissions } from '@/hooks/usePermissions'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { VehicleFormModal, type VehicleFormData } from './VehicleFormModal'
import {
  Bike,
  CheckCircle,
  Wrench,
  XCircle,
  Search,
  Plus,
  Eye,
  Edit2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react'
import type { VehicleStatus } from '@/types'

export function VehiclesListPage() {
  const navigate = useNavigate()
  const { canManageVehicles } = usePermissions()
  const { vehicles, loading, error, fetchVehicles, createVehicle, updateVehicle } = useVehicles()
  const { members, fetchMembers } = useMembers()
  const { drivers, fetchDrivers } = useDrivers()

  // Borrador en memoria
  const vehicleDraftRef = useRef<Partial<import('./VehicleFormModal').VehicleFormData> | null>(null)

  // Confirmación quitar conductor
  const [removeDriverConfirm, setRemoveDriverConfirm] = useState<{
    open: boolean; pendingData: VehicleFormData | null;
  }>({ open: false, pendingData: null })

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // ── Modal Formulario ─────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithMember | null>(null)

  // ── Modal Confirmación cambio de estado ──────────────────────────────────────
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    vehicle: VehicleWithMember | null
    nextStatus: VehicleStatus
    loading: boolean
  }>({ open: false, vehicle: null, nextStatus: 'inactiva', loading: false })

  // ── Carga inicial ────────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    fetchVehicles({
      search: searchTerm || undefined,
      status: (statusFilter as VehicleStatus) || undefined,
    })
  }, [fetchVehicles, searchTerm, statusFilter])

  useEffect(() => {
    fetchVehicles()
    fetchMembers()
    fetchDrivers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    fetchVehicles({
      search: searchTerm || undefined,
      status: (statusFilter as VehicleStatus) || undefined,
    })
  }

  // ── Crear / Editar ───────────────────────────────────────────────────────────
  const processFormSubmit = async (data: VehicleFormData) => {
    const toastId = toast.loading('Guardando unidad...')
    try {
      // Normalizar: strings vacíos → null, year → número
      const clean: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(data)) {
        if (v === '' || v === undefined) {
          clean[k] = null
        } else if (k === 'year' && typeof v === 'string') {
          clean[k] = parseInt(v, 10)
        } else {
          clean[k] = v
        }
      }

      if (selectedVehicle) {
        const { error: err } = await updateVehicle(selectedVehicle.id, clean)
        if (err) throw new Error(err)
        toast.success('Unidad actualizada exitosamente.', { id: toastId })
      } else {
        const { error: err } = await createVehicle(clean as VehicleInsert)
        if (err) throw new Error(err)
        toast.success('Unidad registrada exitosamente.', { id: toastId })
      }

      setIsFormOpen(false)
      setSelectedVehicle(null)
      refresh()
      vehicleDraftRef.current = null
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la unidad.'
      toast.error(msg, { id: toastId })
    }
  }

  const handleFormSubmit = async (data: VehicleFormData) => {
    // Si editamos, tenía conductor, y ahora viene vacío (quitar conductor)
    if (selectedVehicle && selectedVehicle.driver_id && data.driver_id === '') {
      setRemoveDriverConfirm({ open: true, pendingData: data })
      return
    }
    await processFormSubmit(data)
  }

  const handleConfirmRemoveDriver = async () => {
    if (removeDriverConfirm.pendingData) {
      setRemoveDriverConfirm(prev => ({ ...prev, open: false }))
      await processFormSubmit(removeDriverConfirm.pendingData)
      setRemoveDriverConfirm({ open: false, pendingData: null })
    }
  }

  // ── Cambiar estado (no físico) ───────────────────────────────────────────────
  const openStatusConfirm = (vehicle: VehicleWithMember) => {
    // Toggle: activa → inactiva, cualquier otro → activa
    const nextStatus: VehicleStatus = vehicle.status === 'activa' ? 'inactiva' : 'activa'
    setConfirmState({ open: true, vehicle, nextStatus, loading: false })
  }

  const handleConfirmStatusChange = async () => {
    const { vehicle, nextStatus } = confirmState
    if (!vehicle) return

    setConfirmState((s) => ({ ...s, loading: true }))
    const toastId = toast.loading('Actualizando estado...')
    try {
      const { error: err } = await updateVehicle(vehicle.id, { status: nextStatus })
      if (err) throw new Error(err)

      toast.success(
        nextStatus === 'inactiva'
          ? 'Unidad desactivada. El registro se conserva íntegro.'
          : 'Unidad activada correctamente.',
        { id: toastId }
      )
      setConfirmState({ open: false, vehicle: null, nextStatus: 'inactiva', loading: false })
      refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar el estado.'
      toast.error(msg, { id: toastId })
      setConfirmState((s) => ({ ...s, loading: false }))
    }
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  const totalCount  = vehicles.length
  const activeCount = vehicles.filter((v) => v.status === 'activa').length
  const maintCount  = vehicles.filter((v) => v.status === 'mantenimiento').length
  const inactCount  = vehicles.filter((v) => v.status === 'inactiva').length

  // ── Badge variant por estado ─────────────────────────────────────────────────
  const statusVariant = (s: VehicleStatus) => {
    if (s === 'activa') return 'success'
    if (s === 'mantenimiento') return 'warning'
    return 'danger'
  }

  const statusLabel = (s: VehicleStatus) => {
    if (s === 'activa') return 'Activa'
    if (s === 'mantenimiento') return 'Mantenimiento'
    return 'Inactiva'
  }

  // ── ConfirmModal labels ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unidades / Mototaxis</h1>
          <p className="text-gray-500 mt-1">
            Administra las mototaxis de la cooperativa, propietarios y estado operativo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => toast('Exportación próximamente disponible.', { icon: '📊' })}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar
          </Button>
          {canManageVehicles && (
            <Button
              className="flex items-center gap-2"
              onClick={() => { setSelectedVehicle(null); setIsFormOpen(true) }}
            >
              <Plus className="w-4 h-4" />
              Nueva Unidad
            </Button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center space-x-3 p-5">
            <div className="p-2.5 bg-primary-50 rounded-xl">
              <Bike className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-3 p-5">
            <div className="p-2.5 bg-green-50 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Activas</p>
              <h3 className="text-2xl font-bold text-gray-900">{activeCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-3 p-5">
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <Wrench className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Mantenimiento</p>
              <h3 className="text-2xl font-bold text-gray-900">{maintCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-3 p-5">
            <div className="p-2.5 bg-red-50 rounded-xl">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Inactivas</p>
              <h3 className="text-2xl font-bold text-gray-900">{inactCount}</h3>
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
              placeholder="Buscar por disco, placa, marca o modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="w-full md:w-52">
            <Select
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'activa', label: 'Activas' },
                { value: 'mantenimiento', label: 'En mantenimiento' },
                { value: 'inactiva', label: 'Inactivas' },
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

      {/* ── Tabla ────────────────────────────────────────────────────────────── */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
              <p className="text-gray-500 mt-4 text-sm">Cargando unidades...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">
              <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
              <p className="font-semibold">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => fetchVehicles()}>
                Reintentar
              </Button>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="p-12 text-center">
              <Bike className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-700 font-semibold mb-1">No se encontraron unidades</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                No hay mototaxis registradas que coincidan con la búsqueda, o aún no se han registrado unidades.
              </p>
              {canManageVehicles && (
                <Button
                  className="mt-4 flex items-center gap-2 mx-auto"
                  onClick={() => { setSelectedVehicle(null); setIsFormOpen(true) }}
                >
                  <Plus className="w-4 h-4" />
                  Registrar Primera Unidad
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-semibold border-b">
                <tr>
                  <th className="px-6 py-4">Disco / Placa</th>
                  <th className="px-6 py-4">Propietario</th>
                  <th className="px-6 py-4">Conductor</th>
                  <th className="px-6 py-4">Vehículo</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 text-base">
                        # {vehicle.disk_number}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono">{vehicle.plate}</div>
                    </td>

                    <td className="px-6 py-4">
                      {vehicle.member ? (
                        <>
                          <div className="font-medium text-gray-800">
                            {vehicle.member.last_name}, {vehicle.member.first_name}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            C.I: {vehicle.member.document_id}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Sin propietario</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {vehicle.driver ? (
                        <>
                          <div className="font-medium text-gray-800">
                            {vehicle.driver.first_name} {vehicle.driver.last_name}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            C.I: {vehicle.driver.document_id}
                          </div>
                        </>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-100">
                          Sin conductor
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-gray-800">
                        {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '—'}
                      </div>
                      {vehicle.year && (
                        <div className="text-xs text-gray-400 mt-0.5">{vehicle.year}</div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant={statusVariant(vehicle.status || 'inactiva')}>
                        {statusLabel(vehicle.status || 'inactiva')}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Ver ficha */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="p-1.5"
                          title="Ver Ficha de Unidad"
                          onClick={() => navigate(`/unidades/${vehicle.id}`)}
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </Button>

                        {canManageVehicles && (
                          <>
                            {/* Editar */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="p-1.5"
                              title="Editar Unidad"
                              onClick={() => { setSelectedVehicle(vehicle); setIsFormOpen(true) }}
                            >
                              <Edit2 className="w-4 h-4 text-primary-500" />
                            </Button>

                            {/* Activar / Desactivar */}
                            <Button
                              variant={vehicle.status === 'activa' ? 'outline' : 'secondary'}
                              size="sm"
                              className="px-2.5 py-1 text-xs"
                              title={vehicle.status === 'activa' ? 'Desactivar' : 'Activar'}
                              onClick={() => openStatusConfirm(vehicle)}
                            >
                              {vehicle.status === 'activa' ? 'Desactivar' : 'Activar'}
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
      <VehicleFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setSelectedVehicle(null) }}
        onSubmit={handleFormSubmit}
        vehicle={selectedVehicle}
        members={members}
        drivers={drivers}
        draft={!selectedVehicle ? vehicleDraftRef.current : null}
        onDraftChange={(d) => { vehicleDraftRef.current = d }}
      />

      {/* ── Modal Confirmación de Estado ─────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, vehicle: null, nextStatus: 'inactiva', loading: false })}
        onConfirm={handleConfirmStatusChange}
        title={confirmState.nextStatus === 'inactiva' ? 'Desactivar Unidad' : 'Activar Unidad'}
        message={confirmState.vehicle ? `¿Confirmas ${confirmState.nextStatus === 'inactiva' ? 'desactivar' : 'activar'} el disco #${confirmState.vehicle.disk_number}?` : ''}
        detail={confirmState.nextStatus === 'inactiva' ? 'La unidad dejará de estar operativa.' : 'La unidad volverá a estar operativa.'}
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
