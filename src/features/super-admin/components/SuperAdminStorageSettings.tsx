import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Cloud, CheckCircle, Save, HelpCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

export function SuperAdminStorageSettings({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [hasSecret, setHasSecret] = useState(false)
  const [formData, setFormData] = useState({
    cloud_name: '',
    api_key: '',
    api_secret: '',
    upload_preset: '',
    base_folder: '',
    max_file_size_mb: '5',
    is_active: 'false'
  })

  useEffect(() => {
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_storage_settings', {
        p_company_id: companyId
      })
      if (error) throw error
      if (data) {
        const settings = data as any
        setFormData({
          cloud_name: settings.cloud_name || '',
          api_key: settings.api_key || '',
          api_secret: '', // Nunca mostramos el secreto
          upload_preset: settings.upload_preset || '',
          base_folder: settings.base_folder || '',
          max_file_size_mb: settings.max_file_size_mb?.toString() || '5',
          is_active: settings.is_active ? 'true' : 'false'
        })
        setHasSecret(settings.has_secret || false)
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.rpc('upsert_company_storage_settings', {
        p_company_id: companyId,
        p_cloud_name: formData.cloud_name,
        p_api_key: formData.api_key,
        p_api_secret: formData.api_secret || '',
        p_upload_preset: formData.upload_preset || '',
        p_base_folder: formData.base_folder || '',
        p_max_file_size_mb: parseInt(formData.max_file_size_mb),
        p_allowed_formats: ['pdf','jpg','jpeg','png','webp'],
        p_is_active: formData.is_active === 'true'
      })
      
      if (error) throw error
      
      toast.success('Configuración guardada correctamente')
      if (formData.api_secret) {
         setHasSecret(true)
         setFormData(prev => ({...prev, api_secret: ''}))
      }
      fetchSettings()
    } catch (err: any) {
      console.error(err)
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const { data, error } = await supabase.functions.invoke('test-cloudinary-connection', {
        body: { company_id: companyId }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast.success(data?.message || 'Conexión Cloudinary verificada correctamente.')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'No se pudo conectar con Cloudinary. Revisa Cloud Name, API Key y API Secret.')
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Cargando configuración...</div>

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Cloud className="h-5 w-5 text-slate-500" />
            Almacenamiento Documental (Cloudinary)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configuración exclusiva de este cliente para la carga de documentos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Estado de integración"
          value={formData.is_active}
          onChange={(e) => setFormData(f => ({ ...f, is_active: e.target.value }))}
          options={[
            { value: 'false', label: 'Inactivo' },
            { value: 'true', label: 'Activo' }
          ]}
        />
        <div>
          <Input
            label="Cloud Name *"
            value={formData.cloud_name}
            onChange={(e) => setFormData(f => ({ ...f, cloud_name: e.target.value }))}
            placeholder="ej: dxqk2m3xyz"
          />
          <p className="text-[11px] text-slate-400 mt-1">Identificador del entorno de Cloudinary. Ejemplo: ddw9fdcnt.</p>
        </div>
        <Input
          label="API Key *"
          value={formData.api_key}
          onChange={(e) => setFormData(f => ({ ...f, api_key: e.target.value }))}
        />
        <div>
          <Input
            type="password"
            label="API Secret *"
            value={formData.api_secret}
            onChange={(e) => setFormData(f => ({ ...f, api_secret: e.target.value }))}
            placeholder={hasSecret ? '******** (Dejar en blanco para conservar)' : 'Ingresa el API Secret'}
          />
          {hasSecret && !formData.api_secret && (
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
              <CheckCircle className="w-3 h-3" /> Credencial guardada
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">Se guarda de forma segura y no se vuelve a mostrar. Déjalo vacío si solo deseas conservar la credencial actual.</p>
        </div>
        <div>
          <Input
            label="Upload Preset (Opcional)"
            value={formData.upload_preset}
            onChange={(e) => setFormData(f => ({ ...f, upload_preset: e.target.value }))}
            placeholder="ej: ml_default"
          />
          <p className="text-[11px] text-slate-400 mt-1">Opcional. Úsalo solo si configuraste un preset de subida en Cloudinary. Para esta integración segura puedes dejarlo vacío.</p>
        </div>
        <div>
          <Input
            label="Carpeta Base (Opcional)"
            value={formData.base_folder}
            onChange={(e) => setFormData(f => ({ ...f, base_folder: e.target.value }))}
            placeholder="ej: motogremio_coop1"
          />
          <p className="text-[11px] text-slate-400 mt-1">Opcional. Sirve para organizar archivos. Ejemplo: motogremio/bravo-peralta.</p>
        </div>
        <Select
          label="Tamaño máximo por archivo"
          value={formData.max_file_size_mb}
          onChange={(e) => setFormData(f => ({ ...f, max_file_size_mb: e.target.value }))}
          options={[
            { value: '5', label: '5 MB (Recomendado Profesional)' },
            { value: '10', label: '10 MB (Recomendado Empresarial)' },
            { value: '25', label: '25 MB' }
          ]}
        />
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-xs text-blue-800">
        <p className="font-semibold flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4" />
          Nota sobre visualización de archivos PDF
        </p>
        <p className="leading-relaxed">
          <strong>Importante:</strong> para visualizar PDFs desde enlaces públicos, Cloudinary debe tener habilitada la entrega de archivos PDF/ZIP en la configuración de seguridad del entorno. Si esta opción está bloqueada, los PDFs pueden subir correctamente pero abrirán con error 401.
        </p>
        <p className="leading-relaxed text-blue-700/80">
          La prueba de conexión valida credenciales, pero no confirma que Cloudinary permita entregar PDFs públicamente. Para PDFs, revisa la configuración de seguridad <em>PDF/ZIP delivery</em>.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button onClick={handleTestConnection} isLoading={testing} variant="outline" type="button">
          Probar conexión
        </Button>
        <Button onClick={handleSave} isLoading={saving} className="gap-2">
          <Save className="w-4 h-4" />
          Guardar Configuración
        </Button>
      </div>
    </Card>
  )
}
