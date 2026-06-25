import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'react-hot-toast'
import type { Member } from '@/types'
import { Check, Copy } from 'lucide-react'

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  member: Member
  onSuccess: () => void
}

export function InviteMemberModal({ isOpen, onClose, member, onSuccess }: InviteMemberModalProps) {
  const [email, setEmail] = useState(member.email || '')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('El correo es obligatorio para enviar la invitación.')
      return
    }

    setLoading(true)
    try {
      // 1. Si el member no tenía correo, lo actualizamos primero
      if (!member.email || member.email !== email) {
        const { error: updateError } = await supabase
          .from('members')
          .update({ email })
          .eq('id', member.id)
        if (updateError) throw updateError
      }

      // 2. Crear la invitación ligada a este member_id
      const { data: token, error: rpcError } = await supabase.rpc('create_pending_invitation', {
        p_email: email,
        p_company_id: member.company_id,
        p_role: 'socio',
        p_first_name: member.first_name,
        p_last_name: member.last_name,
        p_member_id: member.id,
      })

      if (rpcError) throw rpcError

      if (token) {
        const link = `${window.location.origin}/register?invite=${token}`
        setInviteLink(link)
      } else {
        toast.success('Invitación enviada con éxito')
        onSuccess()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la invitación')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success('¡Enlace copiado al portapapeles!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('No se pudo copiar el enlace')
    }
  }

  const handleClose = () => {
    setInviteLink('')
    onClose()
  }

  if (inviteLink) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Invitación Creada">
        <div className="space-y-4">
          <div className="bg-success-50 p-4 rounded-lg flex items-start gap-3 border border-success-100">
            <div className="bg-success-100 p-2 rounded-full">
              <Check className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-success-800">¡Enlace de acceso generado!</h4>
              <p className="text-xs text-success-700 mt-1">
                Copia este enlace y envíaselo a <strong>{member.first_name}</strong> para que cree su contraseña y acceda al portal.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Input value={inviteLink} readOnly className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={copyToClipboard} title="Copiar enlace">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="pt-4 flex justify-end">
            <Button variant="primary" onClick={() => {
              handleClose()
              onSuccess()
            }}>
              Entendido
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Otorgar Acceso al Sistema">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Se enviará una invitación a <strong>{member.first_name} {member.last_name}</strong> para que acceda al portal de Socios.
        </p>
        
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Correo Electrónico del Socio <span className="text-red-500">*</span>
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@correo.com"
            required
          />
          {!member.email && (
            <p className="text-xs text-gray-500 mt-1">
              Como este socio no tenía correo registrado, se guardará en su expediente.
            </p>
          )}
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={loading} disabled={loading || !email}>
            Generar Enlace de Acceso
          </Button>
        </div>
      </form>
    </Modal>
  )
}
