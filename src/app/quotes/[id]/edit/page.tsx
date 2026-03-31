"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { CustomerStep } from "../../new/components/CustomerStep"
import { ProductsStep } from "../../new/components/ProductsStep"
import { DeliveryStep } from "../../new/components/DeliveryStep"
import { Check, ArrowLeft } from "lucide-react"
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
      option_value_id?: number // Include for discount calculations
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

export default function EditQuotePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const quoteId = params?.id as string | undefined
  
  // Start at step 2 (products) by default, or use step from URL query param
  const initialStep = searchParams?.get('step') ? parseInt(searchParams.get('step') || '2') : 2
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [quoteData, setQuoteData] = useState<QuoteData>({
    products: [],
  })
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  const steps = [
    { number: 1, label: "Customer Details" },
    { number: 2, label: "Select Products" },
    { number: 3, label: "Delivery Details" },
  ]

  // Validate quoteId
  const isValidQuoteId = quoteId && !isNaN(Number(quoteId)) && Number(quoteId) > 0

  // Fetch existing quote data
  const { data: existingQuote, isLoading, error, refetch } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: async () => {
      if (!quoteId || !isValidQuoteId) {
        throw new Error('Invalid quote ID')
      }
      console.log('Fetching quote:', quoteId)
      const response = await api.get(`/admin/quotes/${quoteId}`)
      console.log('Quote fetched:', response.data.quote)
      return response.data.quote
    },
    enabled: !!isValidQuoteId, // Only fetch if quoteId exists and is valid
    retry: 2, // Retry twice on failure
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Always refetch on mount
  })

  // Reset data loaded state when quoteId changes
  useEffect(() => {
    console.log('QuoteId changed:', quoteId)
    setIsDataLoaded(false)
    setQuoteData({ products: [] })
    // Start at step 2 (products) by default, or use step from URL query param
    const stepFromUrl = searchParams?.get('step') ? parseInt(searchParams.get('step') || '2') : 2
    setCurrentStep(stepFromUrl)
  }, [quoteId, searchParams])

  // Handle quote data loading with improved error handling
  useEffect(() => {
    if (existingQuote && !isDataLoaded) {
      console.log('Processing quote data:', existingQuote)
      // Use a longer delay to ensure all data is ready and avoid race conditions
      const timer = setTimeout(() => {
        try {
          const quote = existingQuote
          
          // Validate that we have essential data
          if (!quote || !quote.order_id) {
            console.error('Invalid quote data:', quote)
            toast.error('Invalid quote data received')
            return
          }
          
          // Map quote data to QuoteData structure
          const mappedProducts = quote.products?.map((product: any) => ({
            product_id: product.product_id,
            name: product.product_name,
            category: 'N/A',
            price: parseFloat(product.price || 0),
            quantity: product.quantity,
            comment: product.product_comment || product.comment || '',
            add_ons: product.options?.map((option: any) => ({
              name: `${option.option_name}: ${option.option_value}`,
              price: parseFloat(option.option_price || 0),
              quantity: option.option_quantity || 1,
              option_value_id: option.option_value_id // Include for discount calculations
            })) || []
          })) || []

          // Extract date and time directly from the raw string to avoid timezone shifts.
          let rawDate: string | undefined = undefined
          let rawTime: string | undefined = undefined
          if (quote.delivery_date_time) {
            const dtStr = quote.delivery_date_time.toString()
            const normalized = dtStr.replace('T', ' ').replace('Z', '').split('+')[0]
            const parts = normalized.split(' ')
            rawDate = parts[0] // "2026-03-20"
            rawTime = parts[1] ? parts[1].slice(0, 5) : undefined // "14:30"
          }
          
          // Ensure all customer fields are properly set, handling null/undefined values
          const customerName = quote.firstname || quote.lastname 
            ? `${quote.firstname || ''} ${quote.lastname || ''}`.trim()
            : quote.customer_name || ''
          
          const mappedQuoteData: QuoteData = {
            company_id: quote.company_id || undefined,
            department_id: quote.department_id || undefined,
            customer_id: quote.customer_id || undefined,
            customer_name: customerName,
            customer_type: quote.customer_type || undefined,
            phone: quote.telephone || '',
            email: quote.email || '',
            location: quote.location_name || '',
            location_id: quote.location_id || undefined,
            products: mappedProducts,
            delivery_date: rawDate,
            delivery_time: rawTime,
            delivery_address: quote.delivery_address || '',
            delivery_fee: parseFloat(quote.delivery_fee || 0),
            coupon_code: quote.coupon_code || '',
            coupon_type: quote.coupon_type || undefined,
            coupon_discount: quote.coupon_discount ? parseFloat(quote.coupon_discount.toString()) : (quote.coupon_id ? 0 : undefined),
            order_comments: quote.order_comments || '',
            account_email: quote.account_email || '',
            cost_center: quote.cost_center || '',
            delivery_contact: quote.delivery_contact || '',
            delivery_details: quote.delivery_details || '',
            delivery_method: quote.delivery_method || 'pickup',
          }
          
          console.log('Setting quote data:', mappedQuoteData)
          setQuoteData(mappedQuoteData)
          setIsDataLoaded(true)
          console.log('Quote data loaded successfully')
        } catch (err) {
          console.error('Error processing quote data:', err)
          toast.error('Failed to process quote data')
        }
      }, 200) // Increased delay to ensure data is fully ready
      
      return () => clearTimeout(timer)
    }
  }, [existingQuote, isDataLoaded])

  // Handle error with retry option
  useEffect(() => {
    if (error) {
      console.error("Error fetching quote:", error)
      // Don't redirect immediately, allow user to retry
      toast.error("Failed to load quote details. Please try again.", {
        action: {
          label: "Retry",
          onClick: () => {
            if (quoteId && isValidQuoteId) {
              refetch()
            }
          }
        }
      })
    }
  }, [error, router, quoteId, isValidQuoteId, refetch])

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

  const handleUpdateQuote = async () => {
    try {
      // Validate required fields
      if (!quoteData.customer_id) {
        toast.error("Customer is required")
        return
      }

      if (!quoteData.products || !Array.isArray(quoteData.products) || quoteData.products.length === 0) {
        toast.error("At least one product is required")
        return
      }

      // Validate products
      for (const product of quoteData.products) {
        if (!product || typeof product !== 'object') {
          toast.error("Invalid product data found")
          return
        }
        if (!product.product_id) {
          toast.error(`Product "${product.name || 'Unknown'}" is missing product ID`)
          return
        }
        if (!product.quantity || product.quantity <= 0 || !Number.isInteger(product.quantity)) {
          toast.error(`Product "${product.name || 'Unknown'}" must have a valid quantity greater than 0`)
          return
        }
        if (product.price === undefined || product.price === null || isNaN(product.price) || product.price < 0) {
          toast.error(`Product "${product.name || 'Unknown'}" must have a valid price`)
          return
        }
        
        // Validate add_ons if present
        if (product.add_ons && Array.isArray(product.add_ons)) {
          for (const addon of product.add_ons) {
            if (!addon || typeof addon !== 'object') {
              toast.error(`Invalid add-on data for product "${product.name || 'Unknown'}"`)
              return
            }
            if (addon.quantity !== undefined && (isNaN(addon.quantity) || addon.quantity < 0)) {
              toast.error(`Add-on quantity for product "${product.name || 'Unknown'}" must be a valid number`)
              return
            }
            if (addon.price !== undefined && (isNaN(addon.price) || addon.price < 0)) {
              toast.error(`Add-on price for product "${product.name || 'Unknown'}" must be a valid number`)
              return
            }
          }
        }
      }

      // Validate delivery fee is a number
      if (quoteData.delivery_fee !== undefined && quoteData.delivery_fee !== null && (isNaN(quoteData.delivery_fee) || quoteData.delivery_fee < 0)) {
        toast.error("Delivery fee must be a valid number greater than or equal to 0")
        return
      }

      // Validate delivery contact if provided
      if (quoteData.delivery_contact && typeof quoteData.delivery_contact !== 'string') {
        toast.error("Delivery contact must be a valid string")
        return
      }

      // Validate delivery address if delivery method is delivery
      if (quoteData.delivery_method === 'delivery' && (!quoteData.delivery_address || quoteData.delivery_address.trim() === '')) {
        toast.error("Delivery address is required when delivery method is 'Delivery'")
        return
      }

      // Validate email format if provided
      if (quoteData.account_email && quoteData.account_email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(quoteData.account_email)) {
          toast.error("Please enter a valid email address")
          return
        }
      }

      // Use latestData if provided (from DeliveryStep), otherwise use quoteData state
      // This ensures we have the latest delivery data even if state hasn't updated yet
      const dataToUse = quoteData // Quotes sends entire object, so this is fine
      
      console.log("Updating quote:", dataToUse)
      console.log("Coupon data in update:", {
        coupon_code: dataToUse.coupon_code,
        coupon_type: dataToUse.coupon_type,
        coupon_discount: dataToUse.coupon_discount
      })
      console.log("Delivery fields:", {
        delivery_date: dataToUse.delivery_date,
        delivery_time: dataToUse.delivery_time,
        delivery_date_time: dataToUse.delivery_date_time,
        delivery_address: dataToUse.delivery_address,
        delivery_method: dataToUse.delivery_method,
      })
      
      const response = await api.put(`/admin/quotes/${quoteId}`, dataToUse)
      
      if (response.data) {
        // Invalidate quotes query cache to refresh the list
        queryClient.invalidateQueries({ queryKey: ["quotes"] })
        // Also invalidate the specific quote cache
        queryClient.invalidateQueries({ queryKey: ["quote", quoteId] })
        toast.success("Quote updated successfully!")
        router.push("/quotes?success=true")
      }
    } catch (error: any) {
      console.error("Error updating quote:", error)
      const errorMessage = error.response?.data?.message || error.message || "Failed to update quote"
      toast.error(errorMessage)
    }
  }

  // Show error if quoteId is invalid
  if (!isValidQuoteId) {
    return (
      <div className="flex items-center justify-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <p className="text-[#C62828] mb-2" style={{ fontFamily: 'Albert Sans' }}>
            Invalid Quote ID
          </p>
          {quoteId && (
            <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Albert Sans' }}>
              Quote ID: {quoteId}
            </p>
          )}
          <button
            onClick={() => router.push('/quotes')}
            className="mt-4 px-4 py-2 bg-[#C62828] text-white rounded-lg hover:bg-[#B71C1C] transition-colors"
            style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
          >
            Go Back to Quotes
          </button>
        </div>
      </div>
    )
  }

  // Show loading state with spinner
  if (isLoading || !isDataLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C62828] mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2" style={{ fontFamily: 'Albert Sans' }}>
            Loading quote data...
          </p>
          {quoteId && (
            <p className="text-sm text-gray-500" style={{ fontFamily: 'Albert Sans' }}>
              Quote ID: {quoteId}
            </p>
          )}
          {error && (
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-[#C62828] text-white rounded-lg hover:bg-[#B71C1C] transition-colors"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 " style={{ fontFamily: 'Albert Sans' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/quotes')}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900" style={{ fontWeight: 700 }}>
              Edit Quote #{quoteId}
            </h1>
            <p className="text-gray-600 mt-1">
              {currentStep === 1 && "Update Customer Details"}
              {currentStep === 2 && `Update products for ${quoteData.customer_name || "customer"}`}
              {currentStep === 3 && `Update Delivery details for ${quoteData.customer_name || "customer"}`}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-end gap-4 mb-8">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  currentStep === step.number
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
                className={`text-xs mt-2 whitespace-nowrap ${
                  currentStep === step.number ? "text-[#C62828] font-semibold" : "text-gray-600"
                }`}
                style={{ fontFamily: 'Albert Sans' }}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-24 h-0.5 mx-2 mt-[-20px] ${
                  currentStep > step.number ? "bg-[#C62828]" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {currentStep === 1 && isDataLoaded && (
        <CustomerStep
          data={quoteData}
          onUpdate={updateQuoteData}
          onNext={handleNext}
        />
      )}
      {currentStep === 1 && !isDataLoaded && (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600" style={{ fontFamily: 'Albert Sans' }}>Loading quote data...</p>
        </div>
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
          onSave={handleUpdateQuote}
          onBack={handleBack}
        />
      )}
    </div>
  )
}

