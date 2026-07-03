import { useState, useEffect } from 'react'
import { Plus, FileText, Trash2, Edit, Image, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { Card } from '@/components/ui/Card'
import { DocumentBadge } from '@/components/ui/DocumentBadge'
import { DocumentFormModal } from './DocumentFormModal'
import { useDocuments, type DocumentWithRelations } from '@/hooks/useDocuments'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import toast from 'react-hot-toast'

interface DocumentsListProps {
  targetEntity: 'member' | 'driver' | 'vehicle' | 'company'
  entityId: string
  title?: string
}

export function DocumentsList({ targetEntity, entityId, title = 'Documentos' }: DocumentsListProps) {
  const { documents, documentTypes, loading, fetchDocuments, fetchDocumentTypes, createDocument, updateDocument, deleteDocument } = useDocuments()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<DocumentWithRelations | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

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

  const handleDelete = (id: string) => {
    setDeleteTargetId(id)
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    const toastId = toast.loading('Eliminando documento...')
    try {
      const { error } = await deleteDocument(deleteTargetId)
      if (error) throw new Error(error)
      toast.success('Documento eliminado correctamente', { id: toastId })
      setDeleteTargetId(null)
      fetchDocuments(targetEntity, entityId)
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar', { id: toastId })
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
                 {doc.file_url && (() => {
                   const getFileDetails = (url: string) => {
                     const lowercaseUrl = url.toLowerCase();
                     const isPdf = lowercaseUrl.includes('.pdf') || lowercaseUrl.includes('/raw/upload/');
                     const isImage = lowercaseUrl.includes('.jpg') || lowercaseUrl.includes('.jpeg') || lowercaseUrl.includes('.png') || lowercaseUrl.includes('.webp') || lowercaseUrl.includes('/image/upload/');
                     return {
                       isPdf,
                       isImage,
                       label: isPdf ? 'Ver PDF' : isImage ? 'Ver imagen' : 'Ver archivo'
                     }
                   };
                   const fileDetails = getFileDetails(doc.file_url);
                   return (
                     <div className="pt-2">
                       <a 
                         href={doc.file_url} 
                         target="_blank" 
                         rel="noreferrer" 
                         className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-800 text-xs font-bold bg-brand-50 hover:bg-brand-100 py-1.5 px-3 rounded-lg transition-all duration-200 active:scale-95"
                       >
                         {fileDetails.isPdf ? (
                           <FileText className="w-3.5 h-3.5 text-red-600" />
                         ) : (
                           <Image className="w-3.5 h-3.5 text-blue-600" />
                         )}
                         {fileDetails.label}
                         <ArrowUpRight className="w-3.5 h-3.5 text-brand-600" />
                       </a>
                       {fileDetails.isPdf && (
                         <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                           Si el PDF no abre (Error 401), verifica la entrega de PDFs en Cloudinary.
                         </p>
                       )}
                     </div>
                   );
                 })()}
              </div>

              <div className="mt-auto pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <Tooltip content="Editar documento">
                  <button
                    onClick={() => handleOpenEdit(doc)}
                    className="p-1.5 text-gray-400 hover:text-brand-600 rounded-md hover:bg-brand-50"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip content="Eliminar documento">
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-gray-400 hover:text-danger-600 rounded-md hover:bg-danger-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Tooltip>
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
          onTypeCreated={fetchDocumentTypes}
        />
      )}

      <ConfirmModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Eliminar Documento"
        message="¿Estás seguro de que deseas eliminar este documento permanentemente?"
        detail="Esta acción no se puede deshacer. El archivo adjunto y los datos asociados al documento se borrarán de la base de datos."
        confirmLabel="Sí, eliminar"
        variant="danger"
      />
    </div>
  )
}
