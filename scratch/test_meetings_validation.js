import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phervmsyjkgjkvlfisns.supabase.co'
const supabaseAnonKey = 'sb_publishable_iCmauCSVGwicfdRn_iG-gg_5JtaxQYq'

const supabaseBravo = createClient(supabaseUrl, supabaseAnonKey)
const supabaseTriton = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  console.log("=== INICIANDO VALIDACIÓN FUNCIONAL FASE 3.8 ===")

  // 1. LOGIN ADMIN BRAVO
  console.log("\n--- LOGIN BRAVO PERALTA ---")
  const { data: authBravo, error: authBravoErr } = await supabaseBravo.auth.signInWithPassword({
    email: 'admin@bravoPeralta.dev',
    password: 'Bravo2026',
  })
  if (authBravoErr) {
    console.error("❌ Error login Bravo:", authBravoErr.message)
    return
  }
  console.log("✅ Logueado en Bravo. User ID:", authBravo.user.id)

  const { data: profBravo } = await supabaseBravo.from('profiles').select('company_id').eq('id', authBravo.user.id).single()
  const bravoCompanyId = profBravo.company_id
  console.log("Bravo Company ID:", bravoCompanyId)

  // 2. LOGIN ADMIN TRITON
  console.log("\n--- LOGIN TRITON ---")
  const { data: authTriton, error: authTritonErr } = await supabaseTriton.auth.signInWithPassword({
    email: 'admin@triton.dev',
    password: 'Triton2026',
  })
  if (authTritonErr) {
    console.error("❌ Error login Triton:", authTritonErr.message)
    return
  }
  console.log("✅ Logueado en Triton. User ID:", authTriton.user.id)

  const { data: profTriton } = await supabaseTriton.from('profiles').select('company_id').eq('id', authTriton.user.id).single()
  const tritonCompanyId = profTriton.company_id
  console.log("Triton Company ID:", tritonCompanyId)


  // ==========================================
  // PRUEBA A: CREAR REUNIÓN
  // ==========================================
  console.log("\n=== PRUEBA A: CREAR REUNIÓN ===")
  const meetingData = {
    company_id: bravoCompanyId,
    title: 'Asamblea General Ordinaria de Test',
    meeting_type: 'asamblea',
    date: '2026-06-15',
    time: '18:00:00',
    location: 'Sede Social Bravo Peralta',
    description: 'Puntos: 1. Estado de cuenta, 2. Nuevas unidades',
    is_mandatory: true,
    status: 'programada'
  }

  const { data: newMeeting, error: createMeetingErr } = await supabaseBravo
    .from('meetings')
    .insert(meetingData)
    .select()
    .single()

  if (createMeetingErr) {
    console.error("❌ Error al crear reunión:", createMeetingErr.message)
    return
  }
  const meetingId = newMeeting.id
  console.log("✅ Reunión creada exitosamente:")
  console.table([{
    id: meetingId,
    title: newMeeting.title,
    meeting_type: newMeeting.meeting_type,
    date: newMeeting.date,
    time: newMeeting.time,
    location: newMeeting.location,
    status: newMeeting.status
  }])


  // ==========================================
  // PRUEBA B: CONVOCAR SOCIOS ACTIVOS
  // ==========================================
  console.log("\n=== PRUEBA B: CONVOCAR SOCIOS ACTIVOS ===")
  const { data: activeMembers, error: memErr } = await supabaseBravo
    .from('members')
    .select('id')
    .eq('company_id', bravoCompanyId)
    .eq('status', 'activo')

  if (memErr || !activeMembers || activeMembers.length === 0) {
    console.error("❌ Error al obtener socios activos:", memErr)
    return
  }
  console.log(`Socios activos en Bravo: ${activeMembers.length}`)

  const invites = activeMembers.map(member => ({
    company_id: bravoCompanyId,
    meeting_id: meetingId,
    member_id: member.id,
    invitation_status: 'convocado'
  }))

  const { data: insertedInvites, error: inviteErr } = await supabaseBravo
    .from('meeting_invites')
    .insert(invites)
    .select()

  if (inviteErr) {
    console.error("❌ Error al convocar socios:", inviteErr.message)
  } else {
    console.log(`✅ Socios convocados insertados: ${insertedInvites.length}`)
  }


  // ==========================================
  // PRUEBA C: ANTI-DUPLICADO DE CONVOCADOS
  // ==========================================
  console.log("\n=== PRUEBA C: ANTI-DUPLICADO DE CONVOCADOS ===")
  const dupInvite = {
    company_id: bravoCompanyId,
    meeting_id: meetingId,
    member_id: activeMembers[0].id,
    invitation_status: 'convocado'
  }

  const { error: dupInviteErr } = await supabaseBravo
    .from('meeting_invites')
    .insert(dupInvite)

  if (dupInviteErr) {
    console.log(`✅ CONFIRMADO: La inserción duplicada de convocados fue bloqueada.`)
    console.log(`Código error: ${dupInviteErr.code} | Mensaje: ${dupInviteErr.message}`)
  } else {
    console.error("❌ ERROR: La base de datos permitió convocar dos veces al mismo socio para la misma reunión.")
  }


  // ==========================================
  // PRUEBA D: MARCAR ASISTENCIA
  // ==========================================
  console.log("\n=== PRUEBA D: MARCAR ASISTENCIA ===")
  const statuses = ['asistio', 'ausente', 'tarde', 'justificado']
  const attendances = []

  for (let i = 0; i < Math.min(4, activeMembers.length); i++) {
    attendances.push({
      meeting_id: meetingId,
      member_id: activeMembers[i].id,
      status: statuses[i],
      notes: `Nota de prueba para estado ${statuses[i]}`,
      check_in_time: statuses[i] === 'asistio' || statuses[i] === 'tarde' ? new Date().toISOString() : null
    })
  }

  const { data: insertedAttendances, error: attErr } = await supabaseBravo
    .from('meeting_attendances')
    .insert(attendances)
    .select()

  if (attErr) {
    console.error("❌ Error al insertar asistencia:", attErr.message)
  } else {
    console.log("✅ Asistencia registrada con éxito:")
    console.table(insertedAttendances.map(a => ({
      member_id: a.member_id.slice(0, 8),
      status: a.status,
      check_in_time: a.check_in_time ? a.check_in_time.slice(11, 19) : null,
      notes: a.notes
    })))
  }


  // ==========================================
  // PRUEBA E: ANTI-DUPLICADO DE ASISTENCIA
  // ==========================================
  console.log("\n=== PRUEBA E: ANTI-DUPLICADO DE ASISTENCIA ===")
  const targetMemberId = activeMembers[0].id
  console.log(`Intentando cambiar la asistencia del socio ${targetMemberId.slice(0, 8)} a 'justificado' mediante upsert...`)

  const { error: upsertErr } = await supabaseBravo
    .from('meeting_attendances')
    .upsert({
      meeting_id: meetingId,
      member_id: targetMemberId,
      status: 'justificado',
      notes: 'Justificado por cambio de turno',
      updated_at: new Date().toISOString()
    }, { onConflict: 'meeting_id,member_id' })

  if (upsertErr) {
    console.error("❌ Error al realizar upsert:", upsertErr.message)
  } else {
    console.log("✅ Upsert completado sin errores.")
  }

  // Verificar que no existan filas duplicadas para el mismo socio y reunión
  const { data: counts, error: countErr } = await supabaseBravo
    .from('meeting_attendances')
    .select('meeting_id, member_id')
    .eq('meeting_id', meetingId)

  const duplicates = counts.filter((c, idx) => counts.findIndex(x => x.member_id === c.member_id) !== idx)
  if (duplicates.length === 0) {
    console.log("✅ CONFIRMADO: No existen registros duplicados en meeting_attendances. El upsert actualizó la fila existente.")
  } else {
    console.error("❌ ERROR: Se detectaron registros duplicados en meeting_attendances:", duplicates)
  }


  // ==========================================
  // PRUEBA F: CANCELAR REUNIÓN
  // ==========================================
  console.log("\n=== PRUEBA F: CANCELAR REUNIÓN ===")
  const { data: cancelledMeeting, error: cancelErr } = await supabaseBravo
    .from('meetings')
    .update({ status: 'cancelada' })
    .eq('id', meetingId)
    .select()
    .single()

  if (cancelErr) {
    console.error("❌ Error al cancelar reunión:", cancelErr.message)
  } else {
    console.log(`✅ Reunión cancelada. Estado actual en BD: ${cancelledMeeting.status}`)
  }


  // ==========================================
  // VALIDACIÓN RLS
  // ==========================================
  console.log("\n=== VALIDACIÓN DE POLÍTICAS RLS ===")

  // 1. Admin Triton no debe poder ver las reuniones de Bravo Peralta
  const { data: tritonMeetings } = await supabaseTriton
    .from('meetings')
    .select('id')
    .eq('id', meetingId)

  if (!tritonMeetings || tritonMeetings.length === 0) {
    console.log("✅ RLS SELECT: Admin Triton no puede consultar la reunión de Bravo Peralta (resultado vacío).")
  } else {
    console.error("❌ ERROR RLS: Admin Triton pudo visualizar la reunión de Bravo Peralta.")
  }

  // 2. Admin Triton no debe poder insertar asistencia en reuniones de Bravo Peralta
  const { error: tritonAttErr } = await supabaseTriton
    .from('meeting_attendances')
    .insert({
      meeting_id: meetingId,
      member_id: activeMembers[0].id,
      status: 'asistio'
    })

  if (tritonAttErr) {
    console.log(`✅ RLS INSERT: Admin Triton fue bloqueado al intentar insertar asistencia en Bravo Peralta.`)
    console.log(`Mensaje: ${tritonAttErr.message}`)
  } else {
    console.error("❌ ERROR RLS: Admin Triton logró registrar asistencia en la reunión de Bravo Peralta.")
  }


  // ==========================================
  // LIMPIEZA
  // ==========================================
  console.log("\n=== LIMPIEZA DE DATOS ===")
  const { error: delErr } = await supabaseBravo
    .from('meetings')
    .delete()
    .eq('id', meetingId)

  if (delErr) {
    console.error("❌ Error al eliminar la reunión de prueba:", delErr.message)
  } else {
    console.log("✅ Reunión de prueba y registros asociados (cascada) eliminados de la base de datos.")
  }

  console.log("\n=== PRUEBAS CONCLUIDAS EXITOSAMENTE ===")
}

run()
