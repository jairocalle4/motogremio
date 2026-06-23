import { LogOut, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import { Button } from '@/components/ui/Button'
import { APP_NAME } from '@/lib/constants'

export function AccountDisabledPage() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
        {/* Ícono de Alerta */}
        <div className="w-16 h-16 rounded-full bg-danger-50 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="h-8 w-8 text-danger-600" />
        </div>

        {/* Mensaje Principal */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Cuenta desactivada
        </h1>
        <p className="text-sm text-gray-600 mb-8 leading-relaxed">
          Tu acceso a la plataforma <strong>{APP_NAME}</strong> ha sido suspendido temporalmente.
          Contacta con el administrador de tu compañía para recuperar el acceso.
        </p>

        {/* Botón de Acción */}
        <Button
          onClick={() => signOut()}
          variant="outline"
          fullWidth
          size="lg"
          className="flex items-center justify-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Volver al inicio de sesión
        </Button>
      </div>

      {/* Footer minimalista */}
      <div className="mt-8 text-xs text-gray-400">
        © {new Date().getFullYear()} {APP_NAME} · Hecho en Ecuador 🇪🇨
      </div>
    </div>
  )
}
