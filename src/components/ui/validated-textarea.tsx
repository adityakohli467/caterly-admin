"use client"

import * as React from "react"
import { Textarea } from "./textarea"
import { Label } from "./label"
import { cn } from "@/lib/utils"
import { validateField, ValidationRule } from "@/lib/validation"

// Access the global flag (shared with ValidatedInput via window object)
const getIsDialogClosing = () => {
  if (typeof window !== 'undefined') {
    return (window as any).__isDialogClosing || false
  }
  return false
}

export interface ValidatedTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'onBlur'> {
  label?: string
  validationRule?: ValidationRule
  error?: string
  showError?: boolean
  onChange?: (value: string, isValid: boolean) => void
  onBlur?: (value: string, isValid: boolean) => void
  fieldName?: string
  skipValidation?: boolean // Skip validation when modal is closing
}

const ValidatedTextarea = React.forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  (
    {
      className,
      label,
      validationRule,
      error: externalError,
      showError = true,
      onChange,
      onBlur,
      fieldName,
      value,
      skipValidation = false,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || "")
    const [touched, setTouched] = React.useState(false)
    const [internalError, setInternalError] = React.useState<string | null>(null)

    // Use controlled value if provided, otherwise use internal state
    const currentValue = value !== undefined ? value : internalValue

    // Validate on change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      
      if (value === undefined) {
        setInternalValue(newValue)
      }

      // Real-time validation
      if (validationRule && (touched || newValue.length > 0)) {
        const result = validateField(newValue, validationRule, fieldName || label)
        setInternalError(result.error)
        
        if (onChange) {
          onChange(newValue, result.isValid)
        }
      } else {
        setInternalError(null)
        if (onChange) {
          onChange(newValue, true)
        }
      }
    }

    // Validate on blur
    const handleBlur = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Skip validation if skipValidation is true OR if dialog is closing globally
      // Check global flag first for immediate synchronous check
      if (skipValidation || getIsDialogClosing()) {
        setTouched(false)
        setInternalError(null)
        if (onBlur) {
          onBlur(e.target.value, true)
        }
        return
      }

      setTouched(true)
      const newValue = e.target.value

      if (validationRule) {
        const result = validateField(newValue, validationRule, fieldName || label)
        setInternalError(result.error)
        
        if (onBlur) {
          onBlur(newValue, result.isValid)
        }
      } else {
        if (onBlur) {
          onBlur(newValue, true)
        }
      }
    }

    // Use external error if provided, otherwise use internal error
    const displayError = externalError || (touched && internalError ? internalError : null)
    const hasError = !!displayError

    return (
      <div className="w-full">
        {label && (
          <Label htmlFor={props.id} className={cn(hasError && "text-red-600")}>
            {label}
            {validationRule?.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <Textarea
          ref={ref}
          value={currentValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            hasError && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          {...props}
        />
        {showError && displayError && (
          <p className="text-sm text-red-600 mt-1">{displayError}</p>
        )}
      </div>
    )
  }
)
ValidatedTextarea.displayName = "ValidatedTextarea"

export { ValidatedTextarea }

