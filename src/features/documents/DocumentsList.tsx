import { useState, useEffect } from 'react'
import { Plus, FileText, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DocumentBadge } from '@/components/ui/DocumentBadge'
import { DocumentFormModal } from './DocumentFormModal'
import { useDocuments, type DocumentWithRelations } from '@/hooks/useDocuments'
import toast from 'react-hot-toast'

interface DocumentsListProps {
  targetEntity: 'member' | 'driver' | 'vehicle'
  entityId: string
  title?: string
}

export function DocumentsList({ targetEntity, entityId, title = 'Documentos' }: DocumentsListProps) {
  const { documents, documentTypes, loading, fetchDocuments, fetchDocumentTypes, createDocument, updateDocument, deleteDocument } = useDocuments()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<DocumentWithRelations | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchDocumentTypes()
    fetchDocuments(targetEntity, entityId)
  }, [targetEntity, entityId, fetchDocumentTypes, fetchDocuments])

  const handleOpenAdd = () => {
    setEditingDoc(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (doc: DocumentWithRelations) => {
    setEditingDoc(doc)
    setIsModalOpen(true)
  }

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      if (editingDoc) {
        const { error } = await updateDocument(editingDoc.id, data)
        if (error) throw new Error(error)
        toast.success('Documento actualizado correctamente')
      } else {
        const { error } = await createDocument(data)
        if (error) throw new Error(error)
        toast.success('Documento añadido correctamente')
      }
      setIsModalOpen(false)
      fetchDocuments(targetEntity, entityId)
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el documento')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) return
    const { error } = await deleteDocument(id)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Documento eliminado')
      fetchDocuments(targetEntity, entityId)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <Button onClick={handleOpenAdd} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Añadir Documento
        </Button>
      </div>

      {loading && documents.length === 0 ? (
        <div className="p-8 text-center text-gray-500">Cargando documentos...</div>
      ) : documents.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 border-dashed">
          <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p>No hay documentos registrados</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {documents.map(doc => (
            <Card key={doc.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{doc.document_type.name}</h4>
                  {doc.document_number && (
                    <p className="text-sm text-gray-500 font-mono mt-0.5">N.° {doc.document_number}</p>
                  )}
                </div>
                <DocumentBadge status={doc.status} />
              </div>
              
              <div className="text-xs text-gray-500 space-y-1">
                {doc.issue_date && <p>Emitido: {doc.issue_date}</p>}
                {doc.expiry_date && <p>Vence: {doc.expiry_date}</p>}
                {doc.file_url && (
                  <p>
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                      Ver archivo adjunto
                    </a>
                  </p>
                )}
              </div>

              <div className="mt-auto pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(doc)}
                  className="p-1.5 text-gray-400 hover:text-brand-600 rounded-md hover:bg-brand-50"
                  title="Editar documento"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 text-gray-400 hover:text-danger-600 rounded-md hover:bg-danger-50"
                  title="Eliminar documento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isModalOpen && (
        <DocumentFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          document={editingDoc}
          documentTypes={documentTypes}
          targetEntity={targetEntity}
          entityId={entityId}
          loading={isSubmitting}
        />
      )}
    </div>
  )
}
