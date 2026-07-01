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
    const isSuperAdmin = profile?.role === 'super_admin'
    if (!companyId && !isSuperAdmin) return
    setLoading(true)
    setError(null)

    try {
      if (isSuperAdmin) {
        const { data, error: rpcError } = await supabase.rpc('get_super_admin_alerts')
        if (rpcError) throw rpcError

        const list = (data || []) as any[]
        const mappedAlerts: AppAlert[] = list.map((alert: any) => {
          let severity: AlertSeverity = 'informativa'
          if (alert.severity === 'critical') severity = 'critica'
          else if (alert.severity === 'warning') severity = 'advertencia'

          return {
            id: alert.id,
            title: alert.title,
            message: alert.description,
            severity,
            origin: 'sistema',
            link_url: alert.action_href || undefined,
            is_persistent: false,
            is_read: false,
            can_mark_read: false
          }
        })

        setAlerts(mappedAlerts)
        setCounts({
          total: list.length,
          critical: list.filter(a => a.severity === 'critical').length,
          warning: list.filter(a => a.severity === 'warning').length,
          info: list.filter(a => a.severity === 'info').length,
          unread: 0
        })
      } else {
        const { data, error: rpcError } = await (supabase as any).rpc('get_alerts_summary')
        if (rpcError) throw rpcError

        const rpcResult = data as any
        if (rpcResult) {
          const mappedAlerts: AppAlert[] = (rpcResult.alerts || []).map((alert: any) => {
            let severity: AlertSeverity = 'informativa'
            if (alert.severity === 'critical') severity = 'critica'
            else if (alert.severity === 'warning') severity = 'advertencia'

            const origin: AlertOrigin = (alert.source || 'sistema') as AlertOrigin
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
              can_mark_read: isPersistent && userId !== undefined,
              scope: alert.scope || undefined
            }
          })

          setAlerts(mappedAlerts)

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
      }
    } catch (err: any) {
      setError(err.message || 'Error cargando las alertas')
      console.error('Error fetching alerts from RPC:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId, userId, profile])

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
