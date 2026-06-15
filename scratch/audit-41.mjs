import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

const bravoAdmin = { email: 'admin@bravoPeralta.dev', pass: 'Bravo2026' }
const tritonAdmin = { email: 'admin@triton.dev', pass: 'Triton2026' }

async function audit() {
  console.log('--- AUDIT COMPANIES STATUS ---')
  await supabase.auth.signInWithPassword({ email: bravoAdmin.email, password: bravoAdmin.pass })
  const { data: bData } = await supabase.from('companies').select('status')
  console.log('Bravo status:', bData)
  
  await supabase.auth.signInWithPassword({ email: tritonAdmin.email, password: tritonAdmin.pass })
  const { data: tData } = await supabase.from('companies').select('status')
  console.log('Triton status:', tData)
}

audit().then(() => process.exit(0)).catch(console.error)
