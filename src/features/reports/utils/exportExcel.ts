/**
 * Exportación profesional a Excel (.xlsx) con encabezado de compañía.
 * Usa la librería SheetJS (xlsx) para generar archivos nativos de Excel.
 */
import * as XLSX from 'xlsx'

export interface ExcelColumn<T = any> {
  key: keyof T | string
  label: string
  render?: (val: any, row: T) => string | number
  width?: number
}

export interface ExcelMetadata {
  companyName: string
  reportName: string
  dateRange: string
  generatedAt?: string
}

/**
 * Exporta datos a un archivo Excel (.xlsx) profesional.
 * Incluye filas de encabezado con información de la compañía y el reporte.
 */
export function exportToExcel<T>(
  filename: string,
  columns: ExcelColumn<T>[],
  data: T[],
  metadata?: ExcelMetadata
) {
  const wb = XLSX.utils.book_new()

  const generatedAt = metadata?.generatedAt ?? new Date().toLocaleString('es-EC')

  // ─── FILAS DE ENCABEZADO (Metadata) ─────────────────────────────────────────
  const headerRows: string[][] = []
  if (metadata) {
    headerRows.push([`Compañía:`, metadata.companyName, '', '', '', '', '', ''])
    headerRows.push([`Reporte:`, metadata.reportName, '', '', '', '', '', ''])
    headerRows.push([`Rango:`, metadata.dateRange, '', '', '', '', '', ''])
    headerRows.push([`Generado:`, generatedAt, '', '', '', '', '', ''])
    headerRows.push([]) // fila vacía
  }

  // ─── FILA DE COLUMNAS ────────────────────────────────────────────────────────
  const columnLabels = columns.map(c => c.label)

  // ─── FILAS DE DATOS ──────────────────────────────────────────────────────────
  const dataRows = data.map(row => {
    return columns.map(col => {
      let val: any = ''
      if (col.render) {
        val = col.render((row as any)[col.key], row)
      } else {
        val = (row as any)[col.key]
      }

      if (val === null || val === undefined) {
        return ''
      } else if (Array.isArray(val)) {
        return val.join(', ')
      } else {
        return val
      }
    })
  })

  // ─── CONSTRUIR WORKSHEET ─────────────────────────────────────────────────────
  const wsData = [
    ...headerRows,
    columnLabels,
    ...dataRows,
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // ─── ESTILOS DE COLUMNA (ancho) ──────────────────────────────────────────────
  const colWidths = columns.map(c => ({ wch: c.width ?? 22 }))
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, metadata?.reportName?.slice(0, 31) ?? 'Reporte')

  // ─── DESCARGAR ───────────────────────────────────────────────────────────────
  const date = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`)
}
