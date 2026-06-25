import { Bell } from 'lucide-react'
import { useLocation, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { usePermissions } from '@/hooks/usePermissions'
import { MenuToggle } from './Sidebar'
import { PLAN_LABELS, PLAN_COLORS } from '@/lib/constants'
import type { PlanName } from '@/types'

// Mapa de rutas a títulos de página
const PAGE_TITLES: Record<string, string> = {
  '/dashboard':           'Dashboard',
  '/account/security':    'Seguridad de la cuenta',
  '/socios':              'Socios',
  '/unidades':           'Unidades',
  '/pagos':              'Pagos y Cuotas',
  '/documentos':         'Documentos y Vencimientos',
  '/sanciones':          'Sanciones',
  '/reuniones':          'Reuniones',
  '/reportes':           'Reportes',
  '/configuracion':      'Configuración',
  '/usuarios':           'Usuarios y Roles',
  '/auditoria':          'Auditoría',
  '/super-admin':        'Dashboard SaaS',
  '/super-admin/companies': 'Compañías',
  '/super-admin/plans':  'Planes SaaS',
  '/super-admin/auditoria': 'Auditoría Global',
  '/notificaciones':     'Alertas y Notificaciones',
}

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  // Use permissions to rename Dashboard if socio
  const { isSocio } = usePermissions()
  let pageTitle = PAGE_TITLES[pathname] ?? 'MotoGremio'
  if (pathname === '/dashboard' && isSocio) {
    pageTitle = 'Mi Portal'
  }
  const planName    = profile?.company?.plan?.name as PlanName | undefined
  const planLabel   = planName ? PLAN_LABELS[planName] : null
  const planColor   = planName ? PLAN_COLORS[planName] : ''
  const companyName = profile?.company?.trade_name ?? profile?.company?.legal_name

  useEffect(() => {
    if (!profile?.company_id) return
    const companyId = profile.company_id as string

    // Consulta ligera: obtener cantidad de notificaciones sin leer
    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('is_read', false)
          .or(`user_id.eq.${profile.id},user_id.is.null`)

        if (!error && count !== null) {
          setUnreadCount(count)
        }
      } catch (err) {
        console.error('Error fetching unread notification count:', err)
      }
    }

    fetchUnreadCount()

    // Suscribirse a cambios en tiempo real en la tabla notifications para la compañía
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.company_id, profile?.id])

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-gray-100 flex items-center px-5 gap-4">
      {/* Mobile toggle */}
      <MenuToggle onClick={onMenuToggle} />

      {/* Título de página */}
      <div className="flex-1">
        <h1 className="text-base font-semibold text-gray-900">{pageTitle}</h1>
        {companyName && (
          <p className="text-xs text-gray-500 hidden sm:block">{companyName}</p>
        )}
      </div>

      {/* Acciones derechas */}
      <div className="flex items-center gap-3">
        {planLabel && (
          <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${planColor}`}>
            {planLabel}
          </span>
        )}

        {/* Campana de Notificaciones Enlace */}
        <Link 
          to="/notificaciones" 
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors block"
          title="Ver alertas y notificaciones"
        >
          <Bell className="h-5 w-5" />
          {/* Badge de notificación pendiente */}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-danger-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
