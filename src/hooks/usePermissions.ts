import { useAuth } from '@/context/useAuth'
import type { UserRole } from '@/types'

// Re-exportar useAuth para conveniencia
export { useAuth }

/**
 * Hook para verificar permisos del usuario actual.
 * Devuelve funciones para verificar roles y acceso a módulos.
 */
export function usePermissions() {
  const { profile } = useAuth()
  const role = profile?.role

  const isSuperAdmin = role === 'super_admin'
  const isAdminCompany = role === 'admin_company'
  const isGerente = role === 'gerente'
  const isPresidente = role === 'presidente'
  const isSecretaria = role === 'secretaria'
  const isTesorero = role === 'tesorero'
  const isSocio = role === 'socio'

  /** True si el rol del usuario es uno de los indicados */
  const hasRole = (...roles: UserRole[]) => !!role && roles.includes(role)

  /** True si puede gestionar (crear/editar/eliminar) socios */
  const canManageMembers = hasRole('super_admin', 'admin_company', 'gerente', 'secretaria')

  /** True si puede ver socios (lectura) */
  const canViewMembers = hasRole('super_admin', 'admin_company', 'gerente', 'presidente', 'secretaria', 'tesorero')

  /** True si puede gestionar pagos */
  const canManagePayments = hasRole('super_admin', 'admin_company', 'tesorero')

  /** True si puede ver pagos */
  const canViewPayments = hasRole('super_admin', 'admin_company', 'gerente', 'presidente', 'tesorero')

  /** True si puede gestionar sanciones */
  const canManageSanctions = hasRole('super_admin', 'admin_company', 'gerente', 'secretaria')

  /** True si puede gestionar convocatorias */
  const canManageMeetings = hasRole('super_admin', 'admin_company', 'gerente', 'secretaria')

  /** True si puede ver reportes */
  const canViewReports = hasRole('super_admin', 'admin_company', 'gerente', 'presidente', 'tesorero')

  /** True si puede gestionar usuarios y roles */
  const canManageUsers = hasRole('super_admin', 'admin_company')

  /** True si puede ver el panel de super administrador */
  const canAccessSaasAdmin = isSuperAdmin

  return {
    role,
    isSuperAdmin,
    isAdminCompany,
    isGerente,
    isPresidente,
    isSecretaria,
    isTesorero,
    isSocio,
    hasRole,
    canManageMembers,
    canViewMembers,
    canManagePayments,
    canViewPayments,
    canManageSanctions,
    canManageMeetings,
    canViewReports,
    canManageUsers,
    canAccessSaasAdmin,
  }
}
