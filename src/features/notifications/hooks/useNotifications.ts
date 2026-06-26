import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'

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
  due_date?: string
  days_remaining?: number
  scope?: string
}

export interface AlertCounts {
  total: number
  critical: number
  warning: number
  info: number
  unread: number
}

export function useNotifications() {
  const { profile } = useAuth()
  const companyId = profile?.company_id
  const userId = profile?.id

  const [alerts, setAlerts] = useState<AppAlert[]>([])
  const [counts, setCounts] = useState<AlertCounts>({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
    unread: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await (supabase as any).rpc('get_alerts_summary')

      if (rpcError) throw rpcError

      const rpcResult = data as any
      if (rpcResult) {
        // Mapear la respuesta de la RPC a la interfaz del frontend
        const mappedAlerts: AppAlert[] = (rpcResult.alerts || []).map((alert: any) => {
          // Mapeo de severidad: DB -> UI
          let severity: AlertSeverity = 'informativa'
          if (alert.severity === 'critical') severity = 'critica'
          else if (alert.severity === 'warning') severity = 'advertencia'

          // Mapeo de origen
          const origin: AlertOrigin = (alert.source || 'sistema') as AlertOrigin

          // Determinar si es persistente (viene de la tabla de notificaciones)
          const isPersistent = alert.source === 'sistema'

          return {
            id: alert.id,
            title: alert.title,
            message: alert.message,
            severity,
            origin,
            link_url: alert.link_url || undefined,
            days_overdue: alert.days_remaining !== null && alert.days_remaining < 0 ? Math.abs(alert.days_remaining) : undefined,
            days_remaining: alert.days_remaining !== null ? alert.days_remaining : undefined,
            due_date: alert.due_date || undefined,
            is_persistent: isPersistent,
            is_read: !!alert.is_read,
            can_mark_read: isPersistent && userId !== undefined, // Solo si es persistente y hay sesión activa
            scope: alert.scope || undefined
          }
        })

        setAlerts(mappedAlerts)

        // Mapear los contadores
        if (rpcResult.counts) {
          setCounts({
            total: rpcResult.counts.total || 0,
            critical: rpcResult.counts.critical || 0,
            warning: rpcResult.counts.warning || 0,
            info: rpcResult.counts.info || 0,
            unread: rpcResult.counts.unread || 0
          })
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error cargando las alertas')
      console.error('Error fetching alerts from RPC:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId, userId])

  const markAsRead = async (id: string) => {
    const realId = id.replace('notif-', '')
    const target = alerts.find(a => a.id === id)
    if (!target || !target.is_persistent) return { error: 'No es una notificación persistente' }

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
      // Actualizar el conteo de no leídas
      setCounts(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1)
      }))
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
    counts,
    loading,
    error,
    refresh: fetchAlerts,
    markAsRead
  }
}
