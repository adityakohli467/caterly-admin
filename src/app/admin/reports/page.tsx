"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import api, { subscriptionsAPI } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Search, FileDown, FileText, Printer, Calendar as CalendarIcon, MapPin, Filter } from "lucide-react"
import { format, isValid } from "date-fns"
import { toast } from "sonner"
import { formatDateOnly, formatTimeInAU } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { printTableData } from "@/lib/print-utils"

interface Report {
  order_id: number
  order_date: string
  delivery_date_time: string
  customer_name?: string
  customer_order_name?: string
  firstname?: string
  lastname?: string
  company_name?: string
  company?: string
  department_name?: string
  location_name: string
  order_status: number
  subtotal: number
  delivery_fee: number
  discount: number
  gst: number
  total: number
  order_total?: number
  late_fee?: number
  standing_order?: number
}

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter state
  const [orderDateFrom, setOrderDateFrom] = useState<Date | null>(null)
  const [orderDateTo, setOrderDateTo] = useState<Date | null>(null)
  const [deliveryDateFrom, setDeliveryDateFrom] = useState<Date | null>(null)
  const [deliveryDateTo, setDeliveryDateTo] = useState<Date | null>(null)
  const [selectedLocation, setSelectedLocation] = useState("none_selected")
  const [selectedStatus, setSelectedStatus] = useState("none_selected")
  const [selectedCompany, setSelectedCompany] = useState("none_selected")
  const [includeSubscriptions, setIncludeSubscriptions] = useState(true)

  // Applied filters (for API call)
  const [appliedFilters, setAppliedFilters] = useState({
    order_date_from: "",
    order_date_to: "",
    delivery_date_from: "",
    delivery_date_to: "",
    location_id: "",
    status: "",
    company: "",
    search: "",
    include_subscriptions: true
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ["locations-all"],
    queryFn: async () => {
      const response = await api.get("/admin/locations?limit=1000")
      return response.data
    },
  })

  // Fetch companies
  const { data: companiesData } = useQuery({
    queryKey: ["companies-all"],
    queryFn: async () => {
      const response = await api.get("/admin/companies?limit=1000")
      return response.data
    },
  })

  const companies = companiesData?.companies || []

  const locations = locationsData?.locations || []

  // Fetch reports
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ["reports", appliedFilters, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (appliedFilters.order_date_from) params.append("order_date_from", appliedFilters.order_date_from)
      if (appliedFilters.order_date_to) params.append("order_date_to", appliedFilters.order_date_to)
      if (appliedFilters.delivery_date_from) params.append("delivery_date_from", appliedFilters.delivery_date_from)
      if (appliedFilters.delivery_date_to) params.append("delivery_date_to", appliedFilters.delivery_date_to)
      if (appliedFilters.location_id) params.append("location_id", appliedFilters.location_id)
      if (appliedFilters.status) params.append("status", appliedFilters.status)
      if (appliedFilters.company) params.append("company", appliedFilters.company)
      if (appliedFilters.search) params.append("search", appliedFilters.search)
      
      params.append("limit", itemsPerPage.toString())
      params.append("offset", ((currentPage - 1) * itemsPerPage).toString())
      
      const reportsPromise = api.get(`/admin/reports?${params.toString()}`)
      
      let subscriptionsData = { subscriptions: [], count: 0 }
      if (appliedFilters.include_subscriptions) {
        const subParams: any = {
          status: "active",
          limit: "100",
        }
        if (appliedFilters.search) subParams.search = appliedFilters.search
        
        try {
          const subResponse = await subscriptionsAPI.list(subParams)
          subscriptionsData = subResponse.data
        } catch (error) {
          console.error("Error fetching subscriptions:", error)
        }
      }

      const response = await reportsPromise
      const reportData = response.data
      
      // Merge and map subscriptions if they are not already in the reports
      const reportIds = new Set(reportData.reports.map((r: any) => r.order_id))
      
      const mappedSubscriptions = (subscriptionsData.subscriptions || [])
        .filter((sub: any) => !reportIds.has(sub.order_id))
        .filter((sub: any) => {
          // Frontend filter for delivery date if provided
          if (!appliedFilters.delivery_date_from && !appliedFilters.delivery_date_to) return true
          
          const subDate = new Date(sub.delivery_date_time)
          if (!isValid(subDate)) return true
          
          if (appliedFilters.delivery_date_from) {
            const fromDate = new Date(appliedFilters.delivery_date_from)
            fromDate.setHours(0, 0, 0, 0)
            if (subDate < fromDate) return false
          }
          
          if (appliedFilters.delivery_date_to) {
            const toDate = new Date(appliedFilters.delivery_date_to)
            toDate.setHours(23, 59, 59, 999)
            if (subDate > toDate) return false
          }
          
          return true
        })
        .map((sub: any) => ({
          order_id: sub.order_id,
          order_date: sub.date_added || sub.delivery_date_time || "",
          delivery_date_time: sub.delivery_date_time || "",
          customer_name: sub.customer_name || sub.customer_order_name || "",
          company_name: sub.company_name || "",
          department_name: sub.department_name || "",
          location_name: sub.location_name || "",
          order_status: sub.order_status,
          subtotal: Number(sub.order_total || 0) - Number(sub.delivery_fee || 0),
          delivery_fee: Number(sub.delivery_fee || 0),
          discount: 0,
          gst: (Number(sub.order_total || 0) - Number(sub.delivery_fee || 0)) * 0.11,
          total: Number(sub.order_total || 0),
          order_total: Number(sub.order_total || 0),
          standing_order: sub.standing_order || 1
        }))

      return {
        reports: [...reportData.reports, ...mappedSubscriptions],
        count: (reportData.count || 0) + mappedSubscriptions.length
      }
    },
  })

  const reports = (reportsData?.reports || []).sort((a: any, b: any) => {
    return b.order_id - a.order_id // Descending by Order ID
  })
  const totalCount = reportsData?.count || 0
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handleApplyFilters = () => {
    setAppliedFilters({
      order_date_from: orderDateFrom ? format(orderDateFrom as Date, "yyyy-MM-dd") : "",
      order_date_to: orderDateTo ? format(orderDateTo as Date, "yyyy-MM-dd") : "",
      delivery_date_from: deliveryDateFrom ? format(deliveryDateFrom as Date, "yyyy-MM-dd") : "",
      delivery_date_to: deliveryDateTo ? format(deliveryDateTo as Date, "yyyy-MM-dd") : "",
      location_id: selectedLocation === "none_selected" ? "" : selectedLocation,
      status: selectedStatus === "none_selected" ? "" : selectedStatus,
      company: selectedCompany === "none_selected" ? "" : selectedCompany,
      search: searchQuery,
      include_subscriptions: includeSubscriptions
    })
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setOrderDateFrom(null)
    setOrderDateTo(null)
    setDeliveryDateFrom(null)
    setDeliveryDateTo(null)
    setSelectedLocation("none_selected")
    setSelectedStatus("none_selected")
    setSelectedCompany("none_selected")
    setSearchQuery("")
    setAppliedFilters({
      order_date_from: "",
      order_date_to: "",
      delivery_date_from: "",
      delivery_date_to: "",
      location_id: "",
      status: "",
      company: "",
      search: "",
      include_subscriptions: true
    })
    setIncludeSubscriptions(true)
    setCurrentPage(1)
  }

  const handleDownloadCSV = async (isExcel: boolean = false) => {
    const toastId = toast.loading("Preparing full report data...")
    try {
      // 1. Prepare parameters for a FULL fetch (no pagination)
      const params = new URLSearchParams()
      if (appliedFilters.order_date_from) params.append("order_date_from", appliedFilters.order_date_from)
      if (appliedFilters.order_date_to) params.append("order_date_to", appliedFilters.order_date_to)
      if (appliedFilters.delivery_date_from) params.append("delivery_date_from", appliedFilters.delivery_date_from)
      if (appliedFilters.delivery_date_to) params.append("delivery_date_to", appliedFilters.delivery_date_to)
      if (appliedFilters.location_id) params.append("location_id", appliedFilters.location_id)
      if (appliedFilters.status) params.append("status", appliedFilters.status)
      if (appliedFilters.company) params.append("company", appliedFilters.company)
      if (appliedFilters.search) params.append("search", appliedFilters.search)
      
      // Set a high limit to get all records for the export
      params.append("limit", "100000")
      params.append("offset", "0")
      
      const reportsPromise = api.get(`/admin/reports?${params.toString()}`)
      
      // 2. Fetch subscriptions if included
      let subscriptionsData = { subscriptions: [], count: 0 }
      if (appliedFilters.include_subscriptions) {
        const subParams: any = {
          status: "active",
          limit: "1000", // Fetch a reasonable amount for export
        }
        if (appliedFilters.search) subParams.search = appliedFilters.search
        try {
          const subResponse = await subscriptionsAPI.list(subParams)
          subscriptionsData = subResponse.data
        } catch (error) {
          console.error("Error fetching subscriptions for export:", error)
        }
      }

      const response = await reportsPromise
      const reportData = response.data
      
      // 3. Merge logic (same as useQuery for consistency)
      const reportIds = new Set(reportData.reports.map((r: any) => r.order_id))
      const mappedSubscriptions = (subscriptionsData.subscriptions || [])
        .filter((sub: any) => !reportIds.has(sub.order_id))
        .filter((sub: any) => {
          if (!appliedFilters.delivery_date_from && !appliedFilters.delivery_date_to) return true
          const subDate = new Date(sub.delivery_date_time)
          if (!isValid(subDate)) return true
          if (appliedFilters.delivery_date_from) {
            const fromDate = new Date(appliedFilters.delivery_date_from)
            fromDate.setHours(0, 0, 0, 0)
            if (subDate < fromDate) return false
          }
          if (appliedFilters.delivery_date_to) {
            const toDate = new Date(appliedFilters.delivery_date_to)
            toDate.setHours(23, 59, 59, 999)
            if (subDate > toDate) return false
          }
          return true
        })
        .map((sub: any) => ({
          order_id: sub.order_id,
          order_date: sub.date_added || sub.delivery_date_time || "",
          delivery_date_time: sub.delivery_date_time || "",
          customer_name: sub.customer_name || sub.customer_order_name || "",
          company_name: sub.company_name || "",
          department_name: sub.department_name || "",
          location_name: sub.location_name || "",
          order_status: sub.order_status,
          delivery_fee: Number(sub.delivery_fee || 0),
          discount: 0,
          total: Number(sub.order_total || 0),
          order_total: Number(sub.order_total || 0),
          standing_order: sub.standing_order || 1
        }))

      const allReports = [...reportData.reports, ...mappedSubscriptions].sort((a: any, b: any) => b.order_id - a.order_id)

      // 4. Generate CSV with ALL 14 columns matching the table
      const headers = [
        "Order ID", "Order Date", "Delivery Date", "Delivery Time", 
        "Customer", "Type", "Company", "Department", "Status", 
        "Subtotal", "Delivery Fee", "Discount", "GST", "Total"
      ]

      const csvRows = allReports.map(r => {
        const displayTotal = Number(r.order_total || r.total || 0)
        const deliveryFee = Number(r.delivery_fee || 0)
        const discount = Number(r.discount || 0)
        const lateFee = Number(r.late_fee || 0)
        
        // Calculation matching the table display (Subtotal = Total - Fees + Discounts)
        const displaySubtotal = displayTotal - deliveryFee - lateFee + discount
        const displayGst = displaySubtotal * 0.11

        return [
          `#${r.order_id}`,
          r.order_date ? formatDateOnly(r.order_date) : 'N/A',
          r.delivery_date_time ? formatDateOnly(r.delivery_date_time) : 'N/A',
          r.delivery_date_time ? formatTimeInAU(r.delivery_date_time) : 'N/A',
          `"${String(r.customer_name || r.customer_order_name || "").replace(/"/g, '""')}"`,
          r.standing_order && r.standing_order > 0 ? "Subscription" : "One-off",
          `"${String(r.company_name || r.company || "").replace(/"/g, '""')}"`,
          `"${String(r.department_name || "").replace(/"/g, '""')}"`,
          getStatusBadge(r.order_status).label,
          displaySubtotal.toFixed(2),
          deliveryFee.toFixed(2),
          discount.toFixed(2),
          displayGst.toFixed(2),
          displayTotal.toFixed(2)
        ]
      })

      const csvContent = [
        headers.join(","),
        ...csvRows.map(row => row.join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', isExcel ? 'reports_full.csv' : 'reports_full.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success(`${isExcel ? "Excel" : "CSV"} report downloaded with all details!`, { id: toastId })
    } catch (error: any) {
      console.error("Download CSV error:", error)
      toast.error(error.message || "Failed to download full report", { id: toastId })
    }
  }

  const handleDownloadExcel = () => {
    // For now, use CSV format for Excel
    handleDownloadCSV(true)
  }

  const handlePrint = () => {
    printTableData("Reports")
  }

  const getStatusBadge = (status: number) => {
    const statusMap: { [key: number]: { label: string; class: string } } = {
      0: { label: "Cancelled", class: "bg-gray-100 text-gray-600" },
      1: { label: "New", class: "bg-[#FFEBEE] text-[#C62828]" },
      2: { label: "Paid", class: "bg-[#FFEBEE] text-[#C62828]" },
      3: { label: "Completed", class: "bg-green-50 text-green-700" },
      4: { label: "Awaiting Approval", class: "bg-yellow-50 text-yellow-700" },
      5: { label: "Processing", class: "bg-purple-50 text-purple-700" },
      6: { label: "Production", class: "bg-indigo-50 text-indigo-700" },
      7: { label: "Approved", class: "bg-green-50 text-green-700" },
      8: { label: "Rejected", class: "bg-[#FFEBEE] text-[#C62828]" },
    }
    return statusMap[status] || { label: "Unknown", class: "bg-gray-100 text-gray-600" }
  }

  const safeFormatDate = (dateStr: string | null | undefined, formatStr: string) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    if (!isValid(date)) return "N/A"
    return format(date, formatStr)
  }

  return (
    <div className="bg-gray-50 min-h-screen w-full max-w-full overflow-x-hidden" style={{ fontFamily: 'Albert Sans' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-gray-900" style={{
          fontFamily: 'Albert Sans',
          fontWeight: 600,
          fontStyle: 'normal',
          fontSize: '32px',
          lineHeight: '40px',
          letterSpacing: '0%'
        }}>
          Reports
        </h1>
      </div>

      {/* Filters Section */}
      <Card className="border border-gray-200 shadow-sm mb-6 p-6 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Order Date From/To */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2.5 bg-white">
            <CalendarIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <div className="flex flex-col flex-1">
              <span className="text-xs text-gray-600 mb-1">Order Date</span>
              <DatePicker
                selected={orderDateFrom}
                onChange={(date) => setOrderDateFrom(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="From Date"
                className="text-sm text-gray-900 border-none outline-none w-full cursor-pointer"
                wrapperClassName="w-full"
              />
            </div>
            <div className="flex flex-col flex-1 border-l pl-2">
              <span className="text-xs text-gray-600 mb-1">To Date</span>
              <DatePicker
                selected={orderDateTo}
                onChange={(date) => setOrderDateTo(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="To Date"
                className="text-sm text-gray-900 border-none outline-none w-full cursor-pointer"
                wrapperClassName="w-full"
              />
            </div>
          </div>

          {/* Delivery Date From/To */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2.5 bg-white">
            <CalendarIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <div className="flex flex-col flex-1">
              <span className="text-xs text-gray-600 mb-1">Delivery Date</span>
              <DatePicker
                selected={deliveryDateFrom}
                onChange={(date) => setDeliveryDateFrom(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="From Date"
                className="text-sm text-gray-900 border-none outline-none w-full cursor-pointer"
                wrapperClassName="w-full"
              />
            </div>
            <div className="flex flex-col flex-1 border-l pl-2">
              <span className="text-xs text-gray-600 mb-1">To Date</span>
              <DatePicker
                selected={deliveryDateTo}
                onChange={(date) => setDeliveryDateTo(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="To Date"
                className="text-sm text-gray-900 border-none outline-none w-full cursor-pointer"
                wrapperClassName="w-full"
              />
            </div>
          </div>

          {/* Select Locations */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-1.5 bg-white">
            <MapPin className="h-5 w-5 text-gray-400" />
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="flex-1 text-sm bg-transparent border-none p-0 focus:ring-0 h-9">
                <SelectValue placeholder="Select Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none_selected">Select Locations</SelectItem>
                {locations.map((location: any) => (
                  <SelectItem key={location.location_id} value={location.location_id.toString()}>
                    {location.location_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select Company */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-1.5 bg-white">
            <Filter className="h-5 w-5 text-gray-400" />
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="flex-1 text-sm bg-transparent border-none p-0 focus:ring-0 h-9">
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none_selected">Select Company</SelectItem>
                {companies.map((company: any) => (
                  <SelectItem key={company.company_id} value={company.company_name}>
                    {company.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select Statuses */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-1.5 bg-white">
            <Filter className="h-5 w-5 text-gray-400" />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="flex-1 text-sm bg-transparent border-none p-0 focus:ring-0 h-9">
                <SelectValue placeholder="Select Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none_selected">Select Statuses</SelectItem>
                <SelectItem value="1">New</SelectItem>
                <SelectItem value="7">Approved</SelectItem>
                <SelectItem value="3">Completed</SelectItem>
                <SelectItem value="90">All minus paid</SelectItem>
                <SelectItem value="91">All minus cancelled</SelectItem>
                <SelectItem value="8">Rejected</SelectItem>
                <SelectItem value="0">Cancelled</SelectItem>
                <SelectItem value="2">Paid</SelectItem>
                <SelectItem value="4">Waiting for Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include Subscriptions */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2.5 bg-white">
            <label className="flex items-center gap-2 cursor-pointer w-full h-full">
              <input
                type="checkbox"
                checked={includeSubscriptions}
                onChange={(e) => setIncludeSubscriptions(e.target.checked)}
                className="w-4 h-4 text-[#C62828] border-gray-300 rounded focus:ring-[#C62828]"
              />
              <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>Include Subscriptions</span>
            </label>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            onClick={handleApplyFilters}
            className="bg-[#C62828] hover:bg-[#B71C1C] text-white shadow-sm transition-all hover:shadow-md"
            style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
          <Button
            onClick={handleClearFilters}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all text-gray-700 hover:text-gray-900"
            style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Search and Export */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search Order ID, Customer ID, Status etc."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleApplyFilters()
              }
            }}
            className="w-full sm:w-[488px] h-[54px] border border-gray-200 bg-white rounded-full focus:ring-2 focus:ring-[#C62828] focus:border-[#C62828] focus:outline-none"
            style={{ fontFamily: 'Albert Sans', paddingLeft: '44px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px' }}
          />
        </div>
        <Button
          onClick={() => handleDownloadCSV(false)}
          variant="outline"
          className="gap-2 h-11 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 transition-all"
          style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
        >
          <FileDown className="h-5 w-5" />
          CSV
        </Button>
        <Button
          onClick={handleDownloadExcel}
          variant="outline"
          className="gap-2 h-11 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 transition-all"
          style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
        >
          <FileText className="h-5 w-5" />
          Excel
        </Button>
        <Button
          onClick={handlePrint}
          className="gap-2 whitespace-nowrap border-0 shadow-none ml-auto"
          style={{
            fontFamily: 'Albert Sans',
            fontWeight: 600,
            fontStyle: 'normal',
            fontSize: '16px',
            lineHeight: '20px',
            letterSpacing: '0%',
            textAlign: 'center',
          }}
        >
          <Printer className="h-5 w-5 text-[#C62828]" />
          Print
        </Button>
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: 'Albert Sans' }}>
        {isLoading ? "Loading..." : `Showing ${reports.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-${Math.min(currentPage * itemsPerPage, totalCount)} of ${totalCount} Reports`}
      </p>

      {/* Table */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Order Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Delivery Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Delivery Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Order Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Subtotal
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Delivery Fee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Discount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  GST
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="text-center py-8 text-gray-500">Loading reports...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-8 text-gray-500">No reports found.</td>
                </tr>
              ) : (
                reports.map((report: Report, index: number) => {
                  const statusInfo = getStatusBadge(report.order_status)
                  
                  // Use order_total if available, as it's the correct total from the backend
                  const displayTotal = Number(report.order_total || report.total || 0)
                  const deliveryFee = Number(report.delivery_fee || 0)
                  const discount = Number(report.discount || 0)
                  const lateFee = Number(report.late_fee || 0)
                  
                  // Derive subtotal: Total = Subtotal + Delivery + Late - Discount
                  // So Subtotal = Total - Delivery - Late + Discount
                  const displaySubtotal = displayTotal - deliveryFee - lateFee + discount
                  const displayGst = displaySubtotal * 0.11

                  return (
                    <tr key={`${report.order_id}-${index}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#C62828] font-medium" style={{ fontFamily: 'Albert Sans' }}>
                          #{report.order_id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          {report.order_date ? formatDateOnly(report.order_date) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          {report.delivery_date_time ? formatDateOnly(report.delivery_date_time) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          {report.delivery_date_time ? formatTimeInAU(report.delivery_date_time) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          {report.customer_name || 
                            report.customer_order_name || 
                            `${report.firstname || ''} ${report.lastname || ''}`.trim() || 
                            'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {report.standing_order && report.standing_order > 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            Subscription
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-200">
                            One-off
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          {report.company_name || report.company || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          {report.department_name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          ${displaySubtotal.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          ${deliveryFee.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          ${discount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                            ${displayGst.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-gray-500 italic">(incl.)</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-900 font-semibold" style={{ fontFamily: 'Albert Sans' }}>
                          ${displayTotal.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-600" style={{ fontFamily: 'Albert Sans' }}>
          Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} Entries
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-300 bg-white"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </Button>
          <Button
            size="sm"
            className="bg-[#C62828] hover:bg-[#B71C1C] text-white"
          >
            {currentPage}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-300 bg-white"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
