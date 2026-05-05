import axios from "axios"
import { useAuthStore } from "@/store/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000"

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Track whether we are currently refreshing to avoid infinite loops
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb)
}

const onTokenRefreshed = (newToken: string) => {
  refreshSubscribers.forEach((cb) => cb(newToken))
  refreshSubscribers = []
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const auth = localStorage.getItem("caterly-auth")
    if (auth) {
      try {
        const { state } = JSON.parse(auth)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      } catch (error) {
        console.error("Error parsing auth token:", error)
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle token expiration — attempt a silent refresh before giving up
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const storedRefreshToken = useAuthStore.getState().refreshToken

      if (!storedRefreshToken) {
        // Auto-logout user if no refresh token
        useAuthStore.getState().logout()
        return Promise.reject(new Error(error.response.data?.message || 'Session expired.'))
      }

      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            if (!newToken) {
              reject(new Error('Session expired. Please log in again.'))
            } else {
              if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`
              }
              resolve(api(originalRequest))
            }
          })
        })
      }

      isRefreshing = true

      try {
        const success = await useAuthStore.getState().refreshAccessToken()

        if (success) {
          const newToken = useAuthStore.getState().token as string
          onTokenRefreshed(newToken)
          isRefreshing = false

          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`
          }
          return api(originalRequest)
        } else {
          // Reject queued requests
          onTokenRefreshed('')
          isRefreshing = false
          // Auto-logout user on failure
          useAuthStore.getState().logout()
          return Promise.reject(new Error('Session expired. Please log in again.'))
        }
      } catch (refreshError) {
        onTokenRefreshed('')
        isRefreshing = false
        // Auto-logout user on total failure
        useAuthStore.getState().logout()
        return Promise.reject(new Error('Session expired. Please log in again.'))
      }
    }

    // Enhanced error handling
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message || error.message

      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ API Error [${status}]:`, {
          url: error.config?.url,
          method: error.config?.method,
          message,
        })
      }

      const userMessage = message || `Request failed with status ${status}`
      return Promise.reject(new Error(userMessage))
    } else if (error.request) {
      return Promise.reject(new Error('Network error. Please check your connection and try again.'))
    } else {
      return Promise.reject(new Error(error.message || 'An unexpected error occurred. Please try again.'))
    }
  }
)

export default api

// API functions
export const authAPI = {
  login: (username: string, password: string) =>
    api.post("/admin/auth/login", { username, password }),
  me: () => api.get("/admin/auth/me"),
}

export const productsAPI = {
  list: (params?: any) => api.get("/admin/products", { params }),
  get: (id: number) => api.get(`/admin/products/${id}`),
  create: (data: any) => api.post("/admin/products", data),
  update: (id: number, data: any) => api.put(`/admin/products/${id}`, data),
  delete: (id: number) => api.delete(`/admin/products/${id}`),
}

export const ordersAPI = {
  list: (params?: any) => api.get("/admin/orders", { params }),
  listWholesale: (params?: any) => api.get("/admin/orders/wholesale", { params }),
  get: (id: number) => api.get(`/admin/orders/${id}`),
  create: (data: any) => api.post("/admin/orders", data),
  update: (id: number, data: any) => api.put(`/admin/orders/${id}`, data),
  updateStatus: (id: number, status: number) =>
    api.put(`/admin/orders/${id}/status`, { order_status: status }),
  delete: (id: number) => api.delete(`/admin/orders/${id}`),
  stats: () => api.get("/admin/orders/stats"),
  sendEmail: (id: number, data?: { email_type?: string; custom_message?: string }) =>
    api.post(`/admin/orders/${id}/send-email`, data || {}),
}

export const customersAPI = {
  list: (params?: any) => api.get("/admin/customers", { params }),
  listWholesale: (params?: any) => api.get("/admin/customers/wholesale", { params }),
  listPendingApproval: (params?: any) => api.get("/admin/customers/pending-approval", { params }),
  get: (id: number) => api.get(`/admin/customers/${id}`),
  create: (data: any) => api.post("/admin/customers", data),
  update: (id: number, data: any) => api.put(`/admin/customers/${id}`, data),
  archive: (id: number) => api.post(`/admin/customers/${id}/archive`),
  restore: (id: number) => api.post(`/admin/customers/${id}/restore`),
  delete: (id: number) => api.delete(`/admin/customers/${id}`),
  approve: (id: number) => api.post(`/admin/customers/${id}/approve`),
  reject: (id: number) => api.post(`/admin/customers/${id}/reject`),
  getProductOptionDiscounts: (id: number) => api.get(`/admin/customers/${id}/product-option-discounts`),
  setProductOptionDiscounts: (id: number, discounts: any[]) => api.post(`/admin/customers/${id}/product-option-discounts`, { discounts }),
}

export const locationsAPI = {
  list: (params?: any) => api.get("/admin/locations", { params }),
  get: (id: number) => api.get(`/admin/locations/${id}`),
}

export const couponsAPI = {
  validate: (code: string) => api.post("/admin/coupons/validate", { code }),
  list: (params?: any) => api.get("/admin/coupons", { params }),
  get: (id: number) => api.get(`/admin/coupons/${id}`),
  create: (data: any) => api.post("/admin/coupons", data),
  update: (id: number, data: any) => api.put(`/admin/coupons/${id}`, data),
  delete: (id: number) => api.delete(`/admin/coupons/${id}`),
}

export const contactInquiriesAPI = {
  list: (params?: any) => api.get("/admin/contact-inquiries", { params }),
  get: (id: number) => api.get(`/admin/contact-inquiries/${id}`),
  update: (id: number, data: any) => api.put(`/admin/contact-inquiries/${id}`, data),
  delete: (id: number) => api.delete(`/admin/contact-inquiries/${id}`),
}

export const wholesaleEnquiriesAPI = {
  list: (params?: any) => api.get("/admin/wholesale-enquiries", { params }),
  get: (id: number) => api.get(`/admin/wholesale-enquiries/${id}`),
  update: (id: number, data: any) => api.put(`/admin/wholesale-enquiries/${id}`, data),
  delete: (id: number) => api.delete(`/admin/wholesale-enquiries/${id}`),
}

export const companiesAPI = {
  list: (params?: any) => api.get("/admin/companies", { params }),
  get: (id: number) => api.get(`/admin/companies/${id}`),
  create: (data: any) => api.post("/admin/companies", data),
  update: (id: number, data: any) => api.put(`/admin/companies/${id}`, data),
  delete: (id: number) => api.delete(`/admin/companies/${id}`),
  getDepartments: (companyId?: number) =>
    api.get("/admin/companies/departments/list", { params: { company_id: companyId } }),
  createDepartment: (data: any) => api.post("/admin/companies/departments", data),
  updateDepartment: (id: number, data: any) => api.put(`/admin/companies/departments/${id}`, data),
  deleteDepartment: (id: number) => api.delete(`/admin/companies/departments/${id}`),
}

export const invoicesAPI = {
  generate: (orderId: number) => api.post("/admin/invoices/generate", { order_id: orderId }),
  get: (orderId: number) => api.get(`/admin/invoices/${orderId}`),
  download: (orderId: number) => api.get(`/admin/invoices/${orderId}/download`, { responseType: 'blob' }),
  send: (orderId: number, customMessage?: string) => api.post(`/admin/invoices/${orderId}/send`, { custom_message: customMessage }),
}

export const paymentsAPI = {
  // Stripe Payment Intent
  createIntent: (orderId: number, email?: string) =>
    api.post("/admin/payments/create-intent", { order_id: orderId, email }),
  // Stripe Refund
  stripeRefund: (paymentIntentId: string, amount?: number, reason?: string) =>
    api.post("/admin/payments/stripe-refund", { payment_intent_id: paymentIntentId, amount, reason }),
  // Legacy refund
  processRefund: (orderId: number, amount?: number) =>
    api.post("/admin/payments/refund", { order_id: orderId, amount }),
  // Send payment link
  sendPaymentLink: (orderId: number, email?: string) =>
    api.post(`/admin/orders/${orderId}/send-payment-link`, { email_payment: email }),
  // Status & History
  getStatus: (orderId: number) =>
    api.get(`/admin/payments/order/${orderId}`),
  getHistory: (params?: {
    order_id?: number;
    customer_id?: number;
    payment_status?: string;
    payment_gateway?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number
  }) =>
    api.get("/admin/payments/history", { params }),
  getOrderHistory: (orderId: number) =>
    api.get(`/admin/payments/history/${orderId}`),
  getAuditLog: (transactionId: string) =>
    api.get(`/admin/payments/audit/${transactionId}`),
  getStatistics: (params?: { date_from?: string; date_to?: string }) =>
    api.get("/admin/payments/statistics", { params }),
}

export const historyAPI = {
  list: (params?: any) => api.get("/admin/history", { params }),
  get: (id: number) => api.get(`/admin/history/${id}`),
  statistics: (params?: any) => api.get("/admin/history/statistics", { params }),
  eventTypes: () => api.get("/admin/history/event-types"),
  eventCategories: () => api.get("/admin/history/event-categories"),
  resourceTypes: () => api.get("/admin/history/resource-types"),
}

export const settingsAPI = {
  get: (category?: string) => api.get("/admin/settings", { params: category ? { category } : {} }),
  update: (settings: Record<string, any>) => api.put("/admin/settings", settings),
  getSystemHealth: () => api.get("/admin/settings/system/health"),
}

export const notificationsAPI = {
  list: (params?: any) => api.get("/admin/notifications", { params }),
  getUnreadCount: () => api.get("/admin/notifications/unread-count"),
  markAsRead: (id: number) => api.put(`/admin/notifications/${id}/read`),
  markAllAsRead: () => api.put("/admin/notifications/mark-all-read"),
}

export const quotationsAPI = {
  list: (params?: any) => api.get("/admin/quotation-inquiries", { params }),
  get: (id: number) => api.get(`/admin/quotation-inquiries/${id}`),
  updateStatus: (id: number, status: string) => api.patch(`/admin/quotation-inquiries/${id}/status`, { status }),
  delete: (id: number) => api.delete(`/admin/quotation-inquiries/${id}`),
}

export const subscriptionsAPI = {
  list: (params?: any) => api.get("/admin/subscriptions", { params }),
  get: (id: number) => api.get(`/admin/subscriptions/${id}`),
  cancel: (id: number, comment?: string) => api.post(`/admin/subscriptions/${id}/cancel`, { cancel_comment: comment }),
  activate: (id: number) => api.post(`/admin/subscriptions/${id}/activate`),
  delete: (id: number) => api.delete(`/admin/subscriptions/${id}`),
}

export const newsletterAPI = {
  list: (params?: any) => api.get("/admin/newsletter", { params }),
  stats: () => api.get("/admin/newsletter/stats"),
  unsubscribe: (id: number) => api.put(`/admin/newsletter/${id}/unsubscribe`),
  delete: (id: number) => api.delete(`/admin/newsletter/${id}`),
}

