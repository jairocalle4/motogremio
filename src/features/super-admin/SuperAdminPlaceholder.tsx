import { Card } from '@/components/ui/Card'
import { AlertCircle } from 'lucide-react'

export function SuperAdminPlaceholder({ title, description }: { title: string, description?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-slate-500">{description}</p>}
      </div>

      <Card className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Módulo sin datos</h2>
        <p className="text-slate-500 max-w-md">
          Esta sección está preparada para integrarse con las métricas y configuraciones en la próxima actualización.
          Actualmente no hay información disponible para visualizar.
        </p>
      </Card>
    </div>
  )
}
