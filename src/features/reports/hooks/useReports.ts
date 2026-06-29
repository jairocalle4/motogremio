import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/useAuth'
import { calculateDocumentStatus } from '@/utils/statusCalculator'
import { getPrimaryLicense } from '@/hooks/useDrivers'
import { isWithinInterval, parseISO, startOfDay, subDays } from 'date-fns'

export interface ReportsData {
  socios: {
    total: number
    active: number
    inactive: number
    suspended: number
    singleUnit: number
    multiUnit: number
    noneUnit: number
    list: Array<{
      id: string
      document_id: string
      first_name: string
      last_name: string
      phone: string | null
      status: string
      admission_date: string
      vehicle_count: number
      vehicles: string[]
    }>
  }
  unidades: {
    total: number
    active: number
    inactive: number
    maintenance: number
    unassignedDrivers: number
    expiredDocs: number
    upcomingDocs: number
    list: Array<{
      id: string
      disk_number: string
      plate: string
      status: string
      member_name: string
      driver_name: string
      brand: string | null
      model: string | null
      year: number | null
      expired_docs_count: number
      upcoming_docs_count: number
    }>
  }
  conductores: {
    total: number
    active: number
    inactive: number
    external: number
    socioDrivers: number
    licenseExpiredOrMissing: number
    list: Array<{
      id: string
      document_id: string
      first_name: string
      last_name: string
      phone: string | null
      status: string
      type: 'externo' | 'socio'
      socio_name: string | null
      license_type: string | null
      license_status: string | null
      license_expiry: string | null
    }>
  }
  documentos: {
    total: number
    expired: number
    upcoming30: number
    upcoming60: number
    bySocio: number
    byDriver: number
    byVehicle: number
    list: Array<{
      id: string
      title: string
      type_name: string
      entity_type: 'member' | 'vehicle' | 'driver'
      entity_name: string
      entity_identifier: string
      expiry_date: string | null
      status: 'vigente' | 'por_vencer' | 'vencido'
    }>
  }
  financiero: {
    totalPending: number
    debtorMembersCount: number
    vehiclePendingFees: number
    paymentsCount: number
    paymentsSum: number
    chargesByStatus: {
      paid: number
      pending: number
      overdue: number
      fines: number
    }
    list: Array<{
      id: string
      member_name: string
      description: string
      amount: number
      balance: number
      due_date: string
      status: string
      charge_type: string
      vehicle_disk: string | null
    }>
  }
  sanciones: {
    total: number
    byStatus: {
      pendiente: number
      apelacion: number
      resuelta: number
      anulada: number
    }
    bySeverity: Record<string, number>
    totalFinesAmount: number
    paidFinesAmount: number
    pendingFinesAmount: number
    list: Array<{
      id: string
      member_name: string
      sanction_type: string
      date: string
      reason: string
      severity: string | null
      status: string
      fine_amount: number | null
      fine_balance: number | null
      fine_status: string | null
    }>
  }
  reuniones: {
    total: number
    attendanceRate: number
    list: Array<{
      id: string
      title: string
      meeting_type: string
      date: string
      time: string
      status: string
      is_mandatory: boolean
      attended: number
      absent: number
      justified: number
      tarde: number
      total_invited: number
    }>
    mostAbsences: Array<{
      member_name: string
      document_id: string
      absences: number
      tardiness: number
    }>
  }
}

export interface ReportsSummaryData {
  members_total: number
  members_active: number
  vehicles_total: number
  vehicles_active: number
  drivers_total: number
  documents_expired: number
  documents_expiring_soon: number
  licenses_expired: number
  licenses_expiring_soon: number
  charges_pending: number
  charges_overdue: number
  balance_pending: number
  sanctions_total: number
  meetings_total: number
}

export function useReportsSummary() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ReportsSummaryData | null>(null)

  const fetchSummary = useCallback(async () => {
    if (!profile?.company_id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcErr } = await (supabase.rpc as any)('get_company_reports_summary')
      if (rpcErr) throw rpcErr
      const resData = data as any
      if (resData && resData.summary) {
        setSummary(resData.summary)
      } else {
        setSummary(null)
      }
    } catch (err: any) {
      console.error('Error fetching company reports summary:', err)
      setError(err.message || 'Error al obtener resumen de reportes.')
    } finally {
      setLoading(false)
    }
  }, [profile?.company_id])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return {
    loading,
    error,
    summary,
    refetch: fetchSummary
  }
}

export function useReports(activeTab: string = 'resumen') {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReportsData | null>(null)
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: subDays(new Date(), 30).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  // States for lazy-loaded entities
  const [members, setMembers] = useState<any[] | null>(null)
  const [vehicles, setVehicles] = useState<any[] | null>(null)
  const [drivers, setDrivers] = useState<any[] | null>(null)
  const [documents, setDocuments] = useState<any[] | null>(null)
  const [charges, setCharges] = useState<any[] | null>(null)
  const [payments, setPayments] = useState<any[] | null>(null)
  const [sanctions, setSanctions] = useState<any[] | null>(null)
  const [meetings, setMeetings] = useState<any[] | null>(null)

  const loadTabEntities = useCallback(async (toLoad: string[]) => {
    if (!profile?.company_id || toLoad.length === 0) return
    const companyId = profile.company_id

    setLoading(true)
    setError(null)

    try {
      const promises = toLoad.map(async (entity) => {
        if (entity === 'members') {
          const { data, error } = await supabase.from('members').select('*, licenses(*)').eq('company_id', companyId)
          if (error) throw error
          setMembers(data)
        }
        else if (entity === 'vehicles') {
          const { data, error } = await supabase.from('vehicles').select('*, member:members(id, first_name, last_name, document_id)').eq('company_id', companyId)
          if (error) throw error
          setVehicles(data)
        }
        else if (entity === 'drivers') {
          const { data, error } = await supabase.from('drivers').select('*, member:members(id, first_name, last_name, document_id), licenses(*)').eq('company_id', companyId)
          if (error) throw error
          setDrivers(data)
        }
        else if (entity === 'documents') {
          const { data, error } = await supabase.from('documents').select('*, document_type:document_types(*), member:members(id, first_name, last_name, document_id), vehicle:vehicles(id, disk_number, plate), driver:drivers(id, first_name, last_name, document_id)').eq('company_id', companyId)
          if (error) throw error
          setDocuments(data)
        }
        else if (entity === 'charges') {
          const { data, error } = await supabase.from('charges').select('*, charge_type:charge_types(*), member:members(id, first_name, last_name, document_id), vehicle:vehicles(id, disk_number, plate)').eq('company_id', companyId)
          if (error) throw error
          setCharges(data)
        }
        else if (entity === 'payments') {
          const { data, error } = await supabase.from('payments').select('*, member:members(id, first_name, last_name, document_id)').eq('company_id', companyId)
          if (error) throw error
          setPayments(data)
        }
        else if (entity === 'sanctions') {
          const { data, error } = await supabase.from('sanctions').select('*, sanction_type:sanction_types(*), member:members(id, first_name, last_name, document_id), vehicle:vehicles(id, disk_number, plate), charge:charges(*)').eq('company_id', companyId)
          if (error) throw error
          setSanctions(data)
        }
        else if (entity === 'meetings') {
          const { data, error } = await supabase.from('meetings').select('*, meeting_attendances(*, member:members(id, first_name, last_name, document_id))').eq('company_id', companyId)
          if (error) throw error
          setMeetings(data)
        }
      })

      await Promise.all(promises)
    } catch (err: any) {
      console.error('Error fetching tab entities:', err)
      setError(err.message || 'Error al cargar los datos detallados.')
    } finally {
      setLoading(false)
    }
  }, [profile?.company_id])

  useEffect(() => {
    const tabRequirements: Record<string, string[]> = {
      socios: ['members', 'vehicles'],
      unidades: ['vehicles', 'drivers', 'members', 'documents'],
      conductores: ['drivers', 'members'],
      documentos: ['documents', 'members', 'vehicles', 'drivers'],
      finanzas: ['charges', 'payments', 'members', 'vehicles'],
      sanciones: ['sanctions', 'members', 'vehicles', 'charges'],
      reuniones: ['meetings'],
    }

    const required = tabRequirements[activeTab] || []
    if (required.length === 0) return

    const toLoad: string[] = []
    if (required.includes('members') && !members) toLoad.push('members')
    if (required.includes('vehicles') && !vehicles) toLoad.push('vehicles')
    if (required.includes('drivers') && !drivers) toLoad.push('drivers')
    if (required.includes('documents') && !documents) toLoad.push('documents')
    if (required.includes('charges') && !charges) toLoad.push('charges')
    if (required.includes('payments') && !payments) toLoad.push('payments')
    if (required.includes('sanctions') && !sanctions) toLoad.push('sanctions')
    if (required.includes('meetings') && !meetings) toLoad.push('meetings')

    if (toLoad.length > 0) {
      loadTabEntities(toLoad)
    }
  }, [activeTab, loadTabEntities, members, vehicles, drivers, documents, charges, payments, sanctions, meetings])

  // Calculation effect
  useEffect(() => {
    if (!profile?.company_id) return

    try {
      const today = startOfDay(new Date())

      // Helper de filtrado por rango de fechas
      const filterByDate = (dateVal: string | null | undefined) => {
        if (!dateRange.startDate || !dateRange.endDate) return true
        if (!dateVal) return false
        try {
          const startRange = startOfDay(parseISO(dateRange.startDate))
          const endRange = startOfDay(parseISO(dateRange.endDate))
          const current = startOfDay(parseISO(dateVal))
          return isWithinInterval(current, { start: startRange, end: endRange })
        } catch (e) {
          return true
        }
      }

      // ─── FILTRADO DE ARRAYS BASE SEGÚN EL RANGO ──────────────────────────────
      const filteredMembers = (members || []).filter(m => filterByDate(m.admission_date))
      const filteredVehicles = (vehicles || []).filter(v => filterByDate((v as any).registration_date))
      const filteredDrivers = (drivers || []).filter(d => filterByDate((d as any).admission_date))
      const filteredDocuments = (documents || []).filter(d => filterByDate(d.expiry_date))
      const filteredSanctions = (sanctions || []).filter(s => filterByDate(s.date))
      const filteredMeetings = (meetings || []).filter(m => filterByDate(m.date))

      // ─── COMPUTACIONES / METRICAS DE SOCIOS ─────────────────────────────────
      const memberVehicleMap = new Map<string, string[]>()
      vehicles?.forEach(v => {
        const list = memberVehicleMap.get(v.member_id) || []
        list.push(v.disk_number)
        memberVehicleMap.set(v.member_id, list)
      })

      let activeMembers = 0
      let inactiveMembers = 0
      let suspendedMembers = 0
      let singleUnit = 0
      let multiUnit = 0
      let noneUnit = 0

      const sociosList = filteredMembers.map(m => {
        if (m.status === 'activo') activeMembers++
        else if (m.status === 'inactivo') inactiveMembers++
        else if (m.status === 'suspendido') suspendedMembers++

        const vList = memberVehicleMap.get(m.id) || []
        const count = vList.length
        if (count === 1) singleUnit++
        else if (count > 1) multiUnit++
        else noneUnit++

        return {
          id: m.id,
          document_id: m.document_id,
          first_name: m.first_name,
          last_name: m.last_name,
          phone: m.phone,
          status: m.status || 'activo',
          admission_date: m.admission_date,
          vehicle_count: count,
          vehicles: vList,
        }
      })

      // ─── COMPUTACIONES / METRICAS DE VEHICULOS ─────────────────────────────────
      let activeVehicles = 0
      let inactiveVehicles = 0
      let maintenanceVehicles = 0
      let unassignedDrivers = 0

      const vehicleDocs = new Map<string, { expired: number; upcoming: number }>()
      filteredDocuments.forEach(d => {
        if (d.vehicle_id) {
          const stats = vehicleDocs.get(d.vehicle_id) || { expired: 0, upcoming: 0 }
          const status = calculateDocumentStatus(d.expiry_date)
          if (status === 'vencido') stats.expired++
          else if (status === 'por_vencer') stats.upcoming++
          vehicleDocs.set(d.vehicle_id, stats)
        }
      })

      const unidadesList = filteredVehicles.map(v => {
        if (v.status === 'activa') activeVehicles++
        else if (v.status === 'inactiva') inactiveVehicles++
        else if (v.status === 'mantenimiento') maintenanceVehicles++

        if (!v.driver_id) unassignedDrivers++

        const stats = vehicleDocs.get(v.id) || { expired: 0, upcoming: 0 }
        const mName = v.member ? `${v.member.first_name} ${v.member.last_name}` : 'No asignado'
        
        // Find driver name
        const driverObj = drivers?.find(d => d.id === v.driver_id)
        const dName = driverObj ? `${driverObj.first_name} ${driverObj.last_name}` : 'Sin conductor'

        return {
          id: v.id,
          disk_number: v.disk_number,
          plate: v.plate,
          status: v.status || 'activa',
          member_name: mName,
          driver_name: dName,
          brand: v.brand,
          model: v.model,
          year: v.year,
          expired_docs_count: stats.expired,
          upcoming_docs_count: stats.upcoming,
          registration_date: (v as any).registration_date || null,
        }
      })

      // ─── COMPUTACIONES / METRICAS DE CONDUCTORES ─────────────────────────────
      let activeDrivers = 0
      let inactiveDrivers = 0
      let externalDrivers = 0
      let socioDrivers = 0
      let licenseExpiredOrMissing = 0

      const conductoresList = filteredDrivers.map(d => {
        if (d.status === 'activo') activeDrivers++
        else if (d.status === 'inactivo') inactiveDrivers++

        if (d.member_id) socioDrivers++
        else externalDrivers++

        // Generica License check (Verificar si tiene al menos una licencia vigente)
        const primaryLicense = getPrimaryLicense((d.licenses || []) as any)
        let isExpiredOrMissing = false
        let licenseStatus: string | null = null
        let licenseExpiry: string | null = null

        if (!primaryLicense) {
          isExpiredOrMissing = true
          licenseStatus = 'Faltante'
        } else {
          licenseExpiry = primaryLicense.expiry_date
          const exp = startOfDay(parseISO(primaryLicense.expiry_date))
          if (exp < today) {
            isExpiredOrMissing = true
            licenseStatus = 'Vencida'
          } else {
            const diffTime = exp.getTime() - today.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            licenseStatus = diffDays <= 30 ? 'Por vencer' : 'Vigente'
          }
        }

        if (isExpiredOrMissing) {
          licenseExpiredOrMissing++
        }

        const sName = d.member ? `${d.member.first_name} ${d.member.last_name}` : null

        return {
          id: d.id,
          document_id: d.document_id,
          first_name: d.first_name,
          last_name: d.last_name,
          phone: d.phone,
          status: d.status || 'activo',
          type: (d.member_id ? 'socio' : 'externo') as 'socio' | 'externo',
          socio_name: sName,
          license_type: primaryLicense?.license_type || null,
          license_status: licenseStatus,
          license_expiry: licenseExpiry,
        }
      })

      // ─── COMPUTACIONES / METRICAS DE DOCUMENTOS ──────────────────────────────
      let expDocs = 0
      let up30Docs = 0
      let up60Docs = 0
      let bySocioCount = 0
      let byDriverCount = 0
      let byVehicleCount = 0

      const documentosList = filteredDocuments.map(d => {
        const status = calculateDocumentStatus(d.expiry_date)
        if (status === 'vencido') expDocs++
        else if (status === 'por_vencer') up30Docs++

        if (d.expiry_date) {
          const exp = startOfDay(parseISO(d.expiry_date))
          const diffTime = exp.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays > 30 && diffDays <= 60) {
            up60Docs++
          }
        }

        if (d.member_id) bySocioCount++
        if (d.driver_id) byDriverCount++
        if (d.vehicle_id) byVehicleCount++

        let entityName = 'General'
        let entityIdentifier = ''

        if (d.member) {
          entityName = `${d.member.first_name} ${d.member.last_name}`
          entityIdentifier = d.member.document_id
        } else if (d.vehicle) {
          entityName = `Disco ${d.vehicle.disk_number}`
          entityIdentifier = d.vehicle.plate
        } else if (d.driver) {
          entityName = `${d.driver.first_name} ${d.driver.last_name}`
          entityIdentifier = d.driver.document_id
        }

        return {
          id: d.id,
          title: d.notes || d.document_number || 'Documento',
          type_name: d.document_type?.name || 'Otro',
          entity_type: d.member_id ? 'member' : d.vehicle_id ? 'vehicle' : 'driver',
          entity_name: entityName,
          entity_identifier: entityIdentifier,
          expiry_date: d.expiry_date,
          status: status as 'vigente' | 'por_vencer' | 'vencido',
        }
      })

      // ─── COMPUTACIONES / METRICAS FINANCIERAS ────────────────────────────────
      let totalPending = 0
      const debtorMembers = new Set<string>()
      let vehiclePendingFees = 0
      let paidSum = 0
      let pendingSum = 0
      let overdueSum = 0
      let finesSum = 0

      // Filtrar cuotas (charges) por rango de fechas
      const filteredCharges = (charges || []).filter(c => filterByDate(c.due_date))

      const financieroList = filteredCharges.map(c => {
        const isPending = c.status === 'pendiente' || c.status === 'parcial'
        if (isPending) {
          totalPending += Number(c.balance)
          debtorMembers.add(c.member_id)
          if (c.vehicle_id) {
            vehiclePendingFees += Number(c.balance)
          }
        }

        const isFine = c.charge_type?.name?.toLowerCase().includes('multa') || c.description?.toLowerCase().includes('multa')
        const isOverdue = (c.status === 'pendiente' || c.status === 'parcial') && c.due_date && new Date(c.due_date) < new Date()

        if (c.status === 'pagada') {
          paidSum += Number(c.amount)
        } else if (c.status === 'pendiente' || c.status === 'parcial') {
          pendingSum += Number(c.balance)
          if (isOverdue) {
            overdueSum += Number(c.balance)
          }
        }

        if (isFine) {
          finesSum += Number(c.balance)
        }

        const mName = c.member ? `${c.member.first_name} ${c.member.last_name}` : 'Socio Desconocido'
        const vDisk = c.vehicle ? c.vehicle.disk_number : null

        return {
          id: c.id,
          member_name: mName,
          description: c.description,
          amount: Number(c.amount),
          balance: Number(c.balance),
          due_date: c.due_date,
          status: c.status,
          charge_type: c.charge_type?.name || 'General',
          vehicle_disk: vDisk,
        }
      })

      // Filter payments by date range
      const filteredPayments = (payments || []).filter(p => {
        if (!dateRange.startDate || !dateRange.endDate) return true
        try {
          const startRange = startOfDay(parseISO(dateRange.startDate))
          const endRange = startOfDay(parseISO(dateRange.endDate))
          const pDate = startOfDay(parseISO(p.payment_date))
          return isWithinInterval(pDate, { start: startRange, end: endRange })
        } catch (e) {
          return true
        }
      })

      const paymentsSum = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0)

      // ─── COMPUTACIONES / METRICAS DE SANCIONES ──────────────────────────────
      let pendingSanc = 0
      let apelacionSanc = 0
      let resueltaSanc = 0
      let anuladaSanc = 0
      const severityCounts: Record<string, number> = {}
      let totalFinesAmount = 0
      let paidFinesAmount = 0
      let pendingFinesAmount = 0

      const sancionesList = filteredSanctions.map(s => {
        if (s.status === 'pendiente') pendingSanc++
        else if (s.status === 'apelacion') apelacionSanc++
        else if (s.status === 'resuelta') resueltaSanc++
        else if (s.status === 'anulada') anuladaSanc++

        if (s.severity) {
          severityCounts[s.severity] = (severityCounts[s.severity] || 0) + 1
        }

        let fineVal = 0
        let fineBal = 0
        let fineStat: string | null = null

        if (s.charge) {
          fineVal = Number(s.charge.amount)
          fineBal = Number(s.charge.balance)
          fineStat = s.charge.status

          totalFinesAmount += fineVal
          pendingFinesAmount += fineBal
          paidFinesAmount += (fineVal - fineBal)
        }

        const mName = s.member ? `${s.member.first_name} ${s.member.last_name}` : 'Socio Desconocido'
        const sType = s.sanction_type?.name || 'Sanción'

        return {
          id: s.id,
          member_name: mName,
          sanction_type: sType,
          date: s.date,
          reason: s.reason,
          severity: s.severity,
          status: s.status,
          fine_amount: fineVal > 0 ? fineVal : null,
          fine_balance: fineVal > 0 ? fineBal : null,
          fine_status: fineStat,
        }
      })

      // ─── COMPUTACIONES / METRICAS DE REUNIONES ──────────────────────────────
      let totalAttEnded = 0
      let totalInvitedAll = 0

      const reunionesList = filteredMeetings.map(m => {
        let attended = 0
        let absent = 0
        let justified = 0
        let tarde = 0

        m.meeting_attendances?.forEach((att: any) => {
          if (att.status === 'asistio') attended++
          else if (att.status === 'ausente') absent++
          else if (att.status === 'justificado') justified++
          else if (att.status === 'tarde') tarde++
        })

        const totalInvited = (m.meeting_attendances || []).length
        totalAttEnded += (attended + tarde)
        totalInvitedAll += totalInvited

        return {
          id: m.id,
          title: m.title,
          meeting_type: m.meeting_type || 'ordinaria',
          date: m.date,
          time: m.time,
          status: m.status || 'finalizada',
          is_mandatory: m.is_mandatory || false,
          attended,
          absent,
          justified,
          tarde,
          total_invited: totalInvited,
        }
      })

      const attendanceRate = totalInvitedAll > 0 ? Math.round((totalAttEnded / totalInvitedAll) * 100) : 100

      const memberAbsenceMap = new Map<string, { member_name: string; document_id: string; absences: number; tardiness: number }>()

      meetings?.forEach(m => {
        m.meeting_attendances?.forEach((att: any) => {
          if (att.member) {
            const current = memberAbsenceMap.get(att.member_id) || {
              member_name: `${att.member.first_name} ${att.member.last_name}`,
              document_id: att.member.document_id,
              absences: 0,
              tardiness: 0,
            }
            if (att.status === 'ausente') current.absences++
            if (att.status === 'tarde') current.tardiness++
            memberAbsenceMap.set(att.member_id, current)
          }
        })
      })

      const mostAbsences = Array.from(memberAbsenceMap.values())
        .filter(x => x.absences > 0 || x.tardiness > 0)
        .sort((a, b) => b.absences - a.absences || b.tardiness - a.tardiness)
        .slice(0, 10)

      // ─── FINAL DATA STRUCTURE ──────────────────────────────────────────────
      setData({
        socios: {
          total: members?.length || 0,
          active: activeMembers,
          inactive: inactiveMembers,
          suspended: suspendedMembers,
          singleUnit,
          multiUnit,
          noneUnit,
          list: sociosList,
        },
        unidades: {
          total: vehicles?.length || 0,
          active: activeVehicles,
          inactive: inactiveVehicles,
          maintenance: maintenanceVehicles,
          unassignedDrivers,
          expiredDocs: Array.from(vehicleDocs.values()).filter(x => x.expired > 0).length,
          upcomingDocs: Array.from(vehicleDocs.values()).filter(x => x.upcoming > 0).length,
          list: unidadesList,
        },
        conductores: {
          total: drivers?.length || 0,
          active: activeDrivers,
          inactive: inactiveDrivers,
          external: externalDrivers,
          socioDrivers,
          licenseExpiredOrMissing,
          list: conductoresList,
        },
        documentos: {
          total: documents?.length || 0,
          expired: expDocs,
          upcoming30: up30Docs,
          upcoming60: up60Docs,
          bySocio: bySocioCount,
          byDriver: byDriverCount,
          byVehicle: byVehicleCount,
          list: documentosList as any,
        },
        financiero: {
          totalPending,
          debtorMembersCount: debtorMembers.size,
          vehiclePendingFees,
          paymentsCount: filteredPayments.length,
          paymentsSum,
          chargesByStatus: {
            paid: paidSum,
            pending: pendingSum,
            overdue: overdueSum,
            fines: finesSum,
          },
          list: financieroList as any,
        },
        sanciones: {
          total: sanctions?.length || 0,
          byStatus: {
            pendiente: pendingSanc,
            apelacion: apelacionSanc,
            resuelta: resueltaSanc,
            anulada: anuladaSanc,
          },
          bySeverity: severityCounts,
          totalFinesAmount,
          paidFinesAmount,
          pendingFinesAmount,
          list: sancionesList as any,
        },
        reuniones: {
          total: meetings?.length || 0,
          attendanceRate,
          list: reunionesList,
          mostAbsences,
        },
      })
    } catch (err: any) {
      console.error('Error computing report metrics:', err)
      setError(err.message || 'Error al calcular métricas de reportes.')
    }
  }, [profile?.company_id, dateRange.startDate, dateRange.endDate, members, vehicles, drivers, documents, charges, payments, sanctions, meetings])

  return {
    loading,
    error,
    data,
    dateRange,
    setDateRange,
    refetch: () => {
      const tabRequirements: Record<string, string[]> = {
        socios: ['members', 'vehicles'],
        unidades: ['vehicles', 'drivers', 'members', 'documents'],
        conductores: ['drivers', 'members'],
        documentos: ['documents', 'members', 'vehicles', 'drivers'],
        finanzas: ['charges', 'payments', 'members', 'vehicles'],
        sanciones: ['sanctions', 'members', 'vehicles', 'charges'],
        reuniones: ['meetings'],
      }
      const required = tabRequirements[activeTab] || []
      if (required.length > 0) {
        if (required.includes('members')) setMembers(null)
        if (required.includes('vehicles')) setVehicles(null)
        if (required.includes('drivers')) setDrivers(null)
        if (required.includes('documents')) setDocuments(null)
        if (required.includes('charges')) setCharges(null)
        if (required.includes('payments')) setPayments(null)
        if (required.includes('sanctions')) setSanctions(null)
        if (required.includes('meetings')) setMeetings(null)
      }
    },
  }
}
