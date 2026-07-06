import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Bike } from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { APP_NAME, APP_SLOGAN } from '@/lib/constants'

// ─── Validación ───────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email('Ingresa un correo válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
})
type LoginForm = z.infer<typeof loginSchema>

// ─── Componente ───────────────────────────────────────
export function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from       = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const [showPassword, setShowPassword] = useState(false)
  const [serverError,  setServerError]  = useState<string | null>(null)

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    const { error } = await signIn(data.email, data.password)
    if (error) {
      setServerError(error)
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* ── Panel izquierdo — Branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-gradient-to-br from-slate-900 via-brand-sidebar to-slate-950 p-12 relative overflow-hidden border-r border-slate-800">
        {/* Decoración de fondo */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary-600/30 blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-primary-800/20 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-60 h-60 rounded-full bg-blue-500/10 blur-2xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Bike className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl tracking-tight">{APP_NAME}</p>
            <p className="text-primary-300/80 text-[10px] uppercase tracking-widest font-semibold">SaaS Platform</p>
          </div>
        </div>

        {/* Contenido central */}
        <div className="relative z-10">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-primary-300 bg-primary-500/10 border border-primary-500/20 mb-4">
            Versión Demo Comercial
          </span>
          <h2 className="text-white text-3xl font-extrabold leading-tight tracking-tight mb-4">
            Administra tu compañía<br />de transporte con orden
          </h2>
          <p className="text-slate-350 text-sm leading-relaxed mb-8">
            {APP_SLOGAN}. Socios, pagos, unidades, sanciones y convocatorias en un solo lugar.
          </p>
          
          {/* Features */}
          <div className="space-y-4">
            {[
              'Control de socios y licencias de conducir',
              'Gestión de unidades con número de disco',
              'Pagos, cuotas y deudas al instante',
              'Convocatorias por correo y WhatsApp',
            ].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-500/10 border border-primary-500/30 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                </div>
                <p className="text-slate-200 text-sm font-medium">{f}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-slate-500 text-xs font-medium">
          © {new Date().getFullYear()} {APP_NAME} · Software Administrativo
        </p>
      </div>

      {/* ── Panel derecho — Formulario ── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
        {/* Decoración sutil de fondo derecho */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary-500/10 blur-3xl" />
        </div>

        {/* Logo mobile */}
        <div className="flex items-center gap-2.5 mb-8 lg:hidden z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center shadow-lg">
            <Bike className="h-5 w-5 text-white" />
          </div>
          <p className="font-bold text-xl text-white tracking-tight">{APP_NAME}</p>
        </div>

        {/* Card de login */}
        <div className="w-full max-w-sm bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-xl z-10">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Bienvenido</h1>
            <p className="text-sm text-slate-400">Ingresa a tu cuenta para continuar</p>
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

            <div className="relative space-y-1.5">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-650 focus:border-primary-500"
                error={errors.password?.message}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="text-slate-500 hover:text-slate-350 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...register('password')}
              />
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => navigate('/auth/forgot-password')}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            {/* Error del servidor */}
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
              Iniciar sesión
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-8">
            ¿Problemas para ingresar? Contacta al administrador de tu compañía.
          </p>
        </div>
      </div>
    </div>
  )
}
