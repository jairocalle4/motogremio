import { useState, type ReactNode } from 'react'
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from './EmptyState'
import { LoadingSpinner } from './LoadingSpinner'
import { cn } from '@/lib/utils'
import type { TableColumn } from '@/types'

interface DataTableProps<T extends Record<string, unknown>> {
  columns:      TableColumn<T>[]
  data:         T[]
  loading?:     boolean
  searchable?:  boolean
  searchPlaceholder?: string
  rowKey:       keyof T
  emptyTitle?:  string
  emptyDescription?: string
  actions?:     ReactNode       // botones sobre la tabla (ej: "Nuevo")
  pageSize?:    number
  onRowClick?:  (row: T) => void
}

export function DataTable<T extends Record<string, unknown>>({
  columns, data, loading,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  rowKey,
  emptyTitle = 'No hay registros',
  emptyDescription = 'No se encontraron datos para mostrar.',
  actions,
  pageSize = 20,
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch]     = useState('')
  const [currentPage, setPage]  = useState(1)

  // Filtro local por búsqueda
  const filtered = searchable && search.trim()
    ? data.filter(row =>
        Object.values(row).some(val =>
          String(val ?? '').toLowerCase().includes(search.toLowerCase())
        )
      )
    : data

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const goTo = (page: number) => setPage(Math.min(Math.max(1, page), totalPages))

  const getCellValue = (row: T, col: TableColumn<T>): unknown => {
    const keys = String(col.key).split('.')
    return keys.reduce<unknown>((obj, k) => (obj as Record<string, unknown>)?.[k], row)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de herramientas */}
      {(searchable || actions) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {searchable && (
            <div className="w-full sm:w-72">
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Tabla */}
      <div className="section-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={cn(
                      'table-header text-left font-semibold',
                      col.width && `w-[${col.width}]`,
                      col.align === 'right'  && 'text-right',
                      col.align === 'center' && 'text-center',
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="py-16">
                    <LoadingSpinner size="md" label="Cargando..." className="mx-auto" />
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState
                      type={search ? 'search' : 'empty'}
                      title={search ? 'Sin resultados' : emptyTitle}
                      description={search ? `No hay resultados para "${search}".` : emptyDescription}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map(row => (
                  <tr
                    key={String(row[rowKey])}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'hover:bg-gray-50/70 transition-colors',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col, i) => (
                      <td
                        key={i}
                        className={cn(
                          'table-cell',
                          col.align === 'right'  && 'text-right',
                          col.align === 'center' && 'text-center',
                        )}
                      >
                        {col.render
                          ? col.render(getCellValue(row, col), row)
                          : String(getCellValue(row, col) ?? '—')
                        }
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!loading && filtered.length > pageSize && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="xs" onClick={() => goTo(1)} disabled={currentPage === 1}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="xs" onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-medium text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <Button variant="ghost" size="xs" onClick={() => goTo(currentPage + 1)} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="xs" onClick={() => goTo(totalPages)} disabled={currentPage === totalPages}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
