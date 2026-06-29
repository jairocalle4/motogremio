/**
 * Exportación profesional a Excel (.xlsx) con estilos completos.
 * Usa ExcelJS para soporte de colores, negritas, bordes y encabezados de compañía.
 */
import ExcelJS from 'exceljs'

export interface ExcelColumn<T = any> {
  key: keyof T | string
  label: string
  render?: (val: any, row: T) => string | number
  width?: number
  align?: 'left' | 'center' | 'right'
}

export interface ExcelMetadata {
  companyName: string
  reportName: string
  dateRange: string
  generatedAt?: string
}

// ─── PALETA DE COLORES ───────────────────────────────────────────────────────
const COLORS = {
  // Encabezado compañía / título
  headerBg: '1E3A5F',       // Azul marino oscuro
  headerFg: 'FFFFFF',       // Blanco

  // Subencabezado (etiquetas de metadatos)
  metaLabelBg: 'EFF6FF',    // Azul muy claro
  metaLabelFg: '1E40AF',    // Azul oscuro

  // Columnas de tabla
  colHeaderBg: '2563EB',    // Azul primario
  colHeaderFg: 'FFFFFF',    // Blanco

  // Filas alternas
  rowEvenBg: 'F8FAFF',      // Azul muy suave
  rowOddBg: 'FFFFFF',       // Blanco puro

  // Borde de tabla
  borderColor: 'CBD5E1',    // Gris suave (slate-300)
  borderHeaderColor: '1D4ED8', // Borde azul para cabecera

  // Texto normal
  textNormal: '1E293B',     // Slate-800
  textMuted: '64748B',      // Slate-500
}

/**
 * Crea un border de celda completo (todos los lados).
 */
function fullBorder(color: string): Partial<ExcelJS.Borders> {
  const side: ExcelJS.BorderStyle = 'thin'
  return {
    top:    { style: side, color: { argb: 'FF' + color } },
    left:   { style: side, color: { argb: 'FF' + color } },
    bottom: { style: side, color: { argb: 'FF' + color } },
    right:  { style: side, color: { argb: 'FF' + color } },
  }
}

/**
 * Exporta datos a un archivo Excel (.xlsx) profesional con estilos completos.
 */
export async function exportToExcel<T>(
  filename: string,
  columns: ExcelColumn<T>[],
  data: T[],
  metadata?: ExcelMetadata
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'MotoGremio SaaS'
  wb.lastModifiedBy = 'MotoGremio SaaS'
  wb.created = new Date()
  wb.modified = new Date()

  const sheetName = (metadata?.reportName ?? 'Reporte').slice(0, 31)
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: metadata ? 6 : 1 }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      margins: {
        left: 0.5, right: 0.5,
        top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3,
      },
    },
  })

  const totalCols = columns.length

  // ─── FILA 1: TÍTULO DE LA COMPAÑÍA ──────────────────────────────────────────
  if (metadata) {
    ws.mergeCells(1, 1, 1, totalCols)
    const titleRow = ws.getRow(1)
    titleRow.height = 32
    const titleCell = titleRow.getCell(1)
    titleCell.value = `🏢 ${metadata.companyName}`
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF' + COLORS.headerFg } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.headerBg } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
    titleRow.commit()

    // ─── FILA 2: NOMBRE DEL REPORTE ───────────────────────────────────────────
    ws.mergeCells(2, 1, 2, totalCols)
    const reportRow = ws.getRow(2)
    reportRow.height = 22
    const reportCell = reportRow.getCell(1)
    reportCell.value = metadata.reportName.toUpperCase()
    reportCell.font = { bold: true, size: 12, color: { argb: 'FF' + COLORS.headerFg } }
    reportCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    reportCell.alignment = { vertical: 'middle', horizontal: 'center' }
    reportRow.commit()

    // ─── FILAS 3-5: METADATOS ─────────────────────────────────────────────────
    const metaItems: [string, string][] = [
      ['📅 Período:', metadata.dateRange],
      ['🕐 Generado:', metadata.generatedAt ?? new Date().toLocaleString('es-EC')],
      ['📊 Total registros:', String(data.length)],
    ]

    metaItems.forEach(([label, value], i) => {
      const rowIndex = 3 + i
      const halfCols = Math.floor(totalCols / 2)
      ws.mergeCells(rowIndex, 1, rowIndex, halfCols)
      ws.mergeCells(rowIndex, halfCols + 1, rowIndex, totalCols)

      const metaRow = ws.getRow(rowIndex)
      metaRow.height = 18

      const labelCell = metaRow.getCell(1)
      labelCell.value = label
      labelCell.font = { bold: true, size: 10, color: { argb: 'FF' + COLORS.metaLabelFg } }
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.metaLabelBg } }
      labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

      const valCell = metaRow.getCell(halfCols + 1)
      valCell.value = value
      valCell.font = { size: 10, color: { argb: 'FF' + COLORS.textNormal } }
      valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
      valCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

      metaRow.commit()
    })

    // Fila 6 vacía como separador
    const sepRow = ws.getRow(6)
    ws.mergeCells(6, 1, 6, totalCols)
    sepRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.headerBg } }
    sepRow.height = 4
    sepRow.commit()
  }

  // ─── FILA DE ENCABEZADOS DE COLUMNA ─────────────────────────────────────────
  const headerRowIndex = metadata ? 7 : 1
  const headerRow = ws.getRow(headerRowIndex)
  headerRow.height = 26

  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = col.label.toUpperCase()
    cell.font = { bold: true, size: 10, color: { argb: 'FF' + COLORS.colHeaderFg } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.colHeaderBg } }
    cell.alignment = {
      vertical: 'middle',
      horizontal: (col.align ?? 'left') as ExcelJS.Alignment['horizontal'],
      wrapText: false,
    }
    cell.border = fullBorder(COLORS.borderHeaderColor)
  })
  headerRow.commit()

  // ─── FILAS DE DATOS ──────────────────────────────────────────────────────────
  data.forEach((row, rowIdx) => {
    const dataRow = ws.getRow(headerRowIndex + 1 + rowIdx)
    dataRow.height = 18

    const isEven = rowIdx % 2 === 0
    const bgColor = isEven ? COLORS.rowEvenBg : COLORS.rowOddBg

    columns.forEach((col, colIdx) => {
      let val: any = (row as any)[col.key]
      if (col.render) {
        val = col.render(val, row)
      }

      if (val === null || val === undefined) val = ''
      else if (Array.isArray(val)) val = val.join(', ')

      // Intentar parsear números para que Excel los trate correctamente
      const numericVal = typeof val === 'string' && /^[\d.,]+$/.test(val.trim())
        ? parseFloat(val.replace(',', '.'))
        : val

      const cell = dataRow.getCell(colIdx + 1)
      cell.value = typeof numericVal === 'number' && !isNaN(numericVal) ? numericVal : val
      cell.font = { size: 10, color: { argb: 'FF' + COLORS.textNormal } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } }
      cell.alignment = {
        vertical: 'middle',
        horizontal: (col.align ?? 'left') as ExcelJS.Alignment['horizontal'],
        wrapText: false,
        indent: 1,
      }
      cell.border = fullBorder(COLORS.borderColor)
    })

    dataRow.commit()
  })

  // ─── ANCHOS DE COLUMNA ───────────────────────────────────────────────────────
  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width ?? 22
  })

  // ─── DESCARGAR ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
