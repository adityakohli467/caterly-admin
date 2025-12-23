"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ordersAPI } from "@/lib/api"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { PinPaymentForm } from "@/components/PinPaymentForm"

interface PaymentProcessingModalProps {
  orderId: number
  onSuccess: () => void
  onClose: () => void
}

export function PaymentProcessingModal({ orderId, onSuccess, onClose }: PaymentProcessingModalProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("process")
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Fetch order details
  const { data: orderData, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      try {
        const response = await ordersAPI.get(orderId)
        return response.data || {}
      } catch (error) {
        console.error("Error fetching order:", error)
        return {}
      }
    },
    enabled: !!orderId,
  })

  const order = orderData?.order

  // Mark as paid mutation - MUST be called before any conditional returns
  const markAsPaidMutation = useMutation({
    mutationFn: async (data: { id: number; status: number }) => {
      return await ordersAPI.updateStatus(data.id, data.status)
    },
    onSuccess: () => {
      toast.success("Order marked as paid")
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to mark order as paid")
    },
  })

  const handleMarkAsPaid = () => {
    if (!orderId) return
    markAsPaidMutation.mutate({ id: orderId, status: 2 })
  }

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true)
    toast.success("Payment processed successfully!")
    // Refresh order data
    queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    // Call onSuccess callback after a short delay
    setTimeout(() => {
      onSuccess()
    }, 1500)
  }

  const handlePaymentError = (error: string) => {
    console.error("Payment error:", error)
    // Error is already shown via toast in PinPaymentForm
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  // Show loading state if order is not yet loaded - AFTER all hooks
  if (isLoadingOrder) {
    return (
      <div className="py-4">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4 text-[rgba(220, 53, 69, 1)]" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-4 overflow-y-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="process">Process Payment</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        {/* Process Payment Tab */}
        <TabsContent value="process" className="space-y-4">
          {order ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Order Total</Label>
                    <span className="text-lg font-bold">{formatCurrency(parseFloat(order.order_total || 0))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label>Order Status</Label>
                    <Badge variant={order.order_status === 2 ? "default" : "secondary"}>
                      {order.order_status === 2 ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                  {order.payment_status && (
                    <div className="flex justify-between items-center">
                      <Label>Payment Status</Label>
                      <Badge>{order.payment_status}</Badge>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    {order.order_status === 2 ? (
                      <div className="text-center py-4">
                        <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                        <p className="text-sm text-green-600 font-medium">
                          This order has already been paid.
                        </p>
                      </div>
                    ) : paymentSuccess ? (
                      <div className="text-center py-4">
                        <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                        <p className="text-sm text-green-600 font-medium mb-4">
                          Payment processed successfully!
                        </p>
                        <p className="text-xs text-gray-500">
                          Order status will be updated automatically.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 mb-4">
                          Process payment using Pin Payments or mark the order as paid manually.
                        </p>
                        
                        {/* Pin Payments Form */}
                        <div className="mb-4">
                          <PinPaymentForm
                            orderId={orderId}
                            amount={parseFloat(order.calculated_total || order.order_total || 0)}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                          />
                        </div>

                        <div className="mt-4 pt-4 border-t">
                          <Button
                            onClick={handleMarkAsPaid}
                            disabled={markAsPaidMutation.isPending}
                            variant="outline"
                            className="w-full"
                            style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
                          >
                            {markAsPaidMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Mark as Paid (Manual)
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4 text-[rgba(220, 53, 69, 1)]" />
                  <p className="text-gray-600">Loading order details...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 text-center py-4">
                Payment history will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
