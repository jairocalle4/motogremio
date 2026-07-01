import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface SaasSettings {
  currency_symbol: string
  currency_code: string
  payment_bank_name: string | null
  payment_account_type: string | null
  payment_account_number: string | null
  payment_account_holder: string | null
  payment_account_holder_id: string | null
  payment_instructions: string | null
  internal_receipt_note: string
}

export function generateSaasInvoiceNoticePdf(
  invoice: any,
  payments: any[],
  companyName: string,
  ruc: string,
  settings: SaasSettings | null
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const currencySymbol = settings?.currency_symbol || '$'
  const currencyCode = settings?.currency_code || 'USD'

  // Header Box
  doc.setFillColor(245, 247, 250)
  doc.rect(15, 15, 180, 25, 'F')
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(30, 41, 59)
  doc.text('AVISO DE COBRO INTERNO SAAS', 20, 25)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('MotoGremio SaaS — Control Administrativo', 20, 32)

  // Invoice Number
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text(`Nro: ${invoice.invoice_number}`, 150, 27, { align: 'left' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Estado: ${invoice.status.toUpperCase()}`, 150, 33, { align: 'left' })

  // Customer & Billing Info
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text('CLIENTE / COOPERATIVA:', 15, 52)
  doc.setFont('helvetica', 'normal')
  doc.text(companyName, 15, 57)
  doc.text(`RUC: ${ruc}`, 15, 62)

  doc.setFont('helvetica', 'bold')
  doc.text('DETALLES DEL COBRO:', 110, 52)
  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha Emisión: ${invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : '—'}`, 110, 57)
  doc.text(`Fecha Vencimiento: ${invoice.due_date}`, 110, 62)
  doc.text(`Período de servicio: ${invoice.period_start || '—'} al ${invoice.period_end || '—'}`, 110, 67)

  // Main invoice table
  autoTable(doc, {
    startY: 75,
    margin: { left: 15, right: 15 },
    head: [['Concepto', 'Total Emitido', 'Monto Pagado', 'Saldo Pendiente']],
    body: [
      [
        'Suscripción Mensual de Plataforma SaaS MotoGremio',
        `${currencySymbol}${Number(invoice.amount).toFixed(2)} ${currencyCode}`,
        `${currencySymbol}${Number(invoice.amount_paid || 0).toFixed(2)} ${currencyCode}`,
        `${currencySymbol}${Number(invoice.balance).toFixed(2)} ${currencyCode}`
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  })

  let currentY = (doc as any).lastAutoTable.finalY + 15

  // Payments / Abonos Table
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('HISTORIAL DE ABONOS APLICADOS A ESTE COBRO:', 15, currentY)
  currentY += 5

  const invoicePayments = payments.filter(
    (p) => p.saas_invoice_id === invoice.id || p.saas_invoices?.invoice_number === invoice.invoice_number
  )

  if (invoicePayments.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(148, 163, 184)
    doc.text('Sin pagos registrados para este cobro.', 15, currentY)
    currentY += 10
  } else {
    const paymentRows = invoicePayments.map((p) => [
      p.created_at ? new Date(p.created_at).toLocaleString() : '—',
      p.payment_method === 'transfer' ? 'Transferencia' : p.payment_method === 'deposit' ? 'Depósito' : p.payment_method === 'cash' ? 'Efectivo' : 'Otro',
      p.reference || '—',
      `${currencySymbol}${Number(p.amount).toFixed(2)}`
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: 15, right: 15 },
      head: [['Fecha Abono', 'Método', 'Referencia / Depósito', 'Monto Abono']],
      body: paymentRows,
      theme: 'striped',
      headStyles: { fillColor: [100, 116, 139] },
      columnStyles: {
        3: { halign: 'right' }
      }
    })
    currentY = (doc as any).lastAutoTable.finalY + 15
  }

  // Bank Info (if exists)
  if (settings && (settings.payment_bank_name || settings.payment_instructions)) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(79, 70, 229)
    doc.text('DATOS DE TRANSFERENCIA BANCARIA:', 15, currentY)
    currentY += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(51, 65, 85)
    
    if (settings.payment_bank_name) {
      doc.text(`Banco: ${settings.payment_bank_name} (${settings.payment_account_type || ''})`, 15, currentY)
      currentY += 5
    }
    if (settings.payment_account_number) {
      doc.text(`Cuenta Nro: ${settings.payment_account_number}`, 15, currentY)
      currentY += 5
    }
    if (settings.payment_account_holder) {
      doc.text(`Titular: ${settings.payment_account_holder} (RUC/CI: ${settings.payment_account_holder_id || ''})`, 15, currentY)
      currentY += 5
    }
    if (settings.payment_instructions) {
      doc.setFont('helvetica', 'oblique')
      doc.text(`Instrucciones: ${settings.payment_instructions}`, 15, currentY, { maxWidth: 180 })
      currentY += 10
    }
    currentY += 5
  }

  // Legal / Disclaimer Box
  if (currentY > 240) {
    doc.addPage()
    currentY = 20
  } else {
    currentY = Math.max(currentY, 245)
  }

  doc.setFillColor(248, 250, 252)
  doc.rect(15, currentY, 180, 22, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(15, currentY, 180, 22, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text('Nota Legal Aclaratoria:', 18, currentY + 5)
  
  doc.setFont('helvetica', 'normal')
  doc.text(
    'Este documento es un aviso de cobro interno del SaaS. No corresponde a una factura electrónica SRI ni certifica\npor sí solo la recepción de pago.',
    18,
    currentY + 10,
    { maxWidth: 174 }
  )

  doc.save(`aviso-cobro-saas-${invoice.invoice_number}.pdf`)
}

export function generateSaasPaymentReceiptPdf(
  payment: any,
  invoice: any,
  companyName: string,
  ruc: string,
  settings: SaasSettings | null
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const currencySymbol = settings?.currency_symbol || '$'
  const currencyCode = settings?.currency_code || 'USD'

  // Header Box
  doc.setFillColor(240, 253, 244)
  doc.rect(15, 15, 180, 25, 'F')
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(21, 128, 61)
  doc.text('COMPROBANTE INTERNO DE PAGO RECIBIDO', 20, 25)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(22, 163, 74)
  doc.text('MotoGremio SaaS — Comprobante de Caja', 20, 32)

  // Receipt details
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(`Cobro Relacionado: ${invoice?.invoice_number || '—'}`, 135, 25, { align: 'left' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha Pago: ${payment.created_at ? new Date(payment.created_at).toLocaleDateString() : '—'}`, 135, 31, { align: 'left' })

  // Customer / Cooperativa
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text('EMITIDO A:', 15, 52)
  doc.setFont('helvetica', 'normal')
  doc.text(companyName, 15, 57)
  doc.text(`RUC: ${ruc}`, 15, 62)

  // Details
  doc.setFont('helvetica', 'bold')
  doc.text('DETALLES DE LA TRANSACCIÓN:', 110, 52)
  doc.setFont('helvetica', 'normal')
  doc.text(`Método de Pago: ${payment.payment_method === 'transfer' ? 'Transferencia' : payment.payment_method === 'deposit' ? 'Depósito' : payment.payment_method === 'cash' ? 'Efectivo' : 'Otro'}`, 110, 57)
  doc.text(`Referencia: ${payment.reference || '—'}`, 110, 62)
  doc.text(`Período Cobro: ${invoice?.period_start || '—'} al ${invoice?.period_end || '—'}`, 110, 67)

  // Main payment table
  autoTable(doc, {
    startY: 75,
    margin: { left: 15, right: 15 },
    head: [['Detalle del Abono Recibido', 'Monto Pagado']],
    body: [
      [
        'Abono a Suscripción Mensual de Plataforma SaaS MotoGremio',
        `${currencySymbol}${Number(payment.amount).toFixed(2)} ${currencyCode}`
      ],
      [
        'Saldo Restante de la Obligación de Cobro',
        `${currencySymbol}${Number(invoice?.balance ?? 0).toFixed(2)} ${currencyCode}`
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: 'right', fontStyle: 'bold' }
    }
  })

  let currentY = (doc as any).lastAutoTable.finalY + 15

  // Notes about the payment
  if (payment.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('NOTAS / OBSERVACIONES DEL PAGO:', 15, currentY)
    currentY += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(payment.notes, 15, currentY, { maxWidth: 180 })
    currentY += 15
  }

  // Legal / Disclaimer Box
  currentY = Math.max(currentY, 245)

  doc.setFillColor(248, 250, 252)
  doc.rect(15, currentY, 180, 20, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(15, currentY, 180, 20, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text('Nota Legal Aclaratoria:', 18, currentY + 5)
  
  doc.setFont('helvetica', 'normal')
  doc.text(
    'Este documento es un comprobante interno de pago recibido del SaaS. No corresponde a una factura electrónica SRI.',
    18,
    currentY + 10,
    { maxWidth: 174 }
  )

  doc.save(`comprobante-pago-saas-${payment.reference || payment.id}.pdf`)
}
