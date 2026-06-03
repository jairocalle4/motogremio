import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?:  'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
}

export function LoadingSpinner({ size = 'md', label, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-gray-200 border-t-primary-600 animate-spin',
          sizes[size]
        )}
        role="status"
        aria-label={label ?? 'Cargando...'}
      />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  )
}

/** Skeleton para líneas de texto */
export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={cn('h-4 rounded animate-skeleton', className)} />
  )
}

/** Skeleton para tarjetas */
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5 space-y-3">
      <SkeletonLine className="w-1/3 bg-gray-200" />
      <SkeletonLine className="w-1/2 h-8 bg-gray-200" />
      <SkeletonLine className="w-2/3 bg-gray-100" />
    </div>
  )
}
