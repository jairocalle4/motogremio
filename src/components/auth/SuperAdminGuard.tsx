import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'

export function SuperAdminGuard() {
  const { canAccessSuperAdmin } = usePermissions()

  if (!canAccessSuperAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
