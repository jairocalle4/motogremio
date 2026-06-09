import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Edit2, UserCheck, User, Bike,
  Phone, MapPin, FileText, ToggleLeft, ToggleRight,
  AlertTriangle, CheckCircle, Clock, Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { LicenseBadge } from '@/components/ui/LicenseBadge'
import { useDrivers, getA1License, type DriverWithRelations } from '@/hooks/useDrivers'
import { useMembers } from '@/hooks/useMembers'
import { usePermissions } from '@/hooks/usePermissions'
import { useLicenses } from '@/hooks/useLicenses'
import { DriverFormModal } from './DriverFormModal'
import { LicenseFormModal } from '@/features/licenses/LicenseFormModal'
import { DocumentsList } from '@/features/documents/DocumentsList'
import { DRIVER_STATUS_LABELS, DRIVER_STATUS_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canManageDrivers } = usePermissions()
  const {
    currentDriver,
    fetchDriverById,
    deactivateDriver,
    activateDriver,
  } = useDrivers()
  const { members, fetchMembers } = useMembers()

  const [editOpen,  setEditOpen]  = useState(false)
  const [toggling,  setToggling]  = useState(false)
  const [toggleModal, setToggleModal] = useState(false)
  const [licenseModal, setLicenseModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const { createLicense, updateLicense } = useLicenses()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchDriverById(id).finally(() => setLoading(false))
    fetchMembers()
  }, [id, fetchDriverById, fetchMembers])

  const driver = currentDriver as DriverWithRelations | null
  const a1     = driver ? getA1License(driver.licenses || []) : null
  const isSocio = !!driver?.member_id

  const handleToggleStatus = async () => {
    if (!driver) return
    setToggling(true)
    try {
      const { error } = driver.status === 'activo'
        ? await deactivateDriver(driver.id)
        : await activateDriver(driver.id)
      if (error) throw new Error(error)
      toast.success(
        driver.status === 'activo' ? 'Conductor desactivado.' : 'Conductor activado.'
      )
      setToggleModal(false)
      fetchDriverById(driver.id)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar estado.')
    } finally {
      setToggling(false)
    }
  }

  const handleEdited = () => {
    toast.success('Conductor actualizado.')
    setEditOpen(false)
    if (id) fetchDriverById(id)
  }

  const handleLicenseSubmit = async (data: any) => {
    try {
      if (a1) {
        const { error } = await updateLicense(a1.id, data)
        if (error) throw new Error(error)
        toast.success('Licencia actualizada correctamente')
      } else {
        const { error } = await createLicense(data)
        if (error) throw new Error(error)
        toast.success('Licencia añadida correctamente')
      }
      setLicenseModal(false)
      if (id) fetchDriverById(id)
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar licencia')
    }
  }

  // ── Estados de carga / error ──────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!driver) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-10 h-10 text-danger-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-800">Conductor no encontrado</h2>
        <p className="text-sm text-gray-500 mt-1">El registro puede haber sido eliminado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/conductores')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Conductores
        </Button>
      </div>
    )
  }

  // ── Calcular estado de licencia para info adicional ───
  const licStatus = a1
    ? (() => {
        const now  = new Date()
        const exp  = new Date(a1.expiry_date)
        const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        if (diff < 0)  return { icon: AlertTriangle, label: 'Licencia VENCIDA', color: 'text-danger-600', bg: 'bg-danger-50 border-danger-200' }
        if (diff <= 30) return { icon: Clock, label: `Vence en ${Math.ceil(diff)} días`, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' }
        return { icon: CheckCircle, label: 'Licencia vigente', color: 'text-success-600', bg: 'bg-success-50 border-success-200' }
      })()
    : null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── Navegación ───────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate('/conductores')} className="hover:text-gray-700 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Conductores
        </button>
        <span>/</span>
        <span className="text-gray-800 font-medium">{driver.first_name} {driver.last_name}</span>
      </div>

      {/* ── Hero card ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700
            flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-xl font-bold">
              {driver.first_name[0]}{driver.last_name[0]}
            </span>
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">
                {driver.first_name} {driver.last_name}
              </h1>
              <span className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                DRIVER_STATUS_COLORS[driver.status]
              )}>
                {DRIVER_STATUS_LABELS[driver.status]}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
                isSocio ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
              )}>
                {isSocio ? <UserCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {isSocio ? 'Socio-conductor' : 'Conductor externo'}
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-1 font-mono">C.I. {driver.document_id}</p>

            {/* Socio vinculado */}
            {isSocio && driver.member && (
              <div className="mt-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs text-gray-500">Vinculado al socio: </span>
                <Link
                  to={`/socios/${driver.member_id}`}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {driver.member.first_name} {driver.member.last_name}
                </Link>
              </div>
            )}
          </div>

          {/* Acciones */}
          {canManageDrivers && (
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit2 className="w-4 h-4 mr-1.5" />
                Editar
              </Button>
              <Button
                variant={driver.status === 'activo' ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => setToggleModal(true)}
              >
                {driver.status === 'activo'
                  ? <><ToggleRight className="w-4 h-4 mr-1.5" />Desactivar</>
                  : <><ToggleLeft  className="w-4 h-4 mr-1.5" />Activar</>}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Grid de tarjetas ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Datos personales */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            Datos Personales
          </h2>
          <dl className="space-y-3">
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <dt className="text-xs text-gray-500">Teléfono</dt>
                <dd className="text-sm font-medium text-gray-800">
                  {driver.phone || <span className="text-gray-400 italic">No registrado</span>}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <dt className="text-xs text-gray-500">Dirección</dt>
                <dd className="text-sm font-medium text-gray-800">
                  {driver.address || <span className="text-gray-400 italic">No registrada</span>}
                </dd>
              </div>
            </div>

            {driver.notes && (
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs text-gray-500">Notas internas</dt>
                  <dd className="text-sm text-gray-800 whitespace-pre-wrap">{driver.notes}</dd>
                </div>
              </div>
            )}

            <div className="pt-1 text-xs text-gray-400">
              Registrado el{' '}
              {new Date(driver.created_at).toLocaleDateString('es-EC', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </div>
          </dl>
        </div>

        {/* Licencia A1 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              Licencia A1
            </h2>
            {canManageDrivers && a1 && (
              <Button variant="outline" size="sm" onClick={() => setLicenseModal(true)}>
                Editar licencia
              </Button>
            )}
          </div>

          {a1 ? (
            <div className="space-y-3">
              <LicenseBadge
                expiryDate={a1.expiry_date}
                licenseNumber={a1.license_number}
                licenseType={a1.license_type}
              />

              {licStatus && (
                <div className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
                  licStatus.bg
                )}>
                  <licStatus.icon className={cn('w-4 h-4 shrink-0', licStatus.color)} />
                  <span className={cn('font-medium', licStatus.color)}>{licStatus.label}</span>
                </div>
              )}

              <dl className="space-y-2">
                <div>
                  <dt className="text-xs text-gray-500">N.° de licencia</dt>
                  <dd className="text-sm font-semibold text-gray-800 font-mono">{a1.license_number}</dd>
                </div>
                {a1.issue_date && (
                  <div>
                    <dt className="text-xs text-gray-500">Fecha de emisión</dt>
                    <dd className="text-sm text-gray-800">
                      {new Date(a1.issue_date + 'T00:00:00').toLocaleDateString('es-EC', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500">Fecha de vencimiento</dt>
                  <dd className="text-sm text-gray-800">
                    {new Date(a1.expiry_date + 'T00:00:00').toLocaleDateString('es-EC', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Sin licencia A1 registrada</p>
              <p className="text-xs text-gray-500 mt-1">
                Edita el conductor para registrar la licencia A1.
              </p>
              {canManageDrivers && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setLicenseModal(true)}
                >
                  Registrar licencia
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Unidad asignada */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Bike className="w-4 h-4 text-gray-400" />
            Unidad Asignada
          </h2>

          {driver.assigned_vehicle ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <Bike className="w-6 h-6 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-lg">
                  Disco #{driver.assigned_vehicle.disk_number}
                </p>
                <p className="text-sm text-gray-500 font-mono">{driver.assigned_vehicle.plate}</p>
                <span className={cn(
                  'inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full',
                  driver.assigned_vehicle.status === 'activa'
                    ? 'bg-success-50 text-success-700'
                    : 'bg-gray-100 text-gray-600'
                )}>
                  {driver.assigned_vehicle.status}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/unidades/${driver.assigned_vehicle!.id}`)}
              >
                Ver ficha
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                <Bike className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">Sin unidad asignada</p>
              <p className="text-xs text-gray-400 mt-1">
                Asigna este conductor desde la ficha de una unidad.
              </p>
            </div>
          )}
        </div>

        {/* Documentos */}
        <div className="col-span-1 lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <DocumentsList targetEntity="driver" entityId={driver.id} title="Otros Documentos" />
          </div>
        </div>
      </div>

      {/* ── Modal edición ────────────────────────────────── */}
      <DriverFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onCreated={handleEdited}
        driver={driver}
        members={members}
      />

      <LicenseFormModal
        isOpen={licenseModal}
        onClose={() => setLicenseModal(false)}
        onSubmit={handleLicenseSubmit}
        license={a1 as any}
        driverId={driver.id}
      />

      {/* ── Modal toggle estado ──────────────────────────── */}
      <ConfirmModal
        isOpen={toggleModal}
        onClose={() => setToggleModal(false)}
        onConfirm={handleToggleStatus}
        loading={toggling}
        title={driver.status === 'activo' ? 'Desactivar conductor' : 'Activar conductor'}
        message={`¿Confirmas ${driver.status === 'activo' ? 'desactivar' : 'activar'} a ${driver.first_name} ${driver.last_name}?`}
        detail={
          driver.status === 'activo'
            ? 'El conductor quedará inactivo. Podrás reactivarlo en cualquier momento.'
            : 'El conductor quedará activo nuevamente.'
        }
        confirmLabel={driver.status === 'activo' ? 'Desactivar' : 'Activar'}
        variant={driver.status === 'activo' ? 'warning' : 'success'}
      />
    </div>
  )
}
