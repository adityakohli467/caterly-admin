"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore } from "@/store/auth"
import { canAccessRoute } from "@/lib/permissions"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredAuthLevel?: number
  allowedAuthLevels?: number[]
}

/**
 * Component to protect routes based on user permissions
 * Redirects to dashboard if user doesn't have access
 */
export function ProtectedRoute({ 
  children, 
  requiredAuthLevel,
  allowedAuthLevels 
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }

    // Check if user has access to this route
    const hasAccess = canAccessRoute(user.auth_level, pathname)

    if (!hasAccess) {
      // Redirect to dashboard if no access
      router.push('/')
    }
  }, [isAuthenticated, user, pathname, router])

  // Show loading or nothing while checking
  if (!isAuthenticated || !user) {
    return null
  }

  // Check access
  const hasAccess = canAccessRoute(user.auth_level, pathname)

  if (!hasAccess) {
    return null
  }

  return <>{children}</>
}

