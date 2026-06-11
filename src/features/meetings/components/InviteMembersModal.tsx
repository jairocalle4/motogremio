import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useMembers } from '@/hooks/useMembers'
import { Search, Users, CheckSquare, Square, CheckCircle } from 'lucide-react'

interface InviteMembersModalProps {
  isOpen: boolean
  onClose: () => void
  onConvokeAll: () => Promise<void>
  onConvokeSelected: (memberIds: string[]) => Promise<void>
  alreadyInvokedMemberIds: Set<string>
}

export function InviteMembersModal({
  isOpen,
  onClose,
  onConvokeAll,
  onConvokeSelected,
  alreadyInvokedMemberIds,
}: InviteMembersModalProps) {
  const { members, loading, fetchMembers } = useMembers()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchMembers({ status: 'activo' })
      setSelectedIds(new Set())
      setSearchTerm('')
    }
  }, [isOpen, fetchMembers])

  const filteredMembers = members.filter(
    (member) =>
      member.status === 'activo' &&
      !alreadyInvokedMemberIds.has(member.id) &&
      (`${member.first_name} ${member.last_name} ${member.document_id}`)
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  )

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMembers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredMembers.map((m) => m.id)))
    }
  }

  const handleInviteSelected = async () => {
    if (selectedIds.size === 0) return
    setSubmitting(true)
    try {
      await onConvokeSelected(Array.from(selectedIds))
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleInviteAll = async () => {
    setSubmitting(true)
    try {
      await onConvokeAll()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convocar Socios a la Reunión" size="lg">
      <div className="space-y-6">
        {/* Acciones Rápidas */}
        <div className="p-4 bg-primary-50 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Convocar a todos</h4>
              <p className="text-xs text-gray-500">
                Agrega automáticamente a todos los socios activos de la cooperativa.
              </p>
            </div>
          </div>
          <Button onClick={handleInviteAll} disabled={submitting} className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Convocar Todos los Activos
          </Button>
        </div>

        {/* Buscador & Selección Manual */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Selección Manual de Socios</h4>
            {filteredMembers.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1.5"
              >
                {selectedIds.size === filteredMembers.length ? (
                  <>
                    <CheckSquare className="w-4 h-4" /> Deseleccionar todos
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4" /> Seleccionar todos filtrados
                  </>
                )}
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar socio por nombres, apellidos o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Listado */}
          <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Cargando socios...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No hay más socios activos disponibles para invitar que coincidan con la búsqueda.
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isSelected = selectedIds.has(member.id)
                return (
                  <div
                    key={member.id}
                    onClick={() => toggleSelect(member.id)}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {member.last_name}, {member.first_name}
                      </div>
                      <div className="text-xs text-gray-400">C.I: {member.document_id}</div>
                    </div>
                    <div>
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cerrar
          </Button>
          <Button
            onClick={handleInviteSelected}
            disabled={selectedIds.size === 0 || submitting}
            className="flex items-center gap-2"
          >
            Convocar Seleccionados ({selectedIds.size})
          </Button>
        </div>
      </div>
    </Modal>
  )
}
