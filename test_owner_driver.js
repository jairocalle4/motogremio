import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runTest() {
  console.log("=== TEST: FLUJO SOCIO-CONDUCTOR ===")

  // 1. Login
  console.log("\n1. Iniciando sesión como admin@bravoPeralta.dev...")
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@bravoPeralta.dev',
    password: 'Bravo2026',
  })
  
  if (authError) {
    console.error("Error login:", authError.message)
    return
  }
  console.log("✅ Login exitoso. Usuario ID:", authData.user.id)

  // 2. Obtener un Socio
  console.log("\n2. Buscando al socio ficticio 'Juan Carlos Bravo'...")
  const { data: members, error: memErr } = await supabase
    .from('members')
    .select('*')
    .ilike('first_name', '%Juan Carlos%')
    .limit(1)

  if (memErr || !members || members.length === 0) {
    console.error("Error al obtener socio:", memErr)
    return
  }
  const member = members[0]
  console.log("✅ Socio encontrado:", member.first_name, member.last_name, "- ID:", member.id)

  // 3. Simular lógica del frontend: "El socio también conduce" (_owner)
  console.log("\n3. Verificando si ya tiene registro de conductor asociado...")
  const { data: existingDrivers, error: existErr } = await supabase
    .from('drivers')
    .select('*')
    .eq('member_id', member.id)

  let driverId = null;

  if (existingDrivers && existingDrivers.length > 0) {
    console.log("   -> El socio ya tenía perfil de conductor. Reutilizando...")
    driverId = existingDrivers[0].id
  } else {
    console.log("   -> No existe perfil de conductor. Creando uno nuevo referenciado al socio...")
    const { data: newDriver, error: driverErr } = await supabase
      .from('drivers')
      .insert({
        document_id: member.document_id,
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone,
        address: member.address,
        status: 'activo',
        member_id: member.id, // VINCULACIÓN CRUCIAL
      })
      .select()
      .single()

    if (driverErr) {
      console.error("❌ Error creando conductor:", driverErr.message)
      return
    }
    console.log("✅ Registro de Conductor creado exitosamente. ID:", newDriver.id)
    driverId = newDriver.id
  }

  // 4. Crear vehículo
  console.log("\n4. Registrando nueva unidad (Mototaxi) y asignando al socio y conductor...")
  const { data: vehicle, error: vehErr } = await supabase
    .from('vehicles')
    .insert({
      disk_number: `T-${Math.floor(Math.random() * 1000)}`,
      plate: `ABC-${Math.floor(Math.random() * 1000)}`,
      brand: 'TVS',
      model: 'King',
      year: 2024,
      status: 'activa',
      member_id: member.id, // DUEÑO
      driver_id: driverId   // CONDUCTOR
    })
    .select('*, driver:drivers(*), owner:members!vehicles_member_id_fkey(*)')
    .single()

  if (vehErr) {
    console.error("❌ Error creando unidad:", vehErr.message)
    return
  }
  
  console.log("✅ Unidad creada exitosamente:", vehicle.plate, "Disco:", vehicle.disk_number)
  console.log("\n--- VERIFICACIÓN FINAL EN BD ---")
  console.log(`- Socio Propietario (member_id): ${vehicle.owner.first_name} ${vehicle.owner.last_name}`)
  console.log(`- Conductor Asignado (driver_id): ${vehicle.driver.first_name} ${vehicle.driver.last_name}`)
  console.log(`- ¿El conductor está vinculado al socio? ${vehicle.driver.member_id === vehicle.owner.id ? 'SÍ ✅' : 'NO ❌'}`)
  
  console.log("\nTest concluido.")
}

runTest()
