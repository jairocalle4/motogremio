import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCheck, Bike, Wallet,
  ShieldAlert, BarChart3,
  Settings, UserCog, Activity, Building2, Package,
  CreditCard, TrendingUp, LogOut, ShieldCheck,
  X, Menu, Calendar,
} from 'lucide-react'

import { useAuth } from '@/context/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { cn, getInitials } from '@/lib/utils'
import { ROLE_LABELS, APP_NAME } from '@/lib/constants'
import toast from 'react-hot-toast'

interface NavItem {
  to:    string
  label: string
  icon:  React.ComponentType<{ className?: string }>
}

interface NavSection {
  title?:     string
  items:      NavItem[]
  separator?: boolean
}

// ─── Navegación por rol ────────────────────────────────
const companyNav: NavSection[] = [
  {
    items: [
      { to: '/dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
      { to: '/socios',       label: 'Socios',         icon: Users },
      { to: '/conductores',  label: 'Conductores',    icon: UserCheck },
      { to: '/unidades',     label: 'Unidades',       icon: Bike },
      { to: '/pagos',        label: 'Pagos',          icon: Wallet },
      // Ocultado temporalmente por la fase 3.5 en desarrollo integrado
      // { to: '/documentos',   label: 'Documentos',     icon: FileText },
      { to: '/sanciones',    label: 'Sanciones',      icon: ShieldAlert },
      { to: '/reuniones',    label: 'Reuniones',      icon: Calendar },
      { to: '/reportes',     label: 'Reportes',       icon: BarChart3 },
    ],
  },
  {
    separator: true,
    items: [
      { to: '/configuracion',label: 'Configuración',  icon: Settings },
      { to: '/usuarios',     label: 'Usuarios',       icon: UserCog },
      { to: '/auditoria',    label: 'Auditoría',      icon: Activity },
    ],
  },
]

const adminNav: NavSection[] = [
  {
    items: [
      { to: '/dashboard',           label: 'Dashboard',        icon: LayoutDashboard },
      { to: '/admin/companias',     label: 'Compañías',        icon: Building2 },
      { to: '/admin/planes',        label: 'Planes',           icon: Package },
      { to: '/admin/suscripciones', label: 'Suscripciones',    icon: CreditCard },
      { to: '/admin/metricas',      label: 'Métricas',         icon: TrendingUp },
    ],
  },
  {
    separator: true,
    items: [
      { to: '/admin/configuracion', label: 'Configuración',    icon: Settings },
      { to: '/account/security',    label: 'Seguridad',        icon: ShieldCheck },
    ],
  },
]

// ─── Componente ────────────────────────────────────────
interface SidebarProps {
  isOpen:    boolean
  onClose:   () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const { isSuperAdmin } = usePermissions()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const nav = isSuperAdmin ? adminNav : companyNav
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'Usuario'
  const role     = profile?.role ? ROLE_LABELS[profile.role] : '—'
  const initials = profile ? getInitials(profile.first_name, profile.last_name) : 'U'
  const companyName = profile?.company?.trade_name ?? profile?.company?.legal_name

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    toast.success('Sesión cerrada correctamente.')
    navigate('/login')
  }

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-60 bg-brand-sidebar shadow-sidebar',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{APP_NAME}</p>
              {!isSuperAdmin && companyName && (
                <p className="text-white/50 text-xs truncate max-w-[120px]">{companyName}</p>
              )}
              {isSuperAdmin && (
                <p className="text-primary-300 text-xs">Super Admin</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/50 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {nav.map((section, si) => (
            <div key={si}>
              {section.separator && (
                <div className="my-3 border-t border-white/10" />
              )}
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn('nav-item', isActive && 'active')
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{fullName}</p>
              <p className="text-white/50 text-xs truncate">{role}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/60
              hover:text-white hover:bg-white/10 transition-colors text-xs font-medium
              disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {signingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>
    </>
  )
}

// ─── Botón de menú mobile (exportado para el Header) ──
export function MenuToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
      aria-label="Abrir menú"
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}
