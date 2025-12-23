"use client"

import { useEffect } from "react"

/**
 * Error handler component that filters out browser extension errors
 * and prevents them from cluttering the console
 */
export function ErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      const errorMessage = error?.message || String(error)
      const errorStack = error?.stack || ""

      // Filter out browser extension errors
      if (
        errorStack.includes("contentScript.js") ||
        errorStack.includes("extension://") ||
        errorStack.includes("chrome-extension://") ||
        errorStack.includes("moz-extension://") ||
        errorMessage.includes("contentScript") ||
        errorMessage.includes("extension")
      ) {
        // Suppress browser extension errors
        event.preventDefault()
        return
      }

      // Log legitimate errors
      console.error("Unhandled promise rejection:", error)
    }

    // Handle general errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error
      const errorMessage = error?.message || event.message || ""
      const errorFilename = event.filename || ""
      const errorStack = error?.stack || ""

      // Filter out browser extension errors
      if (
        errorFilename.includes("contentScript.js") ||
        errorFilename.includes("extension://") ||
        errorFilename.includes("chrome-extension://") ||
        errorFilename.includes("moz-extension://") ||
        errorStack.includes("contentScript.js") ||
        errorStack.includes("extension://") ||
        errorStack.includes("chrome-extension://") ||
        errorStack.includes("moz-extension://") ||
        errorMessage.includes("contentScript") ||
        errorMessage.includes("extension")
      ) {
        // Suppress browser extension errors
        event.preventDefault()
        return false
      }

      // Allow legitimate errors to be logged
      return true
    }

    // Add event listeners
    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleError)

    // Cleanup
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleError)
    }
  }, [])

  return null
}

