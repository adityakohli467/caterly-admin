"use client"

import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"

export function Header() {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const getRoleName = (authLevel: number) => {
    switch (authLevel) {
      case 1:
        return "Super Admin"
      case 2:
        return "Admin"
      case 3:
        return "Staff"
      default:
        return "User"
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Admin Portal</h2>
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{user.username}</span>
              <span className="text-gray-500">
                ({getRoleName(user.auth_level)})
              </span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

