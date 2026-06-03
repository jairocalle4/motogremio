import { useContext } from 'react'
import { AuthContext } from './AuthContext'

/**
 * Hook para acceder al contexto de autenticación.
 * Debe usarse dentro de <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
