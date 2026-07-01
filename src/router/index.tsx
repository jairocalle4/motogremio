import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { BrandingProvider } from '@/context/BrandingContext'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { SuperAdminGuard } from '@/components/auth/SuperAdminGuard'

import { SuperAdminDashboard } from '@/features/super-admin/SuperAdminDashboard'
import { SuperAdminCompanies } from '@/features/super-admin/SuperAdminCompanies'
import { SuperAdminCompanyDetail } from '@/features/super-admin/SuperAdminCompanyDetail'
import { SuperAdminPlans } from '@/features/super-admin/SuperAdminPlans'
import { SuperAdminAuditLogs } from '@/features/super-admin/SuperAdminAuditLogs'
import { SuperAdminSubscriptions } from '@/features/super-admin/SuperAdminSubscriptions'
import { SuperAdminPlaceholder } from '@/features/super-admin/SuperAdminPlaceholder'
import { SuperAdminAlerts } from '@/features/super-admin/SuperAdminAlerts'
import { SuperAdminSettings } from '@/features/super-admin/SuperAdminSettings'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ChangePasswordPage } from '@/features/account/ChangePasswordPage'
import { CompanyConfigPage } from '@/features/company/CompanyConfigPage'
import { CompanyUsersPage } from '@/features/company/CompanyUsersPage'
import { CompanyDocumentsPage } from '@/features/documents/CompanyDocumentsPage'
import { MembersListPage } from '@/features/members/MembersListPage'
import { MemberDetailPage } from '@/features/members/MemberDetailPage'
import { VehiclesListPage } from '@/features/vehicles/VehiclesListPage'
import { VehicleDetailPage } from '@/features/vehicles/VehicleDetailPage'
import { DriversListPage } from '@/features/drivers/DriversListPage'
import { DriverDetailPage } from '@/features/drivers/DriverDetailPage'
import { PaymentsPage } from '@/features/payments/PaymentsPage'
import { MeetingsPage } from '@/features/meetings/pages/MeetingsPage'
import { MeetingDetailPage } from '@/features/meetings/pages/MeetingDetailPage'
import { SanctionsPage } from '@/features/sanctions/pages/SanctionsPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage'

// ─── Páginas placeholder (se crearán en Fase 3–5) ─────
const Placeholder = ({ title }: { title: string }) => (
  <div className="page-container">
    <div className="section-card p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-primary-600 text-xl">🚧</span>
      </div>
      <h2 className="text-gray-700 mb-2">{title}</h2>
      <p className="text-sm text-gray-500">Este módulo está en desarrollo (Fase 3)</p>
    </div>
  </div>
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BrandingProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Dashboard común */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Seguridad de cuenta — accesible para cualquier rol autenticado */}
              <Route path="/account/security" element={<ChangePasswordPage />} />

              {/* Rutas de Compañía (Cooperativa) */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'gerente', 'presidente', 'secretaria', 'tesorero', 'operador']} />}>
                {/* Módulos — Fase 3 */}
                <Route path="/socios"           element={<MembersListPage />} />
                <Route path="/socios/:id"       element={<MemberDetailPage />} />
                <Route path="/conductores"      element={<DriversListPage />} />
                <Route path="/conductores/:id"  element={<DriverDetailPage />} />
                <Route path="/unidades"         element={<VehiclesListPage />} />
                <Route path="/unidades/:id"     element={<VehicleDetailPage />} />
                <Route path="/pagos"         element={<PaymentsPage />} />
                <Route path="/documentos"    element={<CompanyDocumentsPage />} />

                {/* Módulos — Fase 4 */}
                <Route path="/sanciones"     element={<SanctionsPage />} />
                <Route path="/reuniones"      element={<MeetingsPage />} />
                <Route path="/reuniones/:id"  element={<MeetingDetailPage />} />
                <Route path="/convocatorias" element={<Navigate to="/reuniones" replace />} />
                <Route path="/asistencia"    element={<Navigate to="/reuniones" replace />} />
                <Route path="/notificaciones" element={<NotificationsPage />} />

                {/* Reportes — Fase 3.9 */}
                <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'gerente', 'presidente', 'secretaria', 'tesorero', 'operador']} />}>
                  <Route path="/reportes"      element={<ReportsPage />} />
                </Route>

                {/* Administración interna — Solo Admin y Super Admin */}
                <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}>
                  <Route path="/usuarios"      element={<CompanyUsersPage />} />
                  <Route path="/auditoria"     element={<Placeholder title="Auditoría" />} />
                  <Route path="/configuracion" element={<CompanyConfigPage />} />
                </Route>
              </Route>

              {/* Panel Super Admin SaaS */}
              <Route path="/super-admin" element={<SuperAdminGuard />}>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="companies" element={<SuperAdminCompanies />} />
                <Route path="companies/:id" element={<SuperAdminCompanyDetail />} />
                <Route path="plans" element={<SuperAdminPlans />} />
                <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
                <Route path="alerts" element={<SuperAdminAlerts />} />
                <Route path="metrics" element={<SuperAdminPlaceholder title="Métricas" description="Estadísticas de uso y crecimiento" />} />
                <Route path="settings" element={<SuperAdminSettings />} />
                <Route path="security" element={<SuperAdminPlaceholder title="Seguridad" description="Configuración de seguridad global" />} />
                <Route path="auditoria" element={<SuperAdminAuditLogs />} />
              </Route>
            </Route>

          </Route>

          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </BrandingProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
