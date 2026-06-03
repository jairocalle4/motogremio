import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DocumentStatus } from '@/types'

// ─── Classnames ───────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Fechas ───────────────────────────────────────────
export function formatDate(date: string | null | undefined, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), fmt, { locale: es })
  } catch {
    return '—'
  }
}

export function formatDateTime(date: string | null | undefined): string {
  return formatDate(date, "dd/MM/yyyy 'a las' HH:mm")
}

export function getDaysUntilExpiry(expiryDate: string | null | undefined): number | null {
  if (!expiryDate) return null
  try {
    return differenceInDays(parseISO(expiryDate), new Date())
  } catch {
    return null
  }
}

export function getDocumentStatus(expiryDate: string | null | undefined): DocumentStatus {
  const days = getDaysUntilExpiry(expiryDate)
  if (days === null) return 'vigente'
  if (days < 0) return 'vencido'
  if (days <= 30) return 'por_vencer'
  return 'vigente'
}

// ─── Números y moneda ─────────────────────────────────
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('es-EC').format(value)
}

// ─── Strings ──────────────────────────────────────────
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}…`
}

// ─── WhatsApp ─────────────────────────────────────────
export function buildWhatsAppLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '')
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${clean}?text=${encoded}`
}
