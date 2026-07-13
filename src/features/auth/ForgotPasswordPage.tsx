import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { APP_NAME, APP_SLOGAN } from '@/lib/constants'

const forgotSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
})
type ForgotForm = z.infer<typeof forgotSchema>

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotForm) => {
    setServerError(null)
    try {
      const redirectToUrl = `${window.location.origin}/auth/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectToUrl,
      })

      if (error) {
        // Para evitar ataques de enumeración, no revelamos si el correo existe o no a menos que sea un error crítico del sistema.
        // Pero controlamos límites de peticiones (Too many requests).
        if (error.message.includes('Too many requests')) {
          setServerError('Demasiados intentos. Por favor, espera un momento antes de volver a solicitar el enlace.')
          return
        }
        // Para cualquier otro error genérico, mostramos éxito para proteger la privacidad de las cuentas (enumeración de usuarios).
      }
      setSuccess(true)
    } catch (err) {
      setServerError('Ocurrió un error inesperado. Inténtalo de nuevo más tarde.')
    }
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
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl tracking-tight">{APP_NAME}</p>
            <p className="text-primary-300/80 text-[10px] uppercase tracking-widest font-semibold">SaaS Platform</p>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-white text-3xl font-extrabold leading-tight tracking-tight mb-4">
            Recupera tu acceso de<br />forma segura y rápida
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            {APP_SLOGAN}. Ingresa tu dirección de correo electrónico institucional o personal para restablecer tu contraseña.
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

        <div
          className="w-full max-w-sm bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-xl z-10"
          style={{ animation: 'fadeSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both' }}
        >
          {success ? (
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Correo enviado</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Si la dirección ingresada está registrada en el sistema, recibirás un mensaje con un enlace para restablecer tu contraseña.
                </p>
                <p className="text-xs text-slate-500 pt-2">
                  No olvides revisar tu carpeta de correo no deseado o Spam si no lo recibes en unos minutos.
                </p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                fullWidth
                variant="outline"
                className="border-slate-800 hover:bg-slate-900 text-white font-semibold h-11"
              >
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Recuperar contraseña</h1>
                <p className="text-sm text-slate-400">Ingresa tu correo para recibir el enlace de acceso</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="space-y-1.5">
                  <Input
                    label="Correo electrónico"
                    type="email"
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    required
                    className="bg-slate-950 border-slate-800 text-white placeholder-slate-650 focus:border-primary-500"
                    error={errors.email?.message}
                    {...register('email')}
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
                  Enviar enlace de recuperación
                </Button>
              </form>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white transition-colors w-full py-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
