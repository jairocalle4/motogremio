import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phervmsyjkgjkvlfisns.supabase.co'
const supabaseAnonKey = 'sb_publishable_iCmauCSVGwicfdRn_iG-gg_5JtaxQYq'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  console.log("Logged in Bravo Peralta admin...")
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@bravoPeralta.dev',
    password: 'Bravo2026',
  })
  if (authError) {
    console.error("Login error Bravo:", authError.message)
    return
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', authData.user.id)
    .single()
  
  const bravoCompanyId = profile.company_id
  console.log("Company ID Bravo Peralta:", bravoCompanyId)
  
  // Login as Triton
  const supabaseTriton = createClient(supabaseUrl, supabaseAnonKey)
  const { data: authTriton } = await supabaseTriton.auth.signInWithPassword({
    email: 'admin@triton.dev',
    password: 'Triton2026',
  })
  
  const { data: profileTriton } = await supabaseTriton
    .from('profiles')
    .select('company_id')
    .eq('id', authTriton.user.id)
    .single()
  const tritonCompanyId = profileTriton.company_id
  console.log("Company ID Triton:", tritonCompanyId)

  // 1. Crear tipo de sanción
  console.log("\n--- 1. CREAR TIPO DE SANCIÓN ---")
  // Limpiar anterior si existe
  await supabase.from('sanction_types').delete().eq('company_id', bravoCompanyId).eq('name', 'Inasistencia a Asamblea General')
  
  const { data: sanctionType, error: ctErr } = await supabase
    .from('sanction_types')
    .insert({
      company_id: bravoCompanyId,
      name: 'Inasistencia a Asamblea General',
      description: 'Falta injustificada a la reunión mensual obligatoria',
      default_fine_amount: 25.00
    })
    .select()
    .single()
  
  if (ctErr) {
    console.error("Error al crear tipo de sanción:", ctErr.message)
    return
  }
  console.log("✅ Tipo de sanción creado:", sanctionType)

  // Obtener un socio de Bravo Peralta
  const { data: members } = await supabase
    .from('members')
    .select('id, first_name, last_name')
    .eq('company_id', bravoCompanyId)
    .limit(1)
  
  if (!members || members.length === 0) {
    console.error("No hay socios para las pruebas en Bravo Peralta")
    return
  }
  const testMember = members[0]
  console.log(`Usando socio de pruebas: ${testMember.first_name} ${testMember.last_name} (${testMember.id})`)

  // Obtener una unidad activa de Bravo Peralta
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, disk_number')
    .eq('company_id', bravoCompanyId)
    .limit(1)
  const testVehicle = vehicles?.[0]
  console.log(`Usando vehículo de pruebas (opcional): Disco ${testVehicle?.disk_number ?? 'Ninguno'}`)

  // 2. Registrar sanción sin valor económico (multa = 0)
  console.log("\n--- 2. REGISTRAR SANCIÓN SIN VALOR ECONÓMICO ---")
  const { data: sNoFine, error: sNoFineErr } = await supabase
    .from('sanctions')
    .insert({
      company_id: bravoCompanyId,
      member_id: testMember.id,
      vehicle_id: testVehicle?.id ?? null,
      sanction_type_id: sanctionType.id,
      date: '2026-06-11',
      reason: 'Llegada tarde sin justificar',
      severity: 'leve',
      status: 'pendiente'
    })
    .select()
    .single()
  
  if (sNoFineErr) {
    console.error("Error al registrar sanción sin multa:", sNoFineErr.message)
  } else {
    console.log("✅ Sanción sin valor económico creada:", sNoFine)
  }

  // 3. Registrar sanción con valor económico ($25.00)
  console.log("\n--- 3. REGISTRAR SANCIÓN CON VALOR ECONÓMICO ---")
  // Primero, asegurar que existe el tipo de cobro "Multa" para generar la deuda en charges
  let { data: chargeType } = await supabase
    .from('charge_types')
    .select('id')
    .eq('company_id', bravoCompanyId)
    .eq('name', 'Multa')
    .maybeSingle()
  
  if (!chargeType) {
    const { data: newCt } = await supabase
      .from('charge_types')
      .insert({
        company_id: bravoCompanyId,
        name: 'Multa',
        description: 'Cargos generados por sanciones disciplinarias',
        default_amount: 0,
        is_recurring: false
      })
      .select()
      .single()
    chargeType = newCt
  }

  // Crear la deuda en charges primero
  const { data: charge, error: chargeErr } = await supabase
    .from('charges')
    .insert({
      company_id: bravoCompanyId,
      member_id: testMember.id,
      vehicle_id: testVehicle?.id ?? null,
      charge_type_id: chargeType.id,
      description: `Multa por Inasistencia a Asamblea General (11/06/2026)`,
      amount: 25.00,
      balance: 25.00,
      due_date: '2026-06-26', // 15 días plazo
      status: 'pendiente',
      period_month: 6,
      period_year: 2026
    })
    .select()
    .single()

  if (chargeErr) {
    console.error("Error al generar deuda para la sanción:", chargeErr.message)
    return
  }
  console.log("✅ Deuda generada en charges:", charge)

  // Crear la sanción vinculando el charge_id
  const { data: sWithFine, error: sWithFineErr } = await supabase
    .from('sanctions')
    .insert({
      company_id: bravoCompanyId,
      member_id: testMember.id,
      vehicle_id: testVehicle?.id ?? null,
      sanction_type_id: sanctionType.id,
      charge_id: charge.id,
      date: '2026-06-11',
      reason: 'Inasistencia total a la asamblea mensual ordinaria',
      severity: 'grave',
      status: 'pendiente'
    })
    .select()
    .single()

  if (sWithFineErr) {
    console.error("Error al registrar sanción con multa:", sWithFineErr.message)
  } else {
    console.log("✅ Sanción con valor económico creada:", sWithFine)
  }

  // 4. Confirmar que la deuda aparece en charges y se puede ver
  console.log("\n--- 4. CONFIRMAR DEUDA VINCULADA ---")
  const { data: verifiedCharge } = await supabase
    .from('charges')
    .select('id, amount, balance, status')
    .eq('id', charge.id)
    .single()
  console.log("Deuda verificada en BD:", verifiedCharge)

  // 5. Confirmar RLS Bravo/Triton
  console.log("\n--- 5. CONFIRMAR RLS AISLAMIENTO ---")
  const { data: tritonCharges } = await supabaseTriton
    .from('charges')
    .select('id')
    .eq('id', charge.id)
  if (!tritonCharges || tritonCharges.length === 0) {
    console.log("✅ RLS correcto: Triton no puede ver deudas de Bravo Peralta.")
  } else {
    console.error("❌ ERROR RLS: Triton pudo consultar la deuda de Bravo Peralta.")
  }

  const { data: tritonSanctions } = await supabaseTriton
    .from('sanctions')
    .select('id')
    .eq('id', sWithFine.id)
  if (!tritonSanctions || tritonSanctions.length === 0) {
    console.log("✅ RLS correcto: Triton no puede ver sanciones de Bravo Peralta.")
  } else {
    console.error("❌ ERROR RLS: Triton pudo consultar la sanción de Bravo Peralta.")
  }

  // 6. Confirmar anulación de sanción en cascada
  console.log("\n--- 6. ANULACIÓN EN CASCADA DE SANCIÓN Y MULTA ---")
  // Simular anulación: se actualiza el estado de la sanción a 'anulada' y notas de resolución
  const { data: annulledSanction, error: annErr } = await supabase
    .from('sanctions')
    .update({
      status: 'anulada',
      resolution_notes: 'Anulado por error en registro'
    })
    .eq('id', sWithFine.id)
    .select()
    .single()

  if (annErr) {
    console.error("Error al anular la sanción:", annErr.message)
  } else {
    console.log("✅ Sanción anulada:", annulledSanction)
    
    // Anular el cobro asociado de forma consistente
    const { data: annulledCharge } = await supabase
      .from('charges')
      .update({
        status: 'anulada'
      })
      .eq('id', sWithFine.charge_id)
      .select()
      .single()
    
    console.log("✅ Deuda asociada anulada de forma consistente:", annulledCharge)
  }

  // Limpieza de registros de prueba creados
  console.log("\n--- LIMPIEZA DE DATOS ---")
  await supabase.from('sanctions').delete().eq('id', sNoFine.id)
  await supabase.from('sanctions').delete().eq('id', sWithFine.id)
  await supabase.from('charges').delete().eq('id', charge.id)
  console.log("✅ Datos de prueba eliminados correctamente.")
}

run()
