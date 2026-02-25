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
import { paymentsAPI } from "@/lib/api"
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

  // Fetch statistics
  const { data: statisticsData } = useQuery({
    queryKey: ['payment-statistics', dateFrom, dateTo],
    queryFn: async () => {
      const params: any = {}
      if (dateFrom) params.date_from = dateFrom.toISOString().split('T')[0]
      if (dateTo) params.date_to = dateTo.toISOString().split('T')[0]
      const response = await paymentsAPI.getStatistics(params)
      return response.data
    },
  })

  const payments: Payment[] = paymentsData?.payments || []
  const pagination = paymentsData?.pagination || { total: 0, limit: 50, offset: 0, has_more: false }
  const statistics: PaymentStatistics | null = statisticsData?.statistics || null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Succeeded</Badge>
      case 'failed':
        return <Badge className="bg-[#e7f1ff] text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'refunded':
        return <Badge className="bg-[#e7f1ff] text-[#B71C1C]"><RotateCcw className="w-3 h-3 mr-1" />Refunded</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getGatewayBadge = (gateway: string) => {
    const colors: Record<string, string> = {
      netcomplete: "bg-purple-100 text-purple-800",
      pinpayments: "bg-[#e7f1ff] text-[#B71C1C]",
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
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(statistics.total_revenue || 0)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Net Revenue</p>
                  <p className="text-2xl font-bold text-[#055160]">{formatCurrency(statistics.net_revenue || 0)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#055160]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Successful Payments</p>
                  <p className="text-2xl font-bold">{statistics.successful_payments || 0}</p>
                  <p className="text-xs text-gray-500">of {statistics.total_transactions || 0} total</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed Payments</p>
                  <p className="text-2xl font-bold text-[#055160]">{statistics.failed_payments || 0}</p>
                  <p className="text-xs text-gray-500">{statistics.refunded_payments || 0} refunded</p>
                </div>
                <XCircle className="w-8 h-8 text-[#055160]" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

            <div>
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
            </div>

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
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
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
                      <th className="text-left p-3">Transaction ID</th>
                      <th className="text-left p-3">Order ID</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Gateway</th>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.payment_history_id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {payment.payment_transaction_id.substring(0, 20)}...
                          </code>
                        </td>
                        <td className="p-3 font-medium">#{payment.order_id}</td>
                        <td className="p-3">
                          {payment.customer_name || payment.customer_email || 'N/A'}
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
                              <span className="text-xs text-[#055160] ml-2">
                                (Refunded: {formatCurrency(payment.refund_amount)})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">{getStatusBadge(payment.payment_status)}</td>
                        <td className="p-3">{getGatewayBadge(payment.payment_gateway)}</td>
                        <td className="p-3 text-sm text-gray-600">
                          {new Date(payment.created_at).toLocaleDateString()}
                          <br />
                          <span className="text-xs">
                            {new Date(payment.created_at).toLocaleTimeString()}
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
              Transaction ID: {selectedPayment?.payment_transaction_id}
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
                  <p className={selectedPayment.refund_amount > 0 ? "text-[#055160] font-bold" : "text-gray-500"}>
                    {formatCurrency(selectedPayment.refund_amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Gateway</Label>
                  <div>{getGatewayBadge(selectedPayment.payment_gateway)}</div>
                </div>
                <div>
                  <Label className="text-gray-600">Payment Method</Label>
                  <p>{selectedPayment.payment_method || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Customer</Label>
                  <p>{selectedPayment.customer_name || selectedPayment.customer_email || 'N/A'}</p>
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
                  <p>{new Date(selectedPayment.created_at).toLocaleString()}</p>
                </div>
                {selectedPayment.processed_at && (
                  <div>
                    <Label className="text-gray-600">Processed</Label>
                    <p>{new Date(selectedPayment.processed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {selectedPayment.has_error && (
                <div className="bg-[#e7f1ff] border border-red-200 rounded p-4">
                  <Label className="text-red-800 font-bold">Error Occurred</Label>
                  <p className="text-sm text-[#055160] mt-1">
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

