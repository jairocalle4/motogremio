import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bike, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { APP_NAME } from '@/lib/constants'
import toast from 'react-hot-toast'

const resetSchema = z
  .object({
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres.')
      .max(72, 'La contraseña no puede superar los 72 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })

type ResetForm = z.infer<typeof resetSchema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  useEffect(() => {
    // Verificar si existe una sesión o evento de recuperación válido
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setHasValidSession(true)
      } else {
        // En flujos PKCE o enlaces en navegador limpio sin sesión automática, 
        // revisamos los fragmentos de la URL (hash o query params).
        const hash = window.location.hash
        const query = new URLSearchParams(window.location.search)
        if (hash.includes('access_token') || query.has('code')) {
          setHasValidSession(true)
        } else {
          setHasValidSession(false)
        }
      }
      setCheckingSession(false)
    }

    checkAuth()
  }, [])

  const onSubmit = async (data: ResetForm) => {
    setServerError(null)
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) {
        setServerError(error.message)
        toast.error('No se pudo actualizar la contraseña.')
        return
      }

      // Cerrar sesión globalmente por seguridad para obligar a autenticarse con la nueva contraseña
      await supabase.auth.signOut({ scope: 'global' })
      setSuccess(true)
      toast.success('Contraseña restablecida correctamente.')
    } catch (err) {
      setServerError('Ocurrió un error inesperado al actualizar la contraseña.')
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-sm animate-pulse">Verificando enlace de recuperación...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Panel izquierdo - Branding */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-gradient-to-br from-slate-900 via-brand-sidebar to-slate-950 p-12 relative overflow-hidden border-r border-slate-800">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary-600/30 blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-primary-800/20 blur-3xl" />
        </div>

        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center shadow-lg">
            <Bike className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl tracking-tight">{APP_NAME}</p>
            <p className="text-primary-300/80 text-[10px] uppercase tracking-widest font-semibold">SaaS Platform</p>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-white text-3xl font-extrabold leading-tight tracking-tight mb-4">
            Establece tu nueva<br />contraseña de acceso
          </h2>
          <p className="text-slate-350 text-sm leading-relaxed">
            Ingresa una contraseña segura de al menos 6 caracteres. No uses contraseñas fáciles de adivinar o reutilizadas de otros servicios.
          </p>
        </div>

        <p className="relative z-10 text-slate-500 text-xs font-medium">
          © {new Date().getFullYear()} {APP_NAME} · Software Administrativo
        </p>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary-500/10 blur-3xl" />
        </div>

        <div className="w-full max-w-sm bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-xl z-10">
          {!hasValidSession ? (
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Enlace inválido o expirado</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  El enlace de recuperación es inválido o ha expirado. Por seguridad, solicita un nuevo enlace para restablecer tu contraseña.
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/auth/forgot-password')}
                  fullWidth
                  className="bg-primary-600 hover:bg-primary-500 text-white font-semibold h-11"
                >
                  Solicitar nuevo enlace
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  fullWidth
                  variant="outline"
                  className="border-slate-800 hover:bg-slate-900 text-white font-semibold h-11"
                >
                  Volver al inicio de sesión
                </Button>
              </div>
            </div>
          ) : success ? (
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-white tracking-tight">¡Contraseña actualizada!</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con tu nueva clave.
                </p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                fullWidth
                className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold h-11 border-none shadow-lg shadow-primary-600/25"
              >
                Iniciar sesión ahora
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Nueva contraseña</h1>
                <p className="text-sm text-slate-400">Crea una clave de acceso segura para tu cuenta</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="relative space-y-1.5">
                  <Input
                    label="Nueva contraseña"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className="bg-slate-950 border-slate-800 text-white placeholder-slate-650 focus:border-primary-500"
                    error={errors.password?.message}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="text-slate-500 hover:text-slate-350 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                    {...register('password')}
                  />
                </div>

                <div className="relative space-y-1.5">
                  <Input
                    label="Confirmar contraseña"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className="bg-slate-950 border-slate-800 text-white placeholder-slate-650 focus:border-primary-500"
                    error={errors.confirmPassword?.message}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="text-slate-500 hover:text-slate-350 transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                    {...register('confirmPassword')}
                  />
                </div>

                {serverError && (
                  <div className="px-4 py-3 rounded-lg bg-red-950/30 border border-red-900/50 text-sm text-red-400">
                    {serverError}
                  </div>
                )}

                <Button
                  type="submit"
                  fullWidth
                  isLoading={isSubmitting}
                  size="lg"
                  className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white shadow-lg shadow-primary-600/25 border-none font-semibold h-11"
                >
                  Guardar nueva contraseña
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
