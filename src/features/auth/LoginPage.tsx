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
    <div className="min-h-screen flex">
      {/* ── Panel izquierdo — Branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-brand-sidebar p-10 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary-500" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-primary-700" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
            <Bike className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl">{APP_NAME}</p>
            <p className="text-primary-300 text-xs">v0.1 — Desarrollo</p>
          </div>
        </div>

        {/* Contenido central */}
        <div className="relative z-10">
          <h2 className="text-white text-3xl font-bold leading-snug mb-4">
            Administra tu compañía<br />de transporte con orden
          </h2>
          <p className="text-primary-200 text-sm leading-relaxed mb-8">
            {APP_SLOGAN}. Socios, pagos, unidades, sanciones y convocatorias en un solo lugar.
          </p>
          
          {/* Features */}
          {[
            'Control de socios y licencias de conducir',
            'Gestión de unidades con número de disco',
            'Pagos, cuotas y deudas al instante',
            'Convocatorias por correo y WhatsApp',
          ].map(f => (
            <div key={f} className="flex items-center gap-2.5 mb-3">
              <div className="w-5 h-5 rounded-full bg-primary-500/30 flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-primary-400" />
              </div>
              <p className="text-primary-100 text-sm">{f}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="relative z-10 text-primary-400 text-xs">
          © {new Date().getFullYear()} {APP_NAME} · Hecho en Ecuador 🇪🇨
        </p>
      </div>

      {/* ── Panel derecho — Formulario ── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 bg-gray-50">
        {/* Logo mobile */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <Bike className="h-5 w-5 text-white" />
          </div>
          <p className="font-bold text-xl text-gray-900">{APP_NAME}</p>
        </div>

        {/* Card de login */}
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido</h1>
            <p className="text-sm text-gray-500">Ingresa a tu cuenta para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              required
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                error={errors.password?.message}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...register('password')}
              />
            </div>

            {/* Error del servidor */}
            {serverError && (
              <div className="px-4 py-3 rounded-lg bg-danger-50 border border-danger-200 text-sm text-danger-700">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting}
              size="lg"
            >
              Iniciar sesión
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            ¿Problemas para ingresar? Contacta al administrador de tu compañía.
          </p>
        </div>
      </div>
    </div>
  )
}
