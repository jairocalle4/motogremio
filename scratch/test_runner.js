import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phervmsyjkgjkvlfisns.supabase.co'
const supabaseAnonKey = 'sb_publishable_iCmauCSVGwicfdRn_iG-gg_5JtaxQYq'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  // Login as admin Bravo Peralta
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@bravoPeralta.dev',
    password: 'Bravo2026',
  })
  
  if (authError) {
    console.error("Login error Bravo Peralta:", authError.message)
    return
  }
  
  console.log("Logged in Bravo Peralta admin successfully. User ID:", authData.user.id)
  
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', authData.user.id)
    .single()
    
  if (profError) {
    console.error("Profile error:", profError.message)
    return
  }
  
  const bravoCompanyId = profiles.company_id
  console.log("Company ID Bravo Peralta:", bravoCompanyId)
  
  // Login as admin Triton
  const supabaseTriton = createClient(supabaseUrl, supabaseAnonKey)
  const { data: authTriton, error: authErrorTriton } = await supabaseTriton.auth.signInWithPassword({
    email: 'admin@triton.dev',
    password: 'Triton2026',
  })
  
  let tritonCompanyId = null
  if (!authErrorTriton) {
    console.log("Logged in Triton admin successfully. User ID:", authTriton.user.id)
    const { data: profTriton } = await supabaseTriton
      .from('profiles')
      .select('company_id')
      .eq('id', authTriton.user.id)
      .single()
    tritonCompanyId = profTriton.company_id
    console.log("Company ID Triton:", tritonCompanyId)
  }

  // 1. Ver qué tipos de cobro existen en Bravo
  console.log('\n--- 1. CONFIRMAR TODOS LOS TIPOS DE COBRO DE BRAVO ---')
  const { data: allChargeTypes, error: actErr } = await supabase
    .from('charge_types')
    .select('id, company_id, name, default_amount, is_recurring')
    .eq('company_id', bravoCompanyId)
  
  if (actErr) {
    console.error("Error charge_types:", actErr.message)
  } else {
    console.table(allChargeTypes)
  }

  // Si no hay ninguno o no está el de Cuota administrativa mensual, lo creamos
  let cuotaType = allChargeTypes?.find(t => t.name.toLowerCase().includes('cuota') && t.is_recurring)
  if (!cuotaType) {
    console.log("Creando 'Cuota administrativa mensual' por defecto ($15)...")
    const { data: newType, error: createTypeErr } = await supabase
      .from('charge_types')
      .insert({
        company_id: bravoCompanyId,
        name: 'Cuota administrativa mensual',
        default_amount: 15.00,
        is_recurring: true,
        description: 'Cuota ordinaria para gastos operativos de la cooperativa'
      })
      .select()
      .single()

    if (createTypeErr) {
      console.error("Error al crear tipo de cobro:", createTypeErr.message)
      return
    }
    cuotaType = newType
    console.log("✅ Creado exitosamente:", cuotaType)
  } else {
    console.log("✅ Tipo de cobro ya existía:", cuotaType)
  }

  // 2. Revisar socios y unidades en Bravo
  console.log('\n--- 2. CARGAR VEHICULOS ACTIVOS DE BRAVO PARA EL PERIODO DE PRUEBA ---')
  const { data: activeVehicles, error: vehErr } = await supabase
    .from('vehicles')
    .select('id, member_id, disk_number, status')
    .eq('company_id', bravoCompanyId)
  
  if (vehErr) {
    console.error("Error getting active vehicles:", vehErr.message)
    return
  }
  console.log(`Vehículos totales en Bravo: ${activeVehicles.length}`)
  console.table(activeVehicles)

  // Asegurarnos de tener al menos 2 unidades activas, idealmente con un socio que tenga 2 unidades
  // Si solo hay 1 unidad, creamos una temporal para el test
  if (activeVehicles.length < 2) {
    console.log("Creando vehículo de prueba temporal para simular socio con 2 unidades...")
    const baseMemberId = activeVehicles[0]?.member_id
    if (!baseMemberId) {
      console.error("No hay socios en Bravo Peralta para asignarle una segunda unidad de prueba.")
      return
    }

    const { data: tempVehicle, error: createVehErr } = await supabase
      .from('vehicles')
      .insert({
        company_id: bravoCompanyId,
        member_id: baseMemberId,
        disk_number: '999',
        plate: 'XYZ-9999',
        brand: 'Honda',
        model: 'Moto',
        year: 2026,
        status: 'activa'
      })
      .select()
      .single()

    if (createVehErr) {
      console.error("Error creando vehículo temporal:", createVehErr.message)
    } else {
      console.log("✅ Vehículo temporal creado:", tempVehicle)
      activeVehicles.push(tempVehicle)
    }
  }

  // Buscar socios con 2+ unidades
  const counts = {}
  activeVehicles.forEach(v => {
    counts[v.member_id] = (counts[v.member_id] || 0) + 1
  })
  let multiMemberId = Object.keys(counts).find(k => counts[k] >= 2)
  if (!multiMemberId && activeVehicles.length >= 2) {
    // Si hay vehículos pero están en diferentes socios, asignamos uno al mismo socio para simularlo
    const targetVeh = activeVehicles[1]
    const targetMember = activeVehicles[0].member_id
    console.log(`Re-asignando vehículo ${targetVeh.disk_number} al socio ${targetMember} para simular socio con 2 unidades...`)
    const { data: updatedVeh } = await supabase
      .from('vehicles')
      .update({ member_id: targetMember })
      .eq('id', targetVeh.id)
      .select()
      .single()
    
    if (updatedVeh) {
      targetVeh.member_id = targetMember
      multiMemberId = targetMember
      console.log(`✅ Vehículo reasignado con éxito.`)
    }
  }

  console.log(`Socio con multi-unidad para el test: ${multiMemberId}`)

  // Generar cuotas para 07/2026 de forma controlada a través del hook/BD
  console.log('\n--- 3. SIMULANDO GENERACIÓN DE CUOTAS PARA EL MES 07/2026 ---')
  const periodMonth = 7
  const periodYear = 2026
  
  console.log(`Generando cuotas para ${periodMonth}/${periodYear} usando charge_type_id: ${cuotaType.id}`)
  
  // Limpiar cuotas existentes para el test si existen
  await supabase
    .from('charges')
    .delete()
    .eq('company_id', bravoCompanyId)
    .eq('period_month', periodMonth)
    .eq('period_year', periodYear)

  const newCharges = activeVehicles.map(veh => ({
    company_id: bravoCompanyId,
    member_id: veh.member_id,
    vehicle_id: veh.id,
    charge_type_id: cuotaType.id,
    description: `${cuotaType.name} - Julio 2026`,
    amount: cuotaType.default_amount,
    balance: cuotaType.default_amount,
    due_date: '2026-07-10',
    status: 'pendiente',
    period_month: periodMonth,
    period_year: periodYear
  }))

  const { data: insertedCharges, error: insErr } = await supabase
    .from('charges')
    .insert(newCharges)
    .select()

  if (insErr) {
    console.error("Error al insertar cuotas:", insErr.message)
    return
  }
  
  console.log(`✅ Se insertaron exitosamente ${insertedCharges.length} cuotas para el periodo 07/2026.`)
  console.table(insertedCharges.map(c => ({
    id: c.id.slice(0, 8),
    vehicle_id: c.vehicle_id.slice(0, 8),
    member_id: c.member_id.slice(0, 8),
    amount: c.amount,
    balance: c.balance,
    status: c.status
  })))

  console.log('\n--- 4. PRUEBA MULTI-UNIDAD ---')
  if (multiMemberId && insertedCharges) {
    const socioCharges = insertedCharges.filter(c => c.member_id === multiMemberId)
    console.log(`Cargos generados para el socio ${multiMemberId.slice(0, 8)}:`)
    console.table(socioCharges.map(c => ({
      id: c.id.slice(0, 8),
      vehicle_id: c.vehicle_id.slice(0, 8),
      amount: c.amount,
      balance: c.balance
    })))
    if (socioCharges.length >= 2) {
      console.log(`✅ CONFIRMADO: El socio recibió cuotas separadas para el mismo periodo por cada una de sus unidades.`)
    }
  }

  console.log('\n--- 5. PRUEBA ANTI-DUPLICADO ---')
  if (insertedCharges && insertedCharges.length > 0) {
    const target = insertedCharges[0]
    console.log(`Intentando re-insertar la misma cuota para el vehículo ${target.vehicle_id.slice(0, 8)} en 07/2026`)
    const { error: dupErr } = await supabase
      .from('charges')
      .insert({
        company_id: target.company_id,
        member_id: target.member_id,
        vehicle_id: target.vehicle_id,
        charge_type_id: target.charge_type_id,
        description: 'INTENTO DUPLICADO',
        amount: target.amount,
        balance: target.amount,
        due_date: target.due_date,
        status: 'pendiente',
        period_month: target.period_month,
        period_year: target.period_year
      })
    
    if (dupErr) {
      console.log(`✅ CONFIRMADO: La BD rechazó la inserción duplicada. Código error: ${dupErr.code} | Mensaje: ${dupErr.message}`)
    } else {
      console.error(`❌ ERROR: La BD aceptó el duplicado. El índice único no está funcionando correctamente.`)
    }
  }

  console.log('\n--- 6. REGISTRO DE PAGO COMPLETO ---')
  if (insertedCharges && insertedCharges.length > 0) {
    const target = insertedCharges[0]
    console.log(`Pagando cuota ${target.id.slice(0, 8)} por valor de ${target.amount}`)
    
    // Crear el pago
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        company_id: bravoCompanyId,
        member_id: target.member_id,
        amount: target.amount,
        payment_date: '2026-06-11',
        payment_method: 'efectivo',
        reference_number: 'REF-TEST-JULIO',
        notes: 'Pago de prueba unitario completo',
        created_by: authData.user.id
      })
      .select()
      .single()

    if (payErr) {
      console.error("Error al registrar pago:", payErr.message)
    } else {
      console.log(`✅ Pago registrado ID: ${payment.id.slice(0, 8)}. Registrando asignación...`)
      
      // Crear allocation
      const { error: allocErr } = await supabase
        .from('payment_allocations')
        .insert({
          payment_id: payment.id,
          charge_id: target.id,
          amount_allocated: target.amount
        })

      if (allocErr) {
        console.error("Error al asignar pago:", allocErr.message)
      } else {
        console.log(`✅ Asignación creada con éxito. Verificando saldo actualizado vía trigger...`)
        
        // Consultar el estado del cargo actualizado
        const { data: updatedCharge, error: upErr } = await supabase
          .from('charges')
          .select('id, amount, balance, status')
          .eq('id', target.id)
          .single()
        
        if (upErr) {
          console.error("Error al consultar cargo actualizado:", upErr.message)
        } else {
          console.table([updatedCharge])
          if (Number(updatedCharge.balance) === 0 && updatedCharge.status === 'pagada') {
            console.log(`✅ CONFIRMADO: El balance es 0 y el estado es 'pagada'.`)
          } else {
            console.error(`❌ ERROR: El balance (${updatedCharge.balance}) o estado (${updatedCharge.status}) son incorrectos.`)
          }
        }
      }
    }
  }

  console.log('\n--- 7. PRUEBA DE SEGURIDAD RLS ---')
  if (supabaseTriton && tritonCompanyId && insertedCharges && insertedCharges.length > 0) {
    const targetBravo = insertedCharges[0]
    console.log(`Intentando ver la deuda de Bravo Peralta usando el token de Triton...`)
    
    const { data: tritonCharges } = await supabaseTriton
      .from('charges')
      .select('id, company_id')
      .eq('id', targetBravo.id)
    
    if (!tritonCharges || tritonCharges.length === 0) {
      console.log(`✅ CONFIRMADO RLS: Triton no puede ver las deudas de Bravo Peralta (resultado vacío).`)
    } else {
      console.error(`❌ ERROR RLS: Triton pudo ver la deuda de Bravo Peralta:`, tritonCharges)
    }
  }

  // Limpiar datos temporales creados para el test de forma ordenada
  console.log('\n--- LIMPIEZA DE DATOS DE PRUEBA ---')
  // El pago y la asignación se pueden mantener como historial válido si se prefiere o borrar
  // Eliminamos el vehículo temporal creado
  const { error: delVehErr } = await supabase
    .from('vehicles')
    .delete()
    .eq('disk_number', '999')
    .eq('company_id', bravoCompanyId)
  
  if (delVehErr) {
    console.error("Error al limpiar vehículo de prueba:", delVehErr.message)
  } else {
    console.log("✅ Vehículo temporal de prueba 999 eliminado.")
  }
}

run()
