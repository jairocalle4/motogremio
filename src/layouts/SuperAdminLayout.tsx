import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, Package, LogOut, ShieldAlert, CreditCard, TrendingUp, Settings, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/useAuth'

export function SuperAdminLayout() {
  const { signOut, profile, user } = useAuth()
  const location = useLocation()

  const navItems = [
    { name: 'Dashboard SaaS', href: '/super-admin', icon: LayoutDashboard },
    { name: 'Compañías', href: '/super-admin/companies', icon: Building2 },
    { name: 'Planes SaaS', href: '/super-admin/plans', icon: Package },
    { name: 'Suscripciones', href: '/super-admin/subscriptions', icon: CreditCard },
    { name: 'Métricas', href: '/super-admin/metrics', icon: TrendingUp },
    { name: 'Configuración', href: '/super-admin/settings', icon: Settings },
    { name: 'Seguridad', href: '/super-admin/security', icon: ShieldCheck },
    { name: 'Auditoría', href: '/super-admin/auditoria', icon: ShieldAlert },
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar Super Admin (Distinto color: slate-900) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight">MotoGremio</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            Modo Super Admin
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/super-admin' && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium">
              {profile?.first_name?.[0] || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.first_name} {profile?.last_name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
