import { cn } from '@/lib/utils'
import { getLicenseStatus } from '@/hooks/useDrivers'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import type { DocumentStatus } from '@/types'

interface LicenseBadgeProps {
  expiryDate?: string | null
  licenseNumber?: string | null
  licenseType?: string
  /** Si se pasa status directamente, se usa en lugar de calcular desde expiryDate */
  status?: DocumentStatus
  /** Modo compacto: solo ícono + texto corto */
  compact?: boolean
  className?: string
}

const statusConfig = {
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
    label:    'Vencida',
    icon:     AlertTriangle,
    classes:  'bg-danger-50 text-danger-700 border-danger-200',
  },
  sin_licencia: {
    label:    'Sin licencia',
    icon:     AlertTriangle,
    classes:  'bg-gray-100 text-gray-500 border-gray-200',
  },
} as const

export function LicenseBadge({
  expiryDate,
  licenseNumber,
  licenseType,
  status,
  compact = false,
  className,
}: LicenseBadgeProps) {
  // Determinar estado efectivo
  let effectiveStatus: keyof typeof statusConfig

  if (!expiryDate && !licenseNumber) {
    effectiveStatus = 'sin_licencia'
  } else if (status) {
    effectiveStatus = status
  } else if (expiryDate) {
    effectiveStatus = getLicenseStatus(expiryDate)
  } else {
    effectiveStatus = 'sin_licencia'
  }

  const config = statusConfig[effectiveStatus]
  const Icon   = config.icon
  const compactType = licenseType ? `${licenseType} ` : ''
  const displayType = licenseType ? `tipo ${licenseType}` : 'de conducir'

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
        {compactType}{config.label}
      </span>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex flex-col gap-0.5 px-3 py-2 rounded-lg border text-xs',
        config.classes,
        className
      )}
    >
      <div className="flex items-center gap-1.5 font-semibold">
        <Icon className="w-3.5 h-3.5" />
        <span>Licencia {displayType} — {config.label}</span>
      </div>
      {licenseNumber && (
        <span className="font-mono opacity-80">N.° {licenseNumber}</span>
      )}
      {expiryDate && (
        <span className="opacity-70">
          Vence: {new Date(expiryDate + 'T00:00:00').toLocaleDateString('es-EC', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </span>
      )}
      {effectiveStatus === 'sin_licencia' && (
        <span className="opacity-70">Pendiente de registro</span>
      )}
    </div>
  )
}
