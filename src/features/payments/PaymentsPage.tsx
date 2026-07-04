import { useEffect, useCallback, useState } from 'react'
import {
  Wallet, TrendingDown, TrendingUp, AlertTriangle,
  Calendar, RefreshCw, Clock, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { usePayments } from '@/hooks/usePayments'
import { usePermissions } from '@/hooks/usePermissions'
import { GenerateChargesModal } from './GenerateChargesModal'
import { DebtorsTab } from './tabs/DebtorsTab'
import { PaymentHistoryTab } from './tabs/PaymentHistoryTab'
import { ChargeTypesTab } from './tabs/ChargeTypesTab'
import toast from 'react-hot-toast'

type TabId = 'deudores' | 'historial' | 'tipos'

const TABS: { id: TabId; label: string }[] = [
  { id: 'deudores',  label: 'Lista de Deudores' },
  { id: 'historial', label: 'Historial de Pagos' },
  { id: 'tipos',     label: 'Tipos de Cobro' },
]

export function PaymentsPage() {
  const { canManagePayments, canViewPayments } = usePermissions()

  // ─── Estado único compartido con todas las pestañas ──────────────────────
  const paymentsState = usePayments()
  const {
    kpis,
    chargeTypesRecurring,
    loading,
    fetchKpis,
    fetchChargeTypes,
    fetchCharges,
    fetchPayments,
    generateMonthlyChargesRpc,
  } = paymentsState

  const [activeTab, setActiveTab] = useState<TabId>('deudores')
  const [generateOpen, setGenerateOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshDone, setRefreshDone] = useState(false)

  // Carga inicial
  useEffect(() => {
    fetchKpis()
    fetchChargeTypes()
    fetchCharges({ status: 'pendiente' })
  }, [fetchKpis, fetchChargeTypes, fetchCharges])

  // ─── Botón Actualizar: refresca TODOS los estados compartidos ─────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    setRefreshDone(false)
    try {
      await Promise.all([
        fetchKpis(),
        fetchChargeTypes(),
        fetchCharges({ status: 'pendiente' }),
        fetchPayments(),
      ])
      setRefreshDone(true)
      toast.success('Información actualizada')
      setTimeout(() => setRefreshDone(false), 3000)
    } catch {
      toast.error('Error al actualizar. Inténtalo de nuevo.')
    } finally {
      setRefreshing(false)
    }
  }, [fetchKpis, fetchChargeTypes, fetchCharges, fetchPayments])

  // Callback para cuando se cambia de tab desde el modal de generación
  const handleGoToChargeTypes = useCallback(() => {
    setGenerateOpen(false)
    setActiveTab('tipos')
  }, [])

  if (!canViewPayments) {
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
            <Wallet className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="page-title">Pagos y Cuotas</h1>
            <p className="page-subtitle">
              Gestiona cobros, cuotas mensuales y el estado financiero de la cooperativa
            </p>
          </div>
        </div>

        {canManagePayments && (
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {refreshing ? 'Actualizando…' : refreshDone ? 'Actualizado ✓' : 'Actualizar'}
              </span>
            </Button>
            <Button
              variant="primary"
              onClick={() => setGenerateOpen(true)}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Generar cuotas
            </Button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total por cobrar */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Total por Cobrar
                </p>
                <p className="text-2xl font-bold text-red-600">
                  ${kpis.totalPendingBalance.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Saldo acumulado pendiente</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recaudado este mes */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Recaudado este Mes
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ${kpis.collectedThisMonth.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Mes actual</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Socios morosos */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Socios con Deuda
                </p>
                <p className="text-2xl font-bold text-amber-600">
                  {kpis.delinquentMembersCount}
                </p>
                <p className="text-xs text-gray-400 mt-1">Con cuotas pendientes</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cuotas vencidas */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Cuotas Vencidas
                </p>
                <p className={`text-2xl font-bold ${kpis.overdueChargesCount > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                  {kpis.overdueChargesCount}
                </p>
                <p className="text-xs text-gray-400 mt-1">Fecha de vencimiento pasada</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpis.overdueChargesCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <Clock className={`h-5 w-5 ${kpis.overdueChargesCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="section-card">
        {/* Tab navigation */}
        <div className="border-b border-gray-100 px-6">
          <nav className="flex gap-1 -mb-px">
            {TABS.map(tab => (
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

        {/* Tab content — pasa el estado compartido para evitar hooks duplicados */}
        <div className="p-6">
          {activeTab === 'deudores'  && (
            <DebtorsTab
              canManage={canManagePayments}
              paymentsState={paymentsState}
              onRefreshKpis={fetchKpis}
            />
          )}
          {activeTab === 'historial' && (
            <PaymentHistoryTab paymentsState={paymentsState} />
          )}
          {activeTab === 'tipos' && (
            <ChargeTypesTab
              canManage={canManagePayments}
              paymentsState={paymentsState}
            />
          )}
        </div>
      </div>

      {/* Modal generar cuotas — usa solo tipos recurrentes válidos */}
      <GenerateChargesModal
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
        chargeTypes={chargeTypesRecurring}
        onGenerate={generateMonthlyChargesRpc}
        onConfigureMonthlyType={handleGoToChargeTypes}
        loading={loading}
      />

      {/* Icono de carga global */}
      {(refreshing) && (
        <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-2 text-sm text-gray-700 z-50">
          <RefreshCw className="h-4 w-4 animate-spin text-primary-500" />
          Actualizando…
        </div>
      )}
      {refreshDone && !refreshing && (
        <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-lg border border-green-200 px-4 py-2 flex items-center gap-2 text-sm text-green-700 z-50">
          <CheckCircle2 className="h-4 w-4" />
          Información actualizada
        </div>
      )}
    </div>
  )
}
