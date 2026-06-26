/**
 * Helper to export data arrays to CSV.
 * Includes UTF-8 BOM so Excel opens Spanish accents correctly.
 */
export function exportToCsv<T>(
  filename: string,
  columns: Array<{ key: keyof T | string; label: string; render?: (val: any, row: T) => string }>,
  data: T[]
) {
  const headers = columns.map(col => `"${col.label.replace(/"/g, '""')}"`).join(';')
  
  const rows = data.map(row => {
    return columns
      .map(col => {
        let val: any = ''
        if (col.render) {
          val = col.render((row as any)[col.key], row)
        } else {
          val = (row as any)[col.key]
        }
        
        // Format values
        if (val === null || val === undefined) {
          val = ''
        } else if (Array.isArray(val)) {
          val = val.join(', ') // Join array elements with comma instead of semicolon to prevent column split issues
        } else {
          val = String(val)
        }
        
        // Escape quotes
        return `"${val.replace(/"/g, '""')}"`
      })
      .join(';')
  })

  // Prepend BOM and sep=; so Excel correctly reads Spanish accents and uses semicolon as separator
  const csvContent = '\uFEFF' + 'sep=;\n' + [headers, ...rows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
