import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Package, CheckCircle2, Edit2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Database } from '@/types/database.types'

type Plan = Database['public']['Tables']['plans']['Row']

export function SuperAdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price_monthly', { ascending: true })
      
      if (error) throw error
      setPlans(data || [])
    } catch (err: any) {
      toast.error('Error al cargar planes: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planes SaaS</h1>
          <p className="text-slate-500">Visualiza la estructura de planes y precios</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`p-6 relative overflow-hidden ${plan.name === 'profesional' ? 'border-2 border-blue-500 shadow-md' : ''}`}
          >
            {plan.name === 'profesional' && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                RECOMENDADO
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${plan.name === 'profesional' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                <Package className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 capitalize">{plan.name}</h2>
            </div>
            
            <div className="mb-6">
              <span className="text-3xl font-bold text-slate-900">${plan.price_monthly}</span>
              <span className="text-slate-500">/mes</span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-slate-600">
                  {plan.max_vehicles === -1 ? 'Unidades ilimitadas' : `Hasta ${plan.max_vehicles} unidades`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-slate-600">
                  {plan.max_members === -1 ? 'Socios ilimitados' : `Hasta ${plan.max_members} socios`}
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2"
              onClick={() => toast('La edición de planes se habilitará próximamente', { icon: '🚧' })}
            >
              <Edit2 className="h-4 w-4" />
              Editar Plan
            </Button>
          </Card>
        ))}
      </div>
      
      {plans.length === 0 && (
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No hay planes configurados</h3>
          <p className="text-slate-500 mt-2">Los planes deben inicializarse en la base de datos.</p>
        </Card>
      )}
    </div>
  )
}
