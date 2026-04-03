"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore } from "@/store/auth"
import { canAccessRoute } from "@/lib/permissions"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { NavigationProgress } from "@/components/navigation-progress"

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, checkAuth } = useAuthStore()

  // Check if current route is a dashboard route (not login)
  // "/" is the dashboard home page, so it should have navbar/footer
  const isDashboardRoute = pathname !== "/login"

  useEffect(() => {
    if (!isDashboardRoute) {
      return // Don't check auth for login page
    }

    // Check auth in background without blocking the UI
    const verifyAuth = async () => {
      const storedAuth = localStorage.getItem('caterly-auth')
      
      if (!storedAuth) {
        // No auth data - redirect but don't block UI
        const redirectPath = pathname !== "/" && pathname !== "/login" ? pathname : ""
        router.push(`/login${redirectPath ? `?redirect=${redirectPath}` : ""}`)
        return
      }

      // Verify with backend in background
      try {
        await checkAuth()
        // If checkAuth failed and set isAuthenticated to false, let the effect re-run or handle here
        if (!useAuthStore.getState().isAuthenticated) {
          router.push('/login')
          return
        }

        const currentAuth = useAuthStore.getState()
        // Check if user has permission to access this route
        if (currentAuth.user) {
          const hasAccess = canAccessRoute(currentAuth.user.auth_level, pathname)
          if (!hasAccess) {
            router.push('/')
          }
        }
      } catch (error: any) {
        // If it's a real auth error (not network), we've already logout() in the store/api
        if (error?.code !== 'ERR_NETWORK' && error?.message !== 'Network Error') {
          if (!useAuthStore.getState().isAuthenticated) {
            router.push('/login')
          }
        }
      }
    }
    
    // Run auth check but don't wait for it
    verifyAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router, isDashboardRoute, isAuthenticated]) 

  // For login/home pages, just render children without navbar/footer
  if (!isDashboardRoute) {
    return <>{children}</>
  }

  // For dashboard routes, render with navbar and footer
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 overflow-x-hidden w-full max-w-full">
      <NavigationProgress />
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 lg:px-12 xl:px-[108px] py-4 sm:py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
        <div className="w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}


