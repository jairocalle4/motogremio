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
  const isAdmin      = role === 'admin'
  const isGerente    = role === 'gerente'
  const isPresidente = role === 'presidente'
  const isSecretaria = role === 'secretaria'
  const isTesorero   = role === 'tesorero'
  const isOperador   = role === 'operador'
  const isSocio      = role === 'socio'

  /** True si el rol del usuario es uno de los indicados */
  const hasRole = (...roles: UserRole[]) => !!role && roles.includes(role)

  /** Gestión de socios */
  const canManageMembers = hasRole('super_admin', 'admin', 'secretaria')
  const canViewMembers   = hasRole('super_admin', 'admin', 'gerente', 'presidente', 'secretaria', 'tesorero', 'operador')

  /** Gestión de unidades / mototaxis */
  const canManageVehicles = hasRole('super_admin', 'admin', 'secretaria')
  const canViewVehicles   = hasRole('super_admin', 'admin', 'gerente', 'presidente', 'secretaria', 'tesorero', 'operador')

  /** Gestión de conductores */
  const canManageDrivers = hasRole('super_admin', 'admin', 'secretaria')
  const canViewDrivers   = hasRole('super_admin', 'admin', 'gerente', 'presidente', 'secretaria', 'tesorero', 'operador')

  /** Gestión de documentos y licencias */
  const canManageDocuments = hasRole('super_admin', 'admin', 'secretaria')
  const canViewDocuments   = hasRole('super_admin', 'admin', 'gerente', 'presidente', 'secretaria', 'tesorero', 'operador')

  /** Gestión financiera / pagos */
  const canManagePayments = hasRole('super_admin', 'admin', 'tesorero')
  const canViewPayments   = hasRole('super_admin', 'admin', 'gerente', 'tesorero', 'operador')

  /** Gestión de sanciones */
  const canManageSanctions = hasRole('super_admin', 'admin', 'gerente', 'secretaria')
  const canViewSanctions   = hasRole('super_admin', 'admin', 'gerente', 'presidente', 'secretaria', 'operador')

  /** Gestión de convocatorias, reuniones y asistencias */
  const canManageMeetings = hasRole('super_admin', 'admin', 'gerente', 'secretaria')
  const canViewMeetings   = hasRole('super_admin', 'admin', 'gerente', 'presidente', 'secretaria', 'operador')

  /** Gestión de reportes */
  const canViewReports = hasRole('super_admin', 'admin', 'gerente', 'presidente', 'secretaria', 'tesorero', 'operador')

  /** Centro de Alertas y Notificaciones */
  const canViewNotifications = hasRole('super_admin', 'admin', 'gerente', 'presidente', 'secretaria', 'tesorero', 'operador')

  /** Gestión de configuraciones y usuarios */
  const canManageUsers = hasRole('super_admin', 'admin')
  const canManageCoopeSettings = hasRole('super_admin', 'admin')

  /** Panel de super administrador del SaaS */
  const canAccessSuperAdmin = isSuperAdmin

  return {
    role,
    isSuperAdmin,
    isAdmin,
    isGerente,
    isPresidente,
    isSecretaria,
    isTesorero,
    isOperador,
    isSocio,
    hasRole,
    canManageMembers,
    canViewMembers,
    canManageVehicles,
    canViewVehicles,
    canManageDrivers,
    canViewDrivers,
    canManageDocuments,
    canViewDocuments,
    canManagePayments,
    canViewPayments,
    canManageSanctions,
    canViewSanctions,
    canManageMeetings,
    canViewMeetings,
    canViewReports,
    canViewNotifications,
    canManageUsers,
    canManageCoopeSettings,
    canAccessSuperAdmin,
  }
}
