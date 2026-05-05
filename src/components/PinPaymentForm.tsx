"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CreditCard, Lock } from "lucide-react"
import { toast } from "sonner"
// Pin Payments is deprecated - Stripe is now the primary payment gateway

declare global {
  interface Window {
    Pin: any
  }
}

interface PinPaymentFormProps {
  orderId: number
  amount: number
  onSuccess: () => void
  onError: (error: string) => void
}

export function PinPaymentForm({ orderId, amount, onSuccess, onError }: PinPaymentFormProps) {
  const [loading, setLoading] = useState(false)
  const [pinInitialized, setPinInitialized] = useState(false)
  const [publishableKey, setPublishableKey] = useState<string>("")
  const formRef = useRef<HTMLFormElement>(null)
  const initAttemptedRef = useRef(false)

  useEffect(() => {
    // Prevent multiple initialization attempts
    if (initAttemptedRef.current) {
      return
    }
    initAttemptedRef.current = true

    let script: HTMLScriptElement | null = null

    const initializePin = async () => {
      try {
        let key: string | null = null

        // Use environment variable for Pin Payments key (legacy - replaced by Stripe)
        key = process.env.NEXT_PUBLIC_PINPAYMENTS_PUBLISHABLE_KEY || null
        if (!key) {
          throw new Error("Pin Payments not configured. Payment processing has moved to Stripe.")
        }

        if (!key) {
          throw new Error("Pin Payments publishable key not found")
        }

        setPublishableKey(key)

        // Function to initialize Pin after script loads
        const initPinLibrary = (attempt = 0): boolean => {
          // Check multiple ways Pin.js might expose itself
          const Pin = (window as any).Pin || (globalThis as any).Pin || (window as any).pinpayments

          if (!Pin) {
            return false
          }

          // Try different initialization methods
          if (typeof Pin.setPublishableKey === 'function') {
            try {
              Pin.setPublishableKey(key!)
              setPinInitialized(true)
              return true
            } catch (error) {
              // Silent fail, try next method
            }
          }

          // Try setting as property
          if (attempt === 0 && !Pin.publishableKey) {
            try {
              Pin.publishableKey = key!
              // Verify it was set
              if (Pin.publishableKey === key!) {
                setPinInitialized(true)
                return true
              }
            } catch (error) {
              // Silent fail, try next method
            }
          }

          if (typeof Pin.configure === 'function') {
            try {
              Pin.configure({ publishableKey: key! })
              setPinInitialized(true)
              return true
            } catch (error) {
              // Silent fail, try next method
            }
          }

          if (typeof Pin.init === 'function') {
            try {
              Pin.init({ publishableKey: key! })
              setPinInitialized(true)
              return true
            } catch (error) {
              // Silent fail, try next method
            }
          }

          // Maybe Pin.js v2 doesn't need initialization - try to use createToken directly
          if (typeof Pin.createToken === 'function') {
            // Store the key for later use in createToken
            setPinInitialized(true)
            return true
          }

          return false
        }

        // Check if Pin.js is already loaded
        if (initPinLibrary()) {
          return
        }

        // Check if script is already in the document
        const existingScript = document.querySelector('script[src="https://cdn.pinpayments.com/pin.v2.js"]')
        if (existingScript) {
          // Script already exists, wait a bit and try again
          setTimeout(() => {
            let retries = 0
            const maxRetries = 10
            const checkInterval = setInterval(() => {
              retries++
              if (initPinLibrary(retries - 1)) {
                clearInterval(checkInterval)
              } else if (retries >= maxRetries) {
                clearInterval(checkInterval)
                toast.error("Pin.js library not loaded correctly")
                onError("Pin.js library not loaded correctly")
              }
            }, 200)
          }, 100)
          return
        }

        // Load Pin.js script
        script = document.createElement("script")
        script.src = "https://cdn.pinpayments.com/pin.v2.js"
        script.type = "text/javascript"
        script.async = true
        script.defer = true

        script.onload = () => {
          // Retry initialization with multiple attempts
          let retries = 0
          const maxRetries = 10
          const checkInterval = setInterval(() => {
            retries++
            if (initPinLibrary(retries - 1)) {
              clearInterval(checkInterval)
            } else if (retries >= maxRetries) {
              clearInterval(checkInterval)
              toast.error("Pin.js library not loaded correctly. Please refresh the page.")
              onError("Pin.js library not loaded correctly")
            }
          }, 200)
        }

        script.onerror = () => {
          toast.error("Failed to load Pin Payments script. Please check your internet connection.")
          onError("Failed to load Pin.js script")
        }

        // Append to head instead of body (recommended by Pin Payments)
        document.head.appendChild(script)
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || "Failed to load payment gateway"
        toast.error(errorMessage)
        onError(errorMessage)
      }
    }

    initializePin()

    return () => {
      // Cleanup script on unmount (only if we created it)
      if (script && (document.head.contains(script) || document.body.contains(script))) {
        try {
          if (document.head.contains(script)) {
            document.head.removeChild(script)
          } else if (document.body.contains(script)) {
            document.body.removeChild(script)
          }
        } catch (e) {
          // Silent cleanup error
        }
      }
    }
  }, [orderId, onError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Get Pin.js library
    const Pin = (window as any).Pin || (globalThis as any).Pin
    if (!pinInitialized || !Pin || typeof Pin.createToken !== 'function') {
      toast.error("Payment gateway not ready. Please wait...")
      return
    }

    setLoading(true)

    try {
      // Get customer IP address
      const ipResponse = await fetch("https://api.ipify.org?format=json")
      const ipData = await ipResponse.json()
      const ipAddress = ipData.ip || "127.0.0.1"

      // Create card token using Pin.js
      // If Pin.js doesn't use setPublishableKey, we may need to pass the key in the form or options
      const tokenOptions: any = {}

      // Some Pin.js versions require the key to be passed with createToken
      if (!Pin.publishableKey && publishableKey) {
        tokenOptions.publishableKey = publishableKey
      }

      Pin.createToken(formRef.current, (result: any) => {
        if (result.error) {
          setLoading(false)
          toast.error(result.error_description || "Card validation failed")
          onError(result.error_description || "Card validation failed")
          return
        }

        // Token created successfully, process payment
        const cardToken = result.token

        // Pin Payments is deprecated - Stripe is now the primary gateway
        setLoading(false)
        const errorMsg = "Pin Payments is no longer supported. Please use Stripe."
        toast.error(errorMsg)
        onError(errorMsg)
      })
    } catch (error: any) {
      setLoading(false)
      const errorMsg = error.message || "Failed to process payment"
      toast.error(errorMsg)
      onError(errorMsg)
    }
  }

  if (!pinInitialized) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4" />
        <p className="text-gray-600">Loading payment gateway...</p>
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-2"
      data-pin-publishable-key={publishableKey}
    >
      <div className="space-y-2">
        <Label htmlFor="card-number">Card Number</Label>
        <div className="relative">
          <Input
            id="card-number"
            name="number"
            type="text"
            inputMode="numeric"
            placeholder="4242 4242 4242 4242"
            required
            className="pl-10"
            maxLength={19}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              const formatted = val.match(/.{1,4}/g)?.join(' ') || '';
              e.target.value = formatted.substring(0, 19);
            }}
          />
          <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="expiry-month">Expiry Month</Label>
          <Input
            id="expiry-month"
            name="expiry_month"
            type="text"
            inputMode="numeric"
            placeholder="MM"
            required
            maxLength={2}
            pattern="[0-9]{2}"
            onChange={(e) => {
              e.target.value = e.target.value.replace(/\D/g, '').substring(0, 2);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiry-year">Expiry Year</Label>
          <Input
            id="expiry-year"
            name="expiry_year"
            type="text"
            inputMode="numeric"
            placeholder="YY"
            required
            maxLength={2}
            pattern="[0-9]{2}"
            onChange={(e) => {
              e.target.value = e.target.value.replace(/\D/g, '').substring(0, 2);
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cvc">CVC</Label>
        <div className="relative">
          <Input
            id="cvc"
            name="cvc"
            type="text"
            inputMode="numeric"
            placeholder="123"
            required
            className="pl-10"
            maxLength={4}
            pattern="[0-9]{3,4}"
            onChange={(e) => {
              e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
            }}
          />
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Cardholder Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="John Doe"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={loading || !pinInitialized}
        className="w-full bg-[#C62828] hover:bg-[#B71C1C] text-white"
        size="sm"
        style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            Pay ${amount.toFixed(2)}
          </>
        )}
      </Button>

      <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        Your payment information is secure and encrypted
      </p>
    </form>
  )
}


