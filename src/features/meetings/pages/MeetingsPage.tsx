import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useMeetings } from '../hooks/useMeetings'
import { usePermissions } from '@/hooks/usePermissions'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { MeetingFormModal } from '../components/MeetingFormModal'
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react'
import type { Meeting, MeetingType } from '@/types'
import {
  MEETING_TYPE_LABELS,
  MEETING_TYPE_COLORS,
  MEETING_STATUS_LABELS,
  MEETING_STATUS_COLORS,
} from '@/lib/constants'

export function MeetingsPage() {
  const navigate = useNavigate()
  const { canManageMeetings } = usePermissions()
  const { meetings, loading, error, fetchMeetings, createMeeting, updateMeeting, cancelMeeting } = useMeetings()

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  // ── Modal Formulario ─────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

  // ── Modal Cancelación ───────────────────────────────────────────────────────
  const [cancelState, setCancelState] = useState<{
    open: boolean
    meeting: Meeting | null
    loading: boolean
  }>({ open: false, meeting: null, loading: false })

  // ── Carga inicial ────────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    fetchMeetings()
  }, [fetchMeetings])

  useEffect(() => {
    refresh()
  }, [refresh])

  // ── Crear / Editar ───────────────────────────────────────────────────────────
  const handleFormSubmit = async (formData: {
    title: string
    description?: string
    meeting_type: MeetingType
    date: string
    time: string
    location?: string
    is_mandatory?: boolean
  }) => {
    const toastId = toast.loading('Guardando reunión...')
    try {
      if (selectedMeeting) {
        await updateMeeting(selectedMeeting.id, formData)
        toast.success('Reunión actualizada exitosamente.', { id: toastId })
      } else {
        await createMeeting(formData)
        toast.success('Reunión programada exitosamente.', { id: toastId })
      }
      setIsFormOpen(false)
      setSelectedMeeting(null)
      refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la reunión.'
      toast.error(msg, { id: toastId })
    }
  }

  // ── Cancelar ─────────────────────────────────────────────────────────────────
  const openCancelModal = (meeting: Meeting) => {
    setCancelState({ open: true, meeting, loading: false })
  }

  const handleConfirmCancel = async () => {
    const { meeting } = cancelState
    if (!meeting) return

    setCancelState((s) => ({ ...s, loading: true }))
    const toastId = toast.loading('Cancelando reunión...')
    try {
      await cancelMeeting(meeting.id)
      toast.success('Reunión cancelada correctamente.', { id: toastId })
      setCancelState({ open: false, meeting: null, loading: false })
      refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar la reunión.'
      toast.error(msg, { id: toastId })
      setCancelState((s) => ({ ...s, loading: false }))
    }
  }

  // ── Filtro de datos local ─────────────────────────────────────────────────────
  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (meeting.location || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter ? meeting.status === statusFilter : true
    const matchesType = typeFilter ? meeting.meeting_type === typeFilter : true
    return matchesSearch && matchesStatus && matchesType
  })

  // ── Métricas calculadas ───────────────────────────────────────────────────────
  const programmedCount = meetings.filter((m) => m.status === 'programada').length
  const finalizedCount = meetings.filter((m) => m.status === 'finalizada').length
  const inProgressCount = meetings.filter((m) => m.status === 'en_curso').length

  // Para las ausencias del mes, es meramente representativo o un placeholder en esta fase ya que no calculamos sanciones
  const absencesThisMonth = 0 

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reuniones y Asambleas</h1>
          <p className="text-gray-500 mt-1">
            Gestiona convocatorias, asambleas generales y controla la asistencia de los socios.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => toast('Función de exportación de actas próximamente disponible.', { icon: '📊' })}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar
          </Button>
          {canManageMeetings && (
            <Button
              className="flex items-center gap-2"
              onClick={() => {
                setSelectedMeeting(null)
                setIsFormOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Nueva Reunión
            </Button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="p-3 bg-primary-50 rounded-xl">
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Programadas</p>
              <h3 className="text-2xl font-bold text-gray-900">{programmedCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Realizadas</p>
              <h3 className="text-2xl font-bold text-gray-900">{finalizedCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">En Curso</p>
              <h3 className="text-2xl font-bold text-gray-900">{inProgressCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="p-3 bg-red-50 rounded-xl">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Faltas del Mes</p>
              <h3 className="text-2xl font-bold text-gray-900">{absencesThisMonth}</h3>
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
              placeholder="Buscar por título o lugar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="w-full md:w-48">
            <Select
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'programada', label: 'Programada' },
                { value: 'en_curso', label: 'En curso' },
                { value: 'finalizada', label: 'Finalizada' },
                { value: 'cancelada', label: 'Cancelada' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>

          <div className="w-full md:w-48">
            <Select
              options={[
                { value: '', label: 'Todos los tipos' },
                ...Object.entries(MEETING_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Tabla Principal ──────────────────────────────────────────────────── */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
              <p className="text-gray-500 mt-4 text-sm">Cargando listado de reuniones...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">
              <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
              <p className="font-semibold">{error}</p>
              <Button variant="outline" className="mt-4" onClick={refresh}>
                Reintentar
              </Button>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-700 font-semibold mb-1">No se encontraron reuniones</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                No existen registros que coincidan con la búsqueda o la cooperativa no ha programado reuniones.
              </p>
              {canManageMeetings && (
                <Button
                  className="mt-4 flex items-center gap-2 mx-auto"
                  onClick={() => {
                    setSelectedMeeting(null)
                    setIsFormOpen(true)
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Programar Primera Reunión
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-semibold border-b">
                <tr>
                  <th className="px-6 py-4">Fecha / Hora</th>
                  <th className="px-6 py-4">Reunión</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Lugar</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMeetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {new Date(meeting.date + 'T00:00:00').toLocaleDateString('es-EC', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {meeting.time ? meeting.time.substring(0, 5) : '—'}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{meeting.title}</div>
                      {meeting.is_mandatory && (
                        <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full font-semibold inline-block mt-1">
                          Obligatoria
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          MEETING_TYPE_COLORS[meeting.meeting_type] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {MEETING_TYPE_LABELS[meeting.meeting_type]}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {meeting.location || '—'}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          MEETING_STATUS_COLORS[meeting.status || 'programada']
                        }`}
                      >
                        {MEETING_STATUS_LABELS[meeting.status || 'programada']}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Ver Detalle */}
                        <Tooltip content="Ver Detalle y Tomar Asistencia">
                          <Button
                            variant="outline"
                            size="sm"
                            className="p-1.5"
                            onClick={() => navigate(`/reuniones/${meeting.id}`)}
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Button>
                        </Tooltip>

                        {canManageMeetings && meeting.status !== 'cancelada' && (
                          <>
                            {/* Editar */}
                            <Tooltip content="Editar Reunión">
                              <Button
                                variant="outline"
                                size="sm"
                                className="p-1.5"
                                onClick={() => {
                                  setSelectedMeeting(meeting)
                                  setIsFormOpen(true)
                                }}
                              >
                                <Plus className="w-4 h-4 text-primary-500" />
                              </Button>
                            </Tooltip>

                            {/* Cancelar */}
                            {meeting.status !== 'finalizada' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 border-red-200"
                                title="Cancelar Reunión"
                                onClick={() => openCancelModal(meeting)}
                              >
                                Cancelar
                              </Button>
                            )}
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
      <MeetingFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedMeeting(null)
        }}
        onSubmit={handleFormSubmit}
        meeting={selectedMeeting}
      />

      {/* ── Modal Confirmación Cancelar ──────────────────────────────────────── */}
      <ConfirmModal
        isOpen={cancelState.open}
        onClose={() => setCancelState({ open: false, meeting: null, loading: false })}
        onConfirm={handleConfirmCancel}
        title="Cancelar Reunión"
        message={`¿Estás seguro de que deseas cancelar la reunión "${cancelState.meeting?.title}"?`}
        detail="Esta acción cambiará el estado a cancelada y no se podrá tomar asistencia."
        confirmLabel="Sí, cancelar reunión"
        variant="danger"
        loading={cancelState.loading}
      />
    </div>
  )
}
