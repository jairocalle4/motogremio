import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkeletonCard } from '@/components/shared/LoadingSpinner'

interface StatCardProps {
  title:      string
  value:      string | number
  subtitle?:  string
  icon:       ReactNode
  iconBg?:    string
  trend?:     'up' | 'down' | 'neutral'
  trendLabel?: string
  loading?:   boolean
  alert?:     boolean
}

const trendConfig = {
  up:      { icon: TrendingUp,   color: 'text-success-600', bg: 'bg-success-50' },
  down:    { icon: TrendingDown, color: 'text-danger-600',  bg: 'bg-danger-50' },
  neutral: { icon: Minus,        color: 'text-gray-500',    bg: 'bg-gray-100' },
}

export function StatCard({
  title, value, subtitle, icon, iconBg = 'bg-primary-50',
  trend, trendLabel, loading, alert,
}: StatCardProps) {
  if (loading) return <SkeletonCard />

  const TrendIcon = trend ? trendConfig[trend].icon : null

  return (
    <div className={cn(
      'bg-white rounded-xl border shadow-card p-5 flex flex-col gap-3',
      alert ? 'border-warning-200' : 'border-gray-100'
    )}>
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
          {icon}
        </div>
        {trend && TrendIcon && trendLabel && (
          <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            trendConfig[trend].bg, trendConfig[trend].color)}>
            <TrendIcon className="h-3 w-3" />
            {trendLabel}
          </div>
        )}
        {alert && (
          <div className="w-2 h-2 rounded-full bg-warning-500 mt-1" title="Requiere atención" />
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
