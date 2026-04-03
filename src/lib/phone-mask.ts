/**
 * Australian Phone Number Masking Utility
 * Strict formatting with real-time validation
 * Formats phone numbers as user types (Australian formats only)
 */

/**
 * Formats Australian phone number as user types with strict validation
 * Supports:
 * - Mobile: 04XX XXX XXX (10 digits)
 * - Landline: 0X XXXX XXXX (10 digits starting with 02, 03, 07, 08)
 * - International: +61 X XXXX XXXX
 * 
 * Only allows valid Australian formats - rejects invalid input
 */
export const formatAustralianPhone = (value: string, previousValue: string = ""): string => {
  // Remove all non-digit characters except +
  const cleaned = value.replaceAll(/[^\d+]/g, '')
  
  // If user is deleting, allow it
  if (cleaned.length < previousValue.replaceAll(/[^\d+]/g, '').length) {
    return value.replaceAll(/[^\d+]/g, '').replaceAll(/\s/g, '')
  }
  
  // Handle international format (+61)
  if (cleaned.startsWith('+61')) {
    const digits = cleaned.slice(3).replaceAll(/\D/g, '')
    
    // Must start with valid area code (2, 3, 4, 7, 8)
    if (digits.length > 0 && !/^[23478]/.test(digits)) {
      return previousValue.replaceAll(/[^\d+]/g, '').replaceAll(/\s/g, '')
    }
    
    if (digits.length === 0) return '+61'
    if (digits.length === 1) return `+61 ${digits}`
    if (digits.length <= 5) return `+61 ${digits.slice(0, 1)} ${digits.slice(1)}`
    if (digits.length <= 9) return `+61 ${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5)}`
    // Max 9 digits after +61
    return `+61 ${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5, 9)}`
  }
  
  // Handle mobile numbers (04XX XXX XXX) - must start with 04
  if (cleaned.startsWith('04')) {
    const digits = cleaned.replaceAll(/\D/g, '')
    
    // Mobile must be exactly 10 digits starting with 04
    if (digits.length > 10) {
      return previousValue.replaceAll(/[^\d+]/g, '').replaceAll(/\s/g, '')
    }
    
    // Validate mobile format: 04XX (X must be 0-9)
    if (digits.length >= 3 && !/^04\d/.test(digits)) {
      return previousValue.replaceAll(/[^\d+]/g, '').replaceAll(/\s/g, '')
    }
    
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 4)}`
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
    if (digits.length <= 10) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
  }
  
  // Handle landline numbers (0X XXXX XXXX) - must start with 02, 03, 07, or 08
  if (cleaned.startsWith('0')) {
    const digits = cleaned.replaceAll(/\D/g, '')
    
    // Landline must be exactly 10 digits starting with 02, 03, 07, or 08
    if (digits.length > 10) {
      return previousValue.replaceAll(/[^\d+]/g, '').replaceAll(/\s/g, '')
    }
    
    // Must start with valid area code: 02, 03, 07, or 08
    if (digits.length >= 2 && !/^0[2378]/.test(digits)) {
      // Allow 0 alone, but reject invalid second digit
      if (digits.length === 1) {
        return digits
      }
      return previousValue.replaceAll(/[^\d+]/g, '').replaceAll(/\s/g, '')
    }
    
    if (digits.length <= 1) return digits
    if (digits.length <= 2) return digits
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`
    if (digits.length <= 10) return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`
  }
  
  // Handle toll-free numbers (1800 XXX XXX)
  if (cleaned.startsWith('1800')) {
    const digits = cleaned.replaceAll(/\D/g, '')
    if (digits.length > 10) return previousValue.replaceAll(/[^\d+]/g, '').replaceAll(/\s/g, '')
    if (digits.length <= 4) return digits
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
  }

  // Handle 1300 numbers (1300 XXX XXX)
  if (cleaned.startsWith('1300')) {
    const digits = cleaned.replaceAll(/\D/g, '')
    if (digits.length > 10) return previousValue.replaceAll(/[^\d+]/g, '').replaceAll(/\s/g, '')
    if (digits.length <= 4) return digits
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
  }

  // Handle 13 numbers (13 XX XX)
  if (cleaned.startsWith('13')) {
    const digits = cleaned.replaceAll(/\D/g, '')
    if (digits.length > 6) return previousValue.replaceAll(/[^\d+]/g, '').replaceAll(/\s/g, '')
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)}`
  }

  // If starts with digit other than 0 or 1, reject (Australian numbers must start with 0, 1, or +61)
  if (cleaned.length > 0 && /^\d/.test(cleaned) && !cleaned.startsWith('0') && !cleaned.startsWith('1')) {
    return previousValue.replaceAll(/[^\d+]/g, '').replaceAll(/\s/g, '')
  }
  
  // Default: return cleaned digits (max 15 chars per DB schema)
  return cleaned.replaceAll(/\D/g, '').slice(0, 15)
}

/**
 * Validates if the phone number format is valid Australian format
 * Returns true if valid or empty (optional field)
 */
export const isValidAustralianPhoneFormat = (value: string): boolean => {
  if (!value || value.trim() === '') {
    return true // Optional field
  }
  
  const cleaned = value.replaceAll(/[^\d+]/g, '')
  
  // International format (+61)
  if (cleaned.startsWith('+61')) {
    return /^\+61[23478]\d{8}$/.test(cleaned)
  }
  
  // Mobile format (04XX XXX XXX)
  if (cleaned.startsWith('04')) {
    return /^04\d{8}$/.test(cleaned)
  }
  
  // Landline format (0X XXXX XXXX)
  if (cleaned.startsWith('0')) {
    return /^0[2378]\d{8}$/.test(cleaned)
  }

  // Toll-free 1800/1300 (10 digits)
  if (cleaned.startsWith('1800') || cleaned.startsWith('1300')) {
    return /^(1800|1300)\d{6}$/.test(cleaned)
  }

  // Toll-free 13 (6 digits)
  if (cleaned.startsWith('13')) {
    return /^13\d{4}$/.test(cleaned)
  }
  
  // Other international formats (starts with +)
  if (cleaned.startsWith('+')) {
    return cleaned.length >= 8 && cleaned.length <= 20
  }
  
  return false
}

/**
 * Removes formatting from phone number (keeps only digits and +)
 * Useful for storing in database
 */
export const cleanPhoneNumber = (value: string): string => {
  if (!value) return ''
  // Keep + for international numbers, remove everything else
  if (value.startsWith('+61')) {
    return `+61${value.slice(3).replaceAll(/\D/g, '')}`
  }
  if (value.startsWith('+')) {
    return value.replaceAll(/[^\d+]/g, '')
  }
  // Remove all non-digits for local numbers
  return value.replaceAll(/\D/g, '')
}

/**
 * Phone number input handler for React with strict validation
 * Formats as user types and prevents invalid input
 */
export const handlePhoneInput = (
  value: string,
  previousValue: string,
  onChange: (value: string) => void
): void => {
  const formatted = formatAustralianPhone(value, previousValue)
  onChange(formatted)
}

/**
 * Phone number mask pattern for input placeholder
 */
export const getPhonePlaceholder = (): string => {
  return '04XX XXX XXX or 1800 XXX XXX'
}

/**
 * Gets validation error message for phone number
 */
export const getPhoneValidationError = (value: string): string | undefined => {
  if (!value || value.trim() === '') {
    return undefined // Optional field
  }
  
  if (!isValidAustralianPhoneFormat(value)) {
    const cleaned = value.replaceAll(/[^\d+]/g, '')
    
    if (cleaned.startsWith('+61')) {
      return 'Invalid international format. Use +61 X XXXX XXXX'
    }
    
    if (cleaned.startsWith('04')) {
      return 'Invalid mobile format. Use 04XX XXX XXX (10 digits)'
    }
    
    if (cleaned.startsWith('0')) {
      return 'Invalid landline format. Use 0X XXXX XXXX (02, 03, 07, or 08)'
    }

    if (cleaned.startsWith('1800') || cleaned.startsWith('1300')) {
      return 'Invalid toll-free format. Use 1800 XXX XXX or 1300 XXX XXX (10 digits)'
    }

    if (cleaned.startsWith('13')) {
      return 'Invalid business format. Use 13 XX XX (6 digits)'
    }
    
    return 'Phone number must start with 0, 1800, 1300, 13 or +61'
  }
  
  return undefined
}
