"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Eye, 
  DollarSign,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  TrendingUp,
  Users,
  FileText
} from "lucide-react"
import { toast } from "sonner"
import { paymentsAPI, ordersAPI } from "@/lib/api"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Payment {
  payment_history_id: number
  order_id: number
  payment_transaction_id: string
  payment_type: string
  payment_status: string
  payment_gateway: string
  amount: number
  currency: string
  refund_amount: number
  customer_id?: number
  customer_email?: string
  card_last4?: string
  card_brand?: string
  payment_method?: string
  created_at: string
  updated_at: string
  processed_at?: string
  gateway_status?: string
  gateway_message?: string
  has_error: boolean
  order_total?: number
  order_status?: number
  customer_name?: string
}

interface PaymentStatistics {
  total_transactions: number
  successful_payments: number
  failed_payments: number
  pending_payments: number
  refunded_payments: number
  total_revenue: number
  total_refunds: number
  net_revenue: number
  unique_customers: number
  unique_orders: number
}

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedGateway, setSelectedGateway] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [page, setPage] = useState(1)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const limit = 50

  // Build query params
  const queryParams: any = {
    limit,
    offset: (page - 1) * limit,
  }

  if (selectedStatus !== "all") {
    queryParams.payment_status = selectedStatus
  }

  if (selectedGateway !== "all") {
    queryParams.payment_gateway = selectedGateway
  }

  if (dateFrom) {
    queryParams.date_from = dateFrom.toISOString().split('T')[0]
  }

  if (dateTo) {
    queryParams.date_to = dateTo.toISOString().split('T')[0]
  }

  if (searchQuery) {
    // Search by order ID or transaction ID
    const orderId = parseInt(searchQuery)
    if (!isNaN(orderId)) {
      queryParams.order_id = orderId
    } else {
      // Could search by transaction ID in backend
      queryParams.search = searchQuery
    }
  }

  // Fetch payment history
  const { data: paymentsData, isLoading, refetch } = useQuery({
    queryKey: ['payments', queryParams],
    queryFn: async () => {
      const response = await paymentsAPI.getHistory(queryParams)
      return response.data
    },
  })

  // Fetch statistics - gateway specific
  const { data: statisticsData, isLoading: isStatsLoading, error: statsError } = useQuery({
    queryKey: ['payment-statistics', dateFrom, dateTo],
    queryFn: async () => {
      const params: any = {}
      if (dateFrom) params.date_from = dateFrom.toISOString().split('T')[0]
      if (dateTo) params.date_to = dateTo.toISOString().split('T')[0]
      const response = await paymentsAPI.getStatistics(params)
      return response.data
    },
  })

  // Fetch overall order statistics for consistent revenue totals
  const { data: orderStatsData, isLoading: isOrderStatsLoading } = useQuery({
    queryKey: ['order-statistics'],
    queryFn: async () => {
      const response = await ordersAPI.stats()
      return response.data
    },
  })

  // Fetch Paid Orders to supplement gateway history
  const { data: paidOrdersData, isLoading: isPaidOrdersLoading } = useQuery({
    queryKey: ['paid-orders', queryParams],
    queryFn: async () => {
      const params = { ...queryParams, order_status: 2 }
      const response = await ordersAPI.list(params)
      return response.data
    },
  })

  // Data processing
  const gatewayPayments: Payment[] = paymentsData?.payments || (Array.isArray(paymentsData) ? paymentsData : [])
  const paidOrders: any[] = paidOrdersData?.orders || []
  
  // Combine and deduplicate
  // If an order has a gateway record, we use that. If not, we use the manual record.
  const gatewayOrderIds = new Set(gatewayPayments.map(p => p.order_id))
  
  const manualPayments: Payment[] = paidOrders
    .filter(order => !gatewayOrderIds.has(order.order_id))
    .map(order => ({
      payment_history_id: -order.order_id, // Negative to avoid collision
      order_id: order.order_id,
      payment_transaction_id: `MANUAL-${order.order_id}`,
      payment_type: 'manual',
      payment_status: 'succeeded',
      payment_gateway: 'manual',
      amount: Number(order.order_total),
      currency: 'AUD',
      refund_amount: 0,
      customer_name: order.customer_name || 
                     (order.customer_firstname || order.customer_lastname ? `${order.customer_firstname || ''} ${order.customer_lastname || ''}`.trim() : null) ||
                     (order.firstname || order.lastname ? `${order.firstname || ''} ${order.lastname || ''}`.trim() : null) ||
                     (order.customer?.firstname || order.customer?.lastname ? `${order.customer?.firstname || ''} ${order.customer?.lastname || ''}`.trim() : null) || 
                     order.customer_email || order.email || 'N/A',
      created_at: order.date_added || order.delivery_date_time || new Date().toISOString(),
      updated_at: order.date_added || order.delivery_date_time || new Date().toISOString(),
      has_error: false
    }))

  const combinedPayments = [...gatewayPayments, ...manualPayments].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const pagination = paymentsData?.pagination || { total: combinedPayments.length, limit: 50, offset: 0, has_more: false }

  const gatewayStats: PaymentStatistics | null = statisticsData?.statistics || 
    (statisticsData?.total_transactions !== undefined ? statisticsData as unknown as PaymentStatistics : null)

  const orderStats = orderStatsData?.stats || null

  // Use order stats for high-level revenue cards if they are available
  const displayTotalRevenue = orderStats ? Number(orderStats.totalRevenue) : (Number(gatewayStats?.total_revenue) || 0)
  const displayNetRevenue = orderStats ? (Number(orderStats.totalRevenue) - (Number(gatewayStats?.total_refunds) || 0)) : (Number(gatewayStats?.net_revenue) || 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Succeeded</Badge>
      case 'failed':
        return <Badge className="bg-[#FFEBEE] text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'refunded':
        return <Badge className="bg-[#FFEBEE] text-[#B71C1C]"><RotateCcw className="w-3 h-3 mr-1" />Refunded</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getGatewayBadge = (gateway: string) => {
    const colors: Record<string, string> = {
      netcomplete: "bg-purple-100 text-purple-800",
      pinpayments: "bg-[#FFEBEE] text-[#B71C1C]",
      securepay: "bg-gray-100 text-gray-800",
      manual: "bg-orange-100 text-orange-800",
    }
    return <Badge className={colors[gateway] || "bg-gray-100 text-gray-800"}>{gateway}</Badge>
  }

  const handleViewDetails = async (payment: Payment) => {
    setSelectedPayment(payment)
    setShowDetailsModal(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600 mt-1">View and manage all payment transactions</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isStatsLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))
        ) : statsError ? (
          <div className="col-span-full bg-red-50 border border-red-100 rounded-lg p-4 text-red-600 text-center">
            <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-sm">Error loading statistics</p>
            <p className="text-xs">{(statsError as any)?.response?.data?.message || "Please refresh the page"}</p>
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <DollarSign className="w-4 h-4 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-green-600">{formatCurrency(displayTotalRevenue)}</h3>
                {orderStats && <p className="text-[10px] text-gray-400">System Total</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-500">Net Revenue</p>
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-[#C62828]">{formatCurrency(displayNetRevenue)}</h3>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-500">Successful Payments</p>
                  <CheckCircle2 className="w-4 h-4 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold">{gatewayStats?.successful_payments || 0}</h3>
                <p className="text-xs text-gray-500">{gatewayStats?.total_transactions || 0} in gateway log</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-500">Failed Payments</p>
                  <XCircle className="w-4 h-4 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-[#B71C1C]">{gatewayStats?.failed_payments || 0}</h3>
                <p className="text-xs text-gray-500">{gatewayStats?.refunded_payments || 0} refunded</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label>Search</Label>
              <Input
                placeholder="Order ID or Transaction ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* <div>
              <Label>Gateway</Label>
              <Select value={selectedGateway} onValueChange={setSelectedGateway}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gateways</SelectItem>
                  <SelectItem value="netcomplete">NetComplete</SelectItem>
                  <SelectItem value="pinpayments">PinPayments</SelectItem>
                  <SelectItem value="securepay">SecurePay</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div> */}

            <div>
              <Label>Date From</Label>
              <DatePicker
                selected={dateFrom}
                onChange={(date) => setDateFrom(date)}
                dateFormat="yyyy-MM-dd"
                className="w-full px-3 py-2 border rounded-md"
                placeholderText="Select date"
              />
            </div>

            <div>
              <Label>Date To</Label>
              <DatePicker
                selected={dateTo}
                onChange={(date) => setDateTo(date)}
                dateFormat="yyyy-MM-dd"
                className="w-full px-3 py-2 border rounded-md"
                placeholderText="Select date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || isPaidOrdersLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#C62828]" />
              <p className="text-gray-600">Loading payments...</p>
            </div>
          ) : (paymentsData instanceof Error || !paymentsData) && (!combinedPayments.length && !isLoading) ? (
            <div className="text-center py-8 text-red-500 bg-red-50 rounded-lg border border-red-100 p-4">
              <XCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="font-semibold">Error loading payments</p>
              <p className="text-sm">Could not fetch payment records. Please try again or contact support.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4 border-red-200 text-red-600 hover:bg-red-100"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          ) : combinedPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No payments found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Order ID</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedPayments.map((payment) => (
                      <tr key={payment.payment_history_id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">#{payment.order_id}</td>
                        <td className="p-3">
                          {payment.customer_name || 'N/A'}
                          {payment.card_last4 && (
                            <span className="text-xs text-gray-500 ml-2">
                              •••• {payment.card_last4}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div>
                            <span className="font-bold">{formatCurrency(payment.amount)}</span>
                            {payment.refund_amount > 0 && (
                              <span className="text-xs text-[#C62828] ml-2">
                                (Refunded: {formatCurrency(payment.refund_amount)})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">{getStatusBadge(payment.payment_status)}</td>
                        <td className="p-3 text-sm text-gray-600">
                         {new Date(payment.created_at).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: 'short', year: 'numeric' })}
                          <br />
                          <span className="text-xs">
                            {new Date(payment.created_at).toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(payment)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-gray-600">
                  Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} payments
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.has_more}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              {selectedPayment?.payment_gateway === 'manual' 
                ? `Manual Payment for Order #${selectedPayment?.order_id}`
                : `Transaction ID: ${selectedPayment?.payment_transaction_id}`}
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Order ID</Label>
                  <p className="font-bold">#{selectedPayment.order_id}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Status</Label>
                  <div>{getStatusBadge(selectedPayment.payment_status)}</div>
                </div>
                <div>
                  <Label className="text-gray-600">Amount</Label>
                  <p className="font-bold text-lg">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Refunded</Label>
                  <p className={selectedPayment.refund_amount > 0 ? "text-[#C62828] font-bold" : "text-gray-500"}>
                    {formatCurrency(selectedPayment.refund_amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Customer</Label>
                  <p className="font-bold">{selectedPayment.customer_name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Card</Label>
                  <p>
                    {selectedPayment.card_brand && (
                      <span className="capitalize">{selectedPayment.card_brand} </span>
                    )}
                    {selectedPayment.card_last4 ? `•••• ${selectedPayment.card_last4}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Created</Label>
                  <p>{new Date(selectedPayment.created_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                {selectedPayment.processed_at && (
                  <div>
                    <Label className="text-gray-600">Processed</Label>
                    <p>{new Date(selectedPayment.processed_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                )}
              </div>
              {selectedPayment.has_error && (
                <div className="bg-[#FFEBEE] border border-red-200 rounded p-4">
                  <Label className="text-red-800 font-bold">Error Occurred</Label>
                  <p className="text-sm text-[#C62828] mt-1">
                    {selectedPayment.gateway_message || 'Payment failed'}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

