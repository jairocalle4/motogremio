import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Bike, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { APP_NAME, APP_SLOGAN } from '@/lib/constants'

// ─── Validación ───────────────────────────────────────
const registerSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  email: z.string().email('Ingresa un correo válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  confirm_password: z.string().min(6, 'Confirma tu contraseña.'),
}).refine((data) => data.password === data.confirm_password, {
  message: "Las contraseñas no coinciden.",
  path: ["confirm_password"],
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(true)
  const [invitationData, setInvitationData] = useState<any>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  useEffect(() => {
    if (!inviteToken) {
      setIsLoadingToken(false)
      return
    }

    const fetchInvitation = async () => {
      try {
        const { data, error } = await supabase.rpc('get_invitation_info', { p_token: inviteToken })
        if (error) throw error
        
        if (data) {
          setInvitationData(data)
          // Pre-llenar formulario
          reset({
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
          })
        }
      } catch (err: any) {
        console.error('Error fetching invitation:', err)
      } finally {
        setIsLoadingToken(false)
      }
    }

    fetchInvitation()
  }, [inviteToken, reset])

  const onSubmit = async (data: RegisterForm) => {
    if (!inviteToken) {
      setServerError('Token de invitación no válido o ausente.')
      return
    }

    setServerError(null)
    setSuccessMessage(null)

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            invite_token: inviteToken,
            first_name: data.first_name,
            last_name: data.last_name,
          },
        },
      })

      if (signUpError) throw signUpError

      if (signUpData.session) {
        // Logueado automáticamente
        navigate('/dashboard', { replace: true })
      } else if (signUpData.user) {
        // Requiere confirmación o registro exitoso sin sesión inmediata
        setSuccessMessage(
          '¡Registro exitoso! Por favor, verifica tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.'
        )
      } else {
        setServerError('No se pudo completar el registro. Inténtalo de nuevo.')
      }
    } catch (err: any) {
      console.error("Auth error:", err)
      let errorMessage = err.message || 'Ocurrió un error al intentar registrarte.'
      
      // Traducciones de errores comunes de Supabase Auth
      if (errorMessage.toLowerCase().includes('email rate limit exceeded')) {
        errorMessage = 'Límite de seguridad de correos alcanzado por hacer muchas pruebas seguidas. Por favor, espera unos minutos y vuelve a intentarlo.'
      } else if (errorMessage.toLowerCase().includes('user already registered')) {
        errorMessage = 'Este correo ya está registrado en el sistema.'
      } else if (errorMessage.toLowerCase().includes('password should be at least')) {
        errorMessage = 'La contraseña es demasiado débil.'
      }

      setServerError(errorMessage)
    }
  }

  // Si no hay token o es inválido/expirado
  if (!inviteToken || (!isLoadingToken && !invitationData)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-danger-50 flex items-center justify-center mx-auto mb-4 text-danger-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-950 mb-2">Enlace no válido</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            El enlace de invitación es incorrecto, ya ha sido utilizado o ha expirado. Por favor, solicita a tu administrador que te envíe una nueva invitación.
          </p>
          <Link
            to="/login"
            className="inline-flex justify-center rounded-lg border border-gray-350 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors w-full"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  if (isLoadingToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-4" />
        <p className="text-sm text-gray-500 font-medium">Verificando invitación...</p>
      </div>
    )
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
            Únete a la plataforma<br />de gestión de transporte
          </h2>
          <p className="text-primary-200 text-sm leading-relaxed mb-8">
            {APP_SLOGAN}. Administra socios, unidades, conductores y pagos de forma centralizada y segura.
          </p>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-primary-400 text-xs">
          © {new Date().getFullYear()} {APP_NAME} · Hecho en Ecuador 🇪🇨
        </p>
      </div>

      {/* ── Panel derecho — Formulario ── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 bg-gray-50 overflow-y-auto">
        {/* Logo mobile */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <Bike className="h-5 w-5 text-white" />
          </div>
          <p className="font-bold text-xl text-gray-900">{APP_NAME}</p>
        </div>

        {/* Card de registro */}
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Crea tu cuenta</h1>
            <p className="text-sm text-gray-500">Completa tus datos para activar tu invitación</p>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 shadow-sm">
            <h3 className="text-blue-800 font-bold text-sm mb-1 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Invitación verificada
            </h3>
            <p className="text-xs text-blue-700 leading-relaxed font-medium">
              Tus datos han sido precargados de la invitación y asegurados. Solo necesitas crear una contraseña para activar tu cuenta.
            </p>
          </div>

          {successMessage ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-success-50 flex items-center justify-center mx-auto text-success-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <p className="text-sm text-gray-650 leading-relaxed font-medium">
                {successMessage}
              </p>
              <Link
                to="/login"
                className="inline-flex justify-center rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors w-full"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  type="text"
                  placeholder="Juan"
                  disabled
                  error={errors.first_name?.message}
                  {...register('first_name')}
                  className="bg-gray-100 cursor-not-allowed opacity-70"
                />
                <Input
                  label="Apellido"
                  type="text"
                  placeholder="Pérez"
                  disabled
                  error={errors.last_name?.message}
                  {...register('last_name')}
                  className="bg-gray-100 cursor-not-allowed opacity-70"
                />
              </div>

              <Input
                label="Correo electrónico"
                type="email"
                placeholder="correo@ejemplo.com"
                disabled
                error={errors.email?.message}
                {...register('email')}
                className="bg-gray-100 cursor-not-allowed opacity-70"
              />

              <div className="relative">
                <Input
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  error={errors.password?.message}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  {...register('password')}
                />
              </div>

              <div className="relative">
                <Input
                  label="Confirmar contraseña"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  error={errors.confirm_password?.message}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  {...register('confirm_password')}
                />
              </div>

              {serverError && (
                <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-xs text-danger-700 leading-normal">
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                isLoading={isSubmitting}
                size="lg"
              >
                Registrarse y activar cuenta
              </Button>
            </form>
          )}

          {!successMessage && (
            <div className="text-center mt-6 text-xs text-gray-500">
              ¿Ya tienes cuenta activa?{' '}
              <Link to="/login" className="text-primary-600 hover:underline font-medium">
                Inicia sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
