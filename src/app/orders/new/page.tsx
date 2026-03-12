"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { CustomerStep } from "../../quotes/new/components/CustomerStep"
import { ProductsStep } from "../../quotes/new/components/ProductsStep"
import { DeliveryStep } from "./components/DeliveryStepOrder"
import { Check } from "lucide-react"
import { toast } from "sonner"
import { ordersAPI } from "@/lib/api"

export interface OrderData {
  // Customer Details
  company_id?: number
  department_id?: number
  customer_id?: number
  customer_name?: string
  customer_type?: string
  phone?: string
  email?: string
  location?: string
  location_id?: number

  // Products
  products: Array<{
    product_id: number
    name: string
    category: string
    price: number
    quantity: number
    comment?: string
    add_ons?: Array<{
      name: string
      price: number
      quantity: number
    }>
  }>

  // Delivery Details
  delivery_date?: string
  delivery_time?: string
  delivery_date_time?: string
  account_email?: string
  cost_center?: string
  delivery_contact?: string
  delivery_details?: string
  delivery_method?: "delivery" | "pickup"
  delivery_address?: string
  delivery_fee?: number
  coupon_code?: string
  coupon_type?: 'P' | 'F'
  coupon_discount?: number
  order_comments?: string
  standing_order?: number // 0 = one-time order, 7 = weekly, 14 = bi-weekly, 30 = monthly
}

export default function NewOrderPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [orderData, setOrderData] = useState<OrderData>({
    products: [],
  })
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)

  const steps = [
    { number: 1, label: "Select Customer" },
    { number: 2, label: "Select Products" },
    { number: 3, label: "Add Delivery Details" },
  ]

  const updateOrderData = (data: Partial<OrderData>) => {
    setOrderData((prev) => ({ ...prev, ...data }))
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveOrder = async (latestData?: Partial<OrderData>) => {
    try {
      // Use latestData if provided (from DeliveryStep), otherwise use orderData state
      // This ensures we have the latest coupon data even if state hasn't updated yet
      const dataToUse = latestData ? { ...orderData, ...latestData } : orderData

      // Validate required fields
      if (!dataToUse.customer_id) {
        toast.error("Please select a customer")
        return
      }

      if (!dataToUse.location_id) {
        toast.error("Please select a location")
        return
      }

      if (!dataToUse.products || dataToUse.products.length === 0) {
        toast.error("Please add at least one product")
        return
      }

      // Build delivery_date_time from delivery_date and delivery_time
      // Only set if both date and time are provided (for future orders, leave as null)
      const deliveryDateTime = dataToUse.delivery_date && dataToUse.delivery_time
        ? `${dataToUse.delivery_date} ${dataToUse.delivery_time}:00`
        : null

      // Transform data to match backend API format (matching quotes structure)
      const orderPayload: any = {
        customer_id: dataToUse.customer_id,
        location_id: dataToUse.location_id,
        company_id: dataToUse.company_id || null,       // ← was missing
        department_id: dataToUse.department_id || null, // ← was missing
        delivery_date: dataToUse.delivery_date || null,
        delivery_time: dataToUse.delivery_time || null, // Send time separately
        delivery_date_time: deliveryDateTime, // Combined date and time
        delivery_fee: parseFloat((dataToUse.delivery_fee || 0).toString()),
        order_comments: dataToUse.order_comments || null,
        coupon_code: dataToUse.coupon_code || null,
        delivery_address: dataToUse.delivery_address || null,
        delivery_method: dataToUse.delivery_method || 'pickup',
        delivery_contact: dataToUse.delivery_contact || null,
        delivery_details: dataToUse.delivery_details || null,
        account_email: dataToUse.account_email || null,
        cost_center: dataToUse.cost_center || null,
        standing_order: dataToUse.standing_order || 0, // 0 = one-time order, >0 = subscription frequency in days
        products: dataToUse.products.map(product => ({
          product_id: product.product_id,
          quantity: product.quantity,
          price: Number((product as any).base_price) > 0 ? (product as any).base_price : product.price,
          comment: product.comment || null,
          add_ons: (product.add_ons || []).map(addon => ({
            ...addon,
            // Use base_price only when it's actually set (> 0); otherwise use display price (e.g. $20)
            price: Number((addon as any).base_price) > 0 ? Number((addon as any).base_price) : addon.price
          }))
        }))
      }

      console.log("Saving order:", orderPayload)
      console.log("💰 ADD-ONS PRICE DEBUG:", JSON.stringify(
        orderPayload.products.map((p: any) => ({
          name: p.name || p.product_id,
          price: p.price,
          add_ons: (p.add_ons || []).map((a: any) => ({
            name: a.name,
            price: a.price,
            base_price: a.base_price,
            quantity: a.quantity
          }))
        })), null, 2
      ))
      console.log("Coupon data:", {
        coupon_code: orderPayload.coupon_code,
        coupon_type: dataToUse.coupon_type,
        coupon_discount: dataToUse.coupon_discount
      })

      const response = await ordersAPI.create(orderPayload)

      if (response.data) {
        // Invalidate ALL orders queries (prefix match) so any cached tab refreshes
        await queryClient.invalidateQueries({ queryKey: ['orders'], exact: false, refetchType: 'all' })
        toast.success("Order created successfully!")
        router.push(`/orders?tab=future&refresh=${Date.now()}`)
      }
    } catch (error: any) {
      console.error("Error saving order:", error)
      toast.error(error.response?.data?.message || "Failed to create order")
    }
  }

  return (
    <div className="bg-gray-50 " style={{ fontFamily: 'Albert Sans' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontWeight: 700 }}>
            Place New Order
          </h1>
          <p className="text-gray-600 mt-1">
            {currentStep === 1 && "Select Customer"}
            {currentStep === 2 && `Select products for ${orderData.customer_name || "John Doe"}`}
            {currentStep === 3 && `Add Delivery details & send`}
          </p>
        </div>

        {currentStep === 2 && (
          <Button
            onClick={() => router.push("/admin/products?add=true")}
            className="bg-[#C62828] hover:bg-[#B71C1C] text-white gap-2 rounded-lg"
            style={{ fontWeight: 600 }}
          >
            <span className="text-lg">+</span>
            Add New Product
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-end gap-4 mb-8">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${currentStep === step.number
                  ? "bg-[#C62828] text-white"
                  : currentStep > step.number
                    ? "bg-[#C62828] text-white"
                    : "bg-gray-300 text-gray-600"
                  }`}
              >
                {currentStep > step.number ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span style={{ fontWeight: 600 }}>{step.number}</span>
                )}
              </div>
              <span
                className={`text-xs mt-2 whitespace-nowrap ${currentStep === step.number ? "text-[#055160] font-semibold" : "text-gray-600"
                  }`}
                style={{ fontFamily: 'Albert Sans' }}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-24 h-0.5 mx-2 mt-[-20px] ${currentStep > step.number ? "bg-[#C62828]" : "bg-gray-300"
                  }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <CustomerStep
          data={orderData}
          onUpdate={updateOrderData}
          onNext={handleNext}
          showAddCustomerModal={showAddCustomerModal}
          onCloseAddCustomerModal={() => setShowAddCustomerModal(false)}
          onOpenAddCustomerModal={() => setShowAddCustomerModal(true)}
        />
      )}
      {currentStep === 2 && (
        <ProductsStep
          data={orderData}
          onUpdate={updateOrderData}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 3 && (
        <DeliveryStep
          data={orderData}
          onUpdate={updateOrderData}
          onSave={handleSaveOrder}
          onBack={handleBack}
        />
      )}
    </div>
  )
}

