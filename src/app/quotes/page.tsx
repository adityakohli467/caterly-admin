"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Calendar, Filter, Printer, Plus, Eye, Edit, FileText, Mail, RotateCcw, Trash2, AlertCircle, CheckCircle2, ArrowRight, MapPin, GripVertical, MoreVertical } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { printTableData } from "@/lib/print-utils"

interface Quote {
  order_id: number
  customer_id: number
  firstname?: string
  lastname?: string
  email?: string
  telephone?: string
  company_name?: string
  department_name?: string
  location_name?: string
  customer_order_name?: string
  delivery_date_time?: string
  order_total: number
  delivery_fee: number
  order_status: number
  date_added: string
  date_modified: string
}

interface Location {
  location_id: number
  location_name: string
}

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "1", label: "New" },
  { value: "4", label: "Awaiting Approval" },
  { value: "7", label: "Approved" },
  { value: "8", label: "Rejected" },
  { value: "9", label: "Modify" },
  { value: "5", label: "Cancelled" },
]

const getStatusLabel = (status: number) => {
  switch (status) {
    case 1: return "New"
    case 4: return "Awaiting Approval"
    case 7: return "Approved"
    case 8: return "Rejected"
    case 9: return "Modify"
    case 5: return "Cancelled"
    default: return "Unknown"
  }
}

const getStatusColor = (status: number) => {
  switch (status) {
    case 1: return "bg-[#e7f1ff] text-[#055160]"   // New
    case 4: return "bg-yellow-50 text-yellow-700"  // Awaiting Approval
    case 7: return "bg-emerald-50 text-emerald-700"  // Approved
    case 8: return "bg-[#e7f1ff] text-[#055160]"    // Rejected
    case 9: return "bg-orange-50 text-orange-700"  // Modify
    case 5: return "bg-[#e7f1ff] text-[#055160]"    // Cancelled
    default: return "bg-gray-50 text-gray-700"
  }
}

export default function QuotesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<number>(0)
  const [selectedStatus, setSelectedStatus] = useState("")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const [selectedQuotes, setSelectedQuotes] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteQuoteId, setDeleteQuoteId] = useState<number | null>(null)
  const [deleteQuoteName, setDeleteQuoteName] = useState("")
  
  // Convert to order modal state
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertQuoteId, setConvertQuoteId] = useState<number | null>(null)
  const [convertQuoteName, setConvertQuoteName] = useState("")

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const response = await api.get('/admin/locations?limit=100')
        return response.data
      } catch (error: any) {
        console.error("Error fetching locations:", error)
        toast.error("Failed to load locations")
        throw error
      }
    }
  })

  const locations = locationsData?.locations || []

  // Fetch quotes
  const { data: quotesData, isLoading, refetch } = useQuery({
    queryKey: ['quotes', searchQuery, selectedLocation, selectedStatus, startDate, endDate, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('limit', itemsPerPage.toString())
      params.append('offset', ((currentPage - 1) * itemsPerPage).toString())
      
      if (searchQuery) params.append('search', searchQuery)
      if (selectedLocation) params.append('location_id', selectedLocation.toString())
      if (selectedStatus) params.append('status', selectedStatus)
      if (startDate) params.append('date_from', format(startDate, 'yyyy-MM-dd'))
      if (endDate) params.append('date_to', format(endDate, 'yyyy-MM-dd'))
      
      const response = await api.get(`/admin/quotes?${params.toString()}`)
      return response.data
    }
  })

  const quotes = quotesData?.quotes || []
  const totalCount = quotesData?.count || 0
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  // Check for success from URL params and refetch quotes (toast is shown in new quote page)
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      // Invalidate quotes query cache - this will automatically trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
      // Clean up URL params without causing re-render
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/quotes')
      }
    }
  }, [searchParams, queryClient])

  // Delete quote mutation
  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/admin/quotes/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
      toast.success("Quote deleted successfully!")
      setShowDeleteModal(false)
      setDeleteQuoteId(null)
      setDeleteQuoteName("")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete quote")
    },
  })

  // Convert to order mutation
  const convertToOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/admin/quotes/${id}/convert`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
      toast.success("Quote converted to order successfully!")
      setShowConvertModal(false)
      setConvertQuoteId(null)
      setConvertQuoteName("")
      router.push('/orders')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to convert quote")
    },
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuotes(quotes.map((q: Quote) => q.order_id))
    } else {
      setSelectedQuotes([])
    }
  }

  const handleSelectQuote = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedQuotes([...selectedQuotes, id])
    } else {
      setSelectedQuotes(selectedQuotes.filter(qId => qId !== id))
    }
  }

  const handleDeleteQuote = (quote: Quote) => {
    setDeleteQuoteId(quote.order_id)
    setDeleteQuoteName(`Quote #${quote.order_id} for ${quote.firstname} ${quote.lastname}`)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    if (deleteQuoteId) {
      deleteQuoteMutation.mutate(deleteQuoteId)
    }
  }

  const handleConvertToOrder = (quote: Quote) => {
    setConvertQuoteId(quote.order_id)
    setConvertQuoteName(`Quote #${quote.order_id} for ${quote.firstname} ${quote.lastname}`)
    setShowConvertModal(true)
  }

  const handleConfirmConvert = () => {
    if (convertQuoteId) {
      convertToOrderMutation.mutate(convertQuoteId)
    }
  }

  const handlePrint = () => {
    printTableData("Quotes")
  }

  const handleRefresh = () => {
    refetch()
    toast.success("Quotes refreshed!")
  }

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen w-full max-w-full overflow-x-hidden" style={{ fontFamily: 'Albert Sans' }}>
      {/* Header - Title and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-gray-900 text-2xl sm:text-3xl lg:text-4xl" style={{ 
          fontFamily: 'Albert Sans',
          fontWeight: 600,
          fontStyle: 'normal',
          lineHeight: '1.2',
          letterSpacing: '0%'
        }}>
          Quotes
        </h1>
        <Link href="/quotes/new" className="w-full sm:w-auto">
          <Button 
            className="bg-[#055160] hover:bg-[#04414d] text-white whitespace-nowrap w-full sm:w-auto"
            style={{ 
              fontWeight: 600,
              minWidth: '196px',
              height: '54px',
              paddingTop: '8px',
              paddingRight: '16px',
              paddingBottom: '8px',
              paddingLeft: '16px',
              gap: '4px',
              borderRadius: '67px',
              opacity: 1
            }}
          >
            <Plus className="h-5 w-5" />
            Add New Quote
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 flex-wrap items-stretch sm:items-center">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search Order ID, Customer ID, Status etc."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:max-w-md h-[54px] border border-gray-200 bg-white rounded-full focus:ring-2 focus:ring-[#055160] focus:border-[#055160] focus:outline-none"
            style={{ fontFamily: 'Albert Sans', paddingLeft: '44px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px' }}
          />
        </div>
        
        <div className="relative flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="gap-2 border border-gray-200 bg-white whitespace-nowrap rounded-full hover:bg-gray-50 hover:text-gray-900 w-full sm:w-auto"
            style={{ 
              fontFamily: 'Albert Sans', 
              fontWeight: 600,
              color: '#1f2937',
              minWidth: '155px',
              height: '54px',
              paddingTop: '8px',
              paddingRight: '24px',
              paddingBottom: '8px',
              paddingLeft: '24px',
              gap: '8px',
              borderRadius: '100px',
              opacity: 1
            }}
          >
            <Calendar className="h-5 w-5 text-gray-700" />
            Select Date
          </Button>
        </div>
        
        <div className="relative flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={() => setShowStatusFilter(!showStatusFilter)}
            className="gap-2 border border-gray-200 bg-white whitespace-nowrap rounded-full hover:bg-gray-50 hover:text-gray-900 w-full sm:w-auto"
            style={{ 
              fontFamily: 'Albert Sans', 
              fontWeight: 600,
              color: '#1f2937',
              minWidth: '157px',
              height: '54px',
              paddingTop: '8px',
              paddingRight: '24px',
              paddingBottom: '8px',
              paddingLeft: '24px'
            }}
          >
            <Filter className="h-5 w-5 text-gray-700" />
            Filter Status
          </Button>
          {showStatusFilter && (
            <div className="absolute top-12 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px]">
              {statusOptions.map((option: any) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedStatus(option.value)
                    setShowStatusFilter(false)
                  }}
                  className={`w-full text-left px-4 py-2 rounded hover:bg-gray-100 ${
                    selectedStatus === option.value ? 'bg-[#e7f1ff] text-[#055160]' : ''
                  }`}
                  style={{ fontFamily: 'Albert Sans' }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto">
          <Button 
            onClick={handlePrint}
            className="gap-2 whitespace-nowrap border-0 shadow-none"
            style={{ 
              fontFamily: 'Albert Sans', 
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '16px',
              lineHeight: '20px',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#055160',
              backgroundColor: 'transparent',
              padding: 0,
              gap: '8px',
              opacity: 1
            }}
          >
            <Printer className="h-5 w-5 text-[#055160]" />
            Print
          </Button>
        </div>
      </div>

      {/* Location Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto mb-6 -mx-4 sm:mx-0 px-4 sm:px-0">
        <button
          onClick={() => {
            setSelectedLocation(0)
            setCurrentPage(1)
          }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            selectedLocation === 0
              ? "border-[#055160] text-[#055160]"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
          style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
        >
          <span className="w-5 h-5 flex items-center justify-center">📍</span>
          All Locations
        </button>
        {locations.map((location: Location) => (
          <button
            key={location.location_id}
            onClick={() => {
              setSelectedLocation(location.location_id)
              setCurrentPage(1)
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              selectedLocation === location.location_id
                ? "border-[#055160] text-[#055160]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
            style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
          >
            <span className="w-5 h-5 flex items-center justify-center">📍</span>
            {location.location_name}
          </button>
        ))}
      </div>

      {showDatePicker && (
        <Card className="p-4 border border-gray-200 mb-6">
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select start date"
                className="h-11 px-3 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select end date"
                className="h-11 px-3 border border-gray-300 rounded-md"
              />
            </div>
            <div className="self-end flex gap-2">
              <Button 
                onClick={() => {
                  setStartDate(null)
                  setEndDate(null)
                  setShowDatePicker(false)
                }}
                variant="outline"
                className="border-gray-300"
              >
                Clear
              </Button>
              <Button 
                onClick={() => {
                  setShowDatePicker(false)
                  setCurrentPage(1) // Reset to first page when filter changes
                }}
                className="bg-[#055160] hover:bg-[#04414d] text-white"
              >
                Apply
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full min-w-[600px] sm:min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={selectedQuotes.length === quotes.length && quotes.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="h-5 w-5"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  <div className="flex items-center gap-2">
                    Order ID
                    <GripVertical className="h-4 w-4 text-gray-400 rotate-90" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  <div className="flex items-center gap-2">
                    Customer Name
                    <GripVertical className="h-4 w-4 text-gray-400 rotate-90" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  <div className="flex items-center gap-2">
                    Company
                    <GripVertical className="h-4 w-4 text-gray-400 rotate-90" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  <div className="flex items-center gap-2">
                    Department
                    <GripVertical className="h-4 w-4 text-gray-400 rotate-90" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  <div className="flex items-center gap-2">
                    Delivery Date
                    <GripVertical className="h-4 w-4 text-gray-400 rotate-90" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  <div className="flex items-center gap-2">
                    Delivery Time
                    <GripVertical className="h-4 w-4 text-gray-400 rotate-90" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  <div className="flex items-center gap-2">
                    Amount
                    <GripVertical className="h-4 w-4 text-gray-400 rotate-90" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  <div className="flex items-center gap-2">
                    Status
                    <GripVertical className="h-4 w-4 text-gray-400 rotate-90" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    Loading quotes...
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    No quotes found. Try adjusting your filters or create a new quote.
                  </td>
                </tr>
              ) : (
                quotes.map((quote: Quote) => (
                  <tr key={quote.order_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedQuotes.includes(quote.order_id)}
                        onCheckedChange={(checked) => handleSelectQuote(quote.order_id, checked as boolean)}
                        className="h-5 w-5"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/quotes/${quote.order_id}`}
                        prefetch={false}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#055160] hover:text-[#04414d] hover:underline cursor-pointer"
                        style={{ 
                          fontFamily: 'Albert Sans',
                          fontWeight: 400,
                          fontStyle: 'normal',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0%',
                          display: 'inline-block'
                        }}
                      >
                        #{quote.order_id}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-900" style={{ 
                        fontFamily: 'Albert Sans',
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '0%'
                      }}>
                        {quote.firstname} {quote.lastname}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700" style={{ 
                        fontFamily: 'Albert Sans',
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '0%'
                      }}>
                        {quote.company_name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700" style={{ 
                        fontFamily: 'Albert Sans',
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '0%'
                      }}>
                        {quote.department_name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700" style={{ 
                        fontFamily: 'Albert Sans',
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '0%'
                      }}>
                        {quote.delivery_date_time 
                          ? format(new Date(quote.delivery_date_time), 'dd-MM-yyyy')
                          : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700" style={{ 
                        fontFamily: 'Albert Sans',
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '0%'
                      }}>
                        {quote.delivery_date_time 
                          ? format(new Date(quote.delivery_date_time), 'hh:mm a')
                          : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-900" style={{ 
                        fontFamily: 'Albert Sans',
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '0%'
                      }}>
                        ${Number(quote.order_total || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.order_status)}`}>
                        {quote.order_status === 2 || quote.order_status === 7 ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            quote.order_status === 5 || quote.order_status === 8 ? 'bg-[#e7f1ff]0' :  // Cancelled/Rejected - red
                            quote.order_status === 4 ? 'bg-yellow-500' : // Awaiting Approval - yellow
                            quote.order_status === 9 ? 'bg-orange-500' : // Modify - orange
                            'bg-[#055160]'  // New (status 1) - teal
                          }`}></div>
                        )}
                        {getStatusLabel(quote.order_status)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => router.push(`/quotes/${quote.order_id}`)}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => router.push(`/quotes/${quote.order_id}/edit?step=2`)}
                              className="cursor-pointer"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Quote
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleConvertToOrder(quote)}
                              disabled={convertToOrderMutation.isPending}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                <ArrowRight className="h-3 w-3 mr-1" />
                                <span>Convert to Order</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={handleRefresh}
                              className="cursor-pointer"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Refresh
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteQuote(quote)}
                              className="cursor-pointer text-[#055160] focus:text-[#055160]"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Quote
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <p className="text-sm text-gray-600" style={{ fontFamily: 'Albert Sans' }}>
            Showing {totalCount > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} Entries
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="text-gray-700 disabled:text-gray-400 disabled:opacity-50"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              Prev
            </Button>
            {totalPages > 0 && (
              <>
                {currentPage > 3 && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(1)}
                      className="text-gray-700"
                      style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
                    >
                      1
                    </Button>
                    {currentPage > 4 && <span className="text-gray-500 px-2">...</span>}
                  </>
                )}
                {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                  let page: number
                  if (totalPages <= 5) {
                    page = index + 1
                  } else if (currentPage <= 3) {
                    page = index + 1
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + index
                  } else {
                    page = currentPage - 2 + index
                  }
                  if (page < 1 || page > totalPages) return null
                  return (
                    <Button 
                      key={page}
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(page)}
                      className={
                        currentPage === page
                          ? "bg-[#055160] text-white border-[#055160] hover:bg-[#04414d]"
                          : "text-gray-700"
                      }
                      style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
                    >
                      {page}
                    </Button>
                  )
                })}
                {currentPage < totalPages - 2 && totalPages > 5 && (
                  <>
                    <span className="text-gray-500 px-2">...</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(totalPages)}
                      className="text-gray-700"
                      style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="text-gray-700 disabled:text-gray-400 disabled:opacity-50"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Albert Sans', fontWeight: 700 }}>
              Delete Quote
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-[#e7f1ff]">
                <AlertCircle className="h-6 w-6 text-[#055160]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Albert Sans' }}>
                  Are you sure you want to permanently delete this quote? This action cannot be undone.
                </p>
                <p className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  {deleteQuoteName}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="border-gray-300"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              disabled={deleteQuoteMutation.isPending}
            >
              {deleteQuoteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert to Order Confirmation Modal */}
      <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Albert Sans', fontWeight: 700 }}>
              Convert to Order
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Albert Sans' }}>
                  Are you sure you want to convert this quote to an order? This will change the status and move it to the orders section.
                </p>
                <p className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  {convertQuoteName}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowConvertModal(false)}
              className="border-gray-300"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              disabled={convertToOrderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmConvert}
              className="bg-green-600 hover:bg-green-700 text-white"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              disabled={convertToOrderMutation.isPending}
            >
              {convertToOrderMutation.isPending ? "Converting..." : "Convert to Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
