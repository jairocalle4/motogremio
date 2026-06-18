import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { CompanyPlanUsage } from '../hooks/usePlanUsage'

interface PlanUsageCardProps {
  usage: CompanyPlanUsage
  className?: string
}

export function PlanUsageCard({ usage, className = '' }: PlanUsageCardProps) {
  const isAnyLimitReached = usage.is_members_limit_reached || usage.is_vehicles_limit_reached
  const isAnyNearLimit = usage.is_near_members_limit || usage.is_near_vehicles_limit

  let planStatusBadge = <Badge variant="success">Activo</Badge>
  if (!usage.plan_is_active) {
    planStatusBadge = <Badge variant="danger">Inactivo</Badge>
  } else if (isAnyLimitReached) {
    planStatusBadge = <Badge variant="danger">Límite Alcanzado</Badge>
  } else if (isAnyNearLimit) {
    planStatusBadge = <Badge variant="warning">Cerca del Límite</Badge>
  }

  return (
    <Card className={`p-6 bg-white shadow-sm border border-slate-100 ${className}`}>
      <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="font-semibold text-slate-800 text-lg">Estado de tu Plan</h3>
          <p className="text-xs text-slate-500">Resumen de cuotas de tu suscripción</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-bold text-slate-900 capitalize text-sm">{usage.plan_name}</span>
          <div>{planStatusBadge}</div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Socios */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 font-medium">Socios Activos</span>
            <span className="font-semibold text-slate-800">
              {usage.current_members} / {usage.max_members || '∞'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                usage.is_members_limit_reached ? 'bg-red-500' : usage.is_near_members_limit ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, usage.members_usage_percent)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>{usage.members_usage_percent}% utilizado</span>
            {usage.is_members_limit_reached ? (
              <span className="text-red-500 font-semibold">Límite alcanzado</span>
            ) : usage.is_near_members_limit ? (
              <span className="text-amber-500 font-medium">Quedan {usage.members_remaining}</span>
            ) : null}
          </div>
        </div>

        {/* Unidades */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 font-medium">Unidades Activas / Mantenimiento</span>
            <span className="font-semibold text-slate-800">
              {usage.current_vehicles} / {usage.max_vehicles || '∞'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                usage.is_vehicles_limit_reached ? 'bg-red-500' : usage.is_near_vehicles_limit ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, usage.vehicles_usage_percent)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>{usage.vehicles_usage_percent}% utilizado</span>
            {usage.is_vehicles_limit_reached ? (
              <span className="text-red-500 font-semibold">Límite alcanzado</span>
            ) : usage.is_near_vehicles_limit ? (
              <span className="text-amber-500 font-medium">Quedan {usage.vehicles_remaining}</span>
            ) : null}
          </div>
        </div>

        {/* Alertas */}
        {isAnyLimitReached && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 space-y-1">
            <p className="font-semibold">Límite del Plan Alcanzado:</p>
            {usage.is_members_limit_reached && (
              <p>• Ya no puedes crear nuevos socios activos. Contacta al soporte o administrador para ampliar tu plan.</p>
            )}
            {usage.is_vehicles_limit_reached && (
              <p>• Ya no puedes crear nuevas unidades activas o en mantenimiento. Contacta al soporte o administrador para ampliar tu plan.</p>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
