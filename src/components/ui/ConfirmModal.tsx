import { AlertTriangle, CheckCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

type ConfirmVariant = 'danger' | 'warning' | 'success'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title: string
  message: string
  detail?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  loading?: boolean
}

const variantStyles: Record<
  ConfirmVariant,
  { icon: React.ReactNode; iconBg: string; confirmClass: string }
> = {
  danger: {
    icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
    iconBg: 'bg-red-50',
    confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    iconBg: 'bg-amber-50',
    confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  success: {
    icon: <CheckCircle className="w-6 h-6 text-green-600" />,
    iconBg: 'bg-green-50',
    confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
  },
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  detail,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'warning',
  loading = false,
}: ConfirmModalProps) {
  const styles = variantStyles[variant]

  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onClose}
      title={title}
      size="sm"
      closeOnOverlay={!loading}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmClass}`}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Procesando...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl shrink-0 ${styles.iconBg}`}>{styles.icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-800 leading-relaxed">{message}</p>
          {detail && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{detail}</p>}
        </div>
      </div>
    </Modal>
  )
}
