/**
 * Comprehensive validation utilities based on database schema
 * Provides real-time field-level validation for all forms
 */

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  patternMessage?: string
  type?: 'email' | 'phone' | 'number' | 'decimal' | 'integer' | 'url' | 'date' | 'text'
  min?: number
  max?: number
  custom?: (value: any) => string | null
}

export interface ValidationResult {
  isValid: boolean
  error: string | null
}

/**
 * Validate a field value against rules
 */
export function validateField(
  value: any,
  rules: ValidationRule,
  fieldName?: string
): ValidationResult {
  // Handle null/undefined
  if (value === null || value === undefined) {
    value = ''
  }

  // Convert to string for length checks (unless it's a number type)
  const stringValue = typeof value === 'string' ? value : String(value)

  // Required check
  if (rules.required && (!stringValue || stringValue.trim().length === 0)) {
    return {
      isValid: false,
      error: `${fieldName || 'This field'} is required`
    }
  }

  // Skip other validations if empty and not required
  if (!stringValue || stringValue.trim().length === 0) {
    return { isValid: true, error: null }
  }

  // Min length check
  if (rules.minLength && stringValue.length < rules.minLength) {
    return {
      isValid: false,
      error: `${fieldName || 'This field'} must be at least ${rules.minLength} characters`
    }
  }

  // Max length check
  if (rules.maxLength && stringValue.length > rules.maxLength) {
    return {
      isValid: false,
      error: `${fieldName || 'This field'} must not exceed ${rules.maxLength} characters`
    }
  }

  // Type-specific validations
  if (rules.type) {
    const typeError = validateType(stringValue, rules.type, fieldName)
    if (typeError) {
      return { isValid: false, error: typeError }
    }
  }

  // Number validations
  if (rules.type === 'number' || rules.type === 'decimal' || rules.type === 'integer') {
    const numValue = parseFloat(stringValue)
    if (isNaN(numValue)) {
      return {
        isValid: false,
        error: `${fieldName || 'This field'} must be a valid number`
      }
    }

    if (rules.type === 'integer' && !Number.isInteger(numValue)) {
      return {
        isValid: false,
        error: `${fieldName || 'This field'} must be a whole number`
      }
    }

    if (rules.min !== undefined && numValue < rules.min) {
      return {
        isValid: false,
        error: `${fieldName || 'This field'} must be at least ${rules.min}`
      }
    }

    if (rules.max !== undefined && numValue > rules.max) {
      return {
        isValid: false,
        error: `${fieldName || 'This field'} must not exceed ${rules.max}`
      }
    }
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    return {
      isValid: false,
      error: rules.patternMessage || `${fieldName || 'This field'} format is invalid`
    }
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value)
    if (customError) {
      return { isValid: false, error: customError }
    }
  }

  return { isValid: true, error: null }
}

/**
 * Validate field type
 */
function validateType(value: string, type: string, fieldName?: string): string | null {
  switch (type) {
    case 'email':
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(value)) {
        return `${fieldName || 'Email'} must be a valid email address`
      }
      break

    case 'phone':
      // Allow various phone formats: +61 4XX XXX XXX, 04XX XXX XXX, (04) XXXX XXXX, etc.
      const phonePattern = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
      const cleanedPhone = value.replace(/[\s\-\(\)]/g, '')
      if (cleanedPhone.length < 8 || cleanedPhone.length > 15 || !phonePattern.test(value)) {
        return `${fieldName || 'Phone'} must be a valid phone number`
      }
      break

    case 'url':
      try {
        new URL(value)
      } catch {
        return `${fieldName || 'URL'} must be a valid URL`
      }
      break

    case 'date':
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        return `${fieldName || 'Date'} must be a valid date`
      }
      break
  }

  return null
}

/**
 * Validation rules based on database schema
 */
export const ValidationRules = {
  // User fields
  user: {
    email: {
      required: true,
      type: 'email' as const,
      maxLength: 255
    },
    username: {
      required: true,
      maxLength: 50
    },
    login_username: {
      maxLength: 100
    },
    password: {
      required: true,
      minLength: 8,
      maxLength: 255
    },
    account_email: {
      type: 'email' as const,
      maxLength: 150
    },
    account_name: {
      maxLength: 1000
    },
    account_number: {
      maxLength: 1000
    },
    bsb: {
      maxLength: 100
    }
  },

  // Company fields
  company: {
    company_name: {
      required: true,
      maxLength: 255
    },
    company_abn: {
      maxLength: 15,
      pattern: /^[0-9]{11}$/,
      patternMessage: 'ABN must be exactly 11 digits'
    },
    company_phone: {
      required: true,
      type: 'phone' as const,
      maxLength: 15
    },
    company_address: {
      type: 'text' as const
    }
  },

  // Department fields
  department: {
    department_name: {
      required: true,
      maxLength: 255
    },
    department_comments: {
      type: 'text' as const
    }
  },

  // Customer fields
  customer: {
    firstname: {
      required: true,
      maxLength: 255
    },
    lastname: {
      required: true,
      maxLength: 255
    },
    email: {
      type: 'email' as const,
      maxLength: 255
    },
    telephone: {
      type: 'phone' as const,
      maxLength: 15
    },
    customer_fax: {
      type: 'phone' as const,
      maxLength: 15
    },
    customer_address: {
      type: 'text' as const
    },
    department: {
      maxLength: 30
    },
    customer_cost_centre: {
      maxLength: 255
    },
    customer_notes: {
      type: 'text' as const
    }
  },

  // Product fields
  product: {
    product_name: {
      required: true,
      maxLength: 255
    },
    product_description: {
      type: 'text' as const
    },
    product_tag: {
      type: 'text' as const
    },
    product_meta_keyword: {
      type: 'text' as const
    },
    product_desc_1: {
      maxLength: 255
    },
    product_desc_2: {
      maxLength: 255
    },
    product_desc_3: {
      maxLength: 255
    },
    product_desc_4: {
      maxLength: 255
    },
    product_desc_5: {
      maxLength: 255
    },
    product_image: {
      type: 'text' as const
    },
    product_price: {
      required: true,
      type: 'decimal' as const,
      min: 0
    },
    product_minimum: {
      type: 'integer' as const,
      min: 1
    },
    uid: {
      maxLength: 500
    }
  },

  // Order/Quote fields
  order: {
    customer_order_name: {
      maxLength: 255
    },
    order_comments: {
      type: 'text' as const
    },
    delivery_fee: {
      type: 'decimal' as const,
      min: 0
    },
    delivery_phone: {
      type: 'phone' as const,
      maxLength: 15
    },
    delivery_address: {
      type: 'text' as const
    },
    delivery_email: {
      type: 'email' as const,
      maxLength: 255
    },
    approval_comments: {
      maxLength: 255
    },
    customer_order_email: {
      type: 'email' as const,
      maxLength: 50
    },
    mark_paid_comment: {
      maxLength: 500
    },
    customer_company_name: {
      maxLength: 500
    },
    customer_company_addr: {
      maxLength: 500
    },
    customer_department_name: {
      maxLength: 500
    },
    express_order: {
      maxLength: 100
    },
    customer_order_telephone: {
      type: 'phone' as const,
      maxLength: 30
    },
    account_email: {
      type: 'email' as const,
      maxLength: 150
    },
    cost_center: {
      maxLength: 255
    },
    delivery_contact: {
      maxLength: 255
    },
    delivery_details: {
      type: 'text' as const
    }
  },

  // Location fields
  location: {
    location_name: {
      required: true,
      maxLength: 200
    },
    post_codes: {
      maxLength: 200
    }
  },

  // Category fields
  category: {
    category_name: {
      required: true,
      maxLength: 255
    }
  },

  // Option fields
  option: {
    name: {
      required: true,
      maxLength: 255
    }
  },

  // Option value fields
  option_value: {
    name: {
      required: true,
      maxLength: 255
    },
    sort_order: {
      type: 'integer' as const,
      min: 0
    }
  },

  // Coupon fields
  coupon: {
    coupon_code: {
      required: true,
      maxLength: 50
    },
    coupon_discount: {
      required: true,
      type: 'decimal' as const,
      min: 0
    }
  }
}

/**
 * Validate multiple fields at once
 */
export function validateFields(
  values: Record<string, any>,
  rules: Record<string, ValidationRule>
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const [fieldName, rule] of Object.entries(rules)) {
    const result = validateField(values[fieldName], rule, fieldName)
    if (!result.isValid && result.error) {
      errors[fieldName] = result.error
    }
  }

  return errors
}

/**
 * Check if form is valid
 */
export function isFormValid(errors: Record<string, string>): boolean {
  return Object.keys(errors).length === 0
}

