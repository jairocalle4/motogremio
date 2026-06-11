import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useMeetings } from '../hooks/useMeetings'
import { usePermissions } from '@/hooks/usePermissions'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { InviteMembersModal } from '../components/InviteMembersModal'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  UserPlus,
  AlertCircle,
  Hourglass,
} from 'lucide-react'
import type { AttendanceStatus, MeetingStatus } from '@/types'
import {
  MEETING_TYPE_LABELS,
  MEETING_TYPE_COLORS,
  MEETING_STATUS_LABELS,
  MEETING_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_COLORS,
} from '@/lib/constants'

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canManageMeetings } = usePermissions()

  const {
    currentMeeting,
    invites,
    attendances,
    loading,
    error,
    fetchMeetingById,
    convokeActiveMembers,
    convokeSelectedMembers,
    saveAttendance,
    updateMeeting,
  } = useMeetings()

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({})
  const [savingAttendanceId, setSavingAttendanceId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const loadData = useCallback(() => {
    if (id) {
      fetchMeetingById(id)
    }
  }, [id, fetchMeetingById])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Inicializar notas locales de asistencia cuando se cargan las asistencias
  useEffect(() => {
    const notesMap: Record<string, string> = {}
    attendances.forEach((att) => {
      notesMap[att.member_id] = att.notes || ''
    })
    setAttendanceNotes(notesMap)
  }, [attendances])

  // ── Acciones de Convocatoria ──────────────────────────────────────────────────
  const handleConvokeAll = async () => {
    if (!id) return
    const toastId = toast.loading('Convocando socios activos...')
    try {
      await convokeActiveMembers(id)
      toast.success('Todos los socios activos fueron convocados.', { id: toastId })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al convocar socios.'
      toast.error(msg, { id: toastId })
    }
  }

  const handleConvokeSelected = async (memberIds: string[]) => {
    if (!id) return
    const toastId = toast.loading('Convocando socios seleccionados...')
    try {
      await convokeSelectedMembers(id, memberIds)
      toast.success('Socios seleccionados convocados.', { id: toastId })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al convocar socios.'
      toast.error(msg, { id: toastId })
    }
  }

  // ── Registrar / Cambiar Asistencia ──────────────────────────────────────────
  const handleStatusChange = async (memberId: string, status: AttendanceStatus) => {
    if (!id) return
    setSavingAttendanceId(memberId)
    const notes = attendanceNotes[memberId] || ''
    try {
      await saveAttendance(id, memberId, status, notes)
      toast.success(`Asistencia registrada: ${ATTENDANCE_STATUS_LABELS[status]}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la asistencia.'
      toast.error(msg)
    } finally {
      setSavingAttendanceId(null)
    }
  }

  const handleNotesBlur = async (memberId: string) => {
    if (!id) return
    const currentAttendance = attendances.find((a) => a.member_id === memberId)
    const notesValue = attendanceNotes[memberId] || ''

    // Si ya existe asistencia y cambió la nota, la guardamos
    if (currentAttendance && currentAttendance.notes !== notesValue) {
      try {
        await saveAttendance(id, memberId, currentAttendance.status as AttendanceStatus, notesValue)
        toast.success('Observación guardada.')
      } catch (err: unknown) {
        console.error(err)
      }
    }
  }

  // ── Cambiar Estado de la Reunión ─────────────────────────────────────────────
  const handleStartMeeting = async () => {
    if (!id) return
    const toastId = toast.loading('Iniciando reunión...')
    try {
      await updateMeeting(id, { status: 'en_curso' as MeetingStatus })
      toast.success('La reunión ha iniciado. Ya puedes tomar asistencia.', { id: toastId })
      loadData()
    } catch (err: unknown) {
      toast.error('Error al iniciar reunión.', { id: toastId })
    }
  }

  const handleFinalizeMeeting = async () => {
    if (!id) return
    const toastId = toast.loading('Finalizando reunión...')
    try {
      await updateMeeting(id, { status: 'finalizada' as MeetingStatus })
      toast.success('Reunión finalizada con éxito.', { id: toastId })
      loadData()
    } catch (err: unknown) {
      toast.error('Error al finalizar reunión.', { id: toastId })
    }
  }

  // ── Cálculos de Asistencia ────────────────────────────────────────────────────
  const totalConvocados = invites.length

  const countByStatus = (status: AttendanceStatus) => {
    return attendances.filter((a) => a.status === status).length
  }

  const asistieronCount = countByStatus('asistio')
  const ausentesCount = countByStatus('ausente')
  const tardeCount = countByStatus('tarde')
  const justificadosCount = countByStatus('justificado')

  const pendientesCount = totalConvocados - (asistieronCount + ausentesCount + tardeCount + justificadosCount)

  // Filtrar la tabla de asistencia localmente
  const filteredInvites = invites.filter((invite) => {
    if (!invite.member) return false
    const fullName = `${invite.member.first_name} ${invite.member.last_name} ${invite.member.document_id}`
    return fullName.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Obtener IDs de socios ya convocados
  const alreadyInvokedMemberIds = new Set(invites.map((i) => i.member_id))

  if (loading && !currentMeeting) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        <p className="text-gray-500 mt-4">Cargando detalles de la reunión...</p>
      </div>
    )
  }

  if (error || !currentMeeting) {
    return (
      <div className="p-12 text-center text-red-600 space-y-4">
        <AlertCircle className="w-12 h-12 mx-auto" />
        <h3 className="text-lg font-bold">Error al cargar la reunión</h3>
        <p className="text-sm text-gray-500">{error || 'La reunión solicitada no existe o no tienes acceso.'}</p>
        <Button variant="outline" onClick={() => navigate('/reuniones')}>
          Volver a Reuniones
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Botón Volver ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/reuniones')}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver al listado
      </button>

      {/* ── Ficha Informativa de la Reunión ───────────────────────────────────── */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-gray-100 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    MEETING_TYPE_COLORS[currentMeeting.meeting_type] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {MEETING_TYPE_LABELS[currentMeeting.meeting_type]}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    MEETING_STATUS_COLORS[currentMeeting.status || 'programada']
                  }`}
                >
                  {MEETING_STATUS_LABELS[currentMeeting.status || 'programada']}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{currentMeeting.title}</h1>
              {currentMeeting.description && (
                <p className="text-gray-600 text-sm max-w-3xl whitespace-pre-line">{currentMeeting.description}</p>
              )}
            </div>

            {canManageMeetings && (
              <div className="flex items-center gap-2">
                {currentMeeting.status === 'programada' && (
                  <Button onClick={handleStartMeeting} className="bg-primary-600 hover:bg-primary-700 text-white text-sm">
                    Iniciar Reunión
                  </Button>
                )}
                {currentMeeting.status === 'en_curso' && (
                  <Button onClick={handleFinalizeMeeting} className="bg-green-600 hover:bg-green-700 text-white text-sm">
                    Finalizar Reunión
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div className="flex items-center space-x-3 text-gray-700">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-semibold text-gray-900">Fecha</p>
                <p>
                  {new Date(currentMeeting.date + 'T00:00:00').toLocaleDateString('es-EC', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-gray-700">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-semibold text-gray-900">Hora</p>
                <p>{currentMeeting.time ? currentMeeting.time.substring(0, 5) : '—'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-gray-700">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-semibold text-gray-900">Lugar</p>
                <p>{currentMeeting.location || 'No especificado'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPIs Asistencia ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Convocados</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalConvocados}</p>
        </div>

        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-center">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Asistieron</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{asistieronCount}</p>
        </div>

        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Faltaron</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{ausentesCount}</p>
        </div>

        <div className="p-4 bg-warning-50 border border-warning-100 rounded-2xl text-center">
          <p className="text-xs font-semibold text-warning-600 uppercase tracking-wider">Tarde</p>
          <p className="text-2xl font-bold text-warning-700 mt-1">{tardeCount}</p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Justificados</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{justificadosCount}</p>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl text-center">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Pendientes</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{pendientesCount}</p>
        </div>
      </div>

      {/* ── Control Operativo de Convocatorias y Asistencia ────────────────────── */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 relative">
              <Input
                placeholder="Buscar socios convocados por nombres o cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {canManageMeetings && currentMeeting.status !== 'cancelada' && (
              <Button
                variant="outline"
                className="flex items-center gap-2 shrink-0"
                onClick={() => setIsInviteOpen(true)}
              >
                <UserPlus className="w-4 h-4" />
                Convocar Socios
              </Button>
            )}
          </div>

          {totalConvocados === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-700 font-semibold mb-1">Reunión sin Convocados</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto mb-4">
                Esta reunión aún no cuenta con socios convocados. Debes convocar a los socios para poder registrar su asistencia.
              </p>
              {canManageMeetings && currentMeeting.status !== 'cancelada' && (
                <div className="flex items-center justify-center gap-3">
                  <Button variant="secondary" onClick={handleConvokeAll}>
                    Convocar Todos los Activos
                  </Button>
                  <Button variant="outline" onClick={() => setIsInviteOpen(true)}>
                    Seleccionar Socios
                  </Button>
                </div>
              )}
            </div>
          ) : filteredInvites.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No se encontraron socios convocados que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-semibold border-b">
                  <tr>
                    <th className="px-6 py-4">Socio / Cédula</th>
                    <th className="px-6 py-4">Contacto</th>
                    <th className="px-6 py-4">Estado de Asistencia</th>
                    <th className="px-6 py-4">Observación / Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvites.map((invite) => {
                    const member = invite.member
                    if (!member) return null

                    const currentAtt = attendances.find((a) => a.member_id === member.id)
                    const status = currentAtt?.status || null
                    const isSaving = savingAttendanceId === member.id

                    // La toma de asistencia solo está habilitada si la reunión está "en_curso" o "finalizada",
                    // y el usuario tiene permisos.
                    const isEditable =
                      canManageMeetings &&
                      (currentMeeting.status === 'en_curso' || currentMeeting.status === 'finalizada')

                    return (
                      <tr key={invite.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">
                            {member.last_name}, {member.first_name}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">C.I: {member.document_id}</div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-sm">{member.phone || '—'}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{member.email || 'Sin correo'}</div>
                        </td>

                        <td className="px-6 py-4">
                          {isEditable ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(['asistio', 'ausente', 'tarde', 'justificado'] as AttendanceStatus[]).map((st) => {
                                const active = status === st
                                let buttonClass = 'px-3 py-1 text-xs border rounded-lg font-medium transition-colors '
                                if (active) {
                                  if (st === 'asistio') buttonClass += 'bg-green-600 text-white border-green-600'
                                  if (st === 'ausente') buttonClass += 'bg-red-600 text-white border-red-600'
                                  if (st === 'tarde') buttonClass += 'bg-warning-500 text-white border-warning-500'
                                  if (st === 'justificado') buttonClass += 'bg-blue-600 text-white border-blue-600'
                                } else {
                                  buttonClass += 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                                }

                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStatusChange(member.id, st)}
                                    disabled={isSaving}
                                    className={buttonClass}
                                  >
                                    {ATTENDANCE_STATUS_LABELS[st]}
                                  </button>
                                )
                              })}
                              {isSaving && <Hourglass className="w-4 h-4 text-gray-400 animate-spin ml-2" />}
                            </div>
                          ) : (
                            <div>
                              {status ? (
                                <Badge variant={ATTENDANCE_STATUS_COLORS[status as AttendanceStatus]}>
                                  {ATTENDANCE_STATUS_LABELS[status as AttendanceStatus]}
                                </Badge>
                              ) : (
                                <Badge variant="warning">Pendiente</Badge>
                              )}
                              {!isEditable && currentMeeting.status === 'programada' && (
                                <p className="text-[10px] text-gray-400 mt-1 italic">
                                  Inicia la reunión para registrar asistencia
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={attendanceNotes[member.id] || ''}
                            onChange={(e) =>
                              setAttendanceNotes((prev) => ({ ...prev, [member.id]: e.target.value }))
                            }
                            onBlur={() => handleNotesBlur(member.id)}
                            disabled={!isEditable}
                            placeholder={isEditable ? "Agregar motivo/justificación..." : "Sin observaciones"}
                            className="w-full text-sm border-0 border-b border-transparent focus:border-primary-500 focus:ring-0 bg-transparent hover:bg-gray-50/50 p-1.5 rounded transition-all disabled:hover:bg-transparent"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal Convocatoria ───────────────────────────────────────────────── */}
      <InviteMembersModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onConvokeAll={handleConvokeAll}
        onConvokeSelected={handleConvokeSelected}
        alreadyInvokedMemberIds={alreadyInvokedMemberIds}
      />
    </div>
  )
}
