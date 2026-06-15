import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

const bravoAdmin = { email: 'admin@bravoPeralta.dev', pass: 'Bravo2026' }

async function runTest() {
  await supabase.auth.signInWithPassword({ email: bravoAdmin.email, password: bravoAdmin.pass })
  
  const { data, error } = await supabase.rpc('get_super_admin_dashboard_stats')
  console.log('Result for get_super_admin_dashboard_stats (admin bravo):')
  console.log(error ? 'Error: ' + error.message : data)
}

runTest().then(() => process.exit(0)).catch(console.error)
