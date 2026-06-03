import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface ConfirmDialogProps {
  isOpen:       boolean
  onClose:      () => void
  onConfirm:    () => void
  title:        string
  description:  string
  confirmLabel?: string
  cancelLabel?:  string
  variant?:      'danger' | 'warning'
  isLoading?:    boolean
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm,
  title, description,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  variant      = 'danger',
  isLoading,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${variant === 'danger' ? 'bg-danger-50' : 'bg-warning-50'}`}>
          <AlertTriangle className={`h-5 w-5 ${variant === 'danger' ? 'text-danger-600' : 'text-warning-600'}`} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </Modal>
  )
}
