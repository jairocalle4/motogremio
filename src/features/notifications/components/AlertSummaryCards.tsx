import { Card, CardContent } from '@/components/ui/Card'
import { ShieldAlert, AlertTriangle, Info, BellRing } from 'lucide-react'

interface AlertSummaryCardsProps {
  criticalCount: number
  warningCount: number
  infoCount: number
  systemCount: number
}

export function AlertSummaryCards({
  criticalCount,
  warningCount,
  infoCount,
  systemCount
}: AlertSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Críticas */}
      <Card className="border-l-4 border-l-danger-500 hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Críticas</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{criticalCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-danger-50 flex items-center justify-center text-danger-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Advertencias */}
      <Card className="border-l-4 border-l-warning-500 hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Advertencias</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{warningCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-warning-50 flex items-center justify-center text-warning-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Informativas */}
      <Card className="border-l-4 border-l-info-500 hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Informativas</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{infoCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-info-50 flex items-center justify-center text-info-600">
            <Info className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Sistema */}
      <Card className="border-l-4 border-l-primary-500 hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Mensajes de Sistema</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{systemCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
            <BellRing className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
