import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Calendar, AlertTriangle } from 'lucide-react'
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_COLORS } from '@/lib/constants'
import type { AttendanceStatus } from '@/types'

interface MemberMeetingsSectionProps {
  memberId: string
}

interface MemberMeetingAttendanceRow {
  id: string
  status: AttendanceStatus | null
  notes: string | null
  meeting: {
    title: string
    date: string
    time: string
    location: string | null
  }
}

export function MemberMeetingsSection({ memberId }: MemberMeetingsSectionProps) {
  const [history, setHistory] = useState<MemberMeetingAttendanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMemberAttendance() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('meeting_attendances')
          .select(`
            id,
            status,
            notes,
            meeting:meetings(
              title,
              date,
              time,
              location
            )
          `)
          .eq('member_id', memberId)

        if (err) throw err
        setHistory((data as unknown as MemberMeetingAttendanceRow[]) ?? [])
      } catch (e: unknown) {
        console.error('Error fetching member meeting attendance:', e)
        setError('No se pudo cargar el historial de asistencia.')
      } finally {
        setLoading(false)
      }
    }

    if (memberId) {
      fetchMemberAttendance()
    }
  }, [memberId])

  // Métricas
  const totalConvocatorias = history.length
  const asistencias = history.filter((h) => h.status === 'asistio').length
  const faltas = history.filter((h) => h.status === 'ausente').length
  const tardanzas = history.filter((h) => h.status === 'tarde').length

  const asistenciaRate = totalConvocatorias > 0
    ? Math.round(((asistencias + tardanzas) / totalConvocatorias) * 100)
    : 100

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Convocatorias</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{totalConvocatorias}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-center">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Asistencias</p>
          <p className="text-xl font-bold text-green-700 mt-1">{asistencias}</p>
        </div>
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Faltas</p>
          <p className="text-xl font-bold text-red-700 mt-1">{faltas}</p>
        </div>
        <div className="p-4 bg-warning-50 border border-warning-100 rounded-2xl text-center">
          <p className="text-xs font-semibold text-warning-600 uppercase tracking-wider">Atrasos</p>
          <p className="text-xl font-bold text-warning-700 mt-1">{tardanzas}</p>
        </div>
        <div className="p-4 bg-primary-50 border border-primary-100 rounded-2xl text-center">
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider">% Asistencia</p>
          <p className="text-xl font-bold text-primary-700 mt-1">{asistenciaRate}%</p>
        </div>
      </div>

      {/* Listado */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">Cargando historial...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 flex flex-col items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center gap-2">
              <Calendar className="w-8 h-8 text-gray-300" />
              <p>Este socio no registra asistencias a reuniones o asambleas.</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-semibold border-b">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Reunión</th>
                  <th className="px-6 py-4">Lugar</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {new Date(row.meeting.date + 'T00:00:00').toLocaleDateString('es-EC', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{row.meeting.title}</td>
                    <td className="px-6 py-4">{row.meeting.location || '—'}</td>
                    <td className="px-6 py-4">
                      {row.status ? (
                        <Badge variant={ATTENDANCE_STATUS_COLORS[row.status as AttendanceStatus]}>
                          {ATTENDANCE_STATUS_LABELS[row.status as AttendanceStatus]}
                        </Badge>
                      ) : (
                        <Badge variant="warning">Pendiente</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs italic">{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
