import { useState, useMemo } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { AlertSummaryCards } from '../components/AlertSummaryCards'
import { NotificationFilters } from '../components/NotificationFilters'
import { NotificationCard } from '../components/NotificationCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Bell } from 'lucide-react'

export function NotificationsPage() {
  const { alerts, loading, error, refresh, markAsRead } = useNotifications()

  // Filtros locales
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [originFilter, setOriginFilter] = useState('')

  // 1. Calcular cantidades para tarjetas de KPIs
  const criticalCount = useMemo(() => alerts.filter(a => a.severity === 'critica' && !(a.is_persistent && a.is_read)).length, [alerts])
  const warningCount = useMemo(() => alerts.filter(a => a.severity === 'advertencia').length, [alerts])
  const infoCount = useMemo(() => alerts.filter(a => a.severity === 'informativa' && !a.is_persistent).length, [alerts])
  const systemCount = useMemo(() => alerts.filter(a => a.is_persistent).length, [alerts])

  // 2. Filtrar lista
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Búsqueda por término
      const matchesSearch = searchTerm === '' || 
        alert.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (alert.entity_name && alert.entity_name.toLowerCase().includes(searchTerm.toLowerCase()))

      // Filtro de severidad
      const matchesSeverity = severityFilter === '' || alert.severity === severityFilter

      // Filtro de origen/módulo
      const matchesOrigin = originFilter === '' || alert.origin === originFilter

      return matchesSearch && matchesSeverity && matchesOrigin
    })
  }, [alerts, searchTerm, severityFilter, originFilter])

  return (
    <div className="page-container p-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary-600 shrink-0" />
            Centro de Alertas y Notificaciones
          </h2>
          <p className="text-sm text-gray-500">
            Supervisión interna de problemas operativos, deudas, documentos y reuniones.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refrescar Alertas
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger-50 border border-danger-100 text-danger-900 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Tarjetas KPI de Resumen */}
      <AlertSummaryCards
        criticalCount={criticalCount}
        warningCount={warningCount}
        infoCount={infoCount}
        systemCount={systemCount}
      />

      {/* Filtros */}
      <NotificationFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        severityFilter={severityFilter}
        onSeverityFilterChange={setSeverityFilter}
        originFilter={originFilter}
        onOriginFilterChange={setOriginFilter}
      />

      {/* Listado principal */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner className="h-10 w-10 text-primary-600" />
          <p className="text-sm text-gray-500 mt-4 font-medium">
            Procesando alertas operativas en tiempo real...
          </p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          type="empty"
          title="Sin Alertas"
          description="Felicidades, no hay alertas activas que coincidan con los filtros seleccionados."
        />
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <NotificationCard
              key={alert.id}
              alert={alert}
              onMarkAsRead={markAsRead}
            />
          ))}
        </div>
      )}
    </div>
  )
}
