import type { Metadata } from "next"
import { Albert_Sans } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { DashboardLayout } from "./dashboard-layout"
import { ErrorHandler } from "@/components/ErrorHandler"
import { SessionManager } from "@/components/session-manager"

const albertSans = Albert_Sans({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-albert-sans",
})

export const metadata: Metadata = {
  title: {
    default: "Caterly",
    template: "%s | Caterly"
  },
  description: "Admin portal for Caterly management system",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
      // { url: "/assets/Group 171.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png" },
      // { url: "/assets/Group 171.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full overflow-x-hidden">
      <body className={`${albertSans.className} h-full overflow-x-hidden max-w-full`}>
        <ErrorHandler />
        <Providers>
          <SessionManager />
          <DashboardLayout>{children}</DashboardLayout>
        </Providers>
      </body>
    </html>
  )
}

