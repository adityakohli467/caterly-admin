"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Toaster } from "sonner"
import { useAppearanceSettings } from "@/hooks/use-appearance-settings"

function AppearanceProvider({ children }: { children: React.ReactNode }) {
  useAppearanceSettings()
  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AppearanceProvider>
        {children}
        <Toaster position="top-right" richColors />
      </AppearanceProvider>
    </QueryClientProvider>
  )
}

