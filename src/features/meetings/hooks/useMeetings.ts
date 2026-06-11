import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import type { Meeting, MeetingInvite, MeetingAttendance, MeetingType, MeetingStatus, AttendanceStatus } from '@/types'

export interface MeetingFormData {
  title: string
  description?: string
  meeting_type: MeetingType
  date: string
  time: string
  location?: string
  is_mandatory?: boolean
}

export function useMeetings() {
  const { profile } = useAuth()
  const companyId = profile?.company_id

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null)
  const [invites, setInvites] = useState<MeetingInvite[]>([])
  const [attendances, setAttendances] = useState<MeetingAttendance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMeetings = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('meetings')
        .select('*')
        .eq('company_id', companyId)
        .order('date', { ascending: false })
        .order('time', { ascending: false })

      if (err) throw err
      setMeetings((data as Meeting[]) ?? [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar las reuniones'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  const fetchMeetingById = useCallback(async (id: string) => {
    if (!companyId) return null
    setLoading(true)
    setError(null)
    try {
      // 1. Cargar datos de la reunión
      const { data: meeting, error: mErr } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

      if (mErr) throw mErr

      // 2. Cargar convocados (invites)
      const { data: invitesData, error: iErr } = await supabase
        .from('meeting_invites')
        .select(`
          *,
          member:members(id, first_name, last_name, document_id, phone, email, status)
        `)
        .eq('meeting_id', id)
        .eq('company_id', companyId)

      if (iErr) throw iErr

      // 3. Cargar asistencia (attendances)
      const { data: attData, error: aErr } = await supabase
        .from('meeting_attendances')
        .select(`
          *,
          member:members(id, first_name, last_name, document_id, phone, email, status)
        `)
        .eq('meeting_id', id)

      if (aErr) throw aErr

      const mappedMeeting = meeting as Meeting
      setCurrentMeeting(mappedMeeting)
      setInvites((invitesData as unknown as MeetingInvite[]) ?? [])
      setAttendances((attData as unknown as MeetingAttendance[]) ?? [])

      return {
        meeting: mappedMeeting,
        invites: (invitesData as unknown as MeetingInvite[]) ?? [],
        attendances: (attData as unknown as MeetingAttendance[]) ?? [],
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar detalle de la reunión'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [companyId])

  const createMeeting = useCallback(async (formData: MeetingFormData) => {
    if (!companyId) return null
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('meetings')
        .insert({
          company_id: companyId,
          title: formData.title,
          description: formData.description || null,
          meeting_type: formData.meeting_type,
          date: formData.date,
          time: formData.time,
          location: formData.location || null,
          is_mandatory: formData.is_mandatory ?? true,
          status: 'programada' as MeetingStatus,
        })
        .select()
        .single()

      if (err) throw err
      await fetchMeetings()
      return data as Meeting
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear la reunión'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId, fetchMeetings])

  const updateMeeting = useCallback(async (id: string, formData: Partial<MeetingFormData> & { status?: MeetingStatus }) => {
    if (!companyId) return null
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('meetings')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (err) throw err
      if (currentMeeting?.id === id) {
        setCurrentMeeting(data as Meeting)
      }
      await fetchMeetings()
      return data as Meeting
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar la reunión'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId, currentMeeting, fetchMeetings])

  const cancelMeeting = useCallback(async (id: string) => {
    return updateMeeting(id, { status: 'cancelada' })
  }, [updateMeeting])

  /**
   * Convoca a todos los socios activos de la compañía.
   */
  const convokeActiveMembers = useCallback(async (meetingId: string) => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      // 1. Obtener todos los socios activos de la cooperativa
      const { data: members, error: mErr } = await supabase
        .from('members')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'activo')

      if (mErr) throw mErr
      if (!members || members.length === 0) {
        throw new Error('No hay socios activos registrados para convocar.')
      }

      // 2. Construir los registros a insertar
      const records = members.map(m => ({
        company_id: companyId,
        meeting_id: meetingId,
        member_id: m.id,
        invitation_status: 'convocado',
        email_status: 'pendiente' as any,
        whatsapp_status: 'pendiente' as any,
      }))

      // 3. Insertar con ON CONFLICT DO NOTHING (gracias al índice único)
      const { error: insErr } = await supabase
        .from('meeting_invites')
        .upsert(records, { onConflict: 'meeting_id,member_id' })

      if (insErr) throw insErr

      // 4. Recargar el detalle
      await fetchMeetingById(meetingId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al convocar socios'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId, fetchMeetingById])

  /**
   * Convoca a una lista seleccionada de socios.
   */
  const convokeSelectedMembers = useCallback(async (meetingId: string, memberIds: string[]) => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      if (memberIds.length === 0) return

      const records = memberIds.map(mId => ({
        company_id: companyId,
        meeting_id: meetingId,
        member_id: mId,
        invitation_status: 'convocado',
        email_status: 'pendiente' as any,
        whatsapp_status: 'pendiente' as any,
      }))

      const { error: insErr } = await supabase
        .from('meeting_invites')
        .upsert(records, { onConflict: 'meeting_id,member_id' })

      if (insErr) throw insErr
      await fetchMeetingById(meetingId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al convocar socios seleccionados'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId, fetchMeetingById])

  /**
   * Guarda o actualiza la asistencia de un socio.
   */
  const saveAttendance = useCallback(async (meetingId: string, memberId: string, status: AttendanceStatus, notes?: string) => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const { error: attErr } = await supabase
        .from('meeting_attendances')
        .upsert({
          meeting_id: meetingId,
          member_id: memberId,
          status: status as any,
          notes: notes || null,
          check_in_time: status === 'asistio' || status === 'tarde' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'meeting_id,member_id' })

      if (attErr) throw attErr
      await fetchMeetingById(meetingId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar asistencia'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [companyId, fetchMeetingById])

  return {
    meetings,
    currentMeeting,
    invites,
    attendances,
    loading,
    error,
    fetchMeetings,
    fetchMeetingById,
    createMeeting,
    updateMeeting,
    cancelMeeting,
    convokeActiveMembers,
    convokeSelectedMembers,
    saveAttendance,
  }
}
