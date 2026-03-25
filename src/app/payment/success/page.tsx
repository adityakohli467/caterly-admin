"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const paymentIntentId = searchParams.get("payment_intent_id") || searchParams.get("transaction_id")
  const orderIdParam = searchParams.get("order_id")

  useEffect(() => {
    if (paymentIntentId && orderIdParam) {
      setOrderId(orderIdParam)
      verifyPayment()
    } else {
      setVerifying(false)
      toast.error("Missing payment information")
    }
  }, [paymentIntentId, orderIdParam])

  const verifyPayment = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'
      // Verify payment with backend
      const response = await fetch(`${apiUrl}/store/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          order_id: orderIdParam ? parseInt(orderIdParam) : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setVerified(true)
        toast.success("Payment successful!")
        // Invalidate order query to refresh data
        if (orderIdParam) {
          queryClient.invalidateQueries({ queryKey: ['order', orderIdParam] })
        }
      } else {
        toast.error("Payment verification failed")
      }
    } catch (error: any) {
      console.error("Payment verification error:", error)
      toast.error(error.message || "Failed to verify payment")
    } finally {
      setVerifying(false)
    }
  }

  if (verifying) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin mb-4 text-blue-600" />
            <h2 className="text-2xl font-bold mb-2">Verifying Payment...</h2>
            <p className="text-gray-600">Please wait while we confirm your payment.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!verified) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-16 text-center">
            <h2 className="text-2xl font-bold mb-4 text-[#C62828]">Payment Verification Failed</h2>
            <p className="text-gray-600 mb-6">
              We couldn't verify your payment. Please contact support if you've been charged.
            </p>
            {orderId && (
              <Button onClick={() => router.push(`/orders/${orderId}`)}>
                View Order
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-16 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-3xl font-bold mb-4">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">
            Payment has been processed successfully for order #{orderId}.
          </p>
          {paymentIntentId && (
            <p className="text-sm text-gray-500 mb-6">
              Payment Intent ID: {paymentIntentId.substring(0, 20)}...
            </p>
          )}
          <div className="flex gap-4 justify-center">
            {orderId && (
              <Button onClick={() => router.push(`/orders/${orderId}`)}>
                View Order
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push("/orders")}>
              Back to Orders
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
