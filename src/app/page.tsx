"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import api, { quotationsAPI } from "@/lib/api"
import {
  ShoppingBag,
  Users,
  Building2,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Package,
  MessageSquare,
  DollarSign,
  UserCheck,
  Calendar,
  Eye,
  ClipboardList,
  Plus,
  Printer,
  ArrowRight,
  ChefHat,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth"
import { toast } from "sonner"
import { OrderDetailModal } from "@/components/OrderDetailModal"
import { ChefViewModal } from "@/components/ChefViewModal"
import { getAUNow, getAUDateToday, getAUDateTomorrow, getAUCurrentHour, formatTimeInAU, formatDateOnly } from "@/lib/utils"

interface DashboardStats {
  totalOrders: number
  newOrders: number
  pendingApproval: number
  approved: number
  completed: number
  todayOrders: number
  totalRevenue: number
  deliveriesToday: number
  deliveriesNext7Days: number
  unapprovedQuotes: number
  unapprovedCustomers: number
  futureOrders: number
  productionOrders: number
  feedbackPending: number
}

interface Order {
  order_id: number
  customer_order_name?: string
  customer_order_telephone?: string
  order_total: string
  order_status: number
  date_added: string
  delivery_date_time: string
  is_catering_checklist_added: number
  is_completed: number
  is_delivered?: number
  order_made_from?: string
  // Direct fields for guest/manual orders
  telephone?: string
  phone?: string
  firstname?: string
  lastname?: string
  customer_telephone?: string
  shipping_telephone?: string
  delivery_contact?: string
  customer?: {
    firstname?: string
    lastname?: string
    email?: string
    telephone?: string
  }
}

interface RecentOrder extends Order { }

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [todayOrders, setTodayOrders] = useState<Order[]>([])
  const [tomorrowOrders, setTomorrowOrders] = useState<Order[]>([])
  const [next7DaysOrders, setNext7DaysOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [previousStats, setPreviousStats] = useState<DashboardStats | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [selectedChefViewOrderId, setSelectedChefViewOrderId] = useState<number | null>(null)
  const [isChefViewModalOpen, setIsChefViewModalOpen] = useState(false)
  const { user, token } = useAuthStore()

  // Set page title
  useEffect(() => {
    document.title = "Caterly"
  }, [])

  useEffect(() => {
    // Don't fetch on the login page
    if (typeof window !== "undefined" && window.location.pathname === "/login") {
      setLoading(false)
      return
    }

    // Wait until the auth token is available (Zustand hydrates from localStorage asynchronously)
    if (!token) {
      // Check localStorage directly as a fallback for the first render tick
      const storedAuth = localStorage.getItem('caterly-auth')
      if (!storedAuth) {
        setLoading(false)
        return
      }
      // Token not in Zustand yet but it's in localStorage — wait for hydration
      return
    }

    fetchDashboardData()

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      if (useAuthStore.getState().token) {
        fetchDashboardData()
      } else {
        clearInterval(interval)
      }
    }, 30000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]) // Re-run when token changes (covers hydration from localStorage)

  const fetchDashboardData = async () => {
    // Check auth before fetching
    const storedAuth = localStorage.getItem('caterly-auth')
    if (!storedAuth) {
      setLoading(false)
      return
    }

    try {
      const response = await api.get("/admin/orders/stats")

      const newStats = response.data.stats

      // Fetch live unreplied quotes to accurately portray on dashboard
      try {
        const quotesRes = await quotationsAPI.list({ limit: 500 })
        const quotesList = quotesRes.data?.inquiries || quotesRes.data?.quotations || quotesRes.data?.data || []
        const unrepliedQuotesCount = quotesList.filter((q: any) => q.status !== 'replied').length
        newStats.unapprovedQuotes = unrepliedQuotesCount
      } catch (err) {
        // silently fallback so dashboard doesn't crash if quotes API drops
      }

      // Store previous stats for comparison (only on first load)
      if (!previousStats && stats) {
        setPreviousStats(stats)
      }

      // Guard: totalRevenue should never decrease — delivered orders still count as revenue.
      // Persist the highest-ever revenue in localStorage so it survives page refreshes.
      const storedMaxRevenue = parseFloat(localStorage.getItem('caterly-max-revenue') || '0')
      const bestRevenue = Math.max(newStats.totalRevenue, storedMaxRevenue, stats?.totalRevenue ?? 0)
      if (bestRevenue > newStats.totalRevenue) {
        newStats.totalRevenue = bestRevenue
      }
      localStorage.setItem('caterly-max-revenue', String(bestRevenue))

      setStats(newStats)
      setRecentOrders(response.data.recentOrders || [])
      setTodayOrders(response.data.todayOrders || [])
      setTomorrowOrders(response.data.tomorrowOrders || [])
      setNext7DaysOrders(response.data.next7DaysOrders || [])
    } catch (error: any) {
      // Handle network errors (backend down) silently
      if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
        // Backend is down - show empty state but don't spam console
        setStats({
          totalOrders: 0,
          newOrders: 0,
          pendingApproval: 0,
          approved: 0,
          completed: 0,
          todayOrders: 0,
          totalRevenue: 0,
          deliveriesToday: 0,
          deliveriesNext7Days: 0,
          unapprovedQuotes: 0,
          unapprovedCustomers: 0,
          futureOrders: 0,
          productionOrders: 0,
          feedbackPending: 0,
        })
        setRecentOrders([])
        setTodayOrders([])
        setTomorrowOrders([])
        setNext7DaysOrders([])
        return
      }

      // Handle 401 auth errors — don't force-logout and don't wipe data to 0s as per user requirement.
      // We purposefully leave the existing variables intact to preserve the UI.
      if (error?.response?.status === 401 || error?.message?.includes('Session expired')) {
        return
      }

      // Log other errors
      console.error("Failed to fetch dashboard data:", error)

      // Set default empty data for other errors so page still renders
      setStats({
        totalOrders: 0,
        newOrders: 0,
        pendingApproval: 0,
        approved: 0,
        completed: 0,
        todayOrders: 0,
        totalRevenue: 0,
        deliveriesToday: 0,
        deliveriesNext7Days: 0,
        unapprovedQuotes: 0,
        unapprovedCustomers: 0,
        futureOrders: 0,
        productionOrders: 0,
        feedbackPending: 0,
      })
      setRecentOrders([])
      setTodayOrders([])
      setTomorrowOrders([])
      setNext7DaysOrders([])
    } finally {
      setLoading(false)
    }
  }

  const calculateChange = (current: number, previous: number | null): { value: number; isPositive: boolean } => {
    if (!previous || previous === 0) return { value: 0, isPositive: true }
    const change = current - previous
    return {
      value: Math.abs(change),
      isPositive: change >= 0
    }
  }

  const handlePrint = (orders: Order[], title: string) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const today = formatDateOnly(new Date())
    const tomorrow = formatDateOnly(new Date(Date.now() + 86400000))

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #212529; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: 600; }
            tr:nth-child(even) { background-color: #f8f9fa; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Date: ${title.includes('Today') ? today : tomorrow}</p>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Customer Phone</th>
                <th>Delivery Time</th>
                <th>Order Status</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(order => `
                <tr>
                  <td>#${order.order_id}</td>
                  <td>${order.customer_order_name || `${order.customer?.firstname || ''} ${order.customer?.lastname || ''}`.trim() || 'N/A'}</td>
                  <td>${order.customer?.telephone || 'N/A'}</td>
                  <td>${order.delivery_date_time ? formatTimeInAU(order.delivery_date_time) : 'N/A'}</td>
                  <td>${order.is_completed === 1 ? 'Completed' : getStatusText(order.order_status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }

  const handleMarkComplete = async (orderId: number) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { order_status: 5 })
      toast.success("Order marked as complete!")
      fetchDashboardData()
    } catch (error: any) {
      console.error("Failed to mark order as complete:", error)
      toast.error(error?.message || "Failed to mark order as complete")
    }
  }

  const handleMarkDelivered = async (orderId: number) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { order_status: 6 })
      toast.success("Order marked as delivered!")
      fetchDashboardData()
    } catch (error: any) {
      console.error("Failed to mark order as delivered:", error)
      toast.error(error?.message || "Failed to mark order as delivered")
    }
  }

  const handleViewOrder = (orderId: number) => {
    setSelectedOrderId(orderId)
    setIsOrderModalOpen(true)
  }

  const handleOrderModalClose = () => {
    setIsOrderModalOpen(false)
    setSelectedOrderId(null)
  }

  const handleChefView = (orderId: number) => {
    setSelectedChefViewOrderId(orderId)
    setIsChefViewModalOpen(true)
  }

  const handleChefViewModalClose = () => {
    setIsChefViewModalOpen(false)
    setSelectedChefViewOrderId(null)
  }

  const handleOrderUpdated = () => {
    fetchDashboardData()
  }

  const getCateringChecklistColor = (status: number) => {
    switch (status) {
      case 1: return "bg-[#FFEBEE] hover:bg-red-600"
      case 2: return "bg-orange-500 hover:bg-orange-600"
      case 3: return "bg-pink-500 hover:bg-pink-600"
      case 4: return "bg-green-500 hover:bg-green-600"
      default: return "bg-yellow-500 hover:bg-yellow-600"
    }
  }

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return "text-[#C62828]"
      case 2: return "text-green-600"
      case 4: return "text-yellow-600"
      case 7: return "text-green-700"
      case 0: return "text-[#C62828]"
      default: return "text-gray-600"
    }
  }

  const getStatusText = (status: number, isCompleted?: number) => {
    if (isCompleted === 1) return "Completed"
    switch (status) {
      case 0: return "Cancelled"
      case 1: return "New"
      case 2: return "Paid"
      case 3: return "Shipped"
      case 4: return "Awaiting Approval"
      case 5: return "Completed"
      case 7: return "Approved"
      case 8: return "Rejected"
      case 9: return "Modified"
      default: return "Unknown"
    }
  }

  const getStatusBadge = (order: Order) => {
    const baseStyle = {
      fontFamily: 'Albert Sans',
      fontWeight: 600,
      fontStyle: 'normal',
      fontSize: '14px',
      lineHeight: '20px',
      letterSpacing: '0%',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      paddingTop: '2px',
      paddingBottom: '2px',
      paddingLeft: '8px',
      paddingRight: '8px',
      borderRadius: '50px',
      height: '24px',
      whiteSpace: 'nowrap' as const,
    }

    if (order.is_delivered === 1 || order.order_status === 6) {
      return (
        <span
          style={{
            ...baseStyle,
            backgroundColor: '#f9fafb',
            color: '#374151',
          }}
        >
          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
          Delivered
        </span>
      )
    }

    if (order.is_completed === 1 || order.order_status === 5) {
      return (
        <span
          style={{
            ...baseStyle,
            backgroundColor: '#f0fdf4',
            color: '#15803d',
          }}
        >
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          Completed
        </span>
      )
    }

    switch (order.order_status) {
      case 0:
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#FFEBEE',
              color: '#C62828',
            }}
          >
            <div className="w-1.5 h-1.5 bg-[#FFEBEE] rounded-full"></div>
            {getStatusText(order.order_status)}
          </span>
        )
      case 1:
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#fff7ed',
              color: '#ea580c',
            }}
          >
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
            In Progress
          </span>
        )
      case 2:
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#f0fdf4',
              color: '#15803d',
            }}
          >
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            {getStatusText(order.order_status)}
          </span>
        )
      case 4:
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#fefce8',
              color: '#ca8a04',
            }}
          >
            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
            {getStatusText(order.order_status)}
          </span>
        )
      case 7:
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#FFEBEE',
              color: '#C62828',
            }}
          >
            <div className="w-1.5 h-1.5 bg-[#C62828] rounded-full"></div>
            {getStatusText(order.order_status)}
          </span>
        )
      case 8:
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#FFEBEE',
              color: '#C62828',
            }}
          >
            <div className="w-1.5 h-1.5 bg-[#FFEBEE] rounded-full"></div>
            {getStatusText(order.order_status)}
          </span>
        )
      case 9:
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#FFEBEE',
              color: '#C62828',
            }}
          >
            <div className="w-1.5 h-1.5 bg-[#C62828] rounded-full"></div>
            Modified
          </span>
        )
      default:
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#f9fafb',
              color: '#374151',
            }}
          >
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
            {getStatusText(order.order_status)}
          </span>
        )
    }
  }

  // Don't block the UI with loading screen
  // Show the layout immediately and load data in background

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = getAUCurrentHour()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }

  return (
    <div className="space-y-4 md:space-y-8 bg-gray-50 w-full max-w-full overflow-x-hidden">
      {/* Header with Greeting and New Order Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1
          className="text-2xl sm:text-3xl lg:text-4xl"
          style={{
            fontFamily: 'Albert Sans',
            fontWeight: 600,
            lineHeight: '1.2',
            letterSpacing: '0%'
          }}
        >
          {getGreeting()}, <span className="text-[#C62828]">{user?.username || 'User'}!</span>
        </h1>
        <Link href="/orders/new" className="w-full sm:w-auto">
          <Button
            className="bg-[#C62828] hover:bg-[#B71C1C] text-white gap-2 sm:gap-3 w-full sm:w-auto"
            style={{
              minWidth: '140px',
              maxWidth: '100%',
              height: '45px',
              paddingTop: '8px',
              paddingRight: '16px',
              paddingBottom: '8px',
              paddingLeft: '16px',
              borderRadius: '67px',
              fontFamily: 'Albert Sans',
              fontWeight: 600
            }}
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Place New Order</span>
          </Button>
        </Link>
      </div>

      {/* Stats Grid - Modern Clean Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Today's Deliveries */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <p style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-xs sm:text-sm text-gray-600">
                Today's Deliveries
              </p>
              {stats && (
                <span style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className={`text-xs px-2 py-1 rounded-full ${stats.deliveriesToday > 0 ? 'bg-[#FFEBEE] text-[#C62828]' : 'bg-gray-50 text-gray-600'}`}>
                  {stats.deliveriesToday > 0 ? `${stats.deliveriesToday}` : '0'}
                </span>
              )}
            </div>
            <h2 style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-3xl sm:text-4xl text-gray-900">
              {stats?.deliveriesToday || 0}
            </h2>
          </CardContent>
        </Card>

        {/* Today's Orders */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <p style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-xs sm:text-sm text-gray-600">
                Today's Orders
              </p>
              {stats && (
                <span style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className={`text-xs px-2 py-1 rounded-full ${stats.todayOrders > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'}`}>
                  {stats.todayOrders > 0 ? `+${stats.todayOrders}` : '0'}
                </span>
              )}
            </div>
            <h2 style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-3xl sm:text-4xl text-gray-900">
              {stats?.todayOrders || 0}
            </h2>
          </CardContent>
        </Card>

        {/* Tomorrow's Deliveries */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <p style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-xs sm:text-sm text-gray-600">
                Tomorrow's Deliveries
              </p>
              {tomorrowOrders.length > 0 && (
                <span style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-full">
                  {tomorrowOrders.length}
                </span>
              )}
            </div>
            <h2 style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-3xl sm:text-4xl text-gray-900">
              {tomorrowOrders.length || 0}
            </h2>
          </CardContent>
        </Card>

        {/* Requested Quotes */}
        <Card className={`bg-white border shadow-sm hover:shadow-md transition-shadow ${stats && stats.unapprovedQuotes > 0 ? 'border-[#E03A3E]/30 bg-[#E03A3E]/5' : 'border-gray-200'}`}>
          <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <p style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className={`text-xs sm:text-sm ${stats && stats.unapprovedQuotes > 0 ? 'text-[#E03A3E]' : 'text-gray-600'}`}>
                Requested Quotes
              </p>
              {stats && stats.unapprovedQuotes > 0 && (
                <span style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-xs px-2 py-1 bg-[#E03A3E] text-white rounded-full shadow-sm">
                  {stats.unapprovedQuotes} New
                </span>
              )}
            </div>
            <h2 style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className={`text-3xl sm:text-4xl ${stats && stats.unapprovedQuotes > 0 ? 'text-[#E03A3E]' : 'text-gray-900'}`}>
              {stats?.unapprovedQuotes || 0}
            </h2>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <p style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-xs sm:text-sm text-gray-600">
                Total Revenue
              </p>
              {stats && stats.totalRevenue > 0 && (
                <span style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-full">
                  Active
                </span>
              )}
            </div>
            <h2 style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-3xl sm:text-4xl text-gray-900">
              ${stats?.totalRevenue ? stats.totalRevenue.toFixed(2) : '0.00'}
            </h2>
          </CardContent>
        </Card>
      </div>


      {/* Today's Deliveries Table */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-white p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
              <CardTitle style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-lg sm:text-xl text-[#C62828]">
                Todays Deliveries
              </CardTitle>
              <p style={{ fontFamily: 'Albert Sans' }} className="text-xs sm:text-sm text-gray-500">
                {formatDateOnly(new Date())}
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2 text-xs sm:text-sm"
              size="sm"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              onClick={() => handlePrint(todayOrders, "Today's Deliveries")}
              disabled={todayOrders.length === 0}
            >
              <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[800px] sm:min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Order ID</th>
                  <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Customer Name</th>
                  <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="hidden md:table-cell text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Customer Phone</th>
                  <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Delivery Time</th>
                  <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="hidden sm:table-cell text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Order Status</th>
                  <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      {Array.from({ length: 6 }).map((_, colIdx) => (
                        <td key={colIdx} className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : todayOrders && todayOrders.length > 0 ? (
                  [...todayOrders].sort((a, b) => b.order_id - a.order_id)
                  .map((order, index) => (
                    <tr key={order.order_id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span 
                          onClick={() => handleViewOrder(order.order_id)}
                          style={{ fontFamily: 'Albert Sans' }} 
                          className="text-xs sm:text-sm font-medium text-[#C62828] cursor-pointer hover:underline"
                        >
                          #{order.order_id}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span style={{ fontFamily: 'Albert Sans' }} className="text-xs sm:text-sm text-gray-900">
                          {order.customer_order_name ||
                            `${order.customer?.firstname || order.firstname || ''} ${order.customer?.lastname || order.lastname || ''}`.trim() ||
                            'N/A'}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4">
                        <span style={{ fontFamily: 'Albert Sans' }} className="text-xs sm:text-sm text-gray-600">
                          {order.customer_order_telephone ||
                            order.customer?.telephone ||
                            order.telephone ||
                            order.customer_telephone ||
                            order.shipping_telephone ||
                            order.phone ||
                            (order.delivery_contact ? order.delivery_contact.split('|')[1] || order.delivery_contact.split('|')[0] : null) ||
                            'N/A'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span style={{ fontFamily: 'Albert Sans' }} className="text-xs sm:text-sm text-gray-900">
                          {order.delivery_date_time
                            ? formatTimeInAU(order.delivery_date_time)
                            : '00:00'}
                        </span>
                      </td>

                      <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4">
                        {getStatusBadge(order)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 flex-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChefView(order.order_id)}
                            style={{
                              fontFamily: 'Albert Sans',
                              fontWeight: 600,
                              fontSize: '13px',
                              lineHeight: '20px',
                            }}
                            className="h-8 px-3 text-xs border border-orange-300 text-orange-700 hover:bg-orange-50 whitespace-nowrap"
                          >
                            <ChefHat className="h-3.5 w-3.5 mr-1" />
                            Chef View
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleMarkComplete(order.order_id)}
                            disabled={order.is_completed === 1 || order.order_status === 5 || order.order_status === 6}
                            style={{
                              fontFamily: 'Albert Sans',
                              fontWeight: 600,
                              fontSize: '13px',
                              lineHeight: '20px',
                            }}
                            className={`h-8 px-3 text-xs text-white whitespace-nowrap shrink-0 ${
                              order.is_completed === 1 || order.order_status === 5 || order.order_status === 6
                                ? 'bg-green-600/50 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            {order.is_completed === 1 || order.order_status === 5 || order.order_status === 6 ? 'Completed' : 'Complete'}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleMarkDelivered(order.order_id)}
                            disabled={order.is_delivered === 1 || order.order_status === 6}
                            style={{
                              fontFamily: 'Albert Sans',
                              fontWeight: 600,
                              fontSize: '13px',
                              lineHeight: '20px',
                            }}
                            className={`h-8 px-3 text-xs text-white whitespace-nowrap shrink-0 ${
                              order.is_delivered === 1 || order.order_status === 6
                                ? 'bg-blue-600/50 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            <Truck className="h-3.5 w-3.5 mr-1" />
                            {order.is_delivered === 1 || order.order_status === 6 ? 'Delivered' : 'Deliver'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-12 text-center text-gray-500">
                      <span style={{ fontFamily: 'Albert Sans' }}>No orders for today</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tomorrow's Deliveries Table */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-white p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
              <CardTitle style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-lg sm:text-xl text-[#C62828]">
                Tomorrow's Deliveries
              </CardTitle>
              <p style={{ fontFamily: 'Albert Sans' }} className="text-xs sm:text-sm text-gray-500">
                {getAUDateTomorrow().split('-').reverse().join('/')}
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2 text-xs sm:text-sm"
              size="sm"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              onClick={() => handlePrint(tomorrowOrders, "Tomorrow's Deliveries")}
              disabled={tomorrowOrders.length === 0}
            >
              <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[800px] sm:min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Order ID</th>
                  <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Customer Name</th>
                  <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Customer Phone</th>
                  <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Delivery Time</th>
                   <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Order Total</th>
                   <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Order Status</th>
                  <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      {Array.from({ length: 6 }).map((_, colIdx) => (
                        <td key={colIdx} className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : tomorrowOrders && tomorrowOrders.length > 0 ? (
                  [...tomorrowOrders].sort((a, b) => b.order_id - a.order_id)
                  .map((order, index) => (
                    <tr key={order.order_id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span 
                          onClick={() => handleViewOrder(order.order_id)}
                          style={{ fontFamily: 'Albert Sans' }} 
                          className="text-xs sm:text-sm font-medium text-[#C62828] cursor-pointer hover:underline"
                        >
                          #{order.order_id}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span style={{ fontFamily: 'Albert Sans' }} className="text-xs sm:text-sm text-gray-900">
                          {order.customer_order_name ||
                            `${order.customer?.firstname || order.firstname || ''} ${order.customer?.lastname || order.lastname || ''}`.trim() ||
                            'N/A'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span style={{ fontFamily: 'Albert Sans' }} className="text-xs sm:text-sm text-gray-600">
                          {order.customer_order_telephone ||
                            order.customer?.telephone ||
                            order.telephone ||
                            order.customer_telephone ||
                            order.shipping_telephone ||
                            order.phone ||
                            (order.delivery_contact ? order.delivery_contact.split('|')[1] || order.delivery_contact.split('|')[0] : null) ||
                            'N/A'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span style={{ fontFamily: 'Albert Sans' }} className="text-xs sm:text-sm text-gray-900">
                          {order.delivery_date_time
                            ? formatTimeInAU(order.delivery_date_time)
                            : '00:00'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        {getStatusBadge(order)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 flex-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChefView(order.order_id)}
                            style={{
                              fontFamily: 'Albert Sans',
                              fontWeight: 600,
                              fontSize: '13px',
                              lineHeight: '20px',
                            }}
                            className="h-8 px-3 text-xs border border-orange-300 text-orange-700 hover:bg-orange-50 whitespace-nowrap"
                          >
                            <ChefHat className="h-3.5 w-3.5 mr-1" />
                            Chef View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-12 text-center text-gray-500">
                      <span style={{ fontFamily: 'Albert Sans' }}>No orders for tomorrow</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        open={isOrderModalOpen}
        onOpenChange={handleOrderModalClose}
        onOrderUpdated={handleOrderUpdated}
      />

      {/* Chef View Modal */}
      <ChefViewModal
        orderId={selectedChefViewOrderId}
        open={isChefViewModalOpen}
        onOpenChange={handleChefViewModalClose}
      />

    </div>
  )
}
