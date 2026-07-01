import { Bell, RefreshCw, AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/useAuth'
import { Tooltip } from '@/components/ui/Tooltip'
import { usePermissions } from '@/hooks/usePermissions'
import { MenuToggle } from './Sidebar'
import { PLAN_LABELS, PLAN_COLORS } from '@/lib/constants'
import type { PlanName } from '@/types'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'

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
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Use permissions and notifications hook
  const { isSocio } = usePermissions()
  const { alerts, counts, loading, refresh } = useNotifications()

  let pageTitle = PAGE_TITLES[pathname] ?? 'MotoGremio'
  if (pathname === '/dashboard' && isSocio) {
    pageTitle = 'Mi Portal'
  }

  const planName    = profile?.company?.plan?.name as PlanName | undefined
  const planLabel   = planName ? PLAN_LABELS[planName] : null
  const planColor   = planName ? PLAN_COLORS[planName] : ''
  const companyName = profile?.company?.trade_name ?? profile?.company?.legal_name

  // Total badge count represents critical + warning + unread persistent notifications
  const totalAlertCount = counts.critical + counts.warning + counts.unread

  // Click outside handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Check if a path is allowed for socio
  const isAllowedPath = (path?: string) => {
    if (!path) return false
    if (!isSocio) return true
    return path === '/dashboard' || path === '/notificaciones'
  }

  const handleAlertClick = (linkUrl?: string) => {
    setDropdownOpen(false)
    if (linkUrl && isAllowedPath(linkUrl)) {
      navigate(linkUrl)
    }
  }

  // Get top 4 alerts to display in dropdown
  const topAlerts = alerts.slice(0, 4)

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

        {/* Campana de Alertas con Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <Tooltip content="Ver alertas y notificaciones">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors block focus:outline-none"
            >
              <Bell className="h-5 w-5" />
              
              {/* Pulsing red dot indicator for critical alerts */}
              {counts.critical > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-danger-500"></span>
                </span>
              )}

              {/* Badge for total active warnings/alerts */}
              {totalAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-danger-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center px-1">
                  {totalAlertCount}
                </span>
              )}
            </button>
          </Tooltip>

          {/* Dropdown Container */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 text-left">
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-800">Alertas Recientes</span>
                <div className="flex items-center gap-2">
                  <Tooltip content="Actualizar alertas">
                    <button 
                      onClick={() => refresh()} 
                      disabled={loading}
                      className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Alerts List */}
              <div className="max-h-72 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-xs text-gray-500">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-primary-600" />
                    Cargando alertas operativas...
                  </div>
                ) : topAlerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 flex flex-col items-center gap-1">
                    <Bell className="h-6 w-6 text-gray-300" />
                    <span>Sin alertas pendientes</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {topAlerts.map((alert) => {
                      const allowed = isAllowedPath(alert.link_url)
                      return (
                        <div 
                          key={alert.id}
                          onClick={() => allowed && handleAlertClick(alert.link_url)}
                          className={`p-3 text-left transition-colors flex gap-2.5 ${
                            allowed && alert.link_url ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {alert.severity === 'critica' ? (
                              <ShieldAlert className="h-4 w-4 text-danger-500" />
                            ) : alert.severity === 'advertencia' ? (
                              <AlertTriangle className="h-4 w-4 text-warning-500" />
                            ) : (
                              <Info className="h-4 w-4 text-info-500" />
                            )}
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <p className="text-xs font-semibold text-gray-900 leading-tight">
                              {alert.title}
                            </p>
                            <p className="text-[11px] text-gray-600 line-clamp-2">
                              {alert.message}
                            </p>
                            {!allowed && alert.link_url && (
                              <span className="text-[9px] text-gray-400 font-medium block">
                                Solo lectura en Portal
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 rounded-b-xl text-center">
                <Link 
                  to={profile?.role === 'super_admin' ? '/super-admin/alerts' : '/notificaciones'} 
                  onClick={() => setDropdownOpen(false)}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-all block"
                >
                  Ver todas las alertas ({alerts.length})
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
