import { useState } from 'react'
import { Eye, EyeOff, ShieldCheck, CheckCircle2, Lock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

// ─── Validación ───────────────────────────────────────
const schema = z
  .object({
    newPassword: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres.')
      .max(72, 'La contraseña no puede superar los 72 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

// ─── Componente ───────────────────────────────────────
export function ChangePasswordPage() {
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success,     setSuccess]     = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    })

    if (error) {
      toast.error('No se pudo actualizar la contraseña. Intenta de nuevo.')
      return
    }

    // No loggear la contraseña en consola
    reset()
    setSuccess(true)
    toast.success('Contraseña actualizada correctamente.')
  }

  return (
    <div className="max-w-lg">
      {/* Encabezado de la sección */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary-600" />
          Seguridad de la cuenta
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Actualiza tu contraseña de acceso al sistema.
        </p>
      </div>

      {/* Panel de éxito */}
      {success ? (
        <Card padding="lg">
          <div className="flex flex-col items-center text-center py-6 gap-4">
            <div className="w-14 h-14 rounded-full bg-success-50 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-success-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                ¡Contraseña actualizada!
              </h2>
              <p className="text-sm text-gray-500">
                Tu contraseña ha sido cambiada correctamente. Ya puedes cerrar
                sesión y volver a ingresar con tu nueva contraseña.
              </p>
            </div>
            <div className="w-full p-4 bg-primary-50 border border-primary-100 rounded-lg text-left">
              <p className="text-sm font-medium text-primary-800">Próximo paso</p>
              <p className="text-xs text-primary-600 mt-1">
                Haz clic en <strong>"Cerrar sesión"</strong> en el menú lateral y vuelve a
                iniciar sesión con tu nueva contraseña para confirmar que todo funciona.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuccess(false)}
            >
              Cambiar de nuevo
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-gray-500" />
              Cambiar contraseña
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              {/* Nueva contraseña */}
              <div className="relative">
                <Input
                  id="new-password"
                  label="Nueva contraseña"
                  type={showNew ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  required
                  error={errors.newPassword?.message}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                      aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showNew ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  {...register('newPassword')}
                />
              </div>

              {/* Confirmar contraseña */}
              <div className="relative">
                <Input
                  id="confirm-password"
                  label="Confirmar nueva contraseña"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  required
                  error={errors.confirmPassword?.message}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  {...register('confirmPassword')}
                />
              </div>

              {/* Requisitos */}
              <ul className="text-xs text-gray-500 space-y-1 pl-1">
                <li className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                  Mínimo 6 caracteres
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                  No se guardará en ninguna tabla de la base de datos
                </li>
              </ul>

              <Button
                type="submit"
                fullWidth
                isLoading={isSubmitting}
                size="lg"
              >
                Actualizar contraseña
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
