"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"

// Session timeout logic removed: session will only end on explicit logout
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000 // Check every 5 minutes

export function SessionManager() {
  const router = useRouter()
  const pathname = usePathname()
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)



  // Check token expiration periodically
  useEffect(() => {
    // Don't check on login page
    if (pathname?.includes('/login')) {
      return
    }

    const checkToken = () => {
      // Check if token exists
      const auth = localStorage.getItem('caterly-auth')
      if (!auth) {
        return
      }

      try {
        const { state } = JSON.parse(auth)
        if (!state?.token) {
          return
        }
        // No inactivity logout: session persists until explicit logout
      } catch (error) {
        // Invalid auth data - clear it
        localStorage.removeItem('caterly-auth')
        localStorage.removeItem('token')
        document.cookie = 'caterly-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    }

    // Initial check
    checkToken()

    // Set up periodic checks (if needed for other reasons)
    tokenCheckIntervalRef.current = setInterval(checkToken, TOKEN_CHECK_INTERVAL)

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current)
      }
    }
  }, [pathname, router])

  return null // This component doesn't render anything
}

