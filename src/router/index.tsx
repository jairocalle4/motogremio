import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ChangePasswordPage } from '@/features/account/ChangePasswordPage'
import { CompanyConfigPage } from '@/features/company/CompanyConfigPage'
import { MembersListPage } from '@/features/members/MembersListPage'
import { MemberDetailPage } from '@/features/members/MemberDetailPage'
import { VehiclesListPage } from '@/features/vehicles/VehiclesListPage'
import { VehicleDetailPage } from '@/features/vehicles/VehicleDetailPage'
import { DriversListPage } from '@/features/drivers/DriversListPage'
import { DriverDetailPage } from '@/features/drivers/DriverDetailPage'
import { PaymentsPage } from '@/features/payments/PaymentsPage'
import { SanctionsPage } from '@/features/sanctions/pages/SanctionsPage'

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
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Dashboard común */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Seguridad de cuenta — accesible para cualquier rol autenticado */}
              <Route path="/account/security" element={<ChangePasswordPage />} />

              {/* Rutas de Compañía (Cooperativa) */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'gerente', 'presidente', 'secretaria', 'tesorero', 'operador', 'socio']} />}>
                {/* Módulos — Fase 3 */}
                <Route path="/socios"           element={<MembersListPage />} />
                <Route path="/socios/:id"       element={<MemberDetailPage />} />
                <Route path="/conductores"      element={<DriversListPage />} />
                <Route path="/conductores/:id"  element={<DriverDetailPage />} />
                <Route path="/unidades"         element={<VehiclesListPage />} />
                <Route path="/unidades/:id"     element={<VehicleDetailPage />} />
                <Route path="/pagos"         element={<PaymentsPage />} />
                <Route path="/documentos"    element={<Placeholder title="Documentos y Vencimientos" />} />

                {/* Módulos — Fase 4 */}
                <Route path="/sanciones"     element={<SanctionsPage />} />
                <Route path="/convocatorias" element={<Placeholder title="Convocatorias y Reuniones" />} />
                <Route path="/asistencia"    element={<Placeholder title="Asistencia a Reuniones" />} />

                {/* Reportes — Fase 6 */}
                <Route path="/reportes"      element={<Placeholder title="Reportes" />} />

                {/* Administración interna */}
                <Route path="/usuarios"      element={<Placeholder title="Usuarios y Roles" />} />
                <Route path="/auditoria"     element={<Placeholder title="Auditoría" />} />
                <Route path="/configuracion" element={<CompanyConfigPage />} />
              </Route>

              {/* Super admin — Fase 5 */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route path="/admin/companias"     element={<Placeholder title="Compañías (SaaS Admin)" />} />
                <Route path="/admin/planes"        element={<Placeholder title="Planes" />} />
                <Route path="/admin/suscripciones" element={<Placeholder title="Suscripciones" />} />
                <Route path="/admin/metricas"      element={<Placeholder title="Métricas Globales" />} />
                <Route path="/admin/configuracion" element={<Placeholder title="Configuración Global" />} />
              </Route>
            </Route>
          </Route>

          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
