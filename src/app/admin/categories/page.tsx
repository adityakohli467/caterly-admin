"use client"

import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ValidatedInput } from "@/components/ui/validated-input"
import { ValidationRules } from "@/lib/validation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Search, Printer, Plus, Edit, Trash2, AlertCircle, FolderOpen, GripVertical } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { validateRequired } from "@/lib/validations"
import { printTableData } from "@/lib/print-utils"

// dnd-kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface Category {
  category_id: number
  category_name: string
  parent_category_id?: number | null
  parent_category_name?: string | null
  sort_order?: number | null
}

// ─── Sortable Item Component for Modal ─────────────────────────────────────────
interface SortableItemProps {
  category: Category
  index: number
}

function SortableItem({ category, index }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.category_id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-3 p-4 mb-2 bg-white border rounded-lg cursor-grab active:cursor-grabbing ${isDragging ? "border-[#c62828] shadow-md" : "border-gray-200"
        }`}
    >
      <div className="text-gray-400 p-1">
        <GripVertical className="h-5 w-5" />
      </div>
      <div>
        <span className="font-semibold text-gray-900">{category.category_name}</span>
        <span className="ml-2 text-xs text-gray-500 font-normal">
          (Current order: {index + 1})
        </span>
      </div>
    </div>
  )
}

// ─── Main Categories Page ──────────────────────────────────────────────────────
export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [categoryView, setCategoryView] = useState<"all" | "main" | "sub">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showReorderModal, setShowReorderModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isSubcategory, setIsSubcategory] = useState(false)

  // Reordering state inside modal
  const [modalCategories, setModalCategories] = useState<Category[]>([])

  // Form state
  const [categoryName, setCategoryName] = useState("")
  const [parentCategoryId, setParentCategoryId] = useState<number | null>(null)
  const [errors, setErrors] = useState<{ category_name?: string }>({})

  // ── Fetch ALL categories ─────────────────────────────────────────────────────
  const { data: allCategoriesData, isLoading } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const response = await api.get("/admin/categories?limit=1000")
      return response.data
    },
  })

  const allCategories: Category[] = allCategoriesData?.categories || []
  const mainCategories = allCategories.filter((cat) => !cat.parent_category_id)

  // ── Filtered Categories for Table ───────────────────────────────────────────
  const filteredCategories = allCategories.filter((cat) => {
    const matchesView =
      categoryView === "all" ||
      (categoryView === "main" && !cat.parent_category_id) ||
      (categoryView === "sub" && !!cat.parent_category_id)

    const matchesSearch =
      !searchQuery ||
      cat.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.parent_category_name || "").toLowerCase().includes(searchQuery.toLowerCase())

    return matchesView && matchesSearch
  })

  // ── Reorder Logic ────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleOpenReorderModal = () => {
    // We only reorder main categories or all? Screenshot shows a specific list.
    // Usually, reordering makes most sense for either all or just main. 
    // Let's allow reordering of the current viewed list or just all.
    // Screenshot shows simple names. Let's use all categories for now.
    setModalCategories([...allCategories])
    setShowReorderModal(true)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setModalCategories((items) => {
      const oldIndex = items.findIndex((i) => i.category_id === active.id)
      const newIndex = items.findIndex((i) => i.category_id === over.id)
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  const reorderMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post("/admin/categories/reorder", payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-all"] })
      toast.success("Category order saved!")
      setShowReorderModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save category order")
    },
  })

  const handleSaveOrder = () => {
    const payload = modalCategories.map((cat, index) => ({
      category_id: cat.category_id,
      sort_order: index,
    }))
    reorderMutation.mutate(payload)
  }

  // ── CRUD Mutations ───────────────────────────────────────────────────────────
  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-all"] })
      toast.success("Category created successfully!")
      setShowAddModal(false)
      resetForm()
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/admin/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-all"] })
      toast.success("Category updated successfully!")
      setShowEditModal(false)
      resetForm()
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-all"] })
      toast.success("Category deleted successfully!")
      setShowDeleteModal(false)
    },
  })

  const resetForm = () => {
    setCategoryName("")
    setParentCategoryId(null)
    setIsSubcategory(false)
    setSelectedCategory(null)
    setErrors({})
  }

  const handleSaveCategory = () => {
    const newErrors: any = {}
    if (!categoryName.trim()) newErrors.category_name = "Required"
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    const data = { category_name: categoryName, parent_category_id: parentCategoryId }
    if (selectedCategory) {
      updateCategoryMutation.mutate({ id: selectedCategory.category_id, ...data })
    } else {
      createCategoryMutation.mutate(data)
    }
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setCategoryName(category.category_name)
    setParentCategoryId(category.parent_category_id || null)
    setShowEditModal(true)
  }

  const handleDeleteCategory = (category: Category) => {
    setSelectedCategory(category)
    setShowDeleteModal(true)
  }

  return (
    <div className="bg-gray-50 min-h-screen p-8" style={{ fontFamily: "Albert Sans" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Manage Categories</h1>
        <div className="flex gap-3">
          <Button
            onClick={handleOpenReorderModal}
            className="bg-[#c62828] hover:bg-[#b01f1f] text-white flex items-center gap-2 px-6 h-12 rounded-full font-semibold"
          >
            <GripVertical className="h-5 w-5" />
            Reorder Categories
          </Button>
          <Button
            onClick={() => { setIsSubcategory(false); setShowAddModal(true); }}
            className="bg-[#c62828] hover:bg-[#b01f1f] text-white flex items-center gap-2 px-6 h-12 rounded-full font-semibold"
          >
            <Plus className="h-5 w-5" />
            Add Main Category
          </Button>
          <Button
            onClick={() => { setIsSubcategory(true); setShowAddModal(true); }}
            className="bg-[#c62828] hover:bg-[#b01f1f] text-white flex items-center gap-2 px-6 h-12 rounded-full font-semibold"
          >
            <Plus className="h-5 w-5" />
            Add Subcategory
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        <button className="px-6 py-2 rounded-full text-sm font-semibold bg-[#fce4ec] text-[#c62828]">
          Categories
        </button>
        <Link href="/admin/options">
          <button className="px-6 py-2 rounded-full text-sm font-semibold bg-white border border-gray-200 text-gray-500 hover:bg-gray-50">
            Options
          </button>
        </Link>
        <Link href="/admin/products">
          <button className="px-6 py-2 rounded-full text-sm font-semibold bg-white border border-gray-200 text-gray-500 hover:bg-gray-50">
            Products
          </button>
        </Link>
      </div>

      {/* View Filters */}
      <div className="flex gap-3 mb-8">
        <Button
          variant={categoryView === "all" ? "default" : "outline"}
          onClick={() => setCategoryView("all")}
          className={categoryView === "all" ? "bg-[#c62828] text-white" : "text-gray-600 bg-white"}
        >
          All Categories
        </Button>
        <Button
          variant={categoryView === "main" ? "default" : "outline"}
          onClick={() => setCategoryView("main")}
          className={categoryView === "main" ? "bg-[#c62828] text-white" : "text-gray-600 bg-white"}
        >
          Main Categories Only
        </Button>
        <Button
          variant={categoryView === "sub" ? "default" : "outline"}
          onClick={() => setCategoryView("sub")}
          className={categoryView === "sub" ? "bg-[#c62828] text-white" : "text-gray-600 bg-white"}
        >
          Subcategories Only
        </Button>
      </div>

      {/* Search and Print */}
      <div className="flex items-center justify-between mb-8">
        <div className="relative w-[500px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search Order ID, Customer ID, Status etc."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 rounded-full border border-gray-200 bg-white"
          />
        </div>
        <Button variant="ghost" className="text-[#c62828] font-semibold flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Print
        </Button>
      </div>

      {/* Main Table */}
      <Card className="border-0 shadow-sm overflow-hidden bg-white rounded-xl">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-5 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-8 py-5 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">Parent Category</th>
              <th className="px-8 py-5 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={3} className="text-center py-10 text-gray-400">Loading categories...</td></tr>
            ) : filteredCategories.map((category) => (
              <tr key={category.category_id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-5 text-sm font-medium text-gray-900 uppercase">
                  {category.category_name}
                  {category.parent_category_id && <span className="ml-2 text-xs text-gray-400 lowercase italic">(subcategory)</span>}
                </td>
                <td className="px-8 py-5 text-sm text-gray-500 uppercase">
                  {category.parent_category_name || "-"}
                </td>
                <td className="px-8 py-5">
                  <div className="flex gap-3">
                    <button onClick={() => handleEditCategory(category)} className="p-2 text-[#c62828] hover:bg-[#fce4ec] rounded-lg"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDeleteCategory(category)} className="p-2 text-[#c62828] hover:bg-[#fce4ec] rounded-lg"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ── REORDER MODAL ────────────────────────────────────────────────── */}
      <Dialog open={showReorderModal} onOpenChange={setShowReorderModal}>
        <DialogContent className="max-w-2xl bg-white p-8 rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-900">Reorder Categories</DialogTitle>
            <DialogDescription className="text-gray-500 mt-2">
              Drag and drop categories to reorder them. The order will be reflected in the shop page.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto px-1 py-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={modalCategories.map((c) => c.category_id)} strategy={verticalListSortingStrategy}>
                {modalCategories.map((category, index) => (
                  <SortableItem key={category.category_id} category={category} index={index} />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="flex gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => setShowReorderModal(false)}
              className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveOrder}
              disabled={reorderMutation.isPending}
              className="flex-1 h-12 rounded-xl bg-[#c62828] hover:bg-[#b01f1f] text-white font-semibold"
            >
              {reorderMutation.isPending ? "Saving..." : "Save Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Modals (using simplified versions for brevity) ────────── */}
      <Dialog open={showAddModal || showEditModal} onOpenChange={(open) => { if (!open) resetForm(); setShowAddModal(open); setShowEditModal(open); }}>
        <DialogContent className="max-w-md bg-white p-8 rounded-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              {showEditModal ? "Edit Category" : isSubcategory ? "Add Subcategory" : "Add Main Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Category Name</Label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Coffee"
                className="h-12 border-gray-200 focus:ring-blue-500"
              />
            </div>
            {isSubcategory && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Parent Category</Label>
                <select
                  value={parentCategoryId || ""}
                  onChange={(e) => setParentCategoryId(Number(e.target.value))}
                  className="w-full h-12 rounded-lg border border-gray-200 px-4 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Parent</option>
                  {mainCategories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }} className="flex-1 h-12 rounded-xl">Cancel</Button>
              <Button onClick={handleSaveCategory} className="flex-1 h-12 rounded-xl bg-[#c62828] hover:bg-[#b01f1f] text-white font-semibold">
                {showEditModal ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Modal ────────────────────────────────────────────────── */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md bg-white p-8 rounded-2xl">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">Delete Category?</DialogTitle>
            <p className="text-gray-500 mb-8">This action cannot be undone. All subcategories and products might be affected.</p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1 h-12 rounded-xl">Keep it</Button>
              <Button onClick={() => deleteCategoryMutation.mutate(selectedCategory!.category_id)} className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold">Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
