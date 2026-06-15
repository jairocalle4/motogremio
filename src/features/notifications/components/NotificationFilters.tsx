import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

interface NotificationFiltersProps {
  searchTerm: string
  onSearchChange: (val: string) => void
  severityFilter: string
  onSeverityFilterChange: (val: string) => void
  originFilter: string
  onOriginFilterChange: (val: string) => void
}

export function NotificationFilters({
  searchTerm,
  onSearchChange,
  severityFilter,
  onSeverityFilterChange,
  originFilter,
  onOriginFilterChange
}: NotificationFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
      <div className="w-full md:flex-1">
        <label className="text-xs font-semibold text-gray-500 block mb-1">Buscar en mensaje o título</label>
        <Input
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="w-full md:w-48">
        <label className="text-xs font-semibold text-gray-500 block mb-1">Severidad</label>
        <Select
          value={severityFilter}
          onChange={(e) => onSeverityFilterChange(e.target.value)}
          options={[
            { value: '', label: 'Todos' },
            { value: 'critica', label: 'Críticas' },
            { value: 'advertencia', label: 'Advertencias' },
            { value: 'informativa', label: 'Informativas' }
          ]}
        />
      </div>

      <div className="w-full md:w-48">
        <label className="text-xs font-semibold text-gray-500 block mb-1">Origen / Módulo</label>
        <Select
          value={originFilter}
          onChange={(e) => onOriginFilterChange(e.target.value)}
          options={[
            { value: '', label: 'Todos' },
            { value: 'documentos', label: 'Documentos' },
            { value: 'licencias', label: 'Licencias' },
            { value: 'finanzas', label: 'Cuotas / Deudas' },
            { value: 'sanciones', label: 'Sanciones' },
            { value: 'reuniones', label: 'Reuniones' },
            { value: 'unidades', label: 'Unidades' },
            { value: 'sistema', label: 'Sistema' }
          ]}
        />
      </div>
    </div>
  )
}
