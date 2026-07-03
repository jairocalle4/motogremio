import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { company_id } = await req.json()
    if (!company_id) {
      throw new Error('Missing company_id')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // 1. Client as the user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Identify user and check if they are super_admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'super_admin') {
      throw new Error('Solo el Super Admin puede probar la conexión de almacenamiento.')
    }

    // 2. Client as service role to fetch encrypted secret
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('company_storage_settings')
      .select('*')
      .eq('company_id', company_id)
      .single()

    if (settingsError || !settings) {
      throw new Error('Guarda primero Cloud Name, API Key y API Secret para probar la conexión.')
    }

    const { cloud_name, api_key, api_secret_encrypted } = settings

    if (!cloud_name || !api_key || !api_secret_encrypted) {
      throw new Error('Guarda primero Cloud Name, API Key y API Secret para probar la conexión.')
    }

    // Probar conexión con Cloudinary
    const auth = btoa(`${api_key}:${api_secret_encrypted}`)
    const url = `https://api.cloudinary.com/v1_1/${cloud_name}/folders`

    const cloudinaryRes = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    })

    if (!cloudinaryRes.ok) {
      const errorText = await cloudinaryRes.text()
      console.error('Cloudinary API error:', errorText)
      throw new Error('No se pudo conectar con Cloudinary. Revisa Cloud Name, API Key y API Secret.')
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Conexión Cloudinary verificada correctamente.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Test Connection Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
