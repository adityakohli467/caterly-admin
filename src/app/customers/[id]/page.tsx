"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mail, Phone, MapPin, Building2, Briefcase, FileText, Percent, User, Clock } from "lucide-react"
import { customersAPI } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params?.id as string | undefined

  // Fetch customer details
  const { data: customerData, isLoading, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      if (!customerId) throw new Error('Customer ID is required')
      const response = await customersAPI.get(parseInt(customerId))
      return response.data.customer
    },
    enabled: !!customerId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C62828] mx-auto mb-4"></div>
          <p className="text-gray-600" style={{ fontFamily: 'Albert Sans' }}>Loading customer details...</p>
        </div>
      </div>
    )
  }

  if (error || !customerData) {
    return (
      <div className="flex items-center justify-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <p className="text-[#C62828] mb-4" style={{ fontFamily: 'Albert Sans' }}>
            {error ? 'Failed to load customer details' : 'Customer not found'}
          </p>
          <Button
            onClick={() => router.back()}
            className="bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg"
          >
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const customer = customerData

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8" style={{ fontFamily: 'Albert Sans' }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight" style={{ fontWeight: 800 }}>
              Viewing Customer Details
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-red-50 text-[#C62828] rounded border border-red-100 font-semibold text-sm">
                ID: #{customer.customer_id}
              </span>
              <Badge variant={customer.archived ? "secondary" : "default"} className={cn(
                customer.archived ? "bg-gray-100 text-gray-600 border-gray-200" : "bg-green-50 text-green-700 border-green-200"
              )}>
                {customer.archived ? "Archived" : "Active"}
              </Badge>
              {customer.created_from === 'storefront' && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                  Frontend
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* <div className="flex items-center gap-3 lg:justify-end">
          <Button
            variant="outline"
            className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => {
              // Redirect to customers page and open edit modal (if implemented via URL)
              // Or just show a toast for now as it's a detail view
              toast.info("Edit functionality is available in the Customers list view.")
              router.push("/customers")
            }}
          >
            Back to List
          </Button>
        </div> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Personal Info */}
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-white px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-[#C62828]" />
                Personal Information
              </h3>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">First Name</p>
                  <p className="text-sm font-semibold text-gray-900">{customer.firstname || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Last Name</p>
                  <p className="text-sm font-semibold text-gray-900">{customer.lastname || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email Address</p>
                  <div className="flex items-center gap-2 group">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-900">{customer.email || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone Number</p>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-900">{customer.telephone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Address */}
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-white px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#C62828]" />
                Location Details
              </h3>
            </div>
            <CardContent className="p-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Default Address</p>
                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {customer.customer_address || 'No address provided'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Additional Notes */}
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-white px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#C62828]" />
                Additional Notes
              </h3>
            </div>
            <CardContent className="p-6">
              <p className="text-sm text-gray-700 italic bg-gray-50 p-4 rounded-lg border border-gray-100 min-h-[100px]">
                {customer.customer_notes || 'No notes added for this customer.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Business Info & Meta */}
        {/* <div className="space-y-6">
         
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-white px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#C62828]" />
                Business Context
              </h3>
            </div>
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" /> Company
                </p>
                <p className="text-sm font-semibold text-gray-900">{customer.company?.company_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3" /> Department
                </p>
                <p className="text-sm font-semibold text-gray-900">{customer.department?.department_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Cost Centre</p>
                <Badge variant="outline" className="font-mono text-xs">
                  {customer.customer_cost_centre || 'N/A'}
                </Badge>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5 text-green-700">
                  <Percent className="h-3 w-3" /> Discount Percentage
                </p>
                <p className="text-2xl font-bold text-green-700">{customer.discount_percentage ? `${customer.discount_percentage}%` : '0%'}</p>
              </div>
            </CardContent>
          </Card>


          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Account Created</span>
                </div>
                <span className="text-xs text-gray-900 font-semibold">
                  {customer.date_added ? new Date(customer.date_added).toLocaleDateString('en-AU') : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <User className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Customer Group</span>
                </div>
                <span className="text-xs text-gray-900 font-semibold">{customer.customer_type || 'General'}</span>
              </div>
            </CardContent>
          </Card>
        </div> */}
      </div>
    </div>
  )
}
