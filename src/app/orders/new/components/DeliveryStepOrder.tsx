"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ValidatedInput } from "@/components/ui/validated-input"
import { ValidatedTextarea } from "@/components/ui/validated-textarea"
import { ValidationRules } from "@/lib/validation"
import { ChevronLeft, Mail, CheckCircle, Tag, GripVertical } from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { OrderData } from "../page"
import api from "@/lib/api"
import { locationsAPI, companiesAPI } from "@/lib/api"
import { toast } from "sonner"
import { formatAustralianPhone, cleanPhoneNumber, getPhonePlaceholder, getPhoneValidationError } from "@/lib/phone-mask"

interface DeliveryStepProps {
  data: OrderData
  onUpdate: (data: Partial<OrderData>) => void
  onSave: (data?: Partial<OrderData>) => void
  onBack: () => void
}

interface Coupon {
  coupon_id: number
  coupon_code: string
  type: 'P' | 'F' // P = percentage, F = fixed
  coupon_discount: number
  status: number
}

interface Location {
  location_id: number
  location_name: string
  pickup_address: string
}

// Sortable Product Item Component for Order Summary
function SortableProductItem({ product, index, onReorder }: {
  product: OrderData['products'][0]
  index: number
  onReorder: (oldIndex: number, newIndex: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `product-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-b">
      <td className="py-2" style={{ fontFamily: 'Albert Sans' }}>
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing mt-1"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1">
            {product.name}
            {product.add_ons && product.add_ons.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Add ons: {product.add_ons.map(a => a.name).join(", ")}
              </div>
            )}
            {product.comment && (
              <div className="text-xs text-gray-600 mt-1 italic">
                Note: {product.comment}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="py-2 text-center" style={{ fontFamily: 'Albert Sans' }}>
        <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-md w-fit mx-auto">
          <button className="px-2 py-1 text-gray-600">-</button>
          <span>{product.quantity}</span>
          <button className="px-2 py-1 text-gray-600">+</button>
        </div>
      </td>
      <td className="py-2 text-right" style={{ fontFamily: 'Albert Sans' }}>
        ${product.price.toFixed(2)}
      </td>
    </tr>
  )
}

export function DeliveryStep({ data, onUpdate, onSave, onBack }: DeliveryStepProps) {
  const [products, setProducts] = useState(data.products || [])

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().replace('product-', ''))
      const newIndex = parseInt(over.id.toString().replace('product-', ''))
      const reorderedProducts = arrayMove(products, oldIndex, newIndex)
      setProducts(reorderedProducts)
      onUpdate({ products: reorderedProducts })
    }
  }
  // Parse delivery_contact from "Name|Number" format
  const parseDeliveryContact = (contact: string | undefined) => {
    if (!contact) return { name: "", number: "" }
    const parts = contact.split("|")
    return { name: parts[0] || "", number: parts[1] || "" }
  }

  // Parse delivery_details - now just returns notes as-is (backward compatible with old format)
  const parseDeliveryDetails = (details: string | undefined) => {
    if (!details) return ""
    // If it's the old structured format, extract the values and combine them
    const timeMatch = details.match(/Time:\s*(.+)/i)
    const locationMatch = details.match(/Location:\s*(.+)/i)
    const nameMatch = details.match(/Name:\s*(.+)/i)
    
    // If it matches old format, combine into notes
    if (timeMatch || locationMatch || nameMatch) {
      const parts = []
      if (timeMatch) parts.push(`Time: ${timeMatch[1].trim()}`)
      if (locationMatch) parts.push(`Location: ${locationMatch[1].trim()}`)
      if (nameMatch) parts.push(`Name: ${nameMatch[1].trim()}`)
      return parts.join('\n')
    }
    
    // Otherwise return as-is (new format)
    return details
  }

  // Parse delivery_date_time to extract date and time
  const parseDeliveryDateTime = (dateTime: string | undefined) => {
    if (!dateTime) {
      // Return empty - no default date/time for future orders/quotes
      return { date: "", time: "" }
    }
    
    try {
      // Handle ISO format (e.g., "2026-01-03T18:30:00.000Z")
      if (dateTime.includes('T')) {
        const dateObj = new Date(dateTime)
        if (!isNaN(dateObj.getTime())) {
          // Extract date in YYYY-MM-DD format (use local date, not UTC)
          const year = dateObj.getFullYear()
          const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
          const day = dateObj.getDate().toString().padStart(2, '0')
          const date = `${year}-${month}-${day}`
          // Extract time in HH:MM format (use local time, not UTC)
          const hours = dateObj.getHours().toString().padStart(2, '0')
          const minutes = dateObj.getMinutes().toString().padStart(2, '0')
          const time = `${hours}:${minutes}`
          console.log('Parsed ISO dateTime:', dateTime, 'to date:', date, 'time:', time)
          return { date, time }
        }
      }
      
      // Handle "YYYY-MM-DD HH:MM:SS" format
      const parts = dateTime.split(' ')
      if (parts.length >= 2) {
        const date = parts[0] || ""
        const time = parts[1] ? parts[1].substring(0, 5) : "" // Extract HH:MM from HH:MM:SS
        return { date, time }
      }
      
      // Handle "YYYY-MM-DD" format (date only)
      if (dateTime.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return { date: dateTime, time: "" }
      }
    } catch (error) {
      console.error('Error parsing delivery_date_time:', error, dateTime)
    }
    
    return { date: "", time: "" }
  }

  const initialDeliveryContact = parseDeliveryContact(data.delivery_contact)
  const initialDeliveryDetails = parseDeliveryDetails(data.delivery_details)
  const initialDeliveryDateTime = parseDeliveryDateTime(data.delivery_date_time)
  const [deliveryDate, setDeliveryDate] = useState(initialDeliveryDateTime.date || "")
  const [deliveryTime, setDeliveryTime] = useState(data.delivery_time || initialDeliveryDateTime.time || "")
  const [accountEmail, setAccountEmail] = useState(data.account_email || "")
  const [costCenter, setCostCenter] = useState(data.cost_center || "")
  const [deliveryContactName, setDeliveryContactName] = useState(initialDeliveryContact.name)
  const [deliveryContactNumber, setDeliveryContactNumber] = useState(initialDeliveryContact.number)
  const [deliveryNotes, setDeliveryNotes] = useState(initialDeliveryDetails)
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">(data.delivery_method || "delivery")
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<number>(data.location_id || 0)
  const [selectedLocation, setSelectedLocation] = useState<number>(data.location_id || 0) // Always required location
  const [deliveryAddress, setDeliveryAddress] = useState(data.delivery_address || "")
  const [deliveryFee, setDeliveryFee] = useState(data.delivery_fee || 0)
  const [couponCode, setCouponCode] = useState(data.coupon_code || "")
  const [orderComments, setOrderComments] = useState(data.order_comments || "")
  const [standingOrder, setStandingOrder] = useState<number>(data.standing_order || 0)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [sendEmail, setSendEmail] = useState(data.email || "")
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [showCouponList, setShowCouponList] = useState(false)

  // Fetch active coupons (status=1 means active)
  const { data: couponsData } = useQuery({
    queryKey: ['coupons-active'],
    queryFn: async () => {
      const response = await api.get('/admin/coupons?status=1&limit=100')
      return response.data
    }
  })

  // Fetch locations for pickup addresses
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await locationsAPI.list()
      return response.data
    }
  })

  // Fetch company details
  const { data: companyData } = useQuery({
    queryKey: ['company', data.company_id],
    queryFn: async () => {
      if (!data.company_id) return null
      try {
        const response = await companiesAPI.get(data.company_id)
        return response.data
      } catch {
        return null
      }
    },
    enabled: !!data.company_id
  })

  // Fetch department details
  const { data: departmentData } = useQuery({
    queryKey: ['department', data.company_id, data.department_id],
    queryFn: async () => {
      if (!data.company_id || !data.department_id) return null
      try {
        const response = await companiesAPI.getDepartments(data.company_id)
        const dept = response.data?.departments?.find((d: any) => d.department_id === data.department_id)
        return dept ? { department: dept } : null
      } catch {
        return null
      }
    },
    enabled: !!data.department_id && !!data.company_id
  })

  const activeCoupons = couponsData?.coupons || []
  const locations = locationsData?.locations || []
  const companyName = companyData?.company?.company_name || ''
  const departmentName = departmentData?.department?.department_name || ''

  // Auto-apply coupon when editing if coupon_code exists in data
  useEffect(() => {
    if (data.coupon_code) {
      // First try to find in active coupons
      const coupon = activeCoupons.find((c: Coupon) => 
        c.coupon_code.toLowerCase() === data.coupon_code?.toLowerCase()
      )
      
      if (coupon) {
        // Only update if the coupon code changed or coupon is not applied
        if (!appliedCoupon || appliedCoupon.coupon_code.toLowerCase() !== coupon.coupon_code.toLowerCase()) {
          setAppliedCoupon(coupon)
          setCouponCode(coupon.coupon_code)
        }
      } else if (data.coupon_type && data.coupon_discount) {
        // If coupon not found in active list but we have coupon data from order/quote, create a temporary coupon object
        const tempCoupon: Coupon = {
          coupon_id: 0, // Temporary ID
          coupon_code: data.coupon_code,
          type: data.coupon_type,
          coupon_discount: data.coupon_discount,
          status: 0 // Mark as inactive since it's not in active list
        }
        if (!appliedCoupon || appliedCoupon.coupon_code.toLowerCase() !== tempCoupon.coupon_code.toLowerCase()) {
          setAppliedCoupon(tempCoupon)
          setCouponCode(tempCoupon.coupon_code)
        }
      } else if (!appliedCoupon) {
        // If coupon code exists but no coupon data, just set the code
        setCouponCode(data.coupon_code)
      }
    } else if (!data.coupon_code && appliedCoupon) {
      // Clear coupon if it was removed from data
      setAppliedCoupon(null)
      setCouponCode("")
    }
  }, [data.coupon_code, data.coupon_type, data.coupon_discount, activeCoupons])

  // Parse delivery_contact and delivery_details from existing data
  useEffect(() => {
    // Parse delivery_contact (format: "Name|Number" or just name)
    if (data.delivery_contact) {
      const parsed = parseDeliveryContact(data.delivery_contact)
      setDeliveryContactName(parsed.name)
      setDeliveryContactNumber(parsed.number)
    }
    
    // Parse delivery_details (now just notes)
    if (data.delivery_details !== undefined) {
      setDeliveryNotes(parseDeliveryDetails(data.delivery_details))
    }
  }, [data.delivery_contact, data.delivery_details])

  // Sync all fields when data prop changes (for edit mode)
  useEffect(() => {
    console.log('DeliveryStep useEffect triggered - data:', {
      delivery_date_time: data.delivery_date_time,
      delivery_date: data.delivery_date,
      delivery_time: data.delivery_time,
    })
    
    if (data.products) setProducts(data.products)
    
    // Handle delivery_date_time - prioritize this over separate date/time
    if (data.delivery_date_time) {
      const parsed = parseDeliveryDateTime(data.delivery_date_time)
      console.log('Parsed delivery_date_time:', parsed, 'from:', data.delivery_date_time)
      // Always set date and time from parsed result (even if empty strings)
      console.log('Setting deliveryDate to:', parsed.date)
      setDeliveryDate(parsed.date || "")
      if (parsed.time) {
        console.log('Setting deliveryTime to:', parsed.time)
        setDeliveryTime(parsed.time)
      } else {
        // If no time in delivery_date_time, clear time field
        setDeliveryTime("")
      }
    } else {
      // Fallback to separate date/time fields if delivery_date_time is not available
      if (data.delivery_date !== undefined) {
        console.log('Setting deliveryDate from delivery_date:', data.delivery_date)
        setDeliveryDate(data.delivery_date || "")
      }
      if (data.delivery_time !== undefined) {
        console.log('Setting deliveryTime from delivery_time:', data.delivery_time)
        setDeliveryTime(data.delivery_time || "")
      }
    }
    
    if (data.account_email !== undefined) setAccountEmail(data.account_email || "")
    if (data.cost_center !== undefined) setCostCenter(data.cost_center || "")
    if (data.delivery_method !== undefined) setDeliveryMethod(data.delivery_method || "delivery")
    if (data.delivery_address !== undefined) setDeliveryAddress(data.delivery_address || "")
    if (data.delivery_fee !== undefined) setDeliveryFee(data.delivery_fee || 0)
    if (data.coupon_code !== undefined) setCouponCode(data.coupon_code || "")
    if (data.order_comments !== undefined) setOrderComments(data.order_comments || "")
    if (data.email !== undefined) setSendEmail(data.email || "")
    if (data.location_id !== undefined) {
      setSelectedPickupLocation(data.location_id || 0)
      setSelectedLocation(data.location_id || 0)
    }
    // Parse and set delivery contact
    if (data.delivery_contact !== undefined) {
      const parsed = parseDeliveryContact(data.delivery_contact || "")
      setDeliveryContactName(parsed.name)
      setDeliveryContactNumber(parsed.number)
    }
    // Parse and set delivery details (notes)
    if (data.delivery_details !== undefined) {
      setDeliveryNotes(parseDeliveryDetails(data.delivery_details || ""))
    }
    
    // Log current deliveryDate state for debugging
    console.log('Current deliveryDate state after useEffect:', deliveryDate)
  }, [data, data.delivery_date_time, data.delivery_date, data.delivery_time])
  
  // Log deliveryDate whenever it changes
  useEffect(() => {
    console.log('deliveryDate state changed to:', deliveryDate)
  }, [deliveryDate])

  const calculateSubtotal = () => {
    return products.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity
      const addOnsTotal = item.add_ons?.reduce((addOnSum, addOn) => addOnSum + (addOn.price * addOn.quantity), 0) || 0
      return sum + itemTotal + addOnsTotal
    }, 0)
  }

  const subtotal = calculateSubtotal()
  
  // Calculate wholesale discount if applicable
  let wholesaleDiscount = 0
  const customerType = data.customer_type || ''
  const isWholesale = customerType && (customerType.includes('Wholesale') || customerType.includes('Wholesaler'))
  
  if (isWholesale) {
    const discountPercentage = customerType.includes('Full Service') ? 15 : 10
    wholesaleDiscount = subtotal * (discountPercentage / 100)
  }
  
  const afterWholesaleDiscount = subtotal - wholesaleDiscount
  
  // Calculate coupon discount (applied after wholesale discount)
  let couponDiscount = 0
  if (appliedCoupon) {
    if (appliedCoupon.type === 'P') { // P for percentage
      couponDiscount = afterWholesaleDiscount * (appliedCoupon.coupon_discount / 100)
    } else if (appliedCoupon.type === 'F') { // F for fixed
      couponDiscount = appliedCoupon.coupon_discount
    }
    // Ensure discount doesn't exceed afterWholesaleDiscount
    couponDiscount = Math.min(couponDiscount, afterWholesaleDiscount)
  }

  const afterDiscount = afterWholesaleDiscount - couponDiscount
  const gst = afterDiscount * 0.1 // 10% GST on amount after discount
  const total = afterDiscount + gst + deliveryFee

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      // Find coupon from list
      const coupon = activeCoupons.find((c: Coupon) => 
        c.coupon_code.toLowerCase() === couponCode.toLowerCase()
      )
      
      if (coupon) {
        setAppliedCoupon(coupon)
        toast.success(`Coupon "${coupon.coupon_code}" applied successfully!`)
      } else {
        toast.error("Invalid or expired coupon code")
      }
    }
  }

  const handleSelectCoupon = (couponId: string) => {
    const coupon = activeCoupons.find((c: Coupon) => c.coupon_id === Number(couponId))
    if (coupon) {
      setCouponCode(coupon.coupon_code)
      setAppliedCoupon(coupon)
      setShowCouponList(false)
      toast.success(`Coupon "${coupon.coupon_code}" applied successfully!`)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode("")
    toast.info("Coupon removed")
  }

  const handleSaveOrder = () => {
    // Validate delivery address for delivery method
    if (deliveryMethod === 'delivery' && (!deliveryAddress || deliveryAddress.trim().length === 0)) {
      toast.error('Delivery Address is required when delivery method is selected')
      return
    }

    // Build delivery_contact as "Name|Number"
    const deliveryContact = deliveryContactName 
      ? `${deliveryContactName}${deliveryContactNumber ? `|${deliveryContactNumber}` : ''}`
      : ''
    
    // Build delivery_details from notes
    const deliveryDetails = deliveryNotes?.trim() || ''

    // Set delivery address based on method
    const finalDeliveryAddress = deliveryMethod === 'pickup' && selectedPickupLocation > 0
      ? locations.find((l: Location) => l.location_id === selectedPickupLocation)?.pickup_address || ''
      : deliveryAddress

    // Build delivery_date_time: allow date-only (with default time) or date+time
    let dateTime: string | undefined = undefined;
    if (deliveryDate) {
      if (deliveryTime) {
        // Both date and time provided
        dateTime = `${deliveryDate} ${deliveryTime}:00`;
      } else {
        // Only date provided, use default time (start of day)
        dateTime = `${deliveryDate} 00:00:00`;
      }
    }
    
    // Pass updateData to ensure coupon and delivery data are included even if state hasn't updated yet
    const updateData: any = {
      delivery_date: deliveryDate || undefined,
      delivery_time: deliveryTime || undefined,
      delivery_date_time: dateTime,
      account_email: accountEmail,
      cost_center: costCenter,
      delivery_contact: deliveryContact,
      delivery_details: deliveryDetails,
      delivery_method: deliveryMethod,
      delivery_address: (finalDeliveryAddress && finalDeliveryAddress.trim()) ? finalDeliveryAddress.trim() : undefined, // Pass address if provided and not empty
      delivery_fee: deliveryFee || 0,
      coupon_code: appliedCoupon?.coupon_code || undefined,
      coupon_type: appliedCoupon?.type || undefined,
      coupon_discount: appliedCoupon?.coupon_discount || undefined,
      order_comments: orderComments,
      standing_order: standingOrder,
      location_id: selectedLocation || (deliveryMethod === 'pickup' ? selectedPickupLocation : undefined),
    }
    
    console.log('DeliveryStep handleSaveOrder - updateData:', updateData)
    console.log('Delivery fields being saved:', {
      delivery_date: updateData.delivery_date,
      delivery_time: updateData.delivery_time,
      delivery_date_time: updateData.delivery_date_time,
      delivery_address: updateData.delivery_address,
      delivery_method: updateData.delivery_method,
    })
    
    onUpdate(updateData)
    onSave(updateData)
  }

  const handleSendToCustomer = () => {
    // Build delivery_contact as "Name|Number"
    const deliveryContact = deliveryContactName 
      ? `${deliveryContactName}${deliveryContactNumber ? `|${deliveryContactNumber}` : ''}`
      : ''
    
    // Build delivery_details from notes
    const deliveryDetails = deliveryNotes?.trim() || ''

    // Set delivery address based on method
    const finalDeliveryAddress = deliveryMethod === 'pickup' && selectedPickupLocation > 0
      ? locations.find((l: Location) => l.location_id === selectedPickupLocation)?.pickup_address || ''
      : deliveryAddress

    onUpdate({
      delivery_time: deliveryTime,
      account_email: accountEmail,
      cost_center: costCenter,
      delivery_contact: deliveryContact,
      delivery_details: deliveryDetails,
      delivery_method: deliveryMethod,
      delivery_address: finalDeliveryAddress,
      delivery_fee: deliveryFee,
      coupon_code: appliedCoupon?.coupon_code || undefined,
      coupon_type: appliedCoupon?.type || undefined,
      coupon_discount: appliedCoupon?.coupon_discount || undefined,
      order_comments: orderComments,
      standing_order: standingOrder,
      location_id: selectedLocation || (deliveryMethod === 'pickup' ? selectedPickupLocation : undefined),
    })
    
    setShowSendModal(true)
  }

  const handleConfirmSend = async () => {
    // Build delivery_contact as "Name|Number"
    const deliveryContact = deliveryContactName 
      ? `${deliveryContactName}${deliveryContactNumber ? `|${deliveryContactNumber}` : ''}`
      : ''
    
    // Build delivery_details from notes
    const deliveryDetails = deliveryNotes?.trim() || ''

    // Set delivery address based on method
    const finalDeliveryAddress = deliveryMethod === 'pickup' && selectedPickupLocation > 0
      ? locations.find((l: Location) => l.location_id === selectedPickupLocation)?.pickup_address || ''
      : deliveryAddress

    // Update data first
    const dateTime = deliveryDate && deliveryTime ? `${deliveryDate} ${deliveryTime}:00` : undefined
    
    // Build updateData with latest coupon info
    const updateData: any = {
      delivery_date: deliveryDate || undefined,
      delivery_time: deliveryTime || undefined,
      delivery_date_time: deliveryDate && deliveryTime ? `${deliveryDate} ${deliveryTime}:00` : undefined,
      account_email: accountEmail,
      cost_center: costCenter,
      delivery_contact: deliveryContact,
      delivery_details: deliveryDetails,
      delivery_method: deliveryMethod,
      delivery_address: finalDeliveryAddress,
      delivery_fee: deliveryFee || 0,
      coupon_code: appliedCoupon?.coupon_code || undefined,
      coupon_type: appliedCoupon?.type || undefined,
      coupon_discount: appliedCoupon?.coupon_discount || undefined,
      order_comments: orderComments,
      standing_order: standingOrder,
      location_id: selectedLocation || (deliveryMethod === 'pickup' ? selectedPickupLocation : undefined),
    }
    
    // Call onSave to create the order with latest data
    setTimeout(() => {
      setShowSuccessModal(false)
      onSave(updateData)
    }, 2000)
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Delivery Details */}
        <div className="lg:col-span-2">
          <Card className="p-8 bg-white border-gray-200">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
            >
              <ChevronLeft className="h-5 w-5" />
              <span style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>Back</span>
            </button>

            {/* Customer Info */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                Ordering for <span className="text-[#055160]">{data.customer_name || "John Doe"}</span>
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">📞 Phone Number</span>
                  <span className="text-gray-900">{data.phone || "(+61) 9876543210"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-600">Email</span>
                  <span className="text-gray-900">{data.email || "Johndoe@gmail.com"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">📍 Location</span>
                  <span className="text-gray-900">{data.location || "Box Hill"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">🏷️ Customer Type</span>
                  <span className="text-gray-900 font-medium">{data.customer_type || "Retail"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">🏢 Company</span>
                  <span className="text-gray-900">{companyName || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">🏛️ Department</span>
                  <span className="text-gray-900">{departmentName || 'N/A'}</span>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-6" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
              Enter Delivery Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Delivery Date */}
              <div className="space-y-2">
                <Label htmlFor="deliveryDate" className="text-sm font-medium text-gray-700">
                  Delivery Date
                </Label>
                <Input
                  key={`delivery-date-${deliveryDate || 'empty'}-${data.delivery_date_time || 'no-dt'}`}
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate || ""}
                  min={new Date().toISOString().split('T')[0]} // Prevent selecting past dates
                  onChange={(e) => {
                    const newDate = e.target.value
                    console.log('Date changed to:', newDate)
                    setDeliveryDate(newDate)
                    const dateTime = newDate && deliveryTime ? `${newDate} ${deliveryTime}:00` : undefined
                    onUpdate({
                      delivery_date: newDate || undefined,
                      delivery_time: deliveryTime || undefined,
                      delivery_date_time: dateTime,
                      delivery_method: deliveryMethod 
                    })
                  }}
                  className="h-11 border-gray-300"
                  style={{ fontFamily: 'Albert Sans' }}
                />
              </div>

              {/* Delivery Time */}
              <div className="space-y-2">
                <Label htmlFor="deliveryTime" className="text-sm font-medium text-gray-700">
                  Delivery Time
                </Label>
                <ValidatedInput
                  id="deliveryTime"
                  type="time"
                  placeholder="Enter time (e.g., 14:30 or 2:30 PM)"
                  value={deliveryTime}
                  fieldName="Delivery Time"
                  onChange={(value) => {
                    setDeliveryTime(value)
                    const dateTime = deliveryDate && value ? `${deliveryDate} ${value}:00` : undefined
                    onUpdate({
                      delivery_date: deliveryDate || undefined,
                      delivery_time: value || undefined,
                      delivery_date_time: dateTime,
                      delivery_method: deliveryMethod 
                    })
                  }}
                  className="h-11 border-gray-300"
                />
              </div>

              {/* Delivery Contact Name */}
              <ValidatedInput
                label="Delivery Contact Name"
                placeholder="Enter contact name"
                value={deliveryContactName}
                validationRule={ValidationRules.order.delivery_contact}
                fieldName="Delivery Contact Name"
                onChange={(value) => {
                  setDeliveryContactName(value)
                  const deliveryContact = value 
                    ? `${value}${deliveryContactNumber ? `|${deliveryContactNumber}` : ''}`
                    : ''
                  onUpdate({ delivery_contact: deliveryContact })
                }}
                className="h-11 border-gray-300"
              />

              {/* Delivery Contact Number */}
              <ValidatedInput
                label="Delivery Contact Number"
                type="tel"
                placeholder={getPhonePlaceholder()}
                value={deliveryContactNumber}
                validationRule={ValidationRules.customer.telephone}
                fieldName="Delivery Contact Number"
                onChange={(value, isValid) => {
                  const previousValue = deliveryContactNumber
                  const formatted = formatAustralianPhone(value, previousValue)
                  setDeliveryContactNumber(formatted)
                  const deliveryContact = deliveryContactName 
                    ? `${deliveryContactName}${formatted ? `|${formatted}` : ''}`
                    : ''
                  onUpdate({ delivery_contact: deliveryContact })
                }}
                className="h-11 border-gray-300"
              />

              {/* Email */}
              <ValidatedInput
                label="Email"
                type="email"
                placeholder="Enter"
                value={accountEmail}
                validationRule={ValidationRules.order.account_email}
                fieldName="Email"
                onChange={(value) => {
                  setAccountEmail(value)
                  onUpdate({ account_email: value })
                }}
                className="h-11 border-gray-300"
              />

              {/* Cost Center */}
              <ValidatedInput
                label="Cost Center"
                placeholder="Enter"
                value={costCenter}
                validationRule={ValidationRules.order.cost_center}
                fieldName="Cost Center"
                onChange={(value) => {
                  setCostCenter(value)
                  onUpdate({ cost_center: value })
                }}
                className="h-11 border-gray-300"
              />

              {/* Delivery Notes */}
              <ValidatedTextarea
                label="Notes"
                placeholder="Enter time, location, and name"
                value={deliveryNotes}
                fieldName="Notes"
                onChange={(value) => {
                  setDeliveryNotes(value)
                  onUpdate({ delivery_details: value?.trim() || '' })
                }}
                rows={3}
                className="border-gray-300 resize-none md:col-span-2"
              />

              {/* Location Selection - Always Required */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="orderLocation" className="text-sm font-medium text-gray-700">
                  Location <span className="text-red-500">*</span>
                </Label>
                <select
                  id="orderLocation"
                  value={selectedLocation}
                  onChange={(e) => {
                    const locId = Number(e.target.value)
                    setSelectedLocation(locId)
                    if (deliveryMethod === 'pickup') {
                      setSelectedPickupLocation(locId)
                      const location = locations.find((l: Location) => l.location_id === locId)
                      if (location) {
                        setDeliveryAddress(location.pickup_address || '')
                      }
                    }
                    onUpdate({ location_id: locId })
                  }}
                  className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#055160] focus:border-transparent"
                  style={{ fontFamily: 'Albert Sans' }}
                  required
                >
                  <option value={0}>Select Location</option>
                  {locations.map((location: Location) => (
                    <option key={location.location_id} value={location.location_id}>
                      {location.location_name}
                    </option>
                  ))}
                </select>
                {selectedLocation === 0 && (
                  <p className="text-xs text-red-500 mt-1">Please select a location</p>
                )}
              </div>

              {/* Delivery Method */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium text-gray-700">
                  Delivery Method: <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="delivery"
                      checked={deliveryMethod === "delivery"}
                      onChange={(e) => {
                        const newMethod = e.target.value as "delivery"
                        setDeliveryMethod(newMethod)
                        setSelectedPickupLocation(0)
                        // Keep selectedLocation for delivery method too
                        onUpdate({ delivery_method: newMethod, location_id: selectedLocation || undefined })
                      }}
                      className="w-4 h-4 text-[#055160]"
                    />
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                      Delivery
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="pickup"
                      checked={deliveryMethod === "pickup"}
                      onChange={(e) => {
                        const newMethod = e.target.value as "pickup"
                        setDeliveryMethod(newMethod)
                        // Use selectedLocation for pickup if no pickup location selected yet
                        if (selectedPickupLocation === 0 && selectedLocation > 0) {
                          setSelectedPickupLocation(selectedLocation)
                          const location = locations.find((l: Location) => l.location_id === selectedLocation)
                          if (location) {
                            setDeliveryAddress(location.pickup_address || '')
                          }
                        }
                        onUpdate({ delivery_method: newMethod, location_id: selectedLocation || selectedPickupLocation || undefined })
                      }}
                      className="w-4 h-4 text-[#055160]"
                    />
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                      Pickup
                    </span>
                  </label>
                </div>
              </div>

              {/* Pickup Location Selection */}
              {deliveryMethod === "pickup" && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="pickupLocation" className="text-sm font-medium text-gray-700">
                    Pickup Location <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="pickupLocation"
                    value={selectedPickupLocation}
                    onChange={(e) => {
                      const locId = Number(e.target.value)
                      setSelectedPickupLocation(locId)
                      setSelectedLocation(locId) // Also update main location
                      const location = locations.find((l: Location) => l.location_id === locId)
                      if (location) {
                        setDeliveryAddress(location.pickup_address || '')
                      }
                      onUpdate({ location_id: locId })
                    }}
                    className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#055160] focus:border-transparent"
                    style={{ fontFamily: 'Albert Sans' }}
                  >
                    <option value={0}>Select Pickup Location</option>
                    {locations.map((location: Location) => (
                      <option key={location.location_id} value={location.location_id}>
                        {location.location_name} - {location.pickup_address || 'No address'}
                      </option>
                    ))}
                  </select>
                  {selectedPickupLocation > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Pickup Address:</span>{' '}
                        {locations.find((l: Location) => l.location_id === selectedPickupLocation)?.pickup_address || 'N/A'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Address - Only show for delivery method */}
              {deliveryMethod === "delivery" && (
                <ValidatedTextarea
                  label="Delivery Address *"
                  placeholder="Enter Address"
                  value={deliveryAddress}
                  validationRule={{
                    ...ValidationRules.order.delivery_address,
                    required: true
                  }}
                  fieldName="Delivery Address"
                  onChange={(value) => {
                    setDeliveryAddress(value)
                    // Always include delivery_method to prevent it from being reset
                    onUpdate({ delivery_address: value, delivery_method: deliveryMethod })
                  }}
                  rows={3}
                  className="border-gray-300 resize-none md:col-span-2"
                />
              )}

              {/* Delivery Fee */}
              <ValidatedInput
                label="Delivery Fee"
                type="number"
                step="0.01"
                placeholder="Enter Delivery Fee"
                value={deliveryFee.toString()}
                validationRule={ValidationRules.order.delivery_fee}
                fieldName="Delivery Fee"
                onChange={(value, isValid) => {
                  const numValue = parseFloat(value) || 0
                  setDeliveryFee(numValue)
                }}
                className="h-11 border-gray-300"
              />

              {/* Standing Order / Subscription */}
              <div className="space-y-2">
                <Label htmlFor="standingOrder" className="text-sm font-medium text-gray-700">
                  Standing Order (Subscription)
                </Label>
                <select
                  id="standingOrder"
                  value={standingOrder}
                  onChange={(e) => setStandingOrder(Number(e.target.value))}
                  className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#055160] focus:border-transparent"
                  style={{ fontFamily: 'Albert Sans' }}
                >
                  <option value="0">One-time Order</option>
                  <option value="7">Weekly (Every 7 days)</option>
                  <option value="14">Bi-weekly (Every 14 days)</option>
                  <option value="30">Monthly (Every 30 days)</option>
                </select>
                {standingOrder > 0 && (
                  <p className="text-xs text-[#055160] mt-1" style={{ fontFamily: 'Albert Sans' }}>
                    This order will become a subscription and appear in the Subscriptions page
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <Card className="p-6 bg-white border-gray-200 sticky top-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
              Order Summary
            </h3>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={products.map((_, index) => `product-${index}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-700 border-b">
                        <th className="pb-2" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>Product Name</th>
                        <th className="pb-2 text-center" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>Quantity</th>
                        <th className="pb-2 text-right" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product, index) => (
                        <SortableProductItem
                          key={`product-${index}`}
                          product={product}
                          index={index}
                          onReorder={(oldIndex, newIndex) => {
                            const reordered = arrayMove(products, oldIndex, newIndex)
                            setProducts(reordered)
                            onUpdate({ products: reordered })
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </SortableContext>
            </DndContext>

            {/* Coupon */}
            <div className="mb-6">
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="🎟️ Add Coupon"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={!!appliedCoupon}
                  className="h-10 border-gray-300"
                  style={{ fontFamily: 'Albert Sans' }}
                />
                {!appliedCoupon ? (
                  <Button
                    onClick={handleApplyCoupon}
                    className="bg-[#055160] hover:bg-[#04414d] text-white px-6"
                    style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
                  >
                    Apply
                  </Button>
                ) : (
                  <Button
                    onClick={handleRemoveCoupon}
                    variant="outline"
                    className="text-[#055160] border-[#055160] px-6"
                    style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              {appliedCoupon && (
                <div className="flex items-center gap-2 text-green-600 text-sm mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <span style={{ fontFamily: 'Albert Sans' }}>
                    {appliedCoupon.coupon_code} applied! (-${couponDiscount.toFixed(2)})
                  </span>
                </div>
              )}
              <button 
                onClick={() => setShowCouponList(true)}
                className="text-sm text-[#055160] hover:underline flex items-center gap-1" 
                style={{ fontFamily: 'Albert Sans' }}
              >
                <Tag className="h-3 w-3" />
                Browse Available Coupons ({activeCoupons.length})
              </button>
            </div>

            {/* Totals */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600" style={{ fontFamily: 'Albert Sans' }}>Subtotal</span>
                <span className="text-gray-900" style={{ fontFamily: 'Albert Sans' }}>${subtotal.toFixed(2)}</span>
              </div>
              {/* Wholesale discount - Hidden for kj3 */}
              {false && wholesaleDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600" style={{ fontFamily: 'Albert Sans' }}>
                    Wholesale Discount ({customerType.includes('Full Service') ? '15%' : '10%'})
                  </span>
                  <span className="text-green-600" style={{ fontFamily: 'Albert Sans' }}>-${wholesaleDiscount.toFixed(2)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600" style={{ fontFamily: 'Albert Sans' }}>
                    Coupon Discount {appliedCoupon && (
                      <span className="text-xs text-gray-500">
                        ({appliedCoupon.type === 'P' ? `${appliedCoupon.coupon_discount}%` : `$${appliedCoupon.coupon_discount}`})
                      </span>
                    )}
                  </span>
                  <span className="text-green-600" style={{ fontFamily: 'Albert Sans' }}>-${couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600" style={{ fontFamily: 'Albert Sans' }}>Delivery Fee</span>
                <span className="text-gray-900" style={{ fontFamily: 'Albert Sans' }}>${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600" style={{ fontFamily: 'Albert Sans' }}>GST (10%)</span>
                <span className="text-gray-900" style={{ fontFamily: 'Albert Sans' }}>${gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span className="text-gray-900" style={{ fontFamily: 'Albert Sans' }}>Total</span>
                <span className="text-gray-900" style={{ fontFamily: 'Albert Sans' }}>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Order Comments */}
            <div className="mb-6">
              <ValidatedTextarea
                label="✏️ Order Comments"
                placeholder="Any special notes"
                value={orderComments}
                validationRule={ValidationRules.order.order_comments}
                fieldName="Order Comments"
                onChange={(value) => setOrderComments(value)}
                rows={3}
                className="border-gray-300 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleSaveOrder}
                variant="outline"
                className="w-full border-[#055160] text-[#055160] hover:bg-[#055160] hover:text-white"
                style={{ fontFamily: 'Albert Sans', fontWeight: 600, height: '50px' }}
              >
                💾 Save Order
              </Button>
              <Button
                onClick={handleSendToCustomer}
                className="w-full bg-[#055160] hover:bg-[#04414d] text-white rounded-full"
                style={{ fontFamily: 'Albert Sans', fontWeight: 600, height: '50px' }}
              >
                Send to Customer
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Send to Customer Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#e7f1ff] rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-[#055160]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Albert Sans' }}>
                Send to Customer
              </h3>
              <p className="text-sm text-gray-600" style={{ fontFamily: 'Albert Sans' }}>
                Enter Email ID to send to customer
              </p>
            </div>

            <div className="mb-6">
              <Label htmlFor="sendEmail" className="text-sm font-medium text-gray-700 mb-2">
                Email
              </Label>
              <Input
                id="sendEmail"
                type="email"
                placeholder="Johndoe@gmail.com"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                className="h-11 border-gray-300"
                style={{ fontFamily: 'Albert Sans' }}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowSendModal(false)}
                variant="outline"
                className="flex-1 border-gray-300"
                style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSend}
                className="flex-1 bg-[#055160] hover:bg-[#04414d] text-white"
                style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              >
                Yes, Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Albert Sans' }}>
                Email Sent to Customer
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Coupons List Modal */}
      {showCouponList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                Available Coupons
              </h3>
              <button
                onClick={() => setShowCouponList(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {activeCoupons.length === 0 ? (
                <p className="text-center text-gray-500 py-8" style={{ fontFamily: 'Albert Sans' }}>
                  No active coupons available
                </p>
              ) : (
                <div className="space-y-3">
                  {activeCoupons.map((coupon: Coupon) => (
                    <div
                      key={coupon.coupon_id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-[#055160] transition-colors cursor-pointer"
                      onClick={() => handleSelectCoupon(coupon.coupon_id.toString())}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Tag className="h-4 w-4 text-[#055160]" />
                            <span className="font-semibold text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                              {coupon.coupon_code}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              {coupon.type === 'P' 
                                ? `${coupon.coupon_discount}% OFF` 
                                : `$${coupon.coupon_discount} OFF`}
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectCoupon(coupon.coupon_id.toString())
                          }}
                          className="bg-[#055160] hover:bg-[#04414d] text-white text-xs px-3 py-1"
                          style={{ fontFamily: 'Albert Sans' }}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={() => setShowCouponList(false)}
                variant="outline"
                className="w-full border-gray-300"
                style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

