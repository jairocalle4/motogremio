import { differenceInDays, isBefore, startOfDay, parseISO } from 'date-fns'
import type { Database } from '@/types/database.types'

type DocumentStatus = Database['public']['Enums']['document_status']

/**
 * Calcula dinámicamente el estado de un documento basado en su fecha de caducidad.
 * @param expiryDate Fecha de caducidad en formato YYYY-MM-DD
 * @returns 'vigente' | 'por_vencer' | 'vencido'
 */
export function calculateDocumentStatus(expiryDate: string | null): DocumentStatus {
  if (!expiryDate) return 'vigente' // Si no caduca, siempre es vigente

  const today = startOfDay(new Date())
  const expiry = startOfDay(parseISO(expiryDate))

  if (isBefore(expiry, today)) {
    return 'vencido'
  }

  const daysLeft = differenceInDays(expiry, today)
  if (daysLeft <= 30) {
    return 'por_vencer'
  }

  return 'vigente'
}
