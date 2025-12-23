"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { XCircle } from "lucide-react"

function PaymentCancelContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get("order_id")

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-16 text-center">
          <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-3xl font-bold mb-4">Payment Cancelled</h2>
          <p className="text-gray-600 mb-6">
            Your payment was cancelled. No charges have been made.
          </p>
          <div className="flex gap-4 justify-center">
            {orderId && (
              <Button onClick={() => router.push(`/payment?order_id=${orderId}`)}>
                Try Again
              </Button>
            )}
            {orderId && (
              <Button variant="outline" onClick={() => router.push(`/orders/${orderId}`)}>
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

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <PaymentCancelContent />
    </Suspense>
  )
}

