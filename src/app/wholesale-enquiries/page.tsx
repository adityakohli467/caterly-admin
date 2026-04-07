"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { wholesaleEnquiriesAPI } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Eye, Trash2, Mail, Phone, Building2, MapPin, Calendar, MoreVertical, Globe } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { formatDateOnly, formatTimeInAU } from "@/lib/utils"

interface WholesaleEnquiry {
  id: number
  first_name: string
  last_name: string
  business_name: string
  email: string
  phone_number?: string
  business_address: string
  suburb: string
  state: string
  postcode: string
  business_license?: string
  business_website?: string
  weekly_volume: string
  start_month: string
  start_year: string
  status: string
  created_at: string
  updated_at: string
}

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "new": return "bg-blue-50 text-blue-700"
    case "contacted": return "bg-yellow-50 text-yellow-700"
    case "approved": return "bg-green-50 text-green-700"
    case "rejected": return "bg-[#FFEBEE] text-[#C62828]"
    default: return "bg-gray-50 text-gray-700"
  }
}

export default function WholesaleEnquiriesPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedEnquiry, setSelectedEnquiry] = useState<WholesaleEnquiry | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteEnquiryId, setDeleteEnquiryId] = useState<number | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wholesale-enquiries", searchQuery, selectedStatus],
    queryFn: async () => {
      const params: any = { limit: 100 }
      if (searchQuery) params.search = searchQuery
      if (selectedStatus && selectedStatus !== "all") params.status = selectedStatus
      const response = await wholesaleEnquiriesAPI.list(params)
      return response.data
    },
  })

  // Handle errors
  if (error) {
    console.error("Wholesale enquiries API error:", error)
  }

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      wholesaleEnquiriesAPI.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wholesale-enquiries"] })
      toast.success("Status updated successfully")
    },
    onError: () => {
      toast.error("Failed to update status")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => wholesaleEnquiriesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wholesale-enquiries"] })
      toast.success("Enquiry deleted successfully")
      setShowDeleteModal(false)
      setDeleteEnquiryId(null)
    },
    onError: () => {
      toast.error("Failed to delete enquiry")
    },
  })

  const enquiries: WholesaleEnquiry[] = data?.enquiries || []

  const handleViewDetails = (enquiry: WholesaleEnquiry) => {
    setSelectedEnquiry(enquiry)
    setShowDetailModal(true)
  }

  const handleDelete = (id: number) => {
    setDeleteEnquiryId(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    if (deleteEnquiryId) {
      deleteMutation.mutate(deleteEnquiryId)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Wholesale Enquiries</h1>
        <p className="text-gray-600 mt-2">View and manage wholesale partnership enquiries</p>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by name, business, email, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
            >
              <SelectTrigger className="h-11 border-gray-200 rounded-lg focus:ring-[#C62828] focus:border-[#C62828] bg-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value || "all"} value={option.value || "all"}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Enquiries List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : error ? (
        <Card className="p-12 text-center">
          <p className="text-[#C62828] mb-4">Error loading wholesale enquiries</p>
          <p className="text-sm text-gray-500 mb-4">
            {(error as any)?.response?.data?.message || "Please check your connection and try again"}
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </Card>
      ) : enquiries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No wholesale enquiries found</p>
          <p className="text-sm text-gray-400 mt-2">Submissions from the wholesale enquiry form will appear here</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {enquiries.map((enquiry) => (
            <Card key={enquiry.id} className="p-6 hover:shadow-lg transition-all border-gray-100 rounded-2xl bg-white shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900">{enquiry.business_name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(enquiry.status)}`}>
                      {enquiry.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{enquiry.first_name} {enquiry.last_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{enquiry.email}</span>
                    </div>
                    {enquiry.phone_number && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        <span>{enquiry.phone_number}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{enquiry.suburb}, {enquiry.state} {enquiry.postcode}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateOnly(enquiry.created_at)} {formatTimeInAU(enquiry.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Weekly Volume:</span> {enquiry.weekly_volume} kg | 
                    <span className="font-medium ml-2">Start Date:</span> {enquiry.start_month} {enquiry.start_year}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(enquiry)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {enquiry.status !== "contacted" && (
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ id: enquiry.id, status: "contacted" })}
                        >
                          Mark as Contacted
                        </DropdownMenuItem>
                      )}
                      {enquiry.status !== "approved" && (
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ id: enquiry.id, status: "approved" })}
                        >
                          Mark as Approved
                        </DropdownMenuItem>
                      )}
                      {enquiry.status !== "rejected" && (
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ id: enquiry.id, status: "rejected" })}
                        >
                          Mark as Rejected
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-[#C62828]"
                        onClick={() => handleDelete(enquiry.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wholesale Enquiry Details</DialogTitle>
          </DialogHeader>
          {selectedEnquiry && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">First Name</label>
                    <p className="text-gray-900">{selectedEnquiry.first_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Name</label>
                    <p className="text-gray-900">{selectedEnquiry.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{selectedEnquiry.email}</p>
                  </div>
                  {selectedEnquiry.phone_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone Number</label>
                      <p className="text-gray-900">{selectedEnquiry.phone_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Business Name</label>
                    <p className="text-gray-900">{selectedEnquiry.business_name}</p>
                  </div>
                  {selectedEnquiry.business_license && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Business License</label>
                      <p className="text-gray-900">{selectedEnquiry.business_license}</p>
                    </div>
                  )}
                  {selectedEnquiry.business_website && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-700">Business Website</label>
                      <p className="text-gray-900">
                        <a href={selectedEnquiry.business_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {selectedEnquiry.business_website}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Address */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <p className="text-gray-900">{selectedEnquiry.business_address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Suburb</label>
                    <p className="text-gray-900">{selectedEnquiry.suburb}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <p className="text-gray-900">{selectedEnquiry.state}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Postcode</label>
                    <p className="text-gray-900">{selectedEnquiry.postcode}</p>
                  </div>
                </div>
              </div>

              {/* Partnership Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Partnership Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Expected Weekly Volume</label>
                    <p className="text-gray-900">{selectedEnquiry.weekly_volume} kg</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Preferred Start Date</label>
                    <p className="text-gray-900">{selectedEnquiry.start_month} {selectedEnquiry.start_year}</p>
                  </div>
                </div>
              </div>

              {/* Status and Dates */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Dates</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedEnquiry.status)}`}>
                        {selectedEnquiry.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Submitted</label>
                    <p className="text-gray-900">
                      {formatDateOnly(selectedEnquiry.created_at)} {formatTimeInAU(selectedEnquiry.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {selectedEnquiry.status !== "contacted" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedEnquiry.id, status: "contacted" })
                      setShowDetailModal(false)
                    }}
                  >
                    Mark as Contacted
                  </Button>
                )}
                {selectedEnquiry.status !== "approved" && (
                  <Button
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedEnquiry.id, status: "approved" })
                      setShowDetailModal(false)
                    }}
                  >
                    Mark as Approved
                  </Button>
                )}
                {selectedEnquiry.status !== "rejected" && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedEnquiry.id, status: "rejected" })
                      setShowDetailModal(false)
                    }}
                  >
                    Mark as Rejected
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Wholesale Enquiry</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">Are you sure you want to delete this wholesale enquiry? This action cannot be undone.</p>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

