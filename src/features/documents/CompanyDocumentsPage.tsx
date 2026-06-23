import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { DocumentBadge } from '@/components/ui/DocumentBadge'
import { useDocuments, type DocumentWithRelations } from '@/hooks/useDocuments'
import { FileText, Search, AlertTriangle, FileCheck, Clock, FileQuestion } from 'lucide-react'
import { DocumentFormModal } from './DocumentFormModal'
import { Button } from '@/components/ui/Button'
import { usePermissions } from '@/hooks/usePermissions'

export function CompanyDocumentsPage() {
  const { documents, documentTypes, loading, fetchDocuments, fetchDocumentTypes, createDocument } = useDocuments()
  const { isAdmin } = usePermissions()
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
      // toast or handle error appropriately
    } finally {
      setIsSubmitting(false)
    }
  }

  // KPIs calculation
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
    const matchesSearch = 
      doc.document_type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.document_number && doc.document_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      getEntityName(doc).toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    
    let matchesEntity = true
    if (entityFilter !== 'all') {
      const type = getEntityTypeLabel(doc)
      if (entityFilter === 'company' && type !== 'Compañía') matchesEntity = false
      if (entityFilter === 'member' && type !== 'Socio') matchesEntity = false
      if (entityFilter === 'driver' && type !== 'Conductor') matchesEntity = false
      if (entityFilter === 'vehicle' && type !== 'Unidad') matchesEntity = false
    }

    return matchesSearch && matchesStatus && matchesEntity
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos y vencimientos</h1>
          <p className="text-sm text-gray-500">Controla documentos de socios, conductores, unidades y compañía.</p>
        </div>
        {isAdmin && (
          <Button onClick={handleAddCompanyDoc} className="gap-2 shrink-0">
            Añadir Documento de Compañía
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4 bg-white border-l-4 border-l-success-500">
          <div className="p-3 bg-success-50 rounded-full">
            <FileCheck className="h-6 w-6 text-success-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Vigentes</p>
            <p className="text-2xl font-bold text-gray-900">{vigentes}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 bg-white border-l-4 border-l-warning-500">
          <div className="p-3 bg-warning-50 rounded-full">
            <Clock className="h-6 w-6 text-warning-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Por Vencer</p>
            <p className="text-2xl font-bold text-gray-900">{porVencer}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 bg-white border-l-4 border-l-danger-500">
          <div className="p-3 bg-danger-50 rounded-full">
            <AlertTriangle className="h-6 w-6 text-danger-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Vencidos</p>
            <p className="text-2xl font-bold text-gray-900">{vencidos}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 bg-white border-l-4 border-l-gray-300">
          <div className="p-3 bg-gray-50 rounded-full">
            <FileText className="h-6 w-6 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Documentos</p>
            <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por titular, tipo o número de documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-sm min-w-[130px]"
            >
              <option value="all">Todos los estados</option>
              <option value="vigente">Vigente</option>
              <option value="por_vencer">Por vencer</option>
              <option value="vencido">Vencido</option>
            </select>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="input text-sm min-w-[130px]"
            >
              <option value="all">Todas las entidades</option>
              <option value="company">Compañía</option>
              <option value="member">Socios</option>
              <option value="driver">Conductores</option>
              <option value="vehicle">Unidades</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Tipo de Documento</th>
                <th className="px-4 py-3">Entidad</th>
                <th className="px-4 py-3">Nombre / Referencia</th>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Vencimiento</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Cargando documentos...
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <FileQuestion className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    No se encontraron documentos
                  </td>
                </tr>
              ) : (
                filteredDocuments.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {doc.document_type.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {getEntityTypeLabel(doc)}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {getEntityName(doc)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono">
                      {doc.document_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {doc.expiry_date || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <DocumentBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {doc.file_url ? (
                        <a 
                          href={doc.file_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                        >
                          Ver Archivo
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Sin archivo</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen && (
        <DocumentFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitCompanyDoc}
          documentTypes={documentTypes}
          targetEntity="company"
          entityId=""
          loading={isSubmitting}
        />
      )}
    </div>
  )
}
