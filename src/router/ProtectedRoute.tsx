import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { UserRole } from '@/types'
import { AccountDisabledPage } from '@/features/auth/AccountDisabledPage'
import { CompanySuspendedPage } from '@/features/auth/CompanySuspendedPage'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

/**
 * Protege rutas que requieren autenticación.
 * Redirige al login si no hay sesión activa.
 * Valida roles permitidos si se especifica allowedRoles.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const { role } = usePermissions()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" label="Verificando sesión..." />
      </div>
    )
  }

  const hash = window.location.hash
  const query = new URLSearchParams(window.location.search)
  const isRecovery = hash.includes('access_token=') || hash.includes('type=recovery') || query.has('code') || location.pathname === '/auth/reset-password'

  if (isRecovery) {
    if (location.pathname !== '/auth/reset-password') {
      return <Navigate to="/auth/reset-password" replace />
    }
    return <Outlet />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Si user existe pero el perfil aún está cargando (loading secundario de perfil)
  // El loading principal de AuthContext suele cubrir esto, pero por seguridad:
  if (user && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" label="Cargando perfil..." />
      </div>
    )
  }

  // Si la compañía está suspendida / inactiva (y no es super_admin)
  if (profile && profile.company && profile.company.status !== 'activa' && role !== 'super_admin') {
    return <CompanySuspendedPage />
  }

  // Si el perfil ya cargó y está inactivo
  if (profile && profile.is_active === false) {
    return <AccountDisabledPage />
  }

  // Si se especificaron roles requeridos y el perfil ya cargó pero el rol no está permitido, redirigir
  if (allowedRoles && !loading && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
