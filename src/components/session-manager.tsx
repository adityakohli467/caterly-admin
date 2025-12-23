"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"

// Session timeout: 2 days (172800 seconds) or 4 hours (14400 seconds) for JWT
const IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes of inactivity
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000 // Check every 5 minutes

export function SessionManager() {
  const router = useRouter()
  const pathname = usePathname()
  const lastActivityRef = useRef<number>(Date.now())
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }

    // Listen to user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })
    }
  }, [])

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

        // Check last activity time
        const timeSinceActivity = Date.now() - lastActivityRef.current
        if (timeSinceActivity > IDLE_TIMEOUT) {
          // User has been idle for too long - logout
          localStorage.removeItem('caterly-auth')
          localStorage.removeItem('token')
          document.cookie = 'caterly-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          toast.info("You have been logged out due to inactivity")
          if (!pathname?.includes('/login')) {
            router.push('/login')
          }
          return
        }
      } catch (error) {
        // Invalid auth data - clear it
        localStorage.removeItem('caterly-auth')
        localStorage.removeItem('token')
        document.cookie = 'caterly-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    }

    // Initial check
    checkToken()

    // Set up periodic checks
    tokenCheckIntervalRef.current = setInterval(checkToken, TOKEN_CHECK_INTERVAL)

    // Set up idle timeout check
    activityTimeoutRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current
      const auth = localStorage.getItem('caterly-auth')
      if (timeSinceActivity > IDLE_TIMEOUT && auth) {
        localStorage.removeItem('caterly-auth')
        localStorage.removeItem('token')
        document.cookie = 'caterly-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        toast.info("You have been logged out due to inactivity")
        if (!pathname?.includes('/login')) {
          router.push('/login')
        }
      }
    }, 60000) // Check every minute

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current)
      }
      if (activityTimeoutRef.current) {
        clearInterval(activityTimeoutRef.current)
      }
    }
  }, [pathname, router])

  return null // This component doesn't render anything
}

