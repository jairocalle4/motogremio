import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { DocumentBadge } from '@/components/ui/DocumentBadge'
import { useDocuments, type DocumentWithRelations } from '@/hooks/useDocuments'
import { FileText, Search, AlertTriangle, FileCheck, Clock, FileQuestion, Building2, ClipboardList, UploadCloud, Users, ArrowUpRight } from 'lucide-react'
import { DocumentFormModal } from './DocumentFormModal'
import { Button } from '@/components/ui/Button'
import { usePermissions } from '@/hooks/usePermissions'
import { Link } from 'react-router-dom'

export function CompanyDocumentsPage() {
  const { documents, documentTypes, loading, fetchDocuments, fetchDocumentTypes, createDocument } = useDocuments()
  const { isAdmin } = usePermissions()
  
  // Estados de UI y Filtros
  const [activeTab, setActiveTab] = useState<'institutional' | 'operational'>('institutional')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchDocumentTypes()
    fetchDocuments() // Fetch all documents for the company
  }, [fetchDocumentTypes, fetchDocuments])

  const handleAddCompanyDoc = () => {
    setIsModalOpen(true)
  }

  const handleSubmitCompanyDoc = async (data: any) => {
    setIsSubmitting(true)
    try {
      const { error } = await createDocument(data)
      if (error) throw new Error(error)
      setIsModalOpen(false)
      fetchDocuments()
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // KPIs calculation (generales)
  const vigentes = documents.filter(d => d.status === 'vigente').length
  const porVencer = documents.filter(d => d.status === 'por_vencer').length
  const vencidos = documents.filter(d => d.status === 'vencido').length

  const getEntityName = (doc: DocumentWithRelations) => {
    if (doc.member) return `${doc.member.first_name} ${doc.member.last_name}`
    if (doc.driver) return `${doc.driver.first_name} ${doc.driver.last_name}`
    if (doc.vehicle) return `Unidad ${doc.vehicle.disk_number} (${doc.vehicle.plate})`
    return 'Compañía'
  }

  const getEntityTypeLabel = (doc: DocumentWithRelations) => {
    if (doc.member) return 'Socio'
    if (doc.driver) return 'Conductor'
    if (doc.vehicle) return 'Unidad'
    return 'Compañía'
  }

  const filteredDocuments = documents.filter(doc => {
    // 1. Filtrar por tipo de pestaña (Institucionales vs Operativos)
    const isInstitutional = !doc.member && !doc.driver && !doc.vehicle
    if (activeTab === 'institutional' && !isInstitutional) return false
    if (activeTab === 'operational' && isInstitutional) return false

    // 2. Filtrar por término de búsqueda
    const matchesSearch = 
      doc.document_type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.document_number && doc.document_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      getEntityName(doc).toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    // 3. Filtrar por estado
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    if (!matchesStatus) return false
    
    // 4. Filtrar por entidad destino (Solo aplica en la pestaña Operativos)
    if (activeTab === 'operational' && entityFilter !== 'all') {
      const type = getEntityTypeLabel(doc)
      if (entityFilter === 'member' && type !== 'Socio') return false
      if (entityFilter === 'driver' && type !== 'Conductor') return false
      if (entityFilter === 'vehicle' && type !== 'Unidad') return false
    }

    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Documentos y vencimientos
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">
            {activeTab === 'institutional' 
              ? 'Administra la base documental institucional de la compañía.'
              : 'Vista de control de documentos asociados a socios, unidades y conductores. Para cargar o renovar un documento operativo, ingresa a la ficha correspondiente.'}
          </p>
        </div>
        {isAdmin && activeTab === 'institutional' && (
          <Button 
            onClick={handleAddCompanyDoc} 
            className="gap-2 shrink-0 bg-[#1E3A5F] hover:bg-[#152a45] text-white shadow-sm hover:shadow-md active:scale-95 transition-all duration-250 py-2.5 px-4.5 rounded-xl font-semibold flex items-center"
          >
            <UploadCloud className="w-5 h-5 text-white/95" />
            Añadir Documento Institucional
          </Button>
        )}
      </div>

      {/* KPIs Generales con Animaciones Suaves de Elevación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4 bg-white border-l-4 border-l-success-500 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transform transition-all duration-300">
          <div className="p-3 bg-success-50 rounded-xl text-success-600">
            <FileCheck className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vigentes</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{vigentes}</p>
          </div>
        </Card>
        
        <Card className="p-5 flex items-center gap-4 bg-white border-l-4 border-l-warning-500 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transform transition-all duration-300">
          <div className="p-3 bg-warning-50 rounded-xl text-warning-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Por Vencer</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{porVencer}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-white border-l-4 border-l-danger-500 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transform transition-all duration-300">
          <div className="p-3 bg-danger-50 rounded-xl text-danger-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vencidos</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{vencidos}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-white border-l-4 border-l-gray-300 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transform transition-all duration-300">
          <div className="p-3 bg-gray-50 rounded-xl text-gray-500">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total General</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{documents.length}</p>
          </div>
        </Card>
      </div>

      {/* Selector de Pestañas Premium (Segmented Control / iOS-style switcher) */}
      <div className="bg-gray-150 p-1.5 rounded-2xl max-w-2xl flex gap-1 border border-gray-200">
        <button
          onClick={() => {
            setActiveTab('institutional')
            setEntityFilter('all')
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-bold text-sm transition-all duration-300 ${
            activeTab === 'institutional'
              ? 'bg-white text-gray-900 shadow-md transform scale-[1.01]'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
          }`}
        >
          <Building2 className={`w-4.5 h-4.5 transition-colors ${activeTab === 'institutional' ? 'text-[#1E3A5F]' : 'text-gray-400'}`} />
          <span>Documentos de la Compañía (Institucionales)</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('operational')
            setEntityFilter('all')
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-bold text-sm transition-all duration-300 ${
            activeTab === 'operational'
              ? 'bg-white text-gray-900 shadow-md transform scale-[1.01]'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
          }`}
        >
          <ClipboardList className={`w-4.5 h-4.5 transition-colors ${activeTab === 'operational' ? 'text-[#1E3A5F]' : 'text-gray-400'}`} />
          <span>Documentos de Control (Operativos)</span>
        </button>
      </div>

      {/* Contenedor Principal de la Tabla */}
      <Card className="overflow-hidden bg-white shadow-sm border border-gray-200 rounded-2xl transition-all duration-300">
        {/* Barra de Filtros */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4.5 w-4.5" />
            <input
              type="text"
              placeholder={
                activeTab === 'institutional'
                  ? "Buscar por tipo, número de documento, etc..."
                  : "Buscar por titular, unidad, tipo o número..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10.5 input w-full text-sm bg-white border-gray-300 focus:border-[#1E3A5F] focus:ring-[#1E3A5F] rounded-xl py-2.5 transition-colors"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-sm min-w-[140px] bg-white border-gray-300 focus:border-[#1E3A5F] focus:ring-[#1E3A5F] rounded-xl py-2.5 transition-colors"
            >
              <option value="all">Todos los estados</option>
              <option value="vigente">Vigente</option>
              <option value="por_vencer">Por vencer</option>
              <option value="vencido">Vencido</option>
            </select>
            
            {activeTab === 'operational' && (
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="input text-sm min-w-[140px] bg-white border-gray-300 focus:border-[#1E3A5F] focus:ring-[#1E3A5F] rounded-xl py-2.5 transition-colors"
              >
                <option value="all">Todas las entidades</option>
                <option value="member">Socios</option>
                <option value="driver">Conductores</option>
                <option value="vehicle">Unidades</option>
              </select>
            )}
          </div>
        </div>

        {/* Tabla de Documentos */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/70 text-gray-550 font-bold border-b border-gray-150 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Tipo de Documento</th>
                {activeTab === 'operational' && <th className="px-6 py-4">Entidad</th>}
                <th className="px-6 py-4">{activeTab === 'operational' ? 'Titular / Referencia' : 'Compañía'}</th>
                <th className="px-6 py-4">Número</th>
                <th className="px-6 py-4">Vencimiento</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1E3A5F]"></div>
                      <span className="font-medium text-gray-600">Cargando documentos de forma segura...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                    <div className="max-w-md mx-auto">
                      <FileQuestion className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-base font-semibold text-gray-700">No se encontraron documentos</p>
                      <p className="text-xs text-gray-400 mt-1">Ajusta los filtros o añade un nuevo registro institucional o de control para empezar.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {doc.document_type.name}
                    </td>
                    {activeTab === 'operational' && (
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          doc.member ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          doc.driver ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-sky-50 text-sky-700 border border-sky-100'
                        }`}>
                          {doc.member && <Users className="w-3 h-3 text-indigo-500" />}
                          {getEntityTypeLabel(doc)}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {getEntityName(doc)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs tracking-wider">
                      {doc.document_number || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">
                      {doc.expiry_date || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <DocumentBadge status={doc.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === 'operational' && (
                          <Link
                            to={doc.member ? `/socios/${doc.member.id}` : doc.driver ? `/conductores/${doc.driver.id}` : `/unidades/${doc.vehicle?.id}`}
                            className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 text-xs font-bold transition-all duration-200 hover:underline active:scale-95 bg-brand-50 py-1.5 px-3 rounded-lg hover:bg-brand-100 whitespace-nowrap"
                          >
                            Ir a {getEntityTypeLabel(doc)}
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        {doc.file_url ? (
                          <a 
                            href={doc.file_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#1E3A5F] hover:text-[#152a45] text-xs font-bold transition-all duration-200 hover:underline active:scale-95 bg-[#1E3A5F]/5 py-1.5 px-3 rounded-lg hover:bg-[#1E3A5F]/10 whitespace-nowrap"
                          >
                            Ver Archivo
                            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs italic px-2">Sin archivo</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Subida de Documentos Institucionales */}
      {isModalOpen && (
        <DocumentFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitCompanyDoc}
          documentTypes={documentTypes}
          targetEntity="company"
          entityId=""
          loading={isSubmitting}
          onTypeCreated={fetchDocumentTypes}
        />
      )}
    </div>
  )
}

