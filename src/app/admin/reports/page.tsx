"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Search, FileDown, FileText, Printer, Calendar as CalendarIcon, MapPin, Filter } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { printTableData } from "@/lib/print-utils"

interface Report {
  order_id: number
  order_date: string
  delivery_date_time: string
  customer_name: string
  company_name: string
  department_name: string
  location_name: string
  order_status: number
  subtotal: number
  delivery_fee: number
  discount: number
  gst: number
  total: number
  order_total?: number
  late_fee?: number
}

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter state
  const [orderDateFrom, setOrderDateFrom] = useState<Date | null>(null)
  const [orderDateTo, setOrderDateTo] = useState<Date | null>(null)
  const [deliveryDateFrom, setDeliveryDateFrom] = useState<Date | null>(null)
  const [deliveryDateTo, setDeliveryDateTo] = useState<Date | null>(null)
  const [selectedLocation, setSelectedLocation] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("2")
  const [selectedCompany, setSelectedCompany] = useState("")

  // Applied filters (for API call)
  const [appliedFilters, setAppliedFilters] = useState({
    order_date_from: "",
    order_date_to: "",
    delivery_date_from: "",
    delivery_date_to: "",
    location_id: "",
    status: "2",
    company: "",
    search: ""
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
      const response = await api.get(`/admin/reports?${params.toString()}`)
      return response.data
    },
  })

  const reports = reportsData?.reports || []
  const totalCount = reportsData?.count || 0
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handleApplyFilters = () => {
    setAppliedFilters({
      order_date_from: orderDateFrom ? format(orderDateFrom as Date, "yyyy-MM-dd") : "",
      order_date_to: orderDateTo ? format(orderDateTo as Date, "yyyy-MM-dd") : "",
      delivery_date_from: deliveryDateFrom ? format(deliveryDateFrom as Date, "yyyy-MM-dd") : "",
      delivery_date_to: deliveryDateTo ? format(deliveryDateTo as Date, "yyyy-MM-dd") : "",
      location_id: selectedLocation,
      status: selectedStatus,
      company: selectedCompany,
      search: searchQuery
    })
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setOrderDateFrom(null)
    setOrderDateTo(null)
    setDeliveryDateFrom(null)
    setDeliveryDateTo(null)
    setSelectedLocation("")
    setSelectedStatus("2")
    setSelectedCompany("")
    setSearchQuery("")
    setAppliedFilters({
      order_date_from: "",
      order_date_to: "",
      delivery_date_from: "",
      delivery_date_to: "",
      location_id: "",
      status: "2",
      company: "",
      search: ""
    })
    setCurrentPage(1)
  }

  const handleDownloadCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (appliedFilters.order_date_from) params.append("order_date_from", appliedFilters.order_date_from)
      if (appliedFilters.order_date_to) params.append("order_date_to", appliedFilters.order_date_to)
      if (appliedFilters.delivery_date_from) params.append("delivery_date_from", appliedFilters.delivery_date_from)
      if (appliedFilters.delivery_date_to) params.append("delivery_date_to", appliedFilters.delivery_date_to)
      if (appliedFilters.location_id) params.append("location_id", appliedFilters.location_id)
      if (appliedFilters.status) params.append("status", appliedFilters.status)
      if (appliedFilters.company) params.append("company", appliedFilters.company)
      if (appliedFilters.search) params.append("search", appliedFilters.search)

      const response = await api.get(`/admin/reports/download/csv?${params.toString()}`, {
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'orders_report.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success("CSV report downloaded successfully!")
    } catch (error: any) {
      console.error("Download CSV error:", error)
      toast.error(error.response?.data?.message || "Failed to download CSV")
    }
  }

  const handleDownloadExcel = () => {
    // For now, use CSV format for Excel
    handleDownloadCSV()
    toast.success("Excel report downloaded successfully!")
  }

  const handlePrint = () => {
    printTableData("Reports")
  }

  const getStatusBadge = (status: number) => {
    const statusMap: { [key: number]: { label: string; class: string } } = {
      0: { label: "Cancelled", class: "bg-gray-100 text-gray-600" },
      1: { label: "New", class: "bg-[#e7f1ff] text-[#055160]" },
      2: { label: "Paid", class: "bg-[#e7f1ff] text-[#055160]" },
      3: { label: "Completed", class: "bg-green-50 text-green-700" },
      4: { label: "Awaiting Approval", class: "bg-yellow-50 text-yellow-700" },
      5: { label: "Processing", class: "bg-purple-50 text-purple-700" },
      6: { label: "Production", class: "bg-indigo-50 text-indigo-700" },
      7: { label: "Approved", class: "bg-green-50 text-green-700" },
      8: { label: "Rejected", class: "bg-[#e7f1ff] text-[#055160]" },
    }
    return statusMap[status] || { label: "Unknown", class: "bg-gray-100 text-gray-600" }
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
                {...({ selected: orderDateFrom || undefined } as any)}
                onChange={(date) => setOrderDateFrom(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="From Date"
                className="text-sm text-gray-900 border-none outline-none w-full cursor-pointer"
                style={{ fontFamily: 'Albert Sans' }}
                wrapperClassName="w-full"
              />
            </div>
            <div className="flex flex-col flex-1 border-l pl-2">
              <span className="text-xs text-gray-600 mb-1">To Date</span>
              <DatePicker
                {...({ selected: orderDateTo || undefined } as any)}
                onChange={(date) => setOrderDateTo(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="To Date"
                className="text-sm text-gray-900 border-none outline-none w-full cursor-pointer"
                style={{ fontFamily: 'Albert Sans' }}
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
                {...({ selected: deliveryDateFrom || undefined } as any)}
                onChange={(date) => setDeliveryDateFrom(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="From Date"
                className="text-sm text-gray-900 border-none outline-none w-full cursor-pointer"
                style={{ fontFamily: 'Albert Sans' }}
                wrapperClassName="w-full"
              />
            </div>
            <div className="flex flex-col flex-1 border-l pl-2">
              <span className="text-xs text-gray-600 mb-1">To Date</span>
              <DatePicker
                {...({ selected: deliveryDateTo || undefined } as any)}
                onChange={(date) => setDeliveryDateTo(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="To Date"
                className="text-sm text-gray-900 border-none outline-none w-full cursor-pointer"
                style={{ fontFamily: 'Albert Sans' }}
                wrapperClassName="w-full"
              />
            </div>
          </div>

          {/* Select Locations */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2.5 bg-white">
            <MapPin className="h-5 w-5 text-gray-500" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="flex-1 text-sm bg-transparent border-none p-0 focus:outline-none"
              style={{ fontFamily: 'Albert Sans' }}
            >
              <option value="">Select Locations</option>
              {locations.map((location: any) => (
                <option key={location.location_id} value={location.location_id}>
                  {location.location_name}
                </option>
              ))}
            </select>
          </div>

          {/* Select Company */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2.5 bg-white">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="flex-1 text-sm bg-transparent border-none p-0 focus:outline-none"
              style={{ fontFamily: 'Albert Sans' }}
            >
              <option value="">Select Company</option>
              {companies.map((company: any) => (
                <option key={company.company_id} value={company.company_name}>
                  {company.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Select Statuses */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2.5 bg-white">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="flex-1 text-sm bg-transparent border-none p-0 focus:outline-none"
              style={{ fontFamily: 'Albert Sans' }}
            >
              <option value="">Select Statuses</option>
              <option value="1">New</option>
              <option value="7">Approved</option>
              <option value="3">Completed</option>
              <option value="90">All minus paid</option>
              <option value="91">All minus cancelled</option>
              <option value="8">Rejected</option>
              <option value="0">Cancelled</option>
              <option value="2">Paid</option>
              <option value="4">Waiting for Approval</option>
            </select>
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
            className="w-[488px] h-[54px] border border-gray-200 bg-white rounded-full focus:ring-2 focus:ring-[#c32626] focus:border-[#c32626] focus:outline-none"
            style={{ fontFamily: 'Albert Sans', paddingLeft: '44px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px' }}
          />
        </div>
        <Button
          onClick={handleDownloadCSV}
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
            color: '#c32626',
            backgroundColor: 'transparent',
            padding: 0,
            gap: '8px',
            opacity: 1
          }}
        >
          <Printer className="h-5 w-5 text-[#c32626]" />
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
                  <td colSpan={13} className="text-center py-8 text-gray-500">Loading reports...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-gray-500">No reports found.</td>
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
                  const displayGst = displaySubtotal * 0.1

                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#c32626] font-medium" style={{ fontFamily: 'Albert Sans' }}>
                          #{report.order_id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          {report.order_date ? format(new Date(report.order_date), "dd-MM-yyyy") : "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          {report.delivery_date_time ? format(new Date(report.delivery_date_time), "dd-MM-yyyy") : "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          {report.delivery_date_time ? format(new Date(report.delivery_date_time), "HH:mm") : "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          {report.customer_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          {report.company_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          {report.department_name}
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
