import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/** Australia/Sydney covers both AEST (UTC+10) and AEDT (UTC+11) automatically */
export const AU_TIMEZONE = "Australia/Sydney"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(num)
}

/** Format a date+time in Australian timezone (e.g. "18 Mar 2026, 5:30 pm") */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: AU_TIMEZONE,
  }).format(d)
}

/** Format date only in Australian timezone (e.g. "18 Mar 2026") */
export function formatDateOnly(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: AU_TIMEZONE,
  }).format(d)
}

/** Format date+time with weekday in Australian timezone (e.g. "Wednesday, 18 Mar 2026, 5:30 pm") */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: AU_TIMEZONE,
  }).format(d)
}

