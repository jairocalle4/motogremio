import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import { calculateDocumentStatus } from '@/utils/statusCalculator'
import type { Database } from '@/types/database.types'

export type DocumentType = Database['public']['Tables']['document_types']['Row']
export type DocumentRow = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']

export type DocumentWithRelations = DocumentRow & {
  document_type: Pick<DocumentType, 'id' | 'name' | 'requires_expiry' | 'target_entity'>
  member?: { id: string, first_name: string, last_name: string } | null
  driver?: { id: string, first_name: string, last_name: string } | null
  vehicle?: { id: string, disk_number: string, plate: string } | null
}

export function useDocuments() {
  const { profile } = useAuth()
  const [documents, setDocuments] = useState<DocumentWithRelations[]>([])
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDocumentTypes = useCallback(async () => {
    if (!profile?.company_id) return
    try {
      const { data, error: fetchError } = await supabase
        .from('document_types')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('name')
      
      if (fetchError) throw fetchError
      setDocumentTypes(data || [])
    } catch (err: any) {
      console.error('Error fetching document types:', err)
    }
  }, [profile?.company_id])

  const fetchDocuments = useCallback(async (entityType?: 'member' | 'driver' | 'vehicle' | 'company', entityId?: string) => {
    if (!profile?.company_id) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          document_type:document_types ( id, name, requires_expiry, target_entity ),
          member:members ( id, first_name, last_name ),
          driver:drivers ( id, first_name, last_name ),
          vehicle:vehicles ( id, disk_number, plate )
        `)
        .eq('company_id', profile.company_id)

      if (entityType === 'member' && entityId) query = query.eq('member_id', entityId)
      if (entityType === 'driver' && entityId) query = query.eq('driver_id', entityId)
      if (entityType === 'vehicle' && entityId) query = query.eq('vehicle_id', entityId)
      if (entityType === 'company') {
        query = query.is('member_id', null).is('driver_id', null).is('vehicle_id', null)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Calcular estados en base a fechas
      const docsWithStatus = (data as any[]).map(doc => ({
        ...doc,
        status: calculateDocumentStatus(doc.expiry_date)
      }))

      setDocuments(docsWithStatus)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.company_id])

  const createDocument = async (docData: DocumentInsert) => {
    if (!profile?.company_id) return { data: null, error: 'No company' }
    try {
      // Auto-calcular estado inicial
      const computedStatus = calculateDocumentStatus(docData.expiry_date || null)
      const dataToInsert = {
        ...docData,
        company_id: profile.company_id,
        status: computedStatus
      }

      const { data, error: insertError } = await supabase
        .from('documents')
        .insert(dataToInsert)
        .select()
        .single()

      if (insertError) throw insertError
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const updateDocument = async (id: string, updates: DocumentUpdate) => {
    try {
      const dataToUpdate = { ...updates }
      if ('expiry_date' in updates) {
        dataToUpdate.status = calculateDocumentStatus(updates.expiry_date || null)
      }

      const { data, error: updateError } = await supabase
        .from('documents')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const deleteDocument = async (id: string) => {
    try {
      const { error: delError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

      if (delError) throw delError
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  const fetchAllDocumentTypes = useCallback(async () => {
    if (!profile?.company_id) return []
    try {
      const { data, error: fetchError } = await supabase
        .from('document_types')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name')
      
      if (fetchError) throw fetchError
      return data || []
    } catch (err: any) {
      console.error('Error fetching all document types:', err)
      return []
    }
  }, [profile?.company_id])

  const createDocumentType = async (name: string, targetEntity: 'member' | 'driver' | 'vehicle' | 'company', requiresExpiry: boolean) => {
    if (!profile?.company_id) return { data: null, error: 'No company_id' }
    try {
      const { data, error: insertError } = await supabase
        .from('document_types')
        .insert({
          company_id: profile.company_id,
          name,
          target_entity: targetEntity,
          requires_expiry: requiresExpiry,
          is_active: true
        })
        .select()
        .single()
      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Ya existe un tipo de documento con este nombre y entidad destino en esta compañía.')
        }
        throw insertError
      }
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const updateDocumentType = async (id: string, updates: Partial<Omit<DocumentType, 'id' | 'company_id'>>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('document_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error('Ya existe un tipo de documento con este nombre y entidad destino en esta compañía.')
        }
        throw updateError
      }
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const checkStorageCapability = async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_storage_capability')
      if (error) throw error
      return data
    } catch (err: any) {
      console.error('Capability error:', err)
      return { can_upload: false, reason: 'error' }
    }
  }

  const uploadDocumentFile = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const { data, error } = await supabase.functions.invoke('upload-company-document', {
        body: formData
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      
      return { data, error: null }
    } catch (err: any) {
      console.error('Upload error:', err)
      return { data: null, error: err.message || 'Error al subir el archivo' }
    }
  }

  return {
    documents,
    documentTypes,
    loading,
    error,
    fetchDocumentTypes,
    fetchAllDocumentTypes,
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    createDocumentType,
    updateDocumentType,
    checkStorageCapability,
    uploadDocumentFile
  }
}
