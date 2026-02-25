"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Building2,
  FileText,
  Settings,
  UtensilsCrossed,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingBag },
  { name: "Products", href: "/admin/products", icon: UtensilsCrossed },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Quotes", href: "/quotes", icon: FileText },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-white border-r overflow-y-auto">
        <Link href="" className="flex items-center justify-center flex-shrink-0 px-4 mb-2">
          <span 
            className="text-2xl font-bold"
            style={{ 
              color: '#055160',
              fontFamily: "'Albert Sans', sans-serif",
              letterSpacing: '0.5px'
            }}
          >
            Caterly
          </span>
        </Link>
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 flex-shrink-0 h-5 w-5",
                      isActive ? "text-white" : "text-gray-500"
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}

