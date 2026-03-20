"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Calendar, Filter, Printer, Plus, Eye, Edit, FileText, Mail, RotateCcw, Trash2, DollarSign, ArrowUpDown, MoreVertical, Image as ImageIcon, Upload, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { invoicesAPI, ordersAPI } from "@/lib/api"
import { OrderDetailModal } from "@/components/OrderDetailModal"
import { PaymentProcessingModal } from "@/components/PaymentProcessingModal"
import { printTableData } from "@/lib/print-utils"

interface Order {
  order_id: number
  customer_name: string
  customer_firstname: string
  customer_lastname: string
  email: string
  telephone: string
  company: string
  company_name?: string
  department: string
  department_name?: string
  location_name: string
  location_id: number
  delivery_date: string | null
  delivery_time: string | null
  order_total: number
  gst?: number
  delivery_fee?: number
  subtotal?: number
  order_status: number
  standing_order: number
  customer_type?: string
  user_id?: number | null
}

interface Location {
  location_id: number
  location_name: string
}

// Order status mapping
const orderStatusMap: Record<number, { label: string; color: string; bgColor: string; borderColor: string }> = {
  0: { label: "Cancelled", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-300" },
  1: { label: "New", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-300" },
  2: { label: "Paid", color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-300" },
  3: { label: "Paid", color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-300" },
  4: { label: "Awaiting Approval", color: "text-yellow-700", bgColor: "bg-yellow-50", borderColor: "border-yellow-300" },
  5: { label: "Processing", color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-300" },
  6: { label: "Delivered", color: "text-teal-700", bgColor: "bg-teal-50", borderColor: "border-teal-300" },
  7: { label: "Approved", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-300" },
  8: { label: "Rejected", color: "text-red-800", bgColor: "bg-red-100", borderColor: "border-red-400" },
}

const orderTabs = [
  { key: "future", label: "Future Orders" },
  { key: "past", label: "Past Orders" },
  { key: "reminder", label: "Reminder Orders" },
  { key: "wholesale", label: "Wholesale Orders", hidden: true },
].filter(tab => !tab.hidden)

// Get current time in Australia/Sydney timezone as a comparable string
const getNowAustralia = () => {
  // Get the current date/time in Australia/Sydney
  const nowUtc = new Date()
  // Australia/Sydney offset: AEDT = UTC+11, AEST = UTC+10
  // Use Intl to get current offset
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  })
  const parts = formatter.formatToParts(nowUtc)
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0'
  return new Date(
    parseInt(get('year')), parseInt(get('month')) - 1, parseInt(get('day')),
    parseInt(get('hour')), parseInt(get('minute')), parseInt(get('second'))
  )
}

export default function OrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTab, setSelectedTab] = useState(() => {
    const tab = searchParams?.get('tab')
    return tab || "future"
  })
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null)
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [amountFilter, setAmountFilter] = useState("")
  const [showPaidOnly, setShowPaidOnly] = useState(false)
  const [lateFeeAmount, setLateFeeAmount] = useState("")

  // UI state
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentOrderId, setPaymentOrderId] = useState<number | null>(null)
  const [showImageUploadModal, setShowImageUploadModal] = useState(false)
  const [imageUploadOrderId, setImageUploadOrderId] = useState<number | null>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const limit = 20

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.get('/admin/locations?limit=100')
      return response.data
    }
  })

  const locations: Location[] = locationsData?.locations || []

  // Handle URL params and refresh orders when coming from order creation/update
  useEffect(() => {
    const tab = searchParams?.get('tab')
    const refresh = searchParams?.get('refresh')
    const success = searchParams?.get('success')

    if (tab && tab !== selectedTab) {
      setSelectedTab(tab)
      setPage(1)
    }

    // Force-refetch when arriving from order create/update (refresh or success param)
    if (refresh || success === 'true') {
      queryClient.invalidateQueries({ queryKey: ['orders'], exact: false, refetchType: 'all' })
    }
  }, [searchParams, queryClient])

  // Build query params
  const buildQueryParams = () => {
    const params: Record<string, any> = {
      limit: 9999, // show all orders, no pagination
      offset: 0,
      sort_by: 'delivery_date',
      sort_order: selectedTab === 'past' ? 'desc' : 'asc',
    }

    if (selectedTab === "wholesale") {
      params.wholesale = "true"
    } else {
      params.order_type = selectedTab
    }

    if (selectedLocation) params.location_id = selectedLocation
    // Paid filter is applied client-side (status 2 OR 3) — not sent to backend
    if (searchQuery) params.search = searchQuery
    // Use delivery_date_ prefix so backend filters by delivery date
    if (dateFrom) params.delivery_date_from = format(dateFrom, 'yyyy-MM-dd')
    if (dateTo) params.delivery_date_to = format(dateTo, 'yyyy-MM-dd')

    return new URLSearchParams(params).toString()
  }

  // Fetch orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', selectedTab, selectedLocation, selectedStatus, searchQuery, dateFrom, dateTo, amountFilter, page],
    queryFn: async () => {
      const queryString = buildQueryParams()
      const response = await api.get(`/admin/orders?${queryString}`)
      return response.data
    },
    staleTime: 0, // Always consider data stale to ensure fresh data on refresh
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })

  // Raw orders from API
  const rawOrders: Order[] = ordersData?.orders || []
  const totalCount = ordersData?.count || 0
  const totalPages = Math.ceil(totalCount / limit)

  // Helper: parse delivery date+time into a Date for sorting/splitting
  // Handles invalid delivery_time values like "24:00" (not valid JS)
  const parseDeliveryDT = (order: Order): Date => {
    if (!order.delivery_date) return new Date(0)

    // Extract just the date part (YYYY-MM-DD or DD/MM/YYYY or with T)
    let datePart = order.delivery_date
    if (datePart.includes('T')) datePart = datePart.split('T')[0]
    // If date is DD/MM/YYYY, convert to YYYY-MM-DD
    if (datePart.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [dd, mm, yyyy] = datePart.split('/')
      datePart = `${yyyy}-${mm}-${dd}`
    }

    let timePart = (order.delivery_time || '00:00').replace(/\s/g, '')
    // Handle "24:00" — treat as 00:00 of next day
    if (timePart.startsWith('24:')) {
      const d = new Date(`${datePart}T00:00:00`)
      if (!isNaN(d.getTime())) d.setDate(d.getDate() + 1)
      return isNaN(d.getTime()) ? new Date(0) : d
    }
    // Ensure time has seconds
    if (timePart.length === 5) timePart += ':00'

    const d = new Date(`${datePart}T${timePart}`)
    return isNaN(d.getTime()) ? new Date(`${datePart}T00:00:00`) : d
  }

  // Today's date-only string in Australia/Sydney for past/future split
  const todayAU = (() => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Sydney',
      year: 'numeric', month: '2-digit', day: '2-digit'
    })
    return formatter.format(new Date()) // returns YYYY-MM-DD
  })()

  const nowAU = getNowAustralia()

  // Client-side delivery date range filter (backend may ignore the params)
  const applyDateFilter = (list: Order[]) => {
    if (!dateFrom && !dateTo) return list
    return list.filter(o => {
      const dt = parseDeliveryDT(o)
      if (dt.getTime() === 0) return true // keep orders with no/invalid date
      if (dateFrom) {
        const startOfDay = new Date(dateFrom)
        startOfDay.setHours(0, 0, 0, 0)
        if (dt < startOfDay) return false
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo)
        endOfDay.setHours(23, 59, 59, 999)
        if (dt > endOfDay) return false
      }
      return true
    })
  }

  // Trust the backend's order_type classification — only sort client-side
  const orders: Order[] = (() => {
    let list = applyDateFilter([...rawOrders]);

    // Paid filter: status 2 (Paid via payment gateway) OR 3 (Marked as paid manually)
    if (showPaidOnly) {
      list = list.filter(o => o.order_status === 2 || o.order_status === 3)
    }

    // Sort the list based on sortField and sortDirection
    list.sort((a, b) => {
      let valA: any = a.order_id || 0;
      let valB: any = b.order_id || 0;

      if (sortField) {
        switch (sortField) {
          case 'order_id':
            valA = a.order_id || 0;
            valB = b.order_id || 0;
            break;
          case 'customer_name':
            valA = (a.customer_name || `${a.customer_firstname || ''} ${a.customer_lastname || ''}`).trim().toLowerCase();
            valB = (b.customer_name || `${b.customer_firstname || ''} ${b.customer_lastname || ''}`).trim().toLowerCase();
            break;
          case 'company_name':
            valA = (a.company_name || a.company || '').toLowerCase();
            valB = (b.company_name || b.company || '').toLowerCase();
            break;
          case 'department_name':
            valA = (a.department_name || a.department || '').toLowerCase();
            valB = (b.department_name || b.department || '').toLowerCase();
            break;
          case 'delivery_date':
          case 'delivery_time':
            valA = parseDeliveryDT(a).getTime();
            valB = parseDeliveryDT(b).getTime();
            break;
          case 'order_total':
            valA = Number(a.order_total) || 0;
            valB = Number(b.order_total) || 0;
            break;
          case 'order_status':
            valA = a.order_status || 0;
            valB = b.order_status || 0;
            break;
        }
      } else {
        // Default sort: order_id descending
        return (b.order_id || 0) - (a.order_id || 0);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list
  })()



  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/orders/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success("Order deleted successfully")
      setShowDeleteModal(false)
      setDeleteOrderId(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete order")
    }
  })

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => api.delete(`/admin/orders/${id}`)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success(`${selectedOrders.length} order${selectedOrders.length !== 1 ? 's' : ''} deleted successfully`)
      setShowBulkDeleteModal(false)
      setSelectedOrders([])
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete selected orders")
    }
  })

  const handleBulkDeleteClick = () => {
    if (selectedOrders.length === 0) return
    setShowBulkDeleteModal(true)
  }

  const handleConfirmBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedOrders)
  }

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => {
      await api.put(`/admin/orders/${id}/status`, { order_status: status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order'] })
      toast.success("Order marked as paid successfully")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update status")
    }
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map(order => order.order_id))
    } else {
      setSelectedOrders([])
    }
  }

  const handleSelectOrder = (orderId: number, checked: boolean) => {
    if (checked) {
      // Prevent duplicates
      if (!selectedOrders.includes(orderId)) {
        setSelectedOrders([...selectedOrders, orderId])
      }
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
    }
  }

  const handleDeleteClick = (orderId: number) => {
    setDeleteOrderId(orderId)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    if (deleteOrderId) {
      deleteMutation.mutate(deleteOrderId)
    }
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setSelectedStatus(null)
    setDateFrom(null)
    setDateTo(null)
    setAmountFilter("")
    setLateFeeAmount("")
    setShowPaidOnly(false)
    setPage(1)
  }

  // Late fee mutation
  const updateLateFeeMutation = useMutation({
    mutationFn: async ({ orderIds, lateFee }: { orderIds: number[]; lateFee: number }) => {
      return await api.post('/admin/orders/update-late-fees', {
        order_ids: orderIds,
        late_fee: lateFee
      })
    },
    onSuccess: (data) => {
      const updatedCount = data.data?.updated_orders || data.data?.orders?.length || selectedOrders.length
      toast.success(data.data.message || `Late fee applied to ${updatedCount} order(s)`)
      setSelectedOrders([])
      setLateFeeAmount("")
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update late fees")
    }
  })

  const handleApplyLateFee = () => {
    if (selectedOrders.length === 0) {
      toast.error("Please select at least one order")
      return
    }

    const lateFee = parseFloat(lateFeeAmount)
    if (isNaN(lateFee) || lateFee < 0) {
      toast.error("Please enter a valid late fee amount")
      return
    }

    // Remove duplicates and ensure valid order IDs
    const uniqueOrderIds = [...new Set(selectedOrders.filter(id => id && !isNaN(Number(id))))]

    if (uniqueOrderIds.length === 0) {
      toast.error("No valid orders selected")
      return
    }

    console.log('Applying late fee to orders:', uniqueOrderIds)

    updateLateFeeMutation.mutate({
      orderIds: uniqueOrderIds,
      lateFee: lateFee
    })
  }

  const handlePrint = () => {
    printTableData("Orders")
  }

  // Email mutation
  const emailMutation = useMutation({
    mutationFn: async ({ orderId, customMessage }: { orderId: number; customMessage?: string }) => {
      return await ordersAPI.sendEmail(orderId, { email_type: 'order_confirmation', custom_message: customMessage })
    },
    onSuccess: (data) => {
      if (data.data.email_sent) {
        toast.success("Email sent successfully")
      } else {
        toast.info("Email prepared (email service not configured)")
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to send email")
    }
  })

  // Download invoice mutation - uses dynamic generation (no S3)
  const downloadInvoiceMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await invoicesAPI.download(orderId)

      // Create blob from response
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const blobUrl = window.URL.createObjectURL(blob)

      // Create download link
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `invoice-${orderId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl)

      return response.data
    },
    onSuccess: () => {
      toast.success("Invoice downloaded successfully")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to download invoice")
    }
  })

  const handleViewOrder = (orderId: number) => {
    console.log("View order:", orderId)
    setSelectedOrderId(orderId)
    setShowOrderDetailModal(true)
  }

  const handleEditOrder = (orderId: number) => {
    console.log("Edit order:", orderId)
    // Redirect to order edit page
    router.push(`/orders/${orderId}/edit`)
  }

  const handlePayment = (orderId: number) => {
    console.log("Payment order:", orderId)
    // Open payment modal or redirect to payment page
    setPaymentOrderId(orderId)
    setShowPaymentModal(true)
  }

  const handleMarkAsPaid = (orderId: number) => {
    updateStatusMutation.mutate({ id: orderId, status: 3 })
  }

  const handleEmailOrder = async (order: Order) => {
    console.log("Email order:", order.order_id)
    try {
      await emailMutation.mutateAsync({ orderId: order.order_id })
    } catch (error) {
      console.error("Email error:", error)
      // Error handled by mutation
    }
  }

  const handleDownloadOrder = async (orderId: number) => {
    console.log("Download order:", orderId)
    try {
      await downloadInvoiceMutation.mutateAsync(orderId)
    } catch (error) {
      console.error("Download error:", error)
      // Error handled by mutation
    }
  }

  const handleRefreshOrder = (orderId: number) => {
    console.log("Refresh order:", orderId)
    queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      toast.success("Order refreshed")
  }

  const handleAttachImage = (orderId: number) => {
    // Implement attach image logic here
    toast.info(`Attach image for order #${orderId}`)
  }

  const handleReorder = (orderId: number) => {
    router.push(`/orders/new?reorderId=${orderId}`)
  }

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file")
        return
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size must be less than 10MB")
        return
      }
      setSelectedImageFile(file)
    }
  }

  const handleImageUpload = async () => {
    if (!imageUploadOrderId || !selectedImageFile) {
      toast.error("Please select an image file")
      return
    }

    try {
      const formData = new FormData()
      formData.append("image", selectedImageFile)
      formData.append("order_id", imageUploadOrderId.toString())

      const response = await api.post("/admin/upload/order-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.data.success) {
        toast.success("Image attached successfully")
        setShowImageUploadModal(false)
        setSelectedImageFile(null)
        setImageUploadOrderId(null)
        queryClient.invalidateQueries({ queryKey: ['orders'] })
      } else {
        toast.error("Failed to attach image")
      }
    } catch (error: any) {
      console.error("Image upload error:", error)
      toast.error(error.response?.data?.message || "Failed to attach image")
    }
  }

  const getStatusBadge = (status: number) => {
    const statusInfo = orderStatusMap[status] || orderStatusMap[1]
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color} border ${statusInfo.borderColor}`}>
        <span className={`w-2 h-2 ${statusInfo.color.replace('text-', 'bg-')} rounded-full`}></span>
        {statusInfo.label}
      </span>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen w-full max-w-full overflow-x-hidden" style={{ fontFamily: 'Albert Sans' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-gray-900 text-2xl sm:text-3xl lg:text-4xl" style={{
          fontFamily: 'Albert Sans',
          fontWeight: 600,
          fontStyle: 'normal',
          lineHeight: '1.2',
          letterSpacing: '0%'
        }}>
          {selectedTab === 'past' ? 'Past Orders' : selectedTab === 'future' ? 'Future Orders' : selectedTab === 'reminder' ? 'Reminder Orders' : 'Wholesale Orders'}
        </h1>
        <Link href="/orders/new" className="w-full sm:w-auto">
          <Button
            className="bg-[#C62828] hover:bg-[#B71C1C] text-white whitespace-nowrap w-full sm:w-auto"
            style={{
              fontWeight: 600,
              minWidth: '196px',
              height: '54px',
              paddingTop: '8px',
              paddingRight: '16px',
              paddingBottom: '8px',
              paddingLeft: '16px',
              gap: '4px',
              borderRadius: '67px',
              opacity: 1
            }}
          >
            <Plus className="h-5 w-5" />
            Place New Order
          </Button>
        </Link>
      </div>

      {/* Order Type Tabs */}
      <div className="flex gap-2 sm:gap-3 mb-6 flex-wrap">
        {orderTabs.map((tab: any) => (
          <button
            key={tab.key}
            onClick={() => {
              setSelectedTab(tab.key)
              setPage(1)
              // Update URL to reflect tab change
              router.push(`/orders?tab=${tab.key}`, { scroll: false })
              // Invalidate queries to ensure fresh data
              queryClient.invalidateQueries({ queryKey: ['orders'] })
            }}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${selectedTab === tab.key
              ? tab.key === 'wholesale'
                ? "bg-purple-100 text-purple-700 border-2 border-purple-500"
                : "bg-[#e7f1ff] text-[#055160] border-2 border-[#055160]"
              : "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300"
              }`}
            style={{ fontFamily: 'Albert Sans', fontWeight: 500 }}
          >
            {tab.label}
            {tab.key === 'wholesale' && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-500 text-white text-xs">
                W
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Info banner for wholesale tab - Hidden for kj3 */}
      {false && selectedTab === 'wholesale' && (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800" style={{ fontFamily: 'Albert Sans' }}>
            <strong>Wholesale Orders Only:</strong> This view shows only orders from wholesale customers.
            Use Past/Future/Reminder tabs to see all orders regardless of customer type.
          </p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-stretch sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center flex-1">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search Order ID, Customer ID, Status etc."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[300px] h-[54px] border border-gray-200 bg-white rounded-full focus:ring-2 focus:ring-[#055160] focus:border-[#055160] focus:outline-none"
              style={{ fontFamily: 'Albert Sans', paddingLeft: '44px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px' }}
            />
          </div>

          {/* Delivery Date range picker */}
          <div className="relative flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`gap-2 border border-gray-200 bg-white whitespace-nowrap rounded-full hover:bg-gray-50 hover:text-gray-900 w-full sm:w-auto ${(dateFrom || dateTo) ? 'border-[#055160] text-[#055160]' : ''
                }`}
              style={{
                fontFamily: 'Albert Sans',
                fontWeight: 600,
                color: dateFrom || dateTo ? '#055160' : '#6b7280',
                minWidth: '185px',
                height: '54px',
                paddingTop: '8px',
                paddingRight: '24px',
                paddingBottom: '8px',
                paddingLeft: '24px',
                gap: '8px',
                borderRadius: '100px',
                borderWidth: '1px',
                opacity: 1
              }}
            >
              <Calendar className="h-5 w-5 text-gray-500" />
              {dateFrom || dateTo
                ? `${dateFrom ? format(dateFrom, 'dd/MM/yy') : '…'} → ${dateTo ? format(dateTo, 'dd/MM/yy') : '…'}`
                : 'Delivery Date'}
            </Button>
            {showDatePicker && (
              <div className="absolute top-full mt-2 z-50 bg-white p-4 rounded-lg shadow-lg border">
                <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Delivery Date Range</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">From</label>
                    <DatePicker
                      selected={dateFrom}
                      onChange={(date) => {
                        setDateFrom(date)
                        if (date) queryClient.invalidateQueries({ queryKey: ['orders'] })
                      }}
                      dateFormat="dd/MM/yyyy"
                      className="border rounded px-3 py-2 w-full"
                      placeholderText="DD/MM/YYYY"
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      isClearable
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">To</label>
                    <DatePicker
                      selected={dateTo}
                      onChange={(date) => setDateTo(date)}
                      dateFormat="dd/MM/yyyy"
                      className="border rounded px-3 py-2 w-full"
                      placeholderText="DD/MM/YYYY"
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      isClearable
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowDatePicker(false)
                        queryClient.invalidateQueries({ queryKey: ['orders'] })
                      }}
                      className="flex-1 bg-[#C62828] hover:bg-[#B71C1C] text-white hover:text-white"
                      style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
                    >
                      Apply
                    </Button>
                    <Button
                      onClick={() => {
                        setDateFrom(null)
                        setDateTo(null)
                        setShowDatePicker(false)
                        queryClient.invalidateQueries({ queryKey: ['orders'] })
                      }}
                      variant="outline"
                      className="flex-1"
                      style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Paid Orders filter */}
          <Button
            variant="outline"
            onClick={() => setShowPaidOnly(!showPaidOnly)}
            className={`gap-2 whitespace-nowrap rounded-full hover:bg-gray-50 hover:text-gray-900 ${showPaidOnly ? 'bg-green-50 text-green-700 border-green-400' : 'border border-gray-200 bg-white'
              }`}
            style={{
              fontFamily: 'Albert Sans',
              fontWeight: 600,
              height: '54px',
              paddingTop: '8px',
              paddingRight: '24px',
              paddingBottom: '8px',
              paddingLeft: '24px',
              borderRadius: '100px',
              borderWidth: '1px',
              opacity: 1
            }}
          >
            <Filter className="h-5 w-5" />
            Paid Orders
          </Button>

          <Button
            onClick={handleClearFilters}
            className="text-[#055160] hover:text-[#04414d] bg-transparent border-0 shadow-none p-0 h-auto whitespace-nowrap"
            style={{
              fontFamily: 'Albert Sans',
              fontWeight: 600,
              fontSize: '16px'
            }}
          >
            Clear Filters
          </Button>
        </div>

        <Button
          onClick={handlePrint}
          className="gap-2 whitespace-nowrap border-0 shadow-none hover:bg-transparent"
          style={{
            fontFamily: 'Albert Sans',
            fontWeight: 600,
            fontStyle: 'normal',
            fontSize: '16px',
            lineHeight: '20px',
            letterSpacing: '0%',
            textAlign: 'center',
            color: '#055160',
            backgroundColor: 'transparent',
            padding: 0,
            gap: '8px',
            opacity: 1
          }}
        >
          <Printer className="h-5 w-5 text-[#055160]" />
          Print
        </Button>
      </div>

      {/* Location Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto mb-6">
        <button
          onClick={() => {
            setSelectedLocation(null)
            setPage(1)
          }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${selectedLocation === null
            ? "border-[#055160] text-[#055160]"
            : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
        >
          <span className="w-5 h-5 flex items-center justify-center">📍</span>
          All Locations
        </button>
        {locations.map((location: any) => (
          <button
            key={location.location_id}
            onClick={() => {
              setSelectedLocation(location.location_id)
              setPage(1)
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${selectedLocation === location.location_id
              ? "border-[#055160] text-[#055160]"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
          >
            <span className="w-5 h-5 flex items-center justify-center">📍</span>
            {location.location_name}
          </button>
        ))}
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedOrders.length > 0 && (
        <div className="flex items-center justify-between gap-4 mb-4 px-4 py-3 bg-[#055160] text-white rounded-xl shadow-md">
          <span className="text-sm font-semibold" style={{ fontFamily: 'Albert Sans' }}>
            {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setSelectedOrders([])}
              className="h-9 px-4 text-sm bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              Deselect All
            </Button>
            <Button
              onClick={handleBulkDeleteClick}
              disabled={bulkDeleteMutation.isPending}
              className="h-9 px-4 text-sm bg-red-600 hover:bg-red-700 text-white border-0"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={orders.length > 0 && selectedOrders.length === orders.length}
                    onCheckedChange={handleSelectAll}
                    className="h-5 w-5"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'order_id') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('order_id')
                      setSortDirection('asc')
                    }
                  }}
                  style={{
                    fontFamily: 'Albert Sans',
                    fontWeight: 600,
                    fontStyle: 'normal',
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '0%'
                  }}
                >
                  <div className="flex items-center gap-2">
                    Order ID
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'customer_name') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('customer_name')
                      setSortDirection('asc')
                    }
                  }}
                  style={{
                    fontFamily: 'Albert Sans',
                    fontWeight: 600,
                    fontStyle: 'normal',
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '0%'
                  }}
                >
                  <div className="flex items-center gap-2">
                    Customer Name
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'company_name') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('company_name')
                      setSortDirection('asc')
                    }
                  }}
                  style={{
                    fontFamily: 'Albert Sans',
                    fontWeight: 600,
                    fontStyle: 'normal',
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '0%'
                  }}
                >
                  <div className="flex items-center gap-2">
                    Company
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'department_name') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('department_name')
                      setSortDirection('asc')
                    }
                  }}
                  style={{
                    fontFamily: 'Albert Sans',
                    fontWeight: 600,
                    fontStyle: 'normal',
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '0%'
                  }}
                >
                  <div className="flex items-center gap-2">
                    Department
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'delivery_date') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('delivery_date')
                      setSortDirection('asc')
                    }
                  }}
                  style={{
                    fontFamily: 'Albert Sans',
                    fontWeight: 600,
                    fontStyle: 'normal',
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '0%'
                  }}
                >
                  <div className="flex items-center gap-2">
                    Delivery Date
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'delivery_time') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('delivery_time')
                      setSortDirection('asc')
                    }
                  }}
                  style={{
                    fontFamily: 'Albert Sans',
                    fontWeight: 600,
                    fontStyle: 'normal',
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '0%'
                  }}
                >
                  <div className="flex items-center gap-2">
                    Delivery Time
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'order_total') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('order_total')
                      setSortDirection('asc')
                    }
                  }}
                  style={{
                    fontFamily: 'Albert Sans',
                    fontWeight: 600,
                    fontStyle: 'normal',
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '0%'
                  }}
                >
                  <div className="flex items-center gap-2">
                    Amount
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'order_status') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('order_status')
                      setSortDirection('asc')
                    }
                  }}
                  style={{
                    fontFamily: 'Albert Sans',
                    fontWeight: 600,
                    fontStyle: 'normal',
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '0%'
                  }}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left"
                  style={{
                    fontFamily: 'Albert Sans',
                    fontWeight: 600,
                    fontStyle: 'normal',
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '0%'
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    {Array.from({ length: 10 }).map((_, colIdx) => (
                      <td key={colIdx} className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => {
                  // Highlight frontend orders (placed by customer online) in light blue
                  const isFrontendOrder = !order.user_id || order.user_id === 0
                  return (
                    <tr key={order.order_id} className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${isFrontendOrder ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}>
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={selectedOrders.includes(order.order_id)}
                          onCheckedChange={(checked) => handleSelectOrder(order.order_id, checked as boolean)}
                          className="h-5 w-5"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Link href={`/orders/${order.order_id}`} prefetch={true} onClick={(e) => e.stopPropagation()}>
                          <span className="text-[#055160] hover:underline cursor-pointer" style={{
                            fontFamily: 'Albert Sans',
                            fontWeight: 400,
                            fontStyle: 'normal',
                            fontSize: '14px',
                            lineHeight: '20px',
                            letterSpacing: '0%'
                          }}>
                            #{order.order_id}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900" style={{
                            fontFamily: 'Albert Sans',
                            fontWeight: 400,
                            fontStyle: 'normal',
                            fontSize: '14px',
                            lineHeight: '20px',
                            letterSpacing: '0%'
                          }}>
                            {order.customer_name || 'N/A'}
                          </span>
                          {/* Wholesale badge - Hidden for kj3 */}
                          {false && order.customer_type && (order.customer_type.includes('Wholesale') || order.customer_type.includes('Wholesaler')) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200" style={{ fontFamily: 'Albert Sans' }}>
                              Wholesale
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-700" style={{
                          fontFamily: 'Albert Sans',
                          fontWeight: 400,
                          fontStyle: 'normal',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0%'
                        }}>
                          {order.company_name || order.company || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-700" style={{
                          fontFamily: 'Albert Sans',
                          fontWeight: 400,
                          fontStyle: 'normal',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0%'
                        }}>
                          {order.department_name || order.department || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-700" style={{
                          fontFamily: 'Albert Sans',
                          fontWeight: 400,
                          fontStyle: 'normal',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0%'
                        }}>
                          {order.delivery_date ? format(new Date(order.delivery_date), 'dd/MM/yyyy') : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-700" style={{
                          fontFamily: 'Albert Sans',
                          fontWeight: 400,
                          fontStyle: 'normal',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0%'
                        }}>
                          {(() => {
                            const timePart = order.delivery_time;
                            if (!timePart) return '—';
                            const [hours, minutes] = timePart.split(':').map(Number);
                            if (isNaN(hours) || isNaN(minutes)) return timePart;
                            const hour12 = hours % 12 || 12;
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                          })()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-900" style={{
                          fontFamily: 'Albert Sans',
                          fontWeight: 400,
                          fontStyle: 'normal',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0%'
                        }}>
                          ${Number(order.order_total || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(order.order_status)}
                      </td>
                      <td className="px-4 py-4">
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleViewOrder(order.order_id)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditOrder(order.order_id)}
                                className="cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Order
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handlePayment(order.order_id)}
                                className="cursor-pointer"
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Process Payment
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleMarkAsPaid(order.order_id)}
                                disabled={updateStatusMutation.isPending || order.order_status === 3}
                                className="cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark Paid
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadOrder(order.order_id)}
                                disabled={downloadInvoiceMutation.isPending}
                                className="cursor-pointer"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Download Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEmailOrder(order)}
                                disabled={emailMutation.isPending}
                                className="cursor-pointer"
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email to Customer
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRefreshOrder(order.order_id)}
                                className="cursor-pointer"
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Refresh Order
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAttachImage(order.order_id)}
                                className="cursor-pointer"
                              >
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Attach Image
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleReorder(order.order_id)}
                                className="cursor-pointer"
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reorder
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(order.order_id)}
                                className="cursor-pointer text-[#055160] focus:text-[#055160]"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Order count */}
        <div className="flex items-center px-6 py-4 border-t border-gray-200 bg-white">
          <p className="text-sm text-gray-600" style={{ fontFamily: 'Albert Sans' }}>
            Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order #{deleteOrderId}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={showBulkDeleteModal} onOpenChange={setShowBulkDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Albert Sans', fontWeight: 700 }}>Delete {selectedOrders.length} Order{selectedOrders.length !== 1 ? 's' : ''}?</DialogTitle>
            <DialogDescription style={{ fontFamily: 'Albert Sans' }}>
              You are about to permanently delete <strong>{selectedOrders.length}</strong> selected order{selectedOrders.length !== 1 ? 's' : ''}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-700" style={{ fontFamily: 'Albert Sans' }}>
              Order ID{selectedOrders.length !== 1 ? 's' : ''}: {selectedOrders.map(id => `#${id}`).join(', ')}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteModal(false)}
              disabled={bulkDeleteMutation.isPending}
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${selectedOrders.length} Order${selectedOrders.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        open={showOrderDetailModal}
        onOpenChange={setShowOrderDetailModal}
        onOrderUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['orders'] })
        }}
      />

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-white z-10 pb-2">
            <DialogTitle style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
              Process Payment
            </DialogTitle>
            <DialogDescription style={{ fontFamily: 'Albert Sans' }}>
              Process payment for order #{paymentOrderId}
            </DialogDescription>
          </DialogHeader>
          {paymentOrderId && (
            <PaymentProcessingModal
              orderId={paymentOrderId}
              onSuccess={() => {
                setShowPaymentModal(false)
                queryClient.invalidateQueries({ queryKey: ['orders'] })
                queryClient.invalidateQueries({ queryKey: ['order', paymentOrderId] })
                toast.success("Payment processed successfully")
              }}
              onClose={() => setShowPaymentModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Image Upload Modal */}
      <Dialog open={showImageUploadModal} onOpenChange={setShowImageUploadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
              Attach Image to Order #{imageUploadOrderId}
            </DialogTitle>
            <DialogDescription style={{ fontFamily: 'Albert Sans' }}>
              Select an image file to attach to this order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Albert Sans' }}>
                Select Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                style={{ fontFamily: 'Albert Sans' }}
              />
              {selectedImageFile && (
                <p className="mt-2 text-sm text-gray-600" style={{ fontFamily: 'Albert Sans' }}>
                  Selected: {selectedImageFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImageUploadModal(false)
                setSelectedImageFile(null)
                setImageUploadOrderId(null)
              }}
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImageUpload}
              disabled={!selectedImageFile}
              className="bg-[#C62828] hover:bg-[#B71C1C] text-white"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
