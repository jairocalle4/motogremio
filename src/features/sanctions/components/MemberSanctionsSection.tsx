import { useState } from 'react'
import { SanctionsList } from './SanctionsList'
import { SanctionFormModal } from './SanctionFormModal'
import { Button } from '@/components/ui/Button'
import { Plus, ShieldAlert } from 'lucide-react'

interface MemberSanctionsSectionProps {
  memberId: string
  canManage: boolean
}

export function MemberSanctionsSection({ memberId, canManage }: MemberSanctionsSectionProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0) // Trigger list refresh

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Historial de Sanciones y Multas
          </h3>
          <p className="text-xs text-gray-500">
            Registro disciplinario, descargos, apelaciones y multas asociadas de este socio.
          </p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={() => setFormOpen(true)} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Nueva Sanción
          </Button>
        )}
      </div>

      {/* Sanciones del socio */}
      <SanctionsList key={`${memberId}-${refreshKey}`} canManage={canManage} memberId={memberId} />

      {/* Registrar Sanción Modal */}
      {formOpen && (
        <SanctionFormModal
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          memberId={memberId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
