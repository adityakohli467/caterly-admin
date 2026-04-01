import { create } from "zustand"
import { persist } from "zustand/middleware"
import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000"

interface User {
  user_id: number
  email: string
  username: string
  auth_level: number
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  refreshAccessToken: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        try {
          const response = await axios.post(`${API_URL}/admin/auth/login`, {
            username,
            password,
          })

          const resData = response.data
          const newToken = resData.token || resData.accessToken || resData.data?.token || resData.data?.accessToken
          const newRefreshToken = resData.refreshToken || resData.refresh_token || resData.data?.refreshToken || resData.data?.refresh_token

          if (!newToken) throw new Error("Invalid login response format")

          // Store in state and localStorage (including refresh token)
          set({
            user: resData.user || resData.data?.user || resData,
            token: newToken,
            refreshToken: newRefreshToken || null,
            isAuthenticated: true,
          })

          // Also set a cookie for middleware (30 days expiration for persistence)
          if (typeof document !== 'undefined') {
            document.cookie = `caterly-auth=${newToken}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
          }
        } catch (error: any) {
          const message = error.response?.data?.message || "Login failed"
          throw new Error(message)
        }
      },

      refreshAccessToken: async (): Promise<boolean> => {
        const { refreshToken } = get()
        if (!refreshToken) return false

        try {
          const response = await axios.post(`${API_URL}/admin/auth/refresh`, {
            refreshToken,
          })

          const resData = response.data
          const newToken = resData.token || resData.accessToken || resData.data?.token || resData.data?.accessToken
          const newRefreshToken = resData.refreshToken || resData.refresh_token || resData.data?.refreshToken || resData.data?.refresh_token

          if (!newToken) throw new Error("No token received")

          set({
            token: newToken,
            refreshToken: newRefreshToken || refreshToken, // keep old if not rotated
            isAuthenticated: true,
          })

          // Update the auth cookie
          if (typeof document !== 'undefined') {
            document.cookie = `caterly-auth=${newToken}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
          }

          return true
        } catch {
          // Refresh token is also expired/invalid — real logout needed
          return false
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        })

        // Clear the cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'caterly-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        }
      },

      checkAuth: async () => {
        const { token, refreshAccessToken } = get()

        if (!token) {
          set({ isAuthenticated: false })
          return
        }

        try {
          const response = await axios.get(`${API_URL}/admin/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 5000,
          })

          set({
            user: response.data.user,
            isAuthenticated: true,
          })
        } catch (error) {
          if (axios.isAxiosError(error)) {
            // Backend is down — keep session alive silently
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
              set({ isAuthenticated: true })
              return
            }

            // Access token expired — try to refresh it
            if (error.response?.status === 401) {
              const refreshed = await refreshAccessToken()
              if (refreshed) {
                // Refreshed successfully — re-fetch user info
                try {
                  const newToken = get().token
                  const meRes = await axios.get(`${API_URL}/admin/auth/me`, {
                    headers: { Authorization: `Bearer ${newToken}` },
                    timeout: 5000,
                  })
                  set({ user: meRes.data.user, isAuthenticated: true })
                } catch {
                  set({ isAuthenticated: true }) // keep alive even if /me fails after refresh
                }
                return
              }
              // Refresh also failed — session is truly expired, force logout
              set({
                user: null,
                token: null,
                refreshToken: null,
                isAuthenticated: false,
              })
              if (typeof window !== 'undefined') {
                localStorage.removeItem('caterly-auth')
                document.cookie = 'caterly-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
                if (window.location.pathname !== '/login') {
                  window.location.replace('/login')
                }
              }
              return
            }
          }

          // Unknown error — keep session alive rather than kicking user out
          set({ isAuthenticated: true })
        }
      },
    }),
    {
      name: "caterly-auth",
    }
  )
)

