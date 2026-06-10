import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Driver, Member } from '@/types'

interface AssignDriverModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (driverId: string) => Promise<void>
  currentDriverId?: string | null
  memberId?: string
  members: Pick<Member, 'id' | 'first_name' | 'last_name' | 'document_id' | 'phone' | 'address'>[]
  drivers: Pick<Driver, 'id' | 'first_name' | 'last_name' | 'document_id' | 'status' | 'member_id'>[]
  loading?: boolean
}

export function AssignDriverModal({
  isOpen,
  onClose,
  onSubmit,
  currentDriverId,
  memberId,
  members,
  drivers,
  loading,
}: AssignDriverModalProps) {
  const [driverType, setDriverType] = useState<'none' | 'owner' | 'existing'>('none')
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')

  const selectedMember = members.find((m) => m.id === memberId)
  const existingDriver = drivers.find((d) => d.member_id === memberId)

  // Sincronizar estado inicial al abrir
  useEffect(() => {
    if (isOpen) {
      if (!currentDriverId) {
        setDriverType('none')
        setSelectedDriverId('')
      } else {
        const isOwner = drivers.some(d => d.id === currentDriverId && d.member_id === memberId)
        if (isOwner || currentDriverId === '_owner') {
          setDriverType('owner')
          setSelectedDriverId('_owner')
        } else {
          setDriverType('existing')
          setSelectedDriverId(currentDriverId)
        }
      }
    }
  }, [isOpen, currentDriverId, memberId, drivers])

  const handleSave = async () => {
    let finalId = ''
    if (driverType === 'owner') {
      finalId = '_owner'
    } else if (driverType === 'existing') {
      finalId = selectedDriverId
    }
    await onSubmit(finalId)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onClose}
      title="Asignar Conductor a la Unidad"
      size="md"
      footer={
        <div className="flex justify-end space-x-3 w-full">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Asignación'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Opción 1: Sin conductor */}
        <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-all">
          <input
            type="radio"
            name="assign_driver_type"
            className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
            checked={driverType === 'none'}
            onChange={() => setDriverType('none')}
          />
          <div>
            <p className="text-sm font-semibold text-gray-700">Sin conductor asignado por ahora</p>
            <p className="text-xs text-gray-500">La unidad quedará registrada sin conductor asignado</p>
          </div>
        </label>

        {/* Opción 2: Socio propietario conduce */}
        {memberId && (
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-all">
              <input
                type="radio"
                name="assign_driver_type"
                className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                checked={driverType === 'owner'}
                onChange={() => setDriverType('owner')}
              />
              <div>
                <p className="text-sm font-semibold text-gray-700">El socio propietario también conduce</p>
                <p className="text-xs text-gray-500">
                  Vincular al socio {selectedMember ? `"${selectedMember.first_name} ${selectedMember.last_name}"` : ''} como el conductor de la unidad.
                </p>
              </div>
            </label>

            {driverType === 'owner' && selectedMember && (
              <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium text-primary-950">
                  ✨ Se creará o vinculará automáticamente un conductor usando los datos del socio propietario.
                </p>
                {existingDriver ? (
                  <p className="text-xs text-primary-800">
                    ℹ️ El socio ya tiene un perfil de conductor registrado (<strong>{existingDriver.first_name} {existingDriver.last_name}</strong>). Se usará su perfil existente sin duplicar datos.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs text-primary-800">
                      🆕 El socio no tiene un perfil de conductor aún. Se creará automáticamente un nuevo perfil con los siguientes datos:
                    </p>
                    <ul className="text-xs text-primary-700 list-disc list-inside space-y-0.5 bg-white bg-opacity-50 p-2 rounded border border-primary-100">
                      <li><strong>Nombre completo:</strong> {selectedMember.first_name} {selectedMember.last_name}</li>
                      <li><strong>Identificación (C.I.):</strong> {selectedMember.document_id}</li>
                      <li>
                        <strong>Teléfono:</strong> {selectedMember.phone || <span className="text-amber-600 font-semibold">⚠️ No registrado (se creará vacío)</span>}
                      </li>
                      <li>
                        <strong>Dirección:</strong> {selectedMember.address || <span className="text-amber-600 font-semibold">⚠️ No registrada (se creará vacía)</span>}
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Opción 3: Seleccionar conductor existente */}
        {drivers.length > 0 && (
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-all">
              <input
                type="radio"
                name="assign_driver_type"
                className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                checked={driverType === 'existing'}
                onChange={() => setDriverType('existing')}
              />
              <div>
                <p className="text-sm font-semibold text-gray-700">Seleccionar conductor existente</p>
                <p className="text-xs text-gray-500">Elegir un conductor que ya esté registrado en la cooperativa</p>
              </div>
            </label>

            {driverType === 'existing' && (
              <div className="pl-7 pt-1">
                <Select
                  options={[
                    { value: '', label: 'Elegir conductor de la cooperativa...' },
                    ...drivers
                      .filter((d) => d.status === 'activo')
                      .map((d) => ({
                        value: d.id,
                        label: `${d.last_name}, ${d.first_name} — C.I: ${d.document_id}`,
                      })),
                  ]}
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
