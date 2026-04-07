"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { newsletterAPI } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Trash2, Mail, Calendar, Check, X, ShieldAlert, Users } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { formatDateOnly, formatTimeInAU } from "@/lib/utils"

interface NewsletterSubscription {
  id: number
  email: string
  status: string
  source: string
  subscribedAt: string
  unsubscribedAt: string | null
}

export default function NewsletterSubscriptionsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteSubscriptionId, setDeleteSubscriptionId] = useState<number | null>(null)
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false)
  const [unsubscribeSubscriptionId, setUnsubscribeSubscriptionId] = useState<number | null>(null)

  // Fetch subscriptions list
  const { data: listData, isLoading: isListLoading, error: listError } = useQuery({
    queryKey: ["newsletter-subscriptions", searchQuery, selectedStatus],
    queryFn: async () => {
      const params: any = { limit: 100 }
      if (searchQuery) params.search = searchQuery
      if (selectedStatus) params.status = selectedStatus
      const response = await newsletterAPI.list(params)
      return response.data
    },
  })

  // Fetch stats separately
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ["newsletter-stats"],
    queryFn: async () => {
      const response = await newsletterAPI.stats()
      return response.data
    },
  })

  // Error handling
  if (listError) {
    console.error("Newsletter API error:", listError)
  }

  const unsubscribeMutation = useMutation({
    mutationFn: (id: number) => newsletterAPI.unsubscribe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-subscriptions"] })
      queryClient.invalidateQueries({ queryKey: ["newsletter-stats"] })
      toast.success("Successfully unsubscribed user")
      setShowUnsubscribeModal(false)
      setUnsubscribeSubscriptionId(null)
    },
    onError: () => {
      toast.error("Failed to unsubscribe user")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => newsletterAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-subscriptions"] })
      queryClient.invalidateQueries({ queryKey: ["newsletter-stats"] })
      toast.success("Subscription deleted successfully")
      setShowDeleteModal(false)
      setDeleteSubscriptionId(null)
    },
    onError: () => {
      toast.error("Failed to delete subscription")
    },
  })

  const subscriptions: NewsletterSubscription[] = listData?.data || []

  const stats = statsData?.stats || { total: 0, active: 0, unsubscribed: 0 }

  const handleDelete = (id: number) => {
    setDeleteSubscriptionId(id)
    setShowDeleteModal(true)
  }

  const handleUnsubscribe = (id: number) => {
    setUnsubscribeSubscriptionId(id)
    setShowUnsubscribeModal(true)
  }

  const confirmDelete = () => {
    if (deleteSubscriptionId) {
      deleteMutation.mutate(deleteSubscriptionId)
    }
  }

  const confirmUnsubscribe = () => {
    if (unsubscribeSubscriptionId) {
      unsubscribeMutation.mutate(unsubscribeSubscriptionId)
    }
  }

  const getStatusColor = (status: string) => {
    if (status.toLowerCase() === "active" || status.toLowerCase() === "subscribed") return "bg-green-50 text-green-700"
    if (status.toLowerCase() === "unsubscribed") return "bg-red-50 text-red-700"
    return "bg-gray-50 text-gray-700"
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Newsletter Subscriptions</h1>
        <p className="text-gray-600 mt-2">Manage and monitor newsletter subscribers</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 border-l-4 border-l-blue-500 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500" style={{ fontFamily: 'Albert Sans' }}>Total Subscribers</p>
            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
              {isStatsLoading ? "..." : stats.total}
            </h2>
          </div>
          <div className="bg-blue-50 p-2 rounded-full">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500" style={{ fontFamily: 'Albert Sans' }}>Active</p>
            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
              {isStatsLoading ? "..." : stats.active}
            </h2>
          </div>
          <div className="bg-green-50 p-2 rounded-full">
            <Check className="w-5 h-5 text-green-500" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500" style={{ fontFamily: 'Albert Sans' }}>Unsubscribed</p>
            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
              {isStatsLoading ? "..." : stats.unsubscribed}
            </h2>
          </div>
          <div className="bg-red-50 p-2 rounded-full">
            <X className="w-5 h-5 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6 bg-white border border-gray-100 shadow-sm rounded-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-gray-200 rounded-lg focus:ring-[#C62828] focus:border-[#C62828]"
                style={{ fontFamily: 'Albert Sans' }}
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 h-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C62828] focus:border-[#C62828] text-sm"
              style={{ fontFamily: 'Albert Sans' }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Subscriptions List */}
      {isListLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
        </div>
      ) : subscriptions.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No newsletter subscriptions found.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id} className="p-6 hover:shadow-lg transition-all border-gray-100 rounded-2xl bg-white shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                      {subscription.email}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(subscription.status)}`} style={{ fontFamily: 'Albert Sans' }}>
                      {subscription.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500" style={{ fontFamily: 'Albert Sans' }}>
                    <div className="flex items-center gap-1 font-medium text-gray-700 bg-gray-50 px-2 py-0.5 rounded">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>Subscribed on: {subscription.subscribedAt ? `${formatDateOnly(subscription.subscribedAt)} ${formatTimeInAU(subscription.subscribedAt)}` : 'N/A'}</span>
                    </div>
                    {subscription.source && (
                      <div className="flex items-center gap-1 font-medium text-gray-700 bg-gray-50 px-2 py-0.5 rounded">
                        <ShieldAlert className="w-3.5 h-3.5 text-gray-400" />
                        <span className="capitalize">Source: {subscription.source.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {subscription.status.toLowerCase() !== "unsubscribed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnsubscribe(subscription.id)}
                      className="text-gray-700"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Unsubscribe
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(subscription.id)}
                    className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Unsubscribe Confirmation Modal */}
      <Dialog open={showUnsubscribeModal} onOpenChange={setShowUnsubscribeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsubscribe User</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">Are you sure you want to manually unsubscribe this user from the newsletter?</p>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowUnsubscribeModal(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={confirmUnsubscribe} className="bg-red-600 hover:bg-red-700 text-white">
              Unsubscribe
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subscription</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">Are you sure you want to permanently delete this subscription? This action cannot be undone.</p>
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
