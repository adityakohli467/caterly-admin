"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ValidatedInput } from "@/components/ui/validated-input"
import { ValidatedTextarea } from "@/components/ui/validated-textarea"
import { ValidationRules } from "@/lib/validation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Upload, Image as ImageIcon, X } from "lucide-react"
import { toast } from "sonner"
import { validateRequired, validateNumber, validateURL } from "@/lib/validations"

interface AddProductModalProps {
  open: boolean
  onClose: () => void
  onProductAdded?: () => void
}

export function AddProductModal({ open, onClose, onProductAdded }: AddProductModalProps) {
  const queryClient = useQueryClient()

  // Form state
  const [productName, setProductName] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [retailPrice, setRetailPrice] = useState("")
  const [retailDiscountPercentage] = useState("40")
  const [productStatus] = useState(1)
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<
    Array<{ option_value_id: number; option_price: number | string }>
  >([])
  const [imagePreviews, setImagePreviews] = useState<
    Array<{ url: string; file?: File; id: string }>
  >([])
  const [dragActive, setDragActive] = useState(false)
  const [minQuantity] = useState("1")
  const [showInStorefront, setShowInStorefront] = useState(false)

  const [errors, setErrors] = useState<{
    productName?: string
    productPrice?: string
    productDescription?: string
  }>({})

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const response = await api.get("/admin/categories?limit=1000")
      return response.data
    },
  })

  // Fetch options
  const { data: optionsData } = useQuery({
    queryKey: ["options-all"],
    queryFn: async () => {
      const response = await api.get("/admin/options?limit=1000")
      return response.data
    },
  })

  const categories = categoriesData?.categories || []
  const options = optionsData?.options || []
  const mainCategories = categories.filter((cat: any) => !cat.parent_category_id)
  const subCategories = categories.filter((cat: any) => cat.parent_category_id)

  const filteredSubcategories =
    selectedCategories.length === 0
      ? subCategories
      : subCategories.filter((sc: any) =>
          selectedCategories.includes(sc.parent_category_id)
        )

  // Flatten option values
  const allOptionValues: { option_value_id: number; name: string; option_id: number; option_name: string }[] = []
  options.forEach((option: any) => {
    if (option.values && Array.isArray(option.values)) {
      option.values.forEach((value: any) => {
        allOptionValues.push({
          option_value_id: value.option_value_id,
          name: value.name,
          option_id: option.option_id,
          option_name: option.name,
        })
      })
    }
  })

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/admin/products-new", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-new"] })
      queryClient.invalidateQueries({ queryKey: ["products-for-quote"], exact: false })
      toast.success("Product created successfully!")
      onProductAdded?.()
      handleClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create product")
    },
  })

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}
    const nameValidation = validateRequired(productName, "Product name", 255)
    if (!nameValidation.valid) {
      newErrors.productName = nameValidation.error || "Product name is required"
    }
    if (productPrice && productPrice.trim() !== "") {
      const priceValidation = validateNumber(productPrice, "Product price", {
        required: false,
        min: 0,
        allowDecimals: true,
      })
      if (!priceValidation.valid) {
        newErrors.productPrice = priceValidation.error || "Invalid price"
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateFile = (file: File): string | null => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
    if (!validTypes.includes(file.type)) return "Please select a valid image file (PNG, JPG, GIF, WebP)"
    if (file.size > 10 * 1024 * 1024) return "Image size must be less than 10MB"
    return null
  }

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (imagePreviews.length + fileArray.length > 10) {
      toast.error("Maximum 10 images allowed")
      return
    }
    const newPreviews: Array<{ url: string; file: File; id: string }> = []
    fileArray.forEach((file) => {
      const err = validateFile(file)
      if (err) { toast.error(`${file.name}: ${err}`); return }
      newPreviews.push({
        url: URL.createObjectURL(file),
        file,
        id: `preview-${Date.now()}-${Math.random()}`,
      })
    })
    setImagePreviews((prev) => [...prev, ...newPreviews])
    if (newPreviews.length) toast.info(`${newPreviews.length} image(s) added.`)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    handleFiles(files)
    e.target.value = ""
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(e.type === "dragenter" || e.type === "dragover")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  const handleRemoveImage = (index: number) => {
    const preview = imagePreviews[index]
    if (preview?.url.startsWith("blob:")) URL.revokeObjectURL(preview.url)
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    const imageFiles = imagePreviews.filter((p) => p.file).map((p) => p.file!)
    const existingImageUrls = imagePreviews
      .filter((p) => !p.file && p.url && !p.url.startsWith("blob:"))
      .map((p) => p.url)

    let finalRetailPrice: number | null = retailPrice ? parseFloat(retailPrice) : null
    if (!finalRetailPrice && productPrice) {
      const base = parseFloat(productPrice)
      const discount = parseFloat(retailDiscountPercentage) || 40
      finalRetailPrice = base * (1 - discount / 100)
    }

    const productData: any = {
      product_name: productName,
      product_description: productDescription,
      short_description: shortDescription || null,
      product_price: productPrice && productPrice.trim() ? parseFloat(productPrice) : 0,
      retail_price: finalRetailPrice,
      retail_discount_percentage: parseFloat(retailDiscountPercentage) || 40,
      customer_type_visibility: "all",
      product_status: productStatus,
      user_id: 1,
      categories: selectedCategories,
      subcategory_id: selectedSubcategory,
      min_quantity: parseInt(minQuantity) || 1,
      you_may_also_like: false,
      show_in_checkout: false,
      featured_1: false,
      featured_2: false,
      show_in_storefront: showInStorefront,
      options: selectedOptions.map((opt) => ({
        option_value_id: opt.option_value_id,
        option_price: Number(opt.option_price || 0),
        option_price_prefix: "+",
        option_required: 0,
      })),
      product_images: existingImageUrls,
    }

    if (imageFiles.length > 0) {
      const formData = new FormData()
      Object.keys(productData).forEach((key) => {
        const val = productData[key]
        if (Array.isArray(val) || typeof val === "object") {
          formData.append(key, JSON.stringify(val))
        } else if (typeof val === "boolean") {
          formData.append(key, val.toString())
        } else if (val !== null && val !== undefined) {
          formData.append(key, val)
        }
      })
      imageFiles.forEach((file) => formData.append("images", file))

      try {
        const response = await api.post("/admin/products-new", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        queryClient.invalidateQueries({ queryKey: ["products-new"] })
        queryClient.invalidateQueries({ queryKey: ["products-for-quote"], exact: false })
        toast.success("Product created successfully!")
        onProductAdded?.()
        handleClose()
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to create product")
      }
    } else {
      createProductMutation.mutate(productData)
    }
  }

  const handleClose = () => {
    // Cleanup blob URLs
    imagePreviews.forEach((p) => {
      if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url)
    })
    // Reset form
    setProductName("")
    setProductDescription("")
    setShortDescription("")
    setProductPrice("")
    setRetailPrice("")
    setSelectedCategories([])
    setSelectedSubcategory(null)
    setSelectedOptions([])
    setImagePreviews([])
    setDragActive(false)
    setErrors({})
    onClose()
  }

  const handleCategoryToggle = (categoryId: number) => {
    const isDeselecting = selectedCategories.includes(categoryId)
    setSelectedCategories((prev) =>
      isDeselecting ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
    if (isDeselecting && selectedSubcategory) {
      const subCat = subCategories.find((sc: any) => sc.category_id === selectedSubcategory)
      if (subCat && subCat.parent_category_id === categoryId) setSelectedSubcategory(null)
    }
  }

  const handleOptionToggle = (optionValueId: number) => {
    setSelectedOptions((prev) => {
      const exists = prev.find((o) => o.option_value_id === optionValueId)
      return exists
        ? prev.filter((o) => o.option_value_id !== optionValueId)
        : [...prev, { option_value_id: optionValueId, option_price: 0 }]
    })
  }

  const isPending = createProductMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent
        className="w-[95vw] sm:w-full max-w-3xl bg-white max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto"
        style={{ fontFamily: "Albert Sans" }}
      >
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#fce4ec] mx-auto mb-4">
            <Plus className="h-6 w-6 text-[#C62828]" />
          </div>
          <DialogTitle className="text-center text-xl font-semibold">
            Add New Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name + Price */}
          <div className="grid grid-cols-2 gap-4">
            <ValidatedInput
              label="Product Name"
              placeholder="e.g., Coffee Blend"
              value={productName}
              validationRule={ValidationRules.product.product_name}
              fieldName="Product Name"
              error={errors.productName}
              onChange={(value, isValid) => {
                setProductName(value)
                if (isValid) setErrors((prev) => { const e = { ...prev }; delete e.productName; return e })
              }}
              className="h-11 border-gray-300 bg-white"
            />
            <ValidatedInput
              label="Price"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={productPrice}
              validationRule={{ ...ValidationRules.product.product_price, required: false }}
              fieldName="Product Price"
              error={errors.productPrice}
              onChange={(value, isValid) => {
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  setProductPrice(value)
                  if (value && !isNaN(parseFloat(value))) {
                    const discount = parseFloat(retailDiscountPercentage) || 40
                    setRetailPrice((parseFloat(value) * (1 - discount / 100)).toFixed(2))
                  } else setRetailPrice("")
                  if (isValid) setErrors((prev) => { const e = { ...prev }; delete e.productPrice; return e })
                }
              }}
              className="h-11 border-gray-300 bg-white"
            />
          </div>

          {/* Short Description */}
          <ValidatedTextarea
            label="Short Description (Optional)"
            placeholder="Short description displayed on product detail page..."
            value={shortDescription}
            fieldName="Short Description"
            onChange={(value) => setShortDescription(value)}
            rows={2}
            className="border-gray-300 bg-white"
          />

          {/* Description */}
          <ValidatedTextarea
            label="Product Description"
            placeholder="Brief description of the product..."
            value={productDescription}
            validationRule={ValidationRules.product.product_description}
            fieldName="Product Description"
            error={errors.productDescription}
            onChange={(value, isValid) => {
              setProductDescription(value)
              if (isValid) setErrors((prev) => { const e = { ...prev }; delete e.productDescription; return e })
            }}
            rows={3}
            className="border-gray-300 bg-white"
          />

          {/* Categories */}
          {mainCategories.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Categories</Label>
              <div className="flex flex-wrap gap-2">
                {mainCategories.map((cat: any) => (
                  <button
                    key={cat.category_id}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.category_id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selectedCategories.includes(cat.category_id)
                        ? "bg-[#C62828] text-white border-[#C62828]"
                        : "bg-white text-gray-600 border-gray-300 hover:border-[#C62828]"
                    }`}
                    style={{ fontFamily: "Albert Sans" }}
                  >
                    {cat.category_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subcategory */}
          {filteredSubcategories.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Subcategory (Optional)</Label>
              <select
                value={selectedSubcategory || ""}
                onChange={(e) => setSelectedSubcategory(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full h-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C62828]"
                style={{ fontFamily: "Albert Sans" }}
              >
                <option value="">No subcategory</option>
                {filteredSubcategories.map((subCat: any) => (
                  <option key={subCat.category_id} value={subCat.category_id}>
                    {subCat.category_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Options */}
          {allOptionValues.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Add-ons / Options</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {allOptionValues.map((opt) => {
                  const selected = selectedOptions.find((o) => o.option_value_id === opt.option_value_id)
                  return (
                    <div key={opt.option_value_id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => handleOptionToggle(opt.option_value_id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 flex-1">{opt.option_name}: {opt.name}</span>
                      {selected && (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={selected.option_price}
                          onChange={(e) =>
                            setSelectedOptions((prev) =>
                              prev.map((o) =>
                                o.option_value_id === opt.option_value_id
                                  ? { ...o, option_price: e.target.value }
                                  : o
                              )
                            )
                          }
                          className="w-20 h-7 border border-gray-300 rounded px-2 text-sm"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Show in Storefront */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInStorefront}
              onChange={(e) => setShowInStorefront(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700" style={{ fontFamily: "Albert Sans" }}>
              Show in Storefront
            </span>
          </label>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Product Images (Optional)</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragActive ? "border-[#C62828] bg-[#fce4ec]" : "border-gray-300 hover:border-[#C62828] bg-gray-50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("add-product-modal-image-upload")?.click()}
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Drag & drop images here, or click to select</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, WebP up to 10MB (max 10 images)</p>
              <input
                id="add-product-modal-image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {imagePreviews.map((preview, index) => (
                  <div key={preview.id} className="relative group">
                    <img
                      src={preview.url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveImage(index) }}
                      className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-gray-300 text-gray-700"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="bg-[#C62828] hover:bg-[#B71C1C] text-white"
              style={{ fontWeight: 600 }}
            >
              {isPending ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
