"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { CustomerStep } from "./components/CustomerStep"
import { ProductsStep } from "./components/ProductsStep"
import { DeliveryStep } from "./components/DeliveryStep"
import { Check } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"

export interface QuoteData {
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
}

export default function NewQuotePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [quoteData, setQuoteData] = useState<QuoteData>({
    products: [],
  })
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)

  const steps = [
    { number: 1, label: "Select Customer" },
    { number: 2, label: "Select Products" },
    { number: 3, label: "Add Delivery Details" },
  ]

  const updateQuoteData = (data: Partial<QuoteData>) => {
    setQuoteData((prev) => ({ ...prev, ...data }))
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

  const handleSaveQuote = async (latestData?: Partial<QuoteData>) => {
    try {
      // Use latestData if provided (from DeliveryStep), otherwise use quoteData state
      // This ensures we have the latest coupon data even if state hasn't updated yet
      const dataToUse = latestData ? { ...quoteData, ...latestData } : quoteData

      // Check if we need to send email (passed from DeliveryStep)
      const sendToEmail = (latestData as any)?.send_to_email

      // Transform products to use base_price for backend calculation
      // Backend will apply additional customer-specific discounts
      const transformedProducts = dataToUse.products?.map(product => ({
        ...product,
        price: (product as any).base_price || product.price, // Use base_price if available, otherwise use price
        add_ons: product.add_ons?.map(addon => ({
          ...addon,
          price: (addon as any).base_price || addon.price, // Use base_price if available
        })) || []
      })) || []

      const quotePayload = {
        ...dataToUse,
        products: transformedProducts
      }

      // Remove temporary fields not for backend
      if ('send_to_email' in quotePayload) {
        delete (quotePayload as any).send_to_email
      }

      // API call to save quote
      console.log("Saving quote:", quotePayload)
      console.log("Coupon data:", {
        coupon_code: quotePayload.coupon_code,
        coupon_type: quotePayload.coupon_type,
        coupon_discount: quotePayload.coupon_discount
      })

      const response = await api.post("/admin/quotes", quotePayload)

      if (response.data) {
        const quoteId = response.data.quote?.order_id

        // If email requested and we have a quote ID
        if (sendToEmail && quoteId) {
          try {
            console.log(`Sending email to ${sendToEmail} for quote ${quoteId}`)
            await api.post(`/admin/quotes/${quoteId}/send-email`, {
              recipient_email: sendToEmail
            })
            toast.success(`Quote saved and email sent to ${sendToEmail}`)
          } catch (emailError) {
            console.error("Error sending email:", emailError)
            toast.error("Quote saved but failed to send email")
          }
        } else {
          toast.success("Quote saved successfully!")
        }

        // Invalidate quotes query cache to refresh the list
        queryClient.invalidateQueries({ queryKey: ["quotes"] })
        router.push("/quotes?success=true")
      }
    } catch (error: any) {
      console.error("Error saving quote:", error)
      toast.error(error.response?.data?.message || "Failed to save quote")
    }
  }

  return (
    <div className="bg-gray-50 " style={{ fontFamily: 'Albert Sans' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontWeight: 700 }}>
            Place Quote
          </h1>
          <p className="text-gray-600 mt-1">
            {currentStep === 1 && "Select Customer"}
            {currentStep === 2 && `Select products for ${quoteData.customer_name || "John Doe"}`}
            {currentStep === 3 && `Add Delivery details & send to ${quoteData.customer_name || "customer"}`}
          </p>
        </div>
        {currentStep === 1 && (
          <Button
            onClick={() => setShowAddCustomerModal(true)}
            className="bg-[#055160] hover:bg-[#04414d] text-white gap-2 rounded-lg"
            style={{ fontWeight: 600 }}
          >
            <span className="text-lg">+</span>
            Add Customer
          </Button>
        )}
        {currentStep === 2 && (
          <Button
            className="bg-[#055160] hover:bg-[#04414d] text-white gap-2 rounded-lg"
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
                    ? "bg-[#055160] text-white"
                    : currentStep > step.number
                      ? "bg-[#055160] text-white"
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
                className={`w-24 h-0.5 mx-2 mt-[-20px] ${currentStep > step.number ? "bg-[#055160]" : "bg-gray-300"
                  }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <CustomerStep
          data={quoteData}
          onUpdate={updateQuoteData}
          onNext={handleNext}
          showAddCustomerModal={showAddCustomerModal}
          onCloseAddCustomerModal={() => setShowAddCustomerModal(false)}
        />
      )}
      {currentStep === 2 && (
        <ProductsStep
          data={quoteData}
          onUpdate={updateQuoteData}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 3 && (
        <DeliveryStep
          data={quoteData}
          onUpdate={updateQuoteData}
          onSave={handleSaveQuote}
          onBack={handleBack}
        />
      )}
    </div>
  )
}

