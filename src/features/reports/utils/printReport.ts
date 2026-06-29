/**
 * Generador de PDF/Impresión profesional para reportes.
 * Abre una ventana nueva con HTML estructurado para impresión limpia.
 */

export interface PrintColumn<T = any> {
  key: keyof T | string
  label: string
  render?: (val: any, row: T) => string
  align?: 'left' | 'center' | 'right'
  width?: string
}

export interface PrintMetadata {
  companyName: string
  reportName: string
  dateRange: string
  logoUrl?: string | null
  generatedAt?: string
}

/**
 * Genera HTML de tabla profesional para imprimir/PDF.
 * Crea una ventana emergente con estilos de impresión optimizados.
 */
export function printReport<T>(
  columns: PrintColumn<T>[],
  data: T[],
  metadata: PrintMetadata,
  /** Filas de resumen opcionales (label, value) para mostrar antes de la tabla */
  summaryRows?: Array<{ label: string; value: string | number; highlight?: 'danger' | 'warning' | 'success' }>
) {
  const generatedAt = metadata.generatedAt ?? new Date().toLocaleString('es-EC')

  // ─── GENERAR FILAS DE TABLA ──────────────────────────────────────────────────
  const tableRows = data.map(row => {
    const cells = columns.map(col => {
      let val: any = (row as any)[col.key]
      if (col.render) {
        val = col.render(val, row)
      }
      if (val === null || val === undefined) val = '-'
      if (Array.isArray(val)) val = val.join(', ')
      const align = col.align ?? 'left'
      return `<td style="text-align:${align};padding:6px 10px;border:1px solid #cbd5e1;font-size:11px;color:#1e293b;">${String(val)}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  // ─── FILAS DE RESUMEN OPCIONAL ───────────────────────────────────────────────
  let summaryHtml = ''
  if (summaryRows && summaryRows.length > 0) {
    const colorMap = {
      danger: '#dc2626',
      warning: '#d97706',
      success: '#16a34a',
    }
    const rows = summaryRows.map(r => {
      const color = r.highlight ? colorMap[r.highlight] : '#1e293b'
      return `
        <tr>
          <td style="padding:5px 10px;font-size:11px;color:#64748b;border:1px solid #e2e8f0;background:#f8fafc;">${r.label}</td>
          <td style="padding:5px 10px;font-size:12px;font-weight:bold;color:${color};border:1px solid #e2e8f0;text-align:right;">${r.value}</td>
        </tr>`
    }).join('')
    summaryHtml = `
      <div style="margin-bottom:16px;">
        <h3 style="font-size:12px;font-weight:600;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Indicadores del Período</h3>
        <table style="border-collapse:collapse;width:auto;min-width:320px;">
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }

  // ─── LOGO / INICIAL ──────────────────────────────────────────────────────────
  const logoHtml = metadata.logoUrl
    ? `<img src="${metadata.logoUrl}" alt="Logo" style="height:56px;width:auto;object-fit:contain;margin-bottom:8px;" />`
    : `<div style="width:56px;height:56px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;margin-bottom:8px;border:2px solid #bfdbfe;">
        <span style="font-size:22px;font-weight:bold;color:#1d4ed8;">${metadata.companyName.charAt(0).toUpperCase()}</span>
       </div>`

  // ─── ENCABEZADOS DE COLUMNA ──────────────────────────────────────────────────
  const headerCells = columns.map(col => {
    const align = col.align ?? 'left'
    const width = col.width ? `width:${col.width};` : ''
    return `<th style="${width}text-align:${align};padding:8px 10px;background:#1e40af;color:#ffffff;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;border:1px solid #1d4ed8;">${col.label}</th>`
  }).join('')

  // ─── DOCUMENTO HTML COMPLETO ─────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.reportName} — ${metadata.companyName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #1e293b;
      padding: 20px;
    }
    .report-wrapper { max-width: 100%; }
    .report-header {
      display: flex;
      align-items: center;
      gap: 20px;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .report-header-text h1 {
      font-size: 18px;
      font-weight: bold;
      color: #1e293b;
      margin-bottom: 2px;
    }
    .report-header-text h2 {
      font-size: 14px;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 6px;
    }
    .report-meta {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    .report-meta-item {
      display: flex;
      flex-direction: column;
    }
    .report-meta-item .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .report-meta-item .value {
      font-size: 11px;
      font-weight: 600;
      color: #1e293b;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .data-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .data-table tbody tr:hover {
      background: #eff6ff;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #94a3b8;
    }
    .no-data {
      text-align: center;
      padding: 32px;
      color: #94a3b8;
      font-style: italic;
      border: 1px solid #e2e8f0;
    }
    @media print {
      body { padding: 0; background: white; }
      .no-print { display: none !important; }
      @page { margin: 1.5cm; size: A4 landscape; }
      .data-table { font-size: 10px; }
    }
  </style>
</head>
<body>
  <div class="report-wrapper">

    <!-- ENCABEZADO -->
    <div class="report-header">
      <div>${logoHtml}</div>
      <div class="report-header-text">
        <h1>${metadata.companyName}</h1>
        <h2>${metadata.reportName}</h2>
        <div class="report-meta">
          <div class="report-meta-item">
            <span class="label">Período</span>
            <span class="value">${metadata.dateRange}</span>
          </div>
          <div class="report-meta-item">
            <span class="label">Generado el</span>
            <span class="value">${generatedAt}</span>
          </div>
          <div class="report-meta-item">
            <span class="label">Total registros</span>
            <span class="value">${data.length}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- BOTÓN IMPRIMIR (solo en pantalla, no en impresión) -->
    <div class="no-print" style="margin-bottom:16px;display:flex;gap:10px;">
      <button onclick="window.print()" style="
        background:#1e40af;color:white;border:none;padding:9px 22px;
        border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;
        display:flex;align-items:center;gap:6px;
      ">🖨️ Imprimir / Guardar como PDF</button>
      <button onclick="window.close()" style="
        background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;padding:9px 22px;
        border-radius:6px;font-size:13px;cursor:pointer;
      ">Cerrar</button>
    </div>

    <!-- RESUMEN DE INDICADORES -->
    ${summaryHtml}

    <!-- TABLA DE DATOS -->
    ${data.length > 0 ? `
    <table class="data-table">
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>` : `<div class="no-data">No hay datos para mostrar con los filtros actuales.</div>`}

    <!-- PIE DE PÁGINA -->
    <div class="footer">
      <span>Reporte generado por MotoGremio SaaS — ${metadata.companyName}</span>
      <span>Generado: ${generatedAt}</span>
    </div>

  </div>
</body>
</html>`

  // ─── ABRIR VENTANA DE IMPRESIÓN ───────────────────────────────────────────────
  const printWindow = window.open('', '_blank', 'width=1100,height=750,scrollbars=yes')
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes para imprimir el reporte.')
    return
  }
  printWindow.document.write(html)
  printWindow.document.close()
  // Auto-focus para que Ctrl+P funcione de inmediato
  printWindow.focus()
}
