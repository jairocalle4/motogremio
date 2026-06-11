import { useEffect, useState, useCallback } from 'react'
import { ShieldAlert, AlertTriangle, TrendingDown, TrendingUp, RefreshCw, Scale, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { usePermissions } from '@/hooks/usePermissions'
import { useSanctions } from '../hooks/useSanctions'
import { SanctionsList } from '../components/SanctionsList'
import { SanctionTypesTab } from '../components/SanctionTypesTab'
import { SanctionFormModal } from '../components/SanctionFormModal'

type TabId = 'sanctions' | 'types'

const TABS: { id: TabId; label: string }[] = [
  { id: 'sanctions', label: 'Registro de Sanciones' },
  { id: 'types', label: 'Tipos de Sanción' },
]

export function SanctionsPage() {
  const { canManageSanctions, canViewSanctions } = usePermissions()
  const { kpis, fetchKpis } = useSanctions()

  const [activeTab, setActiveTab] = useState<TabId>('sanctions')
  const [formOpen, setFormOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    fetchKpis()
    setRefreshKey((prev) => prev + 1)
  }, [fetchKpis])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (!canViewSanctions) {
    return (
      <div className="page-container">
        <div className="section-card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-gray-700 mb-2">Acceso restringido</h2>
          <p className="text-sm text-gray-500">No tienes permisos para ver este módulo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
            <Scale className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="page-title">Sanciones y Multas</h1>
            <p className="page-subtitle">
              Gestiona infracciones disciplinarias, descargos, apelaciones y multas asociadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={refresh} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
          {canManageSanctions && (
            <Button variant="primary" onClick={() => setFormOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Registrar Sanción
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Sanciones */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Total Sanciones
                </p>
                <p className="text-2xl font-bold text-gray-950">{kpis.totalCount}</p>
                <p className="text-xs text-gray-400 mt-1">Registros disciplinarios históricos</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pendientes */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Pendientes / Apeladas
                </p>
                <p className="text-2xl font-bold text-amber-600">
                  {kpis.pendingCount + kpis.appealCount}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {kpis.pendingCount} pendientes · {kpis.appealCount} apelaciones
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total en Multas */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Total Fines Emitidos
                </p>
                <p className="text-2xl font-bold text-green-700">
                  ${kpis.totalFinesAmount.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Multas no anuladas</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fines Pendientes */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Por Recaudar de Sanciones
                </p>
                <p className="text-2xl font-bold text-red-600">
                  ${kpis.pendingFinesAmount.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Saldo pendiente acumulado</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="section-card">
        {/* Navigation */}
        <div className="border-b border-gray-100 px-6">
          <nav className="flex gap-1 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'sanctions' && (
            <SanctionsList key={refreshKey} canManage={canManageSanctions} />
          )}
          {activeTab === 'types' && (
            <SanctionTypesTab canManage={canManageSanctions} />
          )}
        </div>
      </div>

      {/* Modal registrar sanción */}
      {formOpen && (
        <SanctionFormModal
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
