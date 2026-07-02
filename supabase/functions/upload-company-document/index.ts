import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sha1(source: string) {
  const data = new TextEncoder().encode(source);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // 1. Client as the user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // 2. Client as service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Identify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Verify capability using the user's context (evaluates role, company, plan)
    const { data: capability, error: capError } = await supabaseClient.rpc('get_my_storage_capability')
    if (capError || !capability?.can_upload) {
      throw new Error(`Upload not allowed: ${capability?.reason || capError?.message}`)
    }

    // Retrieve full settings using service role, based on user's company
    // Get company_id first
    const { data: profile } = await supabaseClient.from('profiles').select('company_id').eq('id', user.id).single()
    if (!profile || !profile.company_id) {
      throw new Error('Company not found')
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('company_storage_settings')
      .select('*')
      .eq('company_id', profile.company_id)
      .single()

    if (settingsError || !settings || !settings.is_active || !settings.api_secret_encrypted) {
      throw new Error('Cloudinary config is missing or inactive')
    }

    // Parse formData from request
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      throw new Error('No file uploaded')
    }

    // Validate size
    const maxSizeInBytes = settings.max_file_size_mb * 1024 * 1024
    if (file.size > maxSizeInBytes) {
      throw new Error(`File too large. Maximum size is ${settings.max_file_size_mb} MB`)
    }

    // Validate type (basic)
    const allowedTypes = settings.allowed_formats.map((f: string) => f.toLowerCase())
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    
    // allow 'pdf', 'jpg', 'jpeg', 'png', 'webp'
    let isValidExt = false;
    if (ext === 'jpg' && allowedTypes.includes('jpeg')) isValidExt = true;
    if (ext === 'jpeg' && allowedTypes.includes('jpg')) isValidExt = true;
    if (allowedTypes.includes(ext)) isValidExt = true;
    
    if (!isValidExt) {
       throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`)
    }

    // Upload to Cloudinary
    const timestamp = Math.round(new Date().getTime() / 1000).toString()
    
    // Build parameters to sign
    const paramsToSign: Record<string, string> = {
      timestamp
    }
    
    if (settings.base_folder) {
      paramsToSign['folder'] = settings.base_folder
    }

    // Sort keys alphabetically
    const sortedKeys = Object.keys(paramsToSign).sort()
    const signString = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&') + settings.api_secret_encrypted

    
    const signature = await sha1(signString)

    const cloudinaryFormData = new FormData()
    cloudinaryFormData.append('file', file)
    cloudinaryFormData.append('api_key', settings.api_key)
    cloudinaryFormData.append('timestamp', timestamp)
    cloudinaryFormData.append('signature', signature)
    
    if (settings.base_folder) {
      cloudinaryFormData.append('folder', settings.base_folder)
    }

    // Note: upload_preset can be appended but it might interfere with signed uploads depending on settings. 
    // Usually it's better to omit it for strict signed uploads unless specifically configured. We'll skip preset for signed upload to keep it reliable.

    const cloudName = settings.cloud_name
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload` // 'auto' handles image/raw(pdf)

    const cloudinaryRes = await fetch(url, {
      method: 'POST',
      body: cloudinaryFormData
    })

    const cloudinaryData = await cloudinaryRes.json()

    if (!cloudinaryRes.ok) {
      // Log failure
      await supabaseAdmin.from('file_upload_logs').insert({
        company_id: profile.company_id,
        provider: 'cloudinary',
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        status: 'failed',
        error_message: cloudinaryData.error?.message || 'Cloudinary upload failed',
        uploaded_by: user.id
      })
      throw new Error(`Cloudinary error: ${cloudinaryData.error?.message || 'Upload failed'}`)
    }

    // Log success
    await supabaseAdmin.from('file_upload_logs').insert({
      company_id: profile.company_id,
      provider: 'cloudinary',
      file_name: file.name,
      file_type: file.type,
      file_size_bytes: file.size,
      status: 'success',
      uploaded_by: user.id
    })

    return new Response(
      JSON.stringify({ 
        url: cloudinaryData.secure_url,
        public_id: cloudinaryData.public_id,
        format: cloudinaryData.format,
        bytes: cloudinaryData.bytes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Upload Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
