import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

const bravoAdmin = { email: 'admin@bravoPeralta.dev', pass: 'Bravo2026' }

async function checkRPC() {
  await supabase.auth.signInWithPassword({ email: bravoAdmin.email, password: bravoAdmin.pass })
  
  const { data, error } = await supabase.rpc('is_super_admin')
  console.log('is_super_admin exists?', error ? error.message : data)
  
  // Try to create a user to test if super_admin exists... wait, I'm just checking if the function exists.
}

checkRPC().then(() => process.exit(0)).catch(console.error)
