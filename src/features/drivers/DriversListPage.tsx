import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Plus, Search, UserCheck, User, Users,
  UserX, Eye, Edit2, ToggleLeft, ToggleRight, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { LicenseBadge } from '@/components/ui/LicenseBadge'
import { useDrivers, getPrimaryLicense, type DriverWithRelations } from '@/hooks/useDrivers'
import { useMembers } from '@/hooks/useMembers'
import { usePermissions } from '@/hooks/usePermissions'
import { DriverFormModal } from './DriverFormModal'
import { DRIVER_STATUS_LABELS, DRIVER_STATUS_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { DriverStatus } from '@/types'

export function DriversListPage() {
  const navigate = useNavigate()
  const { canManageDrivers } = usePermissions()
  const {
    drivers, loading, error,
    fetchDrivers, deactivateDriver, activateDriver,
  } = useDrivers()
  const { members, fetchMembers } = useMembers()

  // ── Filtros
  const [search, setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState<DriverStatus | ''>('')

  // ── Modales
  const [formOpen, setFormOpen]       = useState(false)
  const [editDriver, setEditDriver]   = useState<DriverWithRelations | null>(null)
  const [toggleConfirm, setToggleConfirm] = useState<{
    open: boolean; driver: DriverWithRelations | null
  }>({ open: false, driver: null })
  const [toggling, setToggling] = useState(false)
  // Borrador en memoria
  const driverDraftRef = useRef<Partial<import('./DriverFormModal').DriverFormData> | null>(null)

  const load = useCallback(() => {
    fetchDrivers({ search: search || undefined, status: statusFilter || undefined })
  }, [fetchDrivers, search, statusFilter])

  useEffect(() => { load() },                    [load])
  useEffect(() => { fetchMembers() }, [fetchMembers])

  // ── KPIs ──────────────────────────────────────────────
  const total    = drivers.length
  const activos  = drivers.filter((d) => d.status === 'activo').length
  const inactivos = total - activos
  const sinLicencia = drivers.filter((d) => {
    const lic = getPrimaryLicense(d.licenses || [])
    return !lic
  }).length
  const licVencidas = drivers.filter((d) => {
    const lic = getPrimaryLicense(d.licenses || [])
    if (!lic) return false
    return new Date(lic.expiry_date) < new Date()
  }).length

  // ── Handlers ──────────────────────────────────────────
  const handleToggleStatus = async () => {
    if (!toggleConfirm.driver) return
    setToggling(true)
    try {
      const d = toggleConfirm.driver
      const { error: err } = d.status === 'activo'
        ? await deactivateDriver(d.id)
        : await activateDriver(d.id)
      if (err) throw new Error(err)
      toast.success(
        d.status === 'activo'
          ? `${d.first_name} ${d.last_name} marcado como inactivo.`
          : `${d.first_name} ${d.last_name} activado nuevamente.`
      )
      setToggleConfirm({ open: false, driver: null })
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar estado.')
    } finally {
      setToggling(false)
    }
  }

  const handleCreated = (driverId: string) => {
    toast.success('Conductor registrado correctamente.')
    setFormOpen(false)
    setEditDriver(null)
    load()
    navigate(`/conductores/${driverId}`)
  }

  const handleEdited = () => {
    toast.success('Conductor actualizado correctamente.')
    setFormOpen(false)
    setEditDriver(null)
    load()
  }

  const openEdit = (d: DriverWithRelations) => {
    setEditDriver(d)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conductores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de conductores y choferes de la cooperativa
          </p>
        </div>
        {canManageDrivers && (
          <Button
            onClick={() => { setEditDriver(null); setFormOpen(true) }}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Conductor
          </Button>
        )}
      </div>

      {/* ── KPIs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{total}</p>
          <p className="text-xs text-gray-500 mt-0.5">conductores registrados</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activos</p>
            <UserCheck className="w-4 h-4 text-success-500" />
          </div>
          <p className="text-2xl font-bold text-success-600 mt-2">{activos}</p>
          <p className="text-xs text-gray-500 mt-0.5">en servicio</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Inactivos</p>
            <UserX className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-600 mt-2">{inactivos}</p>
          <p className="text-xs text-gray-500 mt-0.5">fuera de servicio</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Alertas</p>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{sinLicencia + licVencidas}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {sinLicencia} sin licencia · {licVencidas} vencida{licVencidas !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Filtros ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cédula, nombre o apellido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900
                  placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="sm:w-44">
            <Select
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'activo',   label: 'Activo' },
                { value: 'inactivo', label: 'Inactivo' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DriverStatus | '')}
            />
          </div>
        </div>
      </div>

      {/* ── Tabla ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <AlertTriangle className="w-10 h-10 text-danger-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">Error al cargar los conductores</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={load}>
              Reintentar
            </Button>
          </div>
        )}

        {!loading && !error && drivers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <UserCheck className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-700">
              {search || statusFilter ? 'Sin resultados' : 'Sin conductores registrados'}
            </p>
            <p className="text-sm text-gray-500 mt-1 max-w-xs">
              {search || statusFilter
                ? 'Intenta con otros criterios de búsqueda.'
                : 'Registra el primer conductor de la cooperativa.'}
            </p>
            {canManageDrivers && !search && !statusFilter && (
              <Button className="mt-4" onClick={() => { setEditDriver(null); setFormOpen(true) }}>
                <Plus className="w-4 h-4 mr-2" />
                Registrar Conductor
              </Button>
            )}
          </div>
        )}

        {!loading && !error && drivers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Conductor</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden sm:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">Licencia</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden xl:table-cell">Unidad</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drivers.map((driver) => {
                  const license = getPrimaryLicense(driver.licenses || [])
                  const vehicle = driver.assigned_vehicle
                  const isSocio = !!driver.member_id

                  return (
                    <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary-700">
                              {driver.first_name[0]}{driver.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight">
                              {driver.last_name}, {driver.first_name}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{driver.document_id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                          isSocio ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
                        )}>
                          {isSocio ? <UserCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {isSocio ? 'Socio-conductor' : 'Externo'}
                        </span>
                      </td>

                      <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                        {driver.phone || <span className="text-gray-400">—</span>}
                      </td>

                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                          DRIVER_STATUS_COLORS[driver.status]
                        )}>
                          {DRIVER_STATUS_LABELS[driver.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell">
                        <LicenseBadge
                          expiryDate={license?.expiry_date}
                          licenseNumber={license?.license_number}
                          licenseType={license?.license_type}
                          compact
                        />
                      </td>

                      <td className="px-4 py-3 hidden xl:table-cell">
                        {vehicle ? (
                          <button
                            onClick={() => navigate(`/unidades/${vehicle.id}`)}
                            className="text-xs text-primary-600 hover:text-primary-800 font-semibold underline-offset-2 hover:underline"
                          >
                            Disco #{vehicle.disk_number} · {vehicle.plate}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin asignar</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/conductores/${driver.id}`)}
                            title="Ver ficha"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canManageDrivers && (
                            <>
                              <button
                                onClick={() => openEdit(driver)}
                                title="Editar"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setToggleConfirm({ open: true, driver })}
                                title={driver.status === 'activo' ? 'Desactivar' : 'Activar'}
                                className={cn(
                                  'p-1.5 rounded-lg transition-colors',
                                  driver.status === 'activo'
                                    ? 'text-gray-500 hover:text-warning-600 hover:bg-warning-50'
                                    : 'text-gray-500 hover:text-success-600 hover:bg-success-50'
                                )}
                              >
                                {driver.status === 'activo'
                                  ? <ToggleRight className="w-4 h-4" />
                                  : <ToggleLeft className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal formulario ──────────────────────────────── */}
      <DriverFormModal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditDriver(null) }}
        onCreated={editDriver ? handleEdited : handleCreated}
        driver={editDriver}
        members={members}
        draft={!editDriver ? driverDraftRef.current : null}
        onDraftChange={(d) => { driverDraftRef.current = d }}
      />

      {/* ── Confirmar toggle de estado ────────────────────── */}
      <ConfirmModal
        isOpen={toggleConfirm.open}
        onClose={() => setToggleConfirm({ open: false, driver: null })}
        onConfirm={handleToggleStatus}
        loading={toggling}
        title={
          toggleConfirm.driver?.status === 'activo'
            ? 'Desactivar conductor'
            : 'Activar conductor'
        }
        message={
          toggleConfirm.driver
            ? `¿Confirmas ${toggleConfirm.driver.status === 'activo' ? 'desactivar' : 'activar'} a ${toggleConfirm.driver.first_name} ${toggleConfirm.driver.last_name}?`
            : ''
        }
        detail={
          toggleConfirm.driver?.status === 'activo'
            ? 'El conductor quedará inactivo y no podrá ser asignado a nuevas unidades.'
            : 'El conductor quedará activo nuevamente.'
        }
        confirmLabel={toggleConfirm.driver?.status === 'activo' ? 'Desactivar' : 'Activar'}
        variant={toggleConfirm.driver?.status === 'activo' ? 'warning' : 'success'}
      />
    </div>
  )
}
