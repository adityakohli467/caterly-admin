import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/** Australia/Sydney covers both AEST (UTC+10) and AEDT (UTC+11) automatically */
export const AU_TIMEZONE = "Australia/Sydney"
export const GST_RATE = 0.11
export const GST_PERCENT = 11

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
  if (!date) return "N/A"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "N/A"
  
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: AU_TIMEZONE,
  }).format(d)
}

/** Format date only in Australian timezone (e.g. "18 Mar 2026") */
export function formatDateOnly(date: Date | string): string {
  if (!date || date === "0000-00-00" || date === "0000-00-00 00:00:00") return "N/A"
  
  if (typeof date === "string" && !date.includes("Z") && !date.includes("+")) {
    // For naive strings from backend, extract the date parts literally to avoid shifts
    // Match YYYY-MM-DD anywhere in the string
    const match = date.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [_, year, month, day] = match
      if (year === "0000") return "N/A"
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return `${day} ${months[parseInt(month) - 1]} ${year}`
    }
  }

  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "N/A"

  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: AU_TIMEZONE,
  }).format(d)
}

/** Get the current date/time in Australia as a formatted string or Date object */
export function getAUNow(): Date {
  // Returns a date object that, when formatted with Intl (using AU_TIMEZONE), 
  // correctly reflects the current wall-clock time in Australia.
  return new Date()
}

/** Get current year, month, day in Australia as YYYY-MM-DD */
export function getAUDateToday(): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: AU_TIMEZONE,
  })
  return formatter.format(now)
}

/** Get tomorrow's date in Australia as YYYY-MM-DD */
export function getAUDateTomorrow(): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  
  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: AU_TIMEZONE,
  })
  return formatter.format(tomorrow)
}

/** Get current hour in Australia (0-23) */
export function getAUCurrentHour(): number {
  const now = new Date()
  return parseInt(new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    hour12: false,
    timeZone: AU_TIMEZONE,
  }).format(now))
}

/** Format a Date object or ISO string specifically to a time string in Australia (e.g., "17:30") */
export function formatTimeInAU(date: Date | string, includeSeconds = false): string {
  if (typeof date === "string") {
    // If it's a simple HH:mm string already, return it
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(date)) return date.slice(0, 5)

    // ONLY use literal extraction for naive strings (no timezone info)
    // If it has 'Z' or '+', we MUST use the Date object for proper conversion
    if (!date.includes('Z') && !date.includes('+')) {
      const match = date.match(/(\d{2}):(\d{2})(?::(\d{2}))?/)
      if (match) {
        return `${match[1]}:${match[2]}${includeSeconds && match[3] ? `:${match[3]}` : ''}`
      }
    }
  }

  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "00:00"

  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: true,
    timeZone: AU_TIMEZONE,
  }).format(d)
}

/** Format date+time with weekday in Australian timezone (e.g. "Wednesday, 18 Mar 2026, 5:30 pm") */
export function formatDateTime(date: Date | string): string {
  if (!date || date === "0000-00-00" || date === "0000-00-00 00:00:00") return "N/A"

  if (typeof date === "string" && !date.includes('Z') && !date.includes('+')) {
    // For naive strings, we'll use a literal format or force it to Sydney
    // To get the weekday correctly, we need a Date object.
    const cleanDateStr = date.replace(' ', 'T')
    const match = cleanDateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
    
    if (match) {
       const [_, year, month, day, hour, min] = match
       if (year === "0000") return "N/A"
       const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min))
       if (!isNaN(d.getTime())) {
          return new Intl.DateTimeFormat("en-AU", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: AU_TIMEZONE, // Local time for naive strings
          }).format(d)
       }
    }
  }

  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "N/A"

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

