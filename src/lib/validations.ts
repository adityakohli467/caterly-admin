/**
 * Validation utilities for Australia-specific fields
 * Based on database schema constraints and Australian standards
 */

// Australian phone number validation (mobile: 04XX XXX XXX, landline: various formats)
export const validateAustralianPhone = (phone: string): { valid: boolean; error?: string } => {
  if (!phone || phone.trim() === '') {
    return { valid: true } // Optional field
  }
  
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replaceAll(/[\s\-()]/g, '')
  
  // Australian phone formats:
  // Mobile: 04XX XXX XXX (10 digits starting with 04)
  // Landline: 0X XXXX XXXX (10 digits starting with 02, 03, 07, 08)
  // International: +61 X XXXX XXXX
  const mobileRegex = /^04\d{8}$/
  const landlineRegex = /^0[2-478]\d{8}$/
  
  if (cleaned.length > 15) {
    return { valid: false, error: "Phone number must be 15 characters or less" }
  }
  
  // Check if it's a valid Australian format
  if (cleaned.startsWith('04')) {
    if (!mobileRegex.test(cleaned)) {
      return { valid: false, error: "Invalid Australian mobile number format (e.g., 0412 345 678)" }
    }
  } else if (cleaned.startsWith('0')) {
    if (!landlineRegex.test(cleaned)) {
      return { valid: false, error: "Invalid Australian landline format" }
    }
  } else if (cleaned.startsWith('+61')) {
    // International format
    if (!/^\+61[2-478]\d{8}$/.test(cleaned)) {
      return { valid: false, error: "Invalid international format (e.g., +61 2 1234 5678)" }
    }
  } else {
    return { valid: false, error: "Phone number must start with 0 or +61" }
  }
  
  return { valid: true }
}

// Australian Business Number (ABN) validation
export const validateABN = (abn: string): { valid: boolean; error?: string } => {
  if (!abn || abn.trim() === '') {
    return { valid: true } // Optional field
  }
  
  const cleaned = abn.replaceAll(/\s/g, '')
  
  if (cleaned.length > 15) {
    return { valid: false, error: "ABN must be 15 characters or less" }
  }
  
  // ABN is 11 digits
  if (cleaned.length !== 11) {
    return { valid: false, error: "ABN must be 11 digits" }
  }
  
  if (!/^\d{11}$/.test(cleaned)) {
    return { valid: false, error: "ABN must contain only digits" }
  }
  
  return { valid: true }
}

// Australian postcode validation (4 digits, 0000-9999)
export const validateAustralianPostcode = (postcode: string | number): { valid: boolean; error?: string } => {
  if (!postcode || postcode === '') {
    return { valid: true } // Optional field
  }
  
  const postcodeStr = String(postcode).trim()
  
  if (postcodeStr.length !== 4) {
    return { valid: false, error: "Postcode must be 4 digits" }
  }
  
  if (!/^\d{4}$/.test(postcodeStr)) {
    return { valid: false, error: "Postcode must contain only digits" }
  }
  
  const postcodeNum = Number.parseInt(postcodeStr, 10)
  if (postcodeNum < 0 || postcodeNum > 9999) {
    return { valid: false, error: "Postcode must be between 0000 and 9999" }
  }
  
  return { valid: true }
}

// Email validation
export const validateEmail = (email: string, maxLength: number = 255): { valid: boolean; error?: string } => {
  if (!email || email.trim() === '') {
    return { valid: true } // Optional field
  }
  
  const trimmed = email.trim()
  
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Email must be ${maxLength} characters or less` }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address" }
  }
  
  // Check for common typos
  if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.endsWith('.')) {
    return { valid: false, error: "Invalid email format" }
  }
  
  return { valid: true }
}

// Required field validation
export const validateRequired = (value: string, fieldName: string, maxLength?: number): { valid: boolean; error?: string } => {
  if (!value || value.trim() === '') {
    return { valid: false, error: `${fieldName} is required` }
  }
  
  if (maxLength && value.length > maxLength) {
    return { valid: false, error: `${fieldName} must be ${maxLength} characters or less` }
  }
  
  return { valid: true }
}

// Number validation
export const validateNumber = (
  value: string | number,
  fieldName: string,
  options?: {
    min?: number
    max?: number
    required?: boolean
    allowDecimals?: boolean
  }
): { valid: boolean; error?: string } => {
  const { min, max, required = false, allowDecimals = true } = options || {}
  
  if (!value || value === '') {
    if (required) {
      return { valid: false, error: `${fieldName} is required` }
    }
    return { valid: true }
  }
  
  const numValue = typeof value === 'string' ? Number.parseFloat(value) : value
  
  if (Number.isNaN(numValue)) {
    return { valid: false, error: `${fieldName} must be a valid number` }
  }
  
  if (!allowDecimals && !Number.isInteger(numValue)) {
    return { valid: false, error: `${fieldName} must be a whole number` }
  }
  
  if (min !== undefined && numValue < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` }
  }
  
  if (max !== undefined && numValue > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` }
  }
  
  return { valid: true }
}

// Date validation
export const validateDate = (date: string, fieldName: string, options?: { required?: boolean; minDate?: Date; maxDate?: Date }): { valid: boolean; error?: string } => {
  const { required = false, minDate, maxDate } = options || {}
  
  if (!date || date.trim() === '') {
    if (required) {
      return { valid: false, error: `${fieldName} is required` }
    }
    return { valid: true }
  }
  
  const dateObj = new Date(date)
  
  if (Number.isNaN(dateObj.getTime())) {
    return { valid: false, error: `${fieldName} must be a valid date` }
  }
  
  if (minDate && dateObj < minDate) {
    return { valid: false, error: `${fieldName} must be after ${minDate.toLocaleDateString()}` }
  }
  
  if (maxDate && dateObj > maxDate) {
    return { valid: false, error: `${fieldName} must be before ${maxDate.toLocaleDateString()}` }
  }
  
  return { valid: true }
}

// URL validation
export const validateURL = (url: string, maxLength: number = 500): { valid: boolean; error?: string } => {
  if (!url || url.trim() === '') {
    return { valid: true } // Optional field
  }
  
  const trimmed = url.trim()
  
  if (trimmed.length > maxLength) {
    return { valid: false, error: `URL must be ${maxLength} characters or less` }
  }
  
  try {
    new URL(trimmed)
    return { valid: true }
  } catch {
    // Try adding http:// if no protocol
    try {
      new URL(`http://${trimmed}`)
      return { valid: true }
    } catch {
      return { valid: false, error: "Please enter a valid URL" }
    }
  }
}

// Text length validation
export const validateTextLength = (text: string, fieldName: string, maxLength: number, required: boolean = false): { valid: boolean; error?: string } => {
  if (!text || text.trim() === '') {
    if (required) {
      return { valid: false, error: `${fieldName} is required` }
    }
    return { valid: true }
  }
  
  if (text.length > maxLength) {
    return { valid: false, error: `${fieldName} must be ${maxLength} characters or less` }
  }
  
  return { valid: true }
}

// Australian state validation
export const validateAustralianState = (state: string): { valid: boolean; error?: string } => {
  if (!state || state.trim() === '') {
    return { valid: true } // Optional field
  }
  
  const validStates = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
  const upperState = state.toUpperCase().trim()
  
  if (!validStates.includes(upperState)) {
    return { valid: false, error: `State must be one of: ${validStates.join(', ')}` }
  }
  
  return { valid: true }
}

