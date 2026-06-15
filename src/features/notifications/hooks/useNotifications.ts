import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import { differenceInDays, isBefore, startOfDay, parseISO } from 'date-fns'

export type AlertSeverity = 'critica' | 'advertencia' | 'informativa'
export type AlertOrigin = 'documentos' | 'licencias' | 'finanzas' | 'sanciones' | 'reuniones' | 'unidades' | 'sistema'

export interface AppAlert {
  id: string
  title: string
  message: string
  severity: AlertSeverity
  origin: AlertOrigin
  link_url?: string
  days_overdue?: number
  entity_name?: string
  created_at?: string
  is_persistent?: boolean
  is_read?: boolean
  can_mark_read?: boolean
}

export function useNotifications() {
  const { profile } = useAuth()
  const companyId = profile?.company_id
  const userId = profile?.id

  const [alerts, setAlerts] = useState<AppAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)

    try {
      const today = startOfDay(new Date())

      // 1. Fetch data in parallel to optimize performance
      const [
        { data: documents, error: docsErr },
        { data: licenses, error: licErr },
        { data: drivers, error: driErr },
        { data: members, error: memErr },
        { data: charges, error: chgErr },
        { data: sanctions, error: sancErr },
        { data: meetings, error: meetErr },
        { data: vehicles, error: vehErr },
        { data: dbNotifications, error: notifErr },
        { data: attendances, error: attErr }
      ] = await Promise.all([
        supabase
          .from('documents')
          .select('id, expiry_date, status, document_types(id, name, target_entity), member_id, vehicle_id, driver_id, members(first_name, last_name), vehicles(disk_number, plate), drivers(first_name, last_name)')
          .eq('company_id', companyId),
        supabase
          .from('licenses')
          .select('id, license_number, license_type, expiry_date, status, member_id, driver_id, members(first_name, last_name), drivers(first_name, last_name)')
          .eq('company_id', companyId),
        supabase
          .from('drivers')
          .select('id, first_name, last_name, status')
          .eq('company_id', companyId),
        supabase
          .from('members')
          .select('id, first_name, last_name, status')
          .eq('company_id', companyId),
        supabase
          .from('charges')
          .select('id, balance, due_date, status, description, member_id, members(first_name, last_name), vehicle_id')
          .eq('company_id', companyId)
          .gt('balance', 0)
          .neq('status', 'anulada'),
        supabase
          .from('sanctions')
          .select('id, date, reason, status, meeting_id, member_id, members(first_name, last_name), charge_id, charges(balance, status)')
          .eq('company_id', companyId)
          .in('status', ['pendiente', 'apelacion']),
        supabase
          .from('meetings')
          .select('id, title, date, time, meeting_type, status')
          .eq('company_id', companyId),
        supabase
          .from('vehicles')
          .select('id, disk_number, plate, status, driver_id')
          .eq('company_id', companyId),
        supabase
          .from('notifications')
          .select('id, title, message, type, is_read, link_url, created_at, user_id')
          .eq('company_id', companyId)
          .or(`user_id.eq.${userId},user_id.is.null`)
          .order('created_at', { ascending: false }),
        supabase
          .from('meeting_attendances')
          .select('meeting_id')
      ])

      if (docsErr) throw docsErr
      if (licErr) throw licErr
      if (driErr) throw driErr
      if (memErr) throw memErr
      if (chgErr) throw chgErr
      if (sancErr) throw sancErr
      if (meetErr) throw meetErr
      if (vehErr) throw vehErr
      if (notifErr) throw notifErr
      if (attErr) throw attErr

      const computedAlerts: AppAlert[] = []

      // ─── 1. DOCUMENTOS VENCIDOS Y POR VENCER ───────────────────
      if (documents) {
        documents.forEach((doc: any) => {
          if (!doc.expiry_date) {
            // Informativo si no tiene fecha de caducidad registrada pero se requiere
            return
          }

          const expiry = startOfDay(parseISO(doc.expiry_date))
          const daysLeft = differenceInDays(expiry, today)
          const typeName = doc.document_types?.name || 'Documento'

          let entityName = ''
          let linkUrl = ''

          if (doc.members) {
            entityName = `Socio: ${doc.members.first_name} ${doc.members.last_name}`
            linkUrl = `/socios/${doc.member_id}`
          } else if (doc.vehicles) {
            entityName = `Unidad: Disco ${doc.vehicles.disk_number} (${doc.vehicles.plate})`
            linkUrl = `/unidades/${doc.vehicle_id}`
          } else if (doc.drivers) {
            entityName = `Conductor: ${doc.drivers.first_name} ${doc.drivers.last_name}`
            linkUrl = `/conductores/${doc.driver_id}`
          }

          if (isBefore(expiry, today)) {
            computedAlerts.push({
              id: `doc-vencido-${doc.id}`,
              title: 'Documento Vencido',
              message: `El documento "${typeName}" ha vencido hace ${Math.abs(daysLeft)} días.`,
              severity: 'critica',
              origin: 'documentos',
              link_url: linkUrl,
              days_overdue: Math.abs(daysLeft),
              entity_name: entityName,
              created_at: doc.expiry_date
            })
          } else if (daysLeft <= 30) {
            const severity: AlertSeverity = daysLeft <= 7 ? 'critica' : 'advertencia'
            computedAlerts.push({
              id: `doc-por-vencer-${doc.id}`,
              title: `Documento por Vencer (${daysLeft} días)`,
              message: `El documento "${typeName}" vencerá el ${doc.expiry_date}.`,
              severity,
              origin: 'documentos',
              link_url: linkUrl,
              days_overdue: 0,
              entity_name: entityName,
              created_at: doc.expiry_date
            })
          }
        })
      }

      // ─── 2. LICENCIAS DE CONDUCIR A1 / OTRAS ───────────────────
      if (licenses) {
        licenses.forEach((lic: any) => {
          const expiry = startOfDay(parseISO(lic.expiry_date))
          const daysLeft = differenceInDays(expiry, today)
          const typeName = `Licencia Tipo ${lic.license_type || '—'}`

          let entityName = ''
          let linkUrl = ''

          if (lic.members) {
            entityName = `Socio: ${lic.members.first_name} ${lic.members.last_name}`
            linkUrl = `/socios/${lic.member_id}`
          } else if (lic.drivers) {
            entityName = `Conductor: ${lic.drivers.first_name} ${lic.drivers.last_name}`
            linkUrl = `/conductores/${lic.driver_id}`
          }

          if (isBefore(expiry, today)) {
            computedAlerts.push({
              id: `lic-vencida-${lic.id}`,
              title: 'Licencia Vencida',
              message: `La ${typeName} (No. ${lic.license_number || '—'}) ha vencido hace ${Math.abs(daysLeft)} días.`,
              severity: 'critica',
              origin: 'licencias',
              link_url: linkUrl,
              days_overdue: Math.abs(daysLeft),
              entity_name: entityName,
              created_at: lic.expiry_date
            })
          } else if (daysLeft <= 30) {
            const severity: AlertSeverity = daysLeft <= 7 ? 'critica' : 'advertencia'
            computedAlerts.push({
              id: `lic-por-vencer-${lic.id}`,
              title: `Licencia por Vencer (${daysLeft} días)`,
              message: `La ${typeName} (No. ${lic.license_number || '—'}) vencerá el ${lic.expiry_date}.`,
              severity,
              origin: 'licencias',
              link_url: linkUrl,
              days_overdue: 0,
              entity_name: entityName,
              created_at: lic.expiry_date
            })
          }
        })
      }

      // Conductor/Socio sin licencia registrada
      if (drivers) {
        drivers.forEach((dri: any) => {
          const hasLic = licenses?.some((lic: any) => lic.driver_id === dri.id)
          if (!hasLic && dri.status === 'activo') {
            computedAlerts.push({
              id: `dri-sin-lic-${dri.id}`,
              title: 'Conductor sin Licencia',
              message: `El conductor "${dri.first_name} ${dri.last_name}" está activo pero no posee ninguna licencia registrada en el sistema.`,
              severity: 'critica',
              origin: 'licencias',
              link_url: `/conductores/${dri.id}`,
              entity_name: `Conductor: ${dri.first_name} ${dri.last_name}`
            })
          }
        })
      }

      if (members) {
        members.forEach((mem: any) => {
          const hasLic = licenses?.some((lic: any) => lic.member_id === mem.id)
          if (!hasLic && mem.status === 'activo') {
            computedAlerts.push({
              id: `mem-sin-lic-${mem.id}`,
              title: 'Socio sin Licencia',
              message: `El socio "${mem.first_name} ${mem.last_name}" está activo pero no posee ninguna licencia registrada en el sistema.`,
              severity: 'critica',
              origin: 'licencias',
              link_url: `/socios/${mem.id}`,
              entity_name: `Socio: ${mem.first_name} ${mem.last_name}`
            })
          }
        })
      }

      // ─── 3. DEUDAS Y CUOTAS ────────────────────────────────────
      if (charges) {
        charges.forEach((chg: any) => {
          const dueDate = startOfDay(parseISO(chg.due_date))
          const daysOverdue = differenceInDays(today, dueDate)
          const entityName = chg.members ? `Socio: ${chg.members.first_name} ${chg.members.last_name}` : 'Socio Desconocido'

          if (isBefore(dueDate, today)) {
            computedAlerts.push({
              id: `cuota-vencida-${chg.id}`,
              title: 'Cuota/Deuda Vencida',
              message: `El cargo "${chg.description}" con saldo pendiente de $${chg.balance.toFixed(2)} venció el ${chg.due_date}.`,
              severity: 'critica',
              origin: 'finanzas',
              link_url: `/pagos`,
              days_overdue: daysOverdue,
              entity_name: entityName,
              created_at: chg.due_date
            })
          } else {
            // Próximo a vencer
            const daysLeft = differenceInDays(dueDate, today)
            if (daysLeft <= 7) {
              computedAlerts.push({
                id: `cuota-por-vencer-${chg.id}`,
                title: 'Cuota por Vencer',
                message: `El cargo "${chg.description}" con saldo de $${chg.balance.toFixed(2)} vence pronto (${chg.due_date}).`,
                severity: 'advertencia',
                origin: 'finanzas',
                link_url: `/pagos`,
                entity_name: entityName,
                created_at: chg.due_date
              })
            }
          }
        })

        // Deuda acumulada por socio (agrupado)
        const memberDebts: Record<string, { name: string, total: number, count: number }> = {}
        charges.forEach((chg: any) => {
          if (chg.balance > 0 && chg.members) {
            const mId = chg.member_id
            if (!memberDebts[mId]) {
              memberDebts[mId] = {
                name: `${chg.members.first_name} ${chg.members.last_name}`,
                total: 0,
                count: 0
              }
            }
            memberDebts[mId].total += chg.balance
            memberDebts[mId].count += 1
          }
        })

        Object.entries(memberDebts).forEach(([mId, data]) => {
          if (data.total >= 50) { // Umbral de $50 para considerarlo alerta de morosidad
            computedAlerts.push({
              id: `moroso-${mId}`,
              title: 'Socio Moroso (Deuda Alta)',
              message: `El socio acumula $${data.total.toFixed(2)} de saldo pendiente en ${data.count} cargos.`,
              severity: 'critica',
              origin: 'finanzas',
              link_url: `/socios/${mId}`,
              entity_name: `Socio: ${data.name}`
            })
          }
        })
      }

      // ─── 4. SANCIONES PENDIENTES O APELADAS ────────────────────
      if (sanctions) {
        sanctions.forEach((sanc: any) => {
          const entityName = sanc.members ? `Socio: ${sanc.members.first_name} ${sanc.members.last_name}` : 'Socio Desconocido'
          const isMeetingSanction = !!sanc.meeting_id
          const hasPendingDebt = sanc.charges ? (sanc.charges.balance > 0 && sanc.charges.status !== 'anulada') : false

          if (sanc.status === 'pendiente') {
            computedAlerts.push({
              id: `sanc-pend-${sanc.id}`,
              title: isMeetingSanction ? 'Sanción por Inasistencia' : 'Sanción Pendiente',
              message: `Sanción por "${sanc.reason}" está pendiente de resolución.${hasPendingDebt ? ' Tiene multa pendiente de pago.' : ''}`,
              severity: isMeetingSanction ? 'critica' : 'advertencia',
              origin: 'sanciones',
              link_url: `/sanciones`,
              entity_name: entityName,
              created_at: sanc.date
            })
          } else if (sanc.status === 'apelacion') {
            computedAlerts.push({
              id: `sanc-apel-${sanc.id}`,
              title: 'Sanción Apelada',
              message: `El socio ha apelado la sanción por "${sanc.reason}". Requiere revisión de la directiva.`,
              severity: 'advertencia',
              origin: 'sanciones',
              link_url: `/sanciones`,
              entity_name: entityName,
              created_at: sanc.date
            })
          }
        })
      }

      // ─── 5. REUNIONES Y ASISTENCIAS ────────────────────────────
      if (meetings) {
        meetings.forEach((meet: any) => {
          const meetDate = startOfDay(parseISO(meet.date))

          // Próximas reuniones (dentro de 3 días)
          if (meet.status === 'programada') {
            const daysLeft = differenceInDays(meetDate, today)
            if (daysLeft >= 0 && daysLeft <= 3) {
              computedAlerts.push({
                id: `meet-prox-${meet.id}`,
                title: 'Reunión Próxima',
                message: `La reunión/asamblea "${meet.title}" está programada para el ${meet.date} a las ${meet.time || '—'}.`,
                severity: 'informativa',
                origin: 'reuniones',
                link_url: `/reuniones/${meet.id}`,
                created_at: meet.date
              })
            }
          }

          // Reuniones pasadas programadas o en curso
          if (isBefore(meetDate, today) && (meet.status === 'programada' || meet.status === 'en_curso')) {
            computedAlerts.push({
              id: `meet-atrasada-${meet.id}`,
              title: 'Reunión sin Cerrar',
              message: `La reunión "${meet.title}" del ${meet.date} ya pasó pero no se ha marcado como Finalizada o Cancelada.`,
              severity: 'advertencia',
              origin: 'reuniones',
              link_url: `/reuniones/${meet.id}`,
              created_at: meet.date
            })
          }

          // Reuniones pasadas sin asistencia registrada
          if (isBefore(meetDate, today) && meet.status !== 'cancelada') {
            const hasAtt = attendances?.some((att: any) => att.meeting_id === meet.id)
            if (!hasAtt) {
              computedAlerts.push({
                id: `meet-sin-att-${meet.id}`,
                title: 'Asistencia no Registrada',
                message: `La reunión "${meet.title}" del ${meet.date} no tiene ningún registro de asistencia guardado.`,
                severity: 'critica',
                origin: 'reuniones',
                link_url: `/reuniones/${meet.id}`,
                created_at: meet.date
              })
            }
          }
        })
      }

      // ─── 6. UNIDADES O MOTOTAXIS ───────────────────────────────
      if (vehicles) {
        vehicles.forEach((veh: any) => {
          if (veh.status === 'activa') {
            // Unidad activa sin conductor
            if (!veh.driver_id) {
              computedAlerts.push({
                id: `veh-sin-cond-${veh.id}`,
                title: 'Unidad sin Conductor',
                message: `La unidad con Disco ${veh.disk_number} (${veh.plate}) está activa pero no tiene conductor asignado.`,
                severity: 'advertencia',
                origin: 'unidades',
                link_url: `/unidades/${veh.id}`,
                entity_name: `Disco ${veh.disk_number}`
              })
            }

            // Si los documentos de la unidad están vencidos
            const vehDocs = documents?.filter((d: any) => d.vehicle_id === veh.id)
            const hasVencido = vehDocs?.some((d: any) => isBefore(startOfDay(parseISO(d.expiry_date)), today))
            if (hasVencido) {
              computedAlerts.push({
                id: `veh-docs-vencidos-${veh.id}`,
                title: 'Unidad con Documentos Vencidos',
                message: `La unidad Disco ${veh.disk_number} tiene uno o más documentos vencidos.`,
                severity: 'critica',
                origin: 'unidades',
                link_url: `/unidades/${veh.id}`,
                entity_name: `Disco ${veh.disk_number}`
              })
            }
          }
        })
      }

      // ─── 7. NOTIFICACIONES PERSISTENTES (SISTEMA) ──────────────
      if (dbNotifications) {
        dbNotifications.forEach((notif: any) => {
          computedAlerts.push({
            id: `notif-${notif.id}`,
            title: notif.title,
            message: notif.message,
            severity: notif.type === 'alerta' ? 'critica' : 'informativa',
            origin: 'sistema',
            link_url: notif.link_url || undefined,
            is_persistent: true,
            is_read: !!notif.is_read,
            can_mark_read: notif.user_id !== null && notif.user_id === userId,
            created_at: notif.created_at || undefined
          })
        })
      }

      // Ordenar por severidad y luego por fecha
      const severityWeight = { critica: 3, advertencia: 2, informativa: 1 }
      const sorted = computedAlerts.sort((a, b) => {
        const wA = severityWeight[a.severity]
        const wB = severityWeight[b.severity]
        if (wA !== wB) return wB - wA
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateB - dateA
      })

      setAlerts(sorted)
    } catch (err: any) {
      setError(err.message || 'Error calculando las alertas')
      console.error('Error fetching alerts:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId, userId])

  const markAsRead = async (id: string) => {
    const realId = id.replace('notif-', '')
    const target = alerts.find(a => a.id === id)
    if (!target || !target.is_persistent) return { error: 'No es una notificación persistente' }
    if (!target.can_mark_read) return { error: 'No tienes permisos para marcar esta notificación como leída' }

    try {
      const { error: updError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', realId)

      if (updError) throw updError

      // Actualizar estado local
      setAlerts(prev =>
        prev.map(a => (a.id === id ? { ...a, is_read: true } : a))
      )
      return { error: null }
    } catch (err: any) {
      console.error('Error marking notification as read:', err)
      return { error: err.message }
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  return {
    alerts,
    loading,
    error,
    refresh: fetchAlerts,
    markAsRead
  }
}
