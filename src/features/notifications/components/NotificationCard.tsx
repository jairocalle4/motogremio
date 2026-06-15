import { useState } from 'react'
import { AppAlert } from '../hooks/useNotifications'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  ShieldAlert, Bell, 
  ExternalLink, Check, Calendar, Wallet, Bike, 
  FileText, ShieldCheck, HelpCircle
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface NotificationCardProps {
  alert: AppAlert
  onMarkAsRead: (id: string) => Promise<{ error: string | null }>
}

export function NotificationCard({ alert, onMarkAsRead }: NotificationCardProps) {
  const navigate = useNavigate()
  const [marking, setMarking] = useState(false)

  // Determinar icono de origen
  const getOriginIcon = () => {
    switch (alert.origin) {
      case 'documentos':
        return <FileText className="h-5 w-5" />
      case 'licencias':
        return <ShieldCheck className="h-5 w-5" />
      case 'finanzas':
        return <Wallet className="h-5 w-5" />
      case 'sanciones':
        return <ShieldAlert className="h-5 w-5" />
      case 'reuniones':
        return <Calendar className="h-5 w-5" />
      case 'unidades':
        return <Bike className="h-5 w-5" />
      case 'sistema':
        return <Bell className="h-5 w-5" />
      default:
        return <HelpCircle className="h-5 w-5" />
    }
  }

  // Determinar color de la severidad
  const getSeverityStyle = () => {
    if (alert.is_persistent && alert.is_read) {
      return {
        bg: 'bg-gray-50 border-gray-100',
        text: 'text-gray-400',
        iconBg: 'bg-gray-100 text-gray-400',
        border: 'border-l-4 border-l-gray-300'
      }
    }

    switch (alert.severity) {
      case 'critica':
        return {
          bg: 'bg-danger-50/30 border-danger-100',
          text: 'text-danger-900',
          iconBg: 'bg-danger-50 text-danger-600',
          border: 'border-l-4 border-l-danger-500'
        }
      case 'advertencia':
        return {
          bg: 'bg-warning-50/30 border-warning-100',
          text: 'text-warning-900',
          iconBg: 'bg-warning-50 text-warning-600',
          border: 'border-l-4 border-l-warning-500'
        }
      case 'informativa':
      default:
        return {
          bg: 'bg-info-50/20 border-info-100',
          text: 'text-info-900',
          iconBg: 'bg-info-50 text-info-600',
          border: 'border-l-4 border-l-info-500'
        }
    }
  }

  const styles = getSeverityStyle()

  const handleActionClick = () => {
    if (alert.link_url) {
      navigate(alert.link_url)
    }
  }

  const handleMarkAsRead = async () => {
    if (!alert.can_mark_read) return
    setMarking(true)
    await onMarkAsRead(alert.id)
    setMarking(false)
  }

  return (
    <div className={`p-4 rounded-xl border ${styles.bg} ${styles.border} shadow-sm flex flex-col sm:flex-row gap-4 items-start justify-between transition-all`}>
      <div className="flex gap-3 items-start flex-1">
        {/* Icono del Origen */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${styles.iconBg}`}>
          {getOriginIcon()}
        </div>

        {/* Contenido */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
              {alert.title}
            </h4>
            <Badge variant={
              alert.is_persistent && alert.is_read ? 'info' :
              alert.severity === 'critica' ? 'danger' :
              alert.severity === 'advertencia' ? 'warning' : 'info'
            }>
              {alert.is_persistent && alert.is_read ? 'Leída' : alert.severity.toUpperCase()}
            </Badge>
            {alert.origin !== 'sistema' && (
              <Badge variant="info" className="capitalize">
                {alert.origin}
              </Badge>
            )}
          </div>

          <p className="text-sm text-gray-600 leading-normal">
            {alert.message}
          </p>

          {alert.entity_name && (
            <p className="text-xs font-semibold text-gray-500">
              {alert.entity_name}
            </p>
          )}

          {alert.created_at && (
            <p className="text-xs text-gray-400 mt-1.5 block">
              Hace {formatDistanceToNow(parseISO(alert.created_at.split('T')[0]), { addSuffix: false, locale: es })}
            </p>
          )}

          {/* Notificaciones globales */}
          {alert.is_persistent && !alert.can_mark_read && (
            <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium mt-1 inline-block">
              Notificación general de compañía (lectura global)
            </span>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
        {alert.is_persistent && alert.can_mark_read && !alert.is_read && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAsRead}
            disabled={marking}
            className="flex items-center gap-1 text-xs"
          >
            <Check className="h-3.5 w-3.5" />
            {marking ? 'Marcando...' : 'Leída'}
          </Button>
        )}

        {alert.link_url && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleActionClick}
            className="flex items-center gap-1 text-xs bg-primary-600 hover:bg-primary-700 text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ir al módulo
          </Button>
        )}
      </div>
    </div>
  )
}
