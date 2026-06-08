import { Bell } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import { MenuToggle } from './Sidebar'
import { PLAN_LABELS, PLAN_COLORS } from '@/lib/constants'
import type { PlanName } from '@/types'

// Mapa de rutas a títulos de página
const PAGE_TITLES: Record<string, string> = {
  '/dashboard':          'Dashboard',
  '/socios':             'Socios',
  '/unidades':           'Unidades',
  '/pagos':              'Pagos y Cuotas',
  '/documentos':         'Documentos y Vencimientos',
  '/sanciones':          'Sanciones',
  '/convocatorias':      'Convocatorias',
  '/asistencia':         'Asistencia a Reuniones',
  '/reportes':           'Reportes',
  '/configuracion':      'Configuración',
  '/usuarios':           'Usuarios y Roles',
  '/auditoria':          'Auditoría',
  '/admin/companias':    'Compañías',
  '/admin/planes':       'Planes',
  '/admin/suscripciones':'Suscripciones',
  '/admin/metricas':     'Métricas Globales',
  '/admin/configuracion':'Configuración Global',
}

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { profile } = useAuth()
  const { pathname } = useLocation()

  const pageTitle   = PAGE_TITLES[pathname] ?? 'MotoGremio'
  const planName    = profile?.company?.plan?.name as PlanName | undefined
  const planLabel   = planName ? PLAN_LABELS[planName] : null
  const planColor   = planName ? PLAN_COLORS[planName] : ''
  const companyName = profile?.company?.trade_name ?? profile?.company?.legal_name

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

        {/* Notificaciones (placeholder) */}
        <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
          {/* Badge de notificación pendiente */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger-500" />
        </button>
      </div>
    </header>
  )
}
