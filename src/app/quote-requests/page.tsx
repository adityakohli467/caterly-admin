"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { quotationsAPI } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    Search,
    Eye,
    Trash2,
    Mail,
    Phone,
    Calendar,
    Clock,
    PartyPopper,
    FileText,
    Check,
    ChevronDown,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface QuoteRequest {
    id: number
    name: string
    contact: string
    email: string
    delivery_date_time: string
    occasion: string
    message: string
    status: string
    created_at: string
    updated_at: string
}

const statusOptions = [
    { value: "", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "new", label: "New" },
    { value: "reviewed", label: "Reviewed" },
    { value: "replied", label: "Replied" },
]

const getStatusConfig = (status: string) => {
    switch (status) {
        case "pending":
            return { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", label: "Pending" }
        case "new":
            return { bg: "bg-[#E03A3E]/10", text: "text-[#E03A3E]", dot: "bg-[#E03A3E]", label: "New" }
        case "reviewed":
            return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Reviewed" }
        case "replied":
            return { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", label: "Replied" }
        default:
            return { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400", label: status }
    }
}

export default function QuoteRequestsPage() {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedStatus, setSelectedStatus] = useState("")
    const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteQuoteId, setDeleteQuoteId] = useState<number | null>(null)

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["quote-requests", searchQuery, selectedStatus],
        queryFn: async () => {
            const params: any = { limit: 100 }
            if (searchQuery) params.search = searchQuery
            if (selectedStatus) params.status = selectedStatus
            const response = await quotationsAPI.list(params)
            return response.data
        },
        retry: false,
        refetchOnWindowFocus: false,
    })

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            quotationsAPI.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quote-requests"] })
            toast.success("Status updated successfully")
        },
        onError: () => {
            toast.error("Failed to update status")
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => quotationsAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quote-requests"] })
            toast.success("Quote request deleted successfully")
            setShowDeleteModal(false)
            setDeleteQuoteId(null)
            if (showDetailModal) setShowDetailModal(false)
        },
        onError: () => {
            toast.error("Failed to delete quote request")
        },
    })

    const quotes: QuoteRequest[] = data?.inquiries || data?.quotations || data?.data || []

    const handleViewDetails = (quote: QuoteRequest) => {
        setSelectedQuote(quote)
        setShowDetailModal(true)
        // Auto-mark as reviewed when opening
        if (quote.status === "new" || quote.status === "pending") {
            updateStatusMutation.mutate({ id: quote.id, status: "reviewed" })
        }
    }

    const handleDelete = (id: number) => {
        setDeleteQuoteId(id)
        setShowDeleteModal(true)
    }

    const confirmDelete = () => {
        if (deleteQuoteId) {
            deleteMutation.mutate(deleteQuoteId)
        }
    }

    const formatDeliveryDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), "MMM dd, yyyy 'at' hh:mm a")
        } catch {
            return dateStr
        }
    }

    const formatCreatedAt = (dateStr: string) => {
        try {
            return format(new Date(dateStr), "MMM dd, yyyy HH:mm")
        } catch {
            return dateStr
        }
    }

    // Summary counts
    const newCount = quotes.filter(q => q.status === "new" || q.status === "pending").length
    const reviewedCount = quotes.filter(q => q.status === "reviewed").length
    const repliedCount = quotes.filter(q => q.status === "replied").length

    return (
        <div className="w-full">
            {/* Page Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E03A3E]/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-[#E03A3E]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Albert Sans', sans-serif" }}>
                            Requested Quotes
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Manage and respond to customer quote requests
                        </p>
                    </div>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                    {quotes.length} total request{quotes.length !== 1 ? "s" : ""}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#E03A3E]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#E03A3E] font-bold text-sm">{newCount}</span>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">New</p>
                        <p className="text-sm text-gray-700 font-semibold">Unread</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-600 font-bold text-sm">{reviewedCount}</span>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Reviewed</p>
                        <p className="text-sm text-gray-700 font-semibold">In Progress</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 font-bold text-sm">{repliedCount}</span>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Replied</p>
                        <p className="text-sm text-gray-700 font-semibold">Completed</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4 mb-6 border border-gray-100 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search by name, email, occasion..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 border-gray-200 focus:border-[#E03A3E] focus:ring-[#E03A3E]/20"
                        />
                    </div>
                    <div className="relative w-full sm:w-44">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full appearance-none px-4 py-2 pr-9 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-[#E03A3E] bg-white"
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    </div>
                </div>
            </Card>

            {/* Quote List */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-10 h-10 border-2 border-[#E03A3E] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Loading quote requests...</p>
                </div>
            ) : error ? (
                <Card className="p-12 text-center border border-red-100">
                    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-7 h-7 text-red-400" />
                    </div>
                    <p className="text-gray-800 font-semibold">Failed to load quote requests</p>
                    <p className="text-sm text-gray-500 mt-1 mb-4">
                        {(error as Error)?.message || "The server returned an error. The quotation inquiries feature may not be set up on the backend yet."}
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="border-gray-200 text-gray-700 hover:border-[#E03A3E] hover:text-[#E03A3E]"
                    >
                        Try Again
                    </Button>
                </Card>
            ) : quotes.length === 0 ? (
                <Card className="p-16 text-center border border-gray-100">
                    <div className="w-16 h-16 rounded-full bg-[#E03A3E]/5 flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-7 h-7 text-[#E03A3E]/40" />
                    </div>
                    <p className="text-gray-600 font-medium">No quote requests found</p>
                    <p className="text-sm text-gray-400 mt-1">Requests submitted from the store will appear here</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {quotes.map((quote) => {
                        const statusCfg = getStatusConfig(quote.status)
                        return (
                            <Card
                                key={quote.id}
                                className="p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:border-[#F2CACA]"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                    {/* Left: Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <h3 className="text-base font-semibold text-gray-900 truncate" style={{ fontFamily: "'Albert Sans', sans-serif" }}>
                                                {quote.name}
                                            </h3>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                {statusCfg.label}
                                            </span>
                                            {quote.occasion && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                                                    <PartyPopper className="w-3 h-3" />
                                                    {quote.occasion}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                                            <span className="flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                {quote.email}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                {quote.contact}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                {formatDeliveryDate(quote.delivery_date_time)}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                Submitted {formatCreatedAt(quote.created_at)}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-600 line-clamp-2">{quote.message}</p>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex sm:flex-col items-center gap-2 flex-shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewDetails(quote)}
                                            className="flex-1 sm:flex-none sm:w-full border-gray-200 text-gray-700 hover:border-[#E03A3E] hover:text-[#E03A3E] transition-colors"
                                        >
                                            <Eye className="w-4 h-4 mr-1.5" />
                                            View
                                        </Button>

                                        {quote.status !== "replied" && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => updateStatusMutation.mutate({ id: quote.id, status: "replied" })}
                                                disabled={updateStatusMutation.isPending}
                                                className="flex-1 sm:flex-none sm:w-full border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                                            >
                                                <Check className="w-4 h-4 mr-1.5" />
                                                Replied
                                            </Button>
                                        )}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(quote.id)}
                                            className="flex-1 sm:flex-none sm:w-full border-red-100 text-[#E03A3E] hover:bg-[#E03A3E]/5 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1.5" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-900" style={{ fontFamily: "'Albert Sans', sans-serif" }}>
                            <FileText className="w-4 h-4 text-[#E03A3E]" />
                            Quote Request Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedQuote && (
                        <div className="space-y-4 pt-2">
                            {/* Status badge */}
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const cfg = getStatusConfig(selectedQuote.status)
                                    return (
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                            {cfg.label}
                                        </span>
                                    )
                                })()}
                                <span className="text-xs text-gray-400">
                                    Submitted {formatCreatedAt(selectedQuote.created_at)}
                                </span>
                            </div>

                            {/* Details Grid */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <DetailRow icon={<Mail className="w-4 h-4" />} label="Name" value={selectedQuote.name} />
                                <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={selectedQuote.email} />
                                <DetailRow icon={<Phone className="w-4 h-4" />} label="Contact" value={selectedQuote.contact} />
                                <DetailRow
                                    icon={<Clock className="w-4 h-4" />}
                                    label="Delivery Date & Time"
                                    value={formatDeliveryDate(selectedQuote.delivery_date_time)}
                                />
                                <DetailRow
                                    icon={<PartyPopper className="w-4 h-4" />}
                                    label="Occasion"
                                    value={selectedQuote.occasion}
                                />
                            </div>

                            {/* Message */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</label>
                                <div className="mt-1.5 p-4 bg-white rounded-xl border border-[#F2CACA]">
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                        {selectedQuote.message}
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                {selectedQuote.status !== "reviewed" && selectedQuote.status !== "replied" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            updateStatusMutation.mutate({ id: selectedQuote.id, status: "reviewed" })
                                            setSelectedQuote(prev => prev ? { ...prev, status: "reviewed" } : null)
                                        }}
                                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                                    >
                                        Mark as Reviewed
                                    </Button>
                                )}
                                {selectedQuote.status !== "replied" && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            updateStatusMutation.mutate({ id: selectedQuote.id, status: "replied" })
                                            setSelectedQuote(prev => prev ? { ...prev, status: "replied" } : null)
                                        }}
                                        className="bg-[#E03A3E] hover:bg-[#cc3236] text-white"
                                    >
                                        <Check className="w-4 h-4 mr-1.5" />
                                        Mark as Replied
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowDetailModal(false)
                                        setTimeout(() => handleDelete(selectedQuote.id), 150)
                                    }}
                                    className="ml-auto border-red-100 text-[#E03A3E] hover:bg-[#E03A3E]/5"
                                >
                                    <Trash2 className="w-4 h-4 mr-1.5" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900">Delete Quote Request</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-3 py-2">
                        <div className="w-12 h-12 rounded-full bg-[#E03A3E]/10 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-[#E03A3E]" />
                        </div>
                        <p className="text-sm text-gray-600 text-center">
                            Are you sure you want to delete this quote request?{" "}
                            <span className="font-medium text-gray-800">This action cannot be undone.</span>
                        </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1 border-gray-200 text-gray-700"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-[#E03A3E] hover:bg-[#cc3236] text-white"
                            onClick={confirmDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Helper component for modal detail rows
function DetailRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode
    label: string
    value: string
}) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
            <div className="min-w-0">
                <span className="text-xs text-gray-400 font-medium">{label}</span>
                <p className="text-sm text-gray-800 font-medium truncate">{value || "—"}</p>
            </div>
        </div>
    )
}
