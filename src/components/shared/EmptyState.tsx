import { type ReactNode } from 'react'
import { SearchX, FolderOpen, AlertCircle } from 'lucide-react'

interface EmptyStateProps {
  type?:        'empty' | 'search' | 'error'
  title:        string
  description?: string
  action?:      ReactNode
}

const icons = {
  empty:  FolderOpen,
  search: SearchX,
  error:  AlertCircle,
}

const iconColors = {
  empty:  'text-gray-300',
  search: 'text-gray-300',
  error:  'text-danger-300',
}

export function EmptyState({ type = 'empty', title, description, action }: EmptyStateProps) {
  const Icon = icons[type]

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
        <Icon className={`h-8 w-8 ${iconColors[type]}`} />
      </div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-xs mb-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
