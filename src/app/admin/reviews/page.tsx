"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Search, Check, X, Trash2, Star, Package, Globe, Filter } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProductReview {
  review_id: number
  product_id: number
  product_name: string
  rating: number
  review_text: string
  reviewer_name: string
  reviewer_email?: string
  customer_firstname?: string
  customer_lastname?: string
  status: number
  created_at: string
  reviewed_at?: string
  reviewer_username?: string
}

interface GeneralReview {
  review_id: number
  rating: number
  review_text: string
  reviewer_name: string
  reviewer_email?: string
  reviewer_location?: string
  source: string
  status: number
  created_at: string
  reviewed_at?: string
  reviewer_username?: string
}

export default function ReviewsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"products" | "general">("products")
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedReview, setSelectedReview] = useState<ProductReview | GeneralReview | null>(null)
  const [reviewType, setReviewType] = useState<"product" | "general">("product")

  // Fetch review stats
  const { data: stats } = useQuery({
    queryKey: ["review-stats"],
    queryFn: async () => {
      const response = await api.get("/admin/reviews/stats")
      return response.data
    },
  })

  // Fetch product reviews
  const { data: productReviewsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["product-reviews", searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (statusFilter !== undefined) params.append("status", statusFilter.toString())
      params.append("limit", "50")
      
      const response = await api.get(`/admin/reviews/products?${params.toString()}`)
      return response.data
    },
  })

  // Fetch general reviews
  const { data: generalReviewsData, isLoading: loadingGeneral } = useQuery({
    queryKey: ["general-reviews", searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (statusFilter !== undefined) params.append("status", statusFilter.toString())
      params.append("limit", "50")
      
      const response = await api.get(`/admin/reviews/general?${params.toString()}`)
      return response.data
    },
  })

  // Approve mutations
  const approveProductReviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.put(`/admin/reviews/products/${id}/approve`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-reviews"] })
      queryClient.invalidateQueries({ queryKey: ["review-stats"] })
      toast.success("Review approved and published")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to approve review")
    },
  })

  const approveGeneralReviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.put(`/admin/reviews/general/${id}/approve`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["general-reviews"] })
      queryClient.invalidateQueries({ queryKey: ["review-stats"] })
      toast.success("Review approved and published")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to approve review")
    },
  })

  // Reject mutations
  const rejectProductReviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.put(`/admin/reviews/products/${id}/reject`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-reviews"] })
      queryClient.invalidateQueries({ queryKey: ["review-stats"] })
      toast.success("Review rejected")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject review")
    },
  })

  const rejectGeneralReviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.put(`/admin/reviews/general/${id}/reject`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["general-reviews"] })
      queryClient.invalidateQueries({ queryKey: ["review-stats"] })
      toast.success("Review rejected")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject review")
    },
  })

  // Delete mutations
  const deleteProductReviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/admin/reviews/products/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-reviews"] })
      queryClient.invalidateQueries({ queryKey: ["review-stats"] })
      toast.success("Review deleted successfully")
      setShowDeleteModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete review")
    },
  })

  const deleteGeneralReviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/admin/reviews/general/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["general-reviews"] })
      queryClient.invalidateQueries({ queryKey: ["review-stats"] })
      toast.success("Review deleted successfully")
      setShowDeleteModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete review")
    },
  })

  const handleDelete = (review: ProductReview | GeneralReview, type: "product" | "general") => {
    setSelectedReview(review)
    setReviewType(type)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedReview) {
      if (reviewType === "product") {
        deleteProductReviewMutation.mutate((selectedReview as ProductReview).review_id)
      } else {
        deleteGeneralReviewMutation.mutate((selectedReview as GeneralReview).review_id)
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>
      case 1:
        return <Badge variant="default" className="bg-green-500">Published</Badge>
      case 2:
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return null
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  const productReviews = productReviewsData?.reviews || []
  const generalReviews = generalReviewsData?.reviews || []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Review Management</h1>
        <p className="text-gray-600">Review and publish customer reviews</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Product Reviews Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.product_reviews?.pending || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Product Reviews Published</div>
            <div className="text-2xl font-bold text-green-600">{stats.product_reviews?.approved || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">General Reviews Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.general_reviews?.pending || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">General Reviews Published</div>
            <div className="text-2xl font-bold text-green-600">{stats.general_reviews?.approved || 0}</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === undefined ? "default" : "outline"}
              onClick={() => setStatusFilter(undefined)}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 0 ? "default" : "outline"}
              onClick={() => setStatusFilter(0)}
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === 1 ? "default" : "outline"}
              onClick={() => setStatusFilter(1)}
            >
              Published
            </Button>
            <Button
              variant={statusFilter === 2 ? "default" : "outline"}
              onClick={() => setStatusFilter(2)}
            >
              Rejected
            </Button>
          </div>
        </div>
      </Card>

      {/* Reviews Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "products" | "general")}>
        <TabsList className="mb-6">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Product Reviews ({productReviews.length})
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            General Reviews ({generalReviews.length})
          </TabsTrigger>
        </TabsList>

        {/* Product Reviews */}
        <TabsContent value="products">
          {loadingProducts ? (
            <div className="text-center py-12">Loading...</div>
          ) : productReviews.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-gray-500">No product reviews found</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {productReviews.map((review: ProductReview) => (
                <Card key={review.review_id} className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{review.product_name}</h3>
                            {getStatusBadge(review.status)}
                          </div>
                          <div className="flex items-center gap-4 mb-2">
                            {renderStars(review.rating)}
                            <span className="text-sm text-gray-600">
                              {review.reviewer_name || 
                                (review.customer_firstname && review.customer_lastname 
                                  ? `${review.customer_firstname} ${review.customer_lastname}` 
                                  : "Anonymous")}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{review.review_text}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span>Submitted: {formatDate(review.created_at)}</span>
                            {review.reviewed_at && (
                              <span>Reviewed: {formatDate(review.reviewed_at)}</span>
                            )}
                            {review.reviewer_username && (
                              <span>By: {review.reviewer_username}</span>
                            )}
                            {review.reviewer_email && (
                              <span>Email: {review.reviewer_email}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {review.status === 0 && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => approveProductReviewMutation.mutate(review.review_id)}
                                disabled={approveProductReviewMutation.isPending}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => rejectProductReviewMutation.mutate(review.review_id)}
                                disabled={rejectProductReviewMutation.isPending}
                                className="text-[#055160] hover:text-[#055160]"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(review, "product")}
                            className="text-[#055160] hover:text-[#055160]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* General Reviews */}
        <TabsContent value="general">
          {loadingGeneral ? (
            <div className="text-center py-12">Loading...</div>
          ) : generalReviews.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-gray-500">No general reviews found</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {generalReviews.map((review: GeneralReview) => (
                <Card key={review.review_id} className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{review.reviewer_name}</h3>
                            {getStatusBadge(review.status)}
                            {review.source && (
                              <Badge variant="outline" className="text-xs">
                                {review.source}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mb-2">
                            {renderStars(review.rating)}
                            {review.reviewer_location && (
                              <span className="text-sm text-gray-600">{review.reviewer_location}</span>
                            )}
                          </div>
                          <p className="text-gray-700 mb-2">{review.review_text}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span>Submitted: {formatDate(review.created_at)}</span>
                            {review.reviewed_at && (
                              <span>Reviewed: {formatDate(review.reviewed_at)}</span>
                            )}
                            {review.reviewer_username && (
                              <span>By: {review.reviewer_username}</span>
                            )}
                            {review.reviewer_email && (
                              <span>Email: {review.reviewer_email}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {review.status === 0 && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => approveGeneralReviewMutation.mutate(review.review_id)}
                                disabled={approveGeneralReviewMutation.isPending}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => rejectGeneralReviewMutation.mutate(review.review_id)}
                                disabled={rejectGeneralReviewMutation.isPending}
                                className="text-[#055160] hover:text-[#055160]"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(review, "general")}
                            className="text-[#055160] hover:text-[#055160]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={
                deleteProductReviewMutation.isPending || deleteGeneralReviewMutation.isPending
              }
            >
              {deleteProductReviewMutation.isPending || deleteGeneralReviewMutation.isPending
                ? "Deleting..."
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

