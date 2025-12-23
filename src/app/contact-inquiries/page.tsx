"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { contactInquiriesAPI } from "@/lib/api"
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
import { Search, Eye, Trash2, Mail, Phone, MessageSquare, Calendar, MoreVertical } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface ContactInquiry {
  id: number
  first_name: string
  last_name: string
  email: string
  phone_number?: string
  message: string
  status: string
  created_at: string
  updated_at: string
}

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "new": return "bg-blue-50 text-blue-700"
    case "read": return "bg-yellow-50 text-yellow-700"
    case "replied": return "bg-green-50 text-green-700"
    default: return "bg-gray-50 text-gray-700"
  }
}

export default function ContactInquiriesPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteInquiryId, setDeleteInquiryId] = useState<number | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["contact-inquiries", searchQuery, selectedStatus],
    queryFn: async () => {
      const params: any = { limit: 100 }
      if (searchQuery) params.search = searchQuery
      if (selectedStatus) params.status = selectedStatus
      const response = await contactInquiriesAPI.list(params)
      return response.data
    },
  })

  // Handle errors
  if (error) {
    console.error("Contact inquiries API error:", error)
  }

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      contactInquiriesAPI.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-inquiries"] })
      toast.success("Status updated successfully")
    },
    onError: () => {
      toast.error("Failed to update status")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => contactInquiriesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-inquiries"] })
      toast.success("Inquiry deleted successfully")
      setShowDeleteModal(false)
      setDeleteInquiryId(null)
    },
    onError: () => {
      toast.error("Failed to delete inquiry")
    },
  })

  const inquiries: ContactInquiry[] = data?.inquiries || []

  const handleViewDetails = (inquiry: ContactInquiry) => {
    setSelectedInquiry(inquiry)
    setShowDetailModal(true)
  }

  const handleDelete = (id: number) => {
    setDeleteInquiryId(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    if (deleteInquiryId) {
      deleteMutation.mutate(deleteInquiryId)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contact Inquiries</h1>
        <p className="text-gray-600 mt-2">View and manage contact form submissions</p>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by name, email, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Inquiries List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : inquiries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No contact inquiries found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {inquiry.first_name} {inquiry.last_name}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{inquiry.email}</span>
                    </div>
                    {inquiry.phone_number && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        <span>{inquiry.phone_number}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(inquiry.created_at), "MMM dd, yyyy HH:mm")}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{inquiry.message}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(inquiry)}
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
                      {inquiry.status !== "read" && (
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: "read" })}
                        >
                          Mark as Read
                        </DropdownMenuItem>
                      )}
                      {inquiry.status !== "replied" && (
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: "replied" })}
                        >
                          Mark as Replied
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-[#055160]"
                        onClick={() => handleDelete(inquiry.id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contact Inquiry Details</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  <p className="text-gray-900">{selectedInquiry.first_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  <p className="text-gray-900">{selectedInquiry.last_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedInquiry.email}</p>
                </div>
                {selectedInquiry.phone_number && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                    <p className="text-gray-900">{selectedInquiry.phone_number}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedInquiry.status)}`}>
                      {selectedInquiry.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Submitted</label>
                  <p className="text-gray-900">
                    {format(new Date(selectedInquiry.created_at), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Message</label>
                <div className="mt-1 p-4 bg-gray-50 rounded-lg border">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedInquiry.message}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                {selectedInquiry.status !== "read" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedInquiry.id, status: "read" })
                      setShowDetailModal(false)
                    }}
                  >
                    Mark as Read
                  </Button>
                )}
                {selectedInquiry.status !== "replied" && (
                  <Button
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedInquiry.id, status: "replied" })
                      setShowDetailModal(false)
                    }}
                  >
                    Mark as Replied
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
            <DialogTitle>Delete Contact Inquiry</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">Are you sure you want to delete this contact inquiry? This action cannot be undone.</p>
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

