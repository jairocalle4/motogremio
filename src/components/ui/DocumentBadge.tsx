import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import type { Database } from '@/types/database.types'

type DocumentStatus = Database['public']['Enums']['document_status']

interface DocumentBadgeProps {
  status?: DocumentStatus | null
  className?: string
  compact?: boolean
}

const statusConfig: Record<DocumentStatus | 'vacio', { label: string, icon: any, classes: string }> = {
  vigente: {
    label:    'Vigente',
    icon:     CheckCircle,
    classes:  'bg-success-50 text-success-700 border-success-200',
  },
  por_vencer: {
    label:    'Por vencer',
    icon:     Clock,
    classes:  'bg-amber-50 text-amber-700 border-amber-200',
  },
  vencido: {
    label:    'Vencido',
    icon:     AlertTriangle,
    classes:  'bg-danger-50 text-danger-700 border-danger-200',
  },
  vacio: {
    label:    'Sin estado',
    icon:     CheckCircle,
    classes:  'bg-gray-100 text-gray-500 border-gray-200',
  }
}

export function DocumentBadge({ status, className, compact = false }: DocumentBadgeProps) {
  const config = statusConfig[status || 'vacio']
  const Icon = config.icon

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
          config.classes,
          className
        )}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium',
        config.classes,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </div>
  )
}
