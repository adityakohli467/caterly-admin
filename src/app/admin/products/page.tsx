"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ValidatedInput } from "@/components/ui/validated-input"
import { ValidatedTextarea } from "@/components/ui/validated-textarea"
import { ValidationRules } from "@/lib/validation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Printer, Plus, Edit, Trash2, AlertCircle, X, Upload, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { validateRequired, validateNumber, validateURL } from "@/lib/validations"
import { printTableData } from "@/lib/print-utils"

interface ProductOption {
  product_option_id?: number
  option_id: number
  option_name: string
  option_type?: string
  option_value_id: number
  option_value_name: string
  option_price: number
  option_price_prefix?: string
  option_required?: number
  standard_price?: number
  wholesale_price?: number
}

interface Product {
  product_id: number
  product_name: string
  product_description: string
  short_description?: string
  product_price: number
  retail_price?: number
  retail_discount_percentage?: number
  customer_type_visibility?: 'all' | 'retailers' | 'wholesalers'
  product_status: number
  product_image_url?: string
  product_images?: Array<{ product_image_id: number; image_url: string; image_order: number }>
  categories: Array<{ category_id: number; category_name: string }> | null
  subcategory?: { category_id: number; category_name: string } | null
  options: ProductOption[] | null
  min_quantity?: number
  you_may_also_like?: boolean
  show_in_checkout?: boolean
  featured_1?: boolean
  featured_2?: boolean
  roast_level?: string | null
  show_specifications?: boolean
  show_other_info?: boolean
}

interface OptionValue {
  option_value_id: number
  name: string
  option_id: number
  option_name: string
}

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Form state
  const [productName, setProductName] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [roastLevel, setRoastLevel] = useState<string>("")
  const [showSpecifications, setShowSpecifications] = useState(false)
  const [showOtherInfo, setShowOtherInfo] = useState(false)
  const [productPrice, setProductPrice] = useState("")
  const [retailPrice, setRetailPrice] = useState("")
  const [retailDiscountPercentage, setRetailDiscountPercentage] = useState("40")
  const [customerTypeVisibility, setCustomerTypeVisibility] = useState<'all' | 'retailers' | 'wholesalers'>('all')
  const [productStatus, setProductStatus] = useState(1)
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Array<{ option_value_id: number; option_price: number; discount_percentage?: number }>>([])
  const [productImageUrls, setProductImageUrls] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set())
  const [imagePreviews, setImagePreviews] = useState<Array<{ url: string; file?: File; id: string }>>([])
  const [dragActive, setDragActive] = useState(false)
  const [minQuantity, setMinQuantity] = useState("1")
  const [youMayAlsoLike, setYouMayAlsoLike] = useState(false)
  const [showInCheckout, setShowInCheckout] = useState(false)
  const [featured1, setFeatured1] = useState(false)
  const [featured2, setFeatured2] = useState(false)
  
  // Validation errors
  const [errors, setErrors] = useState<{
    productName?: string
    productPrice?: string
    productDescription?: string
    productImage?: string
  }>({})

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Fetch products
  const { data: productsData, isLoading, error: productsError } = useQuery({
    queryKey: ["products-new", searchQuery, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      params.append("limit", itemsPerPage.toString())
      params.append("offset", ((currentPage - 1) * itemsPerPage).toString())
      const response = await api.get(`/admin/products-new?${params.toString()}`)
      return response.data
    },
    retry: 1,
  })

  // Fetch categories
  const { data: categoriesData, error: categoriesError } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const response = await api.get("/admin/categories?limit=1000")
      return response.data
    },
    retry: 1,
  })

  // Fetch options with values
  const { data: optionsData, error: optionsError } = useQuery({
    queryKey: ["options-all"],
    queryFn: async () => {
      const response = await api.get("/admin/options?limit=1000")
      return response.data
    },
    retry: 1,
  })

  const products = productsData?.products || []
  const totalCount = productsData?.count || 0
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const categories = categoriesData?.categories || []
  const options = optionsData?.options || []

  // Separate main categories and subcategories
  const mainCategories = categories.filter((cat: any) => !cat.parent_category_id)
  const subCategories = categories.filter((cat: any) => cat.parent_category_id)
  
  // Get subcategories filtered by selected main categories (for better UX)
  const getFilteredSubcategories = () => {
    if (selectedCategories.length === 0) {
      // If no main categories selected, show all subcategories
      return subCategories
    }
    // Only show subcategories whose parent is in the selected main categories
    return subCategories.filter((subCat: any) => 
      selectedCategories.includes(subCat.parent_category_id)
    )
  }
  const filteredSubcategories = getFilteredSubcategories()

  // Flatten options into option values
  const allOptionValues: OptionValue[] = []
  options.forEach((option: any) => {
    if (option.values && Array.isArray(option.values)) {
      option.values.forEach((value: any) => {
        allOptionValues.push({
          option_value_id: value.option_value_id,
          name: value.name,
          option_id: option.option_id,
          option_name: option.name
        })
      })
    }
  })

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await api.post("/admin/products-new", productData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-new"] })
      toast.success("Product created successfully!")
      setShowAddModal(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create product")
    },
  })

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, formData, productData }: any) => {
      // If formData is provided, use it (for file uploads), otherwise use productData (JSON)
      const response = formData 
        ? await api.put(`/admin/products-new/${id}`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          })
        : await api.put(`/admin/products-new/${id}`, productData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-new"] })
      toast.success("Product updated successfully!")
      setShowEditModal(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update product")
    },
  })

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/admin/products-new/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-new"] })
      toast.success("Product deleted successfully!")
      setShowDeleteModal(false)
      setSelectedProduct(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete product")
    },
  })

  const handleAddProduct = () => {
    resetForm()
    setShowAddModal(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setProductName(product.product_name)
    setProductDescription(product.product_description || "")
    setShortDescription(product.short_description || "")
    setRoastLevel(product.roast_level || "")
    setShowSpecifications(product.show_specifications || false)
    setShowOtherInfo(product.show_other_info || false)
    setProductPrice(product.product_price.toString())
    setRetailPrice(product.retail_price?.toString() || "")
    setRetailDiscountPercentage(product.retail_discount_percentage?.toString() || "40")
    setCustomerTypeVisibility(product.customer_type_visibility || 'all')
    setProductStatus(product.product_status)
    const productCategoryIds = product.categories?.map(c => c.category_id) || []
    
    // If product has a subcategory, ensure its parent category is also selected
    if (product.subcategory?.category_id) {
      const subCat = subCategories.find((sc: any) => sc.category_id === product.subcategory?.category_id)
      if (subCat && subCat.parent_category_id && !productCategoryIds.includes(subCat.parent_category_id)) {
        productCategoryIds.push(subCat.parent_category_id)
      }
    }
    
    setSelectedCategories(productCategoryIds)
    setSelectedSubcategory(product.subcategory?.category_id || null)
    setMinQuantity(product.min_quantity?.toString() || "1")
    setYouMayAlsoLike(product.you_may_also_like || false)
    setShowInCheckout(product.show_in_checkout || false)
    setFeatured1(product.featured_1 || false)
    setFeatured2(product.featured_2 || false)
    setSelectedOptions(
      product.options?.map(o => ({
        option_value_id: o.option_value_id,
        option_price: parseFloat(o.option_price.toString()),
        discount_percentage: (o as any).discount_percentage || 0
      })) || []
    )
    // Load product images - prefer product_images array, fallback to product_image_url
    const productImages = (product as any).product_images || []
    const existingImageUrl = (product as any).product_image_url || ""
    
    if (productImages && Array.isArray(productImages) && productImages.length > 0) {
      // Use product_images array if available
      const imageUrls = productImages.map((img: any) => img.image_url || img)
      setProductImageUrls(imageUrls)
      setImagePreviews(imageUrls.map((url: string, index: number) => ({
        url,
        id: `existing-${Date.now()}-${index}`
      })))
    } else if (existingImageUrl) {
      // Fallback to single product_image_url
      setProductImageUrls([existingImageUrl])
      setImagePreviews([{ url: existingImageUrl, id: `existing-${Date.now()}` }])
    } else {
      setProductImageUrls([])
      setImagePreviews([])
    }
    setShowEditModal(true)
  }

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowDeleteModal(true)
  }

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}
    
    // Validate product name (required, max 255 chars per DB schema)
    const nameValidation = validateRequired(productName, "Product name", 255)
    if (!nameValidation.valid) {
      newErrors.productName = nameValidation.error || "Product name is required"
    }
    
    // Validate product price (required, DECIMAL(15,4) per DB schema)
    const priceValidation = validateNumber(productPrice, "Product price", {
      required: true,
      min: 0,
      max: 999999999999.9999, // Max for DECIMAL(15,4)
      allowDecimals: true
    })
    if (!priceValidation.valid) {
      newErrors.productPrice = priceValidation.error || "Product price is required"
    }
    
    // Validate product description (optional, TEXT field - reasonable limit)
    if (productDescription && productDescription.length > 10000) {
      newErrors.productDescription = "Product description must be 10,000 characters or less"
    }
    
    // Validate product image URL (optional, max 500 chars per migration, must be valid URL)
    if (productImageUrls && productImageUrls.length > 0 && productImageUrls[0]) {
      const urlValidation = validateURL(productImageUrls[0], 500)
      if (!urlValidation.valid) {
        newErrors.productImage = urlValidation.error || "Please enter a valid image URL"
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveProduct = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    // Collect image files (not URLs) for upload
    const imageFiles = imagePreviews
      .filter(preview => preview.file) // Only files that haven't been uploaded yet
      .map(preview => preview.file!)
    
    // Collect existing image URLs (already uploaded)
    const existingImageUrls = imagePreviews
      .filter(preview => !preview.file && preview.url && !preview.url.startsWith('blob:'))
      .map(preview => preview.url)

    // Calculate retail price if not set
    let finalRetailPrice = retailPrice ? parseFloat(retailPrice) : null
    if (!finalRetailPrice && productPrice) {
      const basePrice = parseFloat(productPrice)
      const discount = parseFloat(retailDiscountPercentage) || 40
      finalRetailPrice = basePrice * (1 - discount / 100)
    }

    // Prepare product data
    const productData: any = {
      product_name: productName,
      product_description: productDescription,
      short_description: shortDescription || null,
      roast_level: roastLevel || null,
      show_specifications: showSpecifications,
      show_other_info: showOtherInfo,
      product_price: parseFloat(productPrice),
      retail_price: finalRetailPrice,
      retail_discount_percentage: parseFloat(retailDiscountPercentage) || 40,
      customer_type_visibility: customerTypeVisibility,
      product_status: productStatus,
      user_id: 1, // TODO: Get from auth context
      categories: JSON.stringify(selectedCategories),
      subcategory_id: selectedSubcategory || null,
      min_quantity: parseInt(minQuantity) || 1,
      you_may_also_like: youMayAlsoLike,
      show_in_checkout: showInCheckout,
      featured_1: featured1,
      featured_2: featured2,
      options: JSON.stringify(selectedOptions.map(opt => ({
        option_value_id: opt.option_value_id,
        option_price: opt.option_price || 0,
        option_price_prefix: '+',
        option_required: 0,
        discount_percentage: opt.discount_percentage || 0
      }))),
    }

    // Add existing image URLs if any
    if (existingImageUrls.length > 0) {
      productData.product_images = JSON.stringify(existingImageUrls)
      productData.product_image_url = existingImageUrls[0] // Keep first for backward compatibility
    }

    if (selectedProduct) {
      // For update, send FormData if there are new image files, otherwise send JSON
      if (imageFiles.length > 0) {
        const formData = new FormData()
        
        // Add product data as form fields
        formData.append('product_name', productData.product_name)
        formData.append('product_description', productData.product_description || '')
        formData.append('short_description', productData.short_description || '')
        formData.append('roast_level', productData.roast_level || '')
        formData.append('show_specifications', productData.show_specifications.toString())
        formData.append('show_other_info', productData.show_other_info.toString())
        formData.append('product_price', productData.product_price.toString())
        formData.append('retail_price', productData.retail_price?.toString() || '')
        formData.append('retail_discount_percentage', productData.retail_discount_percentage?.toString() || '40')
        formData.append('customer_type_visibility', productData.customer_type_visibility || 'all')
        formData.append('product_status', productData.product_status.toString())
        formData.append('user_id', productData.user_id.toString())
        formData.append('categories', JSON.stringify(selectedCategories))
        formData.append('subcategory_id', selectedSubcategory?.toString() || '')
        formData.append('min_quantity', minQuantity)
        formData.append('you_may_also_like', youMayAlsoLike.toString())
        formData.append('show_in_checkout', showInCheckout.toString())
        formData.append('featured_1', featured1.toString())
        formData.append('featured_2', featured2.toString())
        formData.append('options', productData.options)
        
        // Add existing image URLs
        if (existingImageUrls.length > 0) {
          formData.append('product_images', JSON.stringify(existingImageUrls))
          formData.append('product_image_url', existingImageUrls[0])
        }
        
        // Add new image files
        imageFiles.forEach((file) => {
          formData.append('images', file)
        })
        
        updateProductMutation.mutate({
          id: selectedProduct.product_id,
          formData,
          productData: null
        })
      } else {
        // No new images, send as JSON
        updateProductMutation.mutate({
          id: selectedProduct.product_id,
          formData: null,
          productData: {
            ...productData,
            categories: selectedCategories,
            subcategory_id: selectedSubcategory,
            min_quantity: parseInt(minQuantity) || 1,
            you_may_also_like: youMayAlsoLike,
            show_in_checkout: showInCheckout,
            featured_1: featured1,
            featured_2: featured2,
            options: selectedOptions.map(opt => ({
              option_value_id: opt.option_value_id,
              option_price: opt.option_price || 0,
              option_price_prefix: '+',
              option_required: 0,
              discount_percentage: opt.discount_percentage || 0
            })),
            product_images: existingImageUrls
          }
        })
      }
    } else {
      // For create, send as FormData with images
      if (imageFiles.length > 0) {
        const formData = new FormData()
        
        // Add product data as form fields
        Object.keys(productData).forEach(key => {
          if (key === 'categories' || key === 'options') {
            formData.append(key, JSON.stringify(productData[key]))
          } else if (typeof productData[key] === 'boolean') {
            formData.append(key, productData[key].toString())
          } else {
            formData.append(key, productData[key] || '')
          }
        })
        
        // Add image files
        imageFiles.forEach((file, index) => {
          formData.append('images', file)
        })
        
        // Create product with images
        try {
          const response = await api.post("/admin/products-new", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          })
          queryClient.invalidateQueries({ queryKey: ["products-new"] })
          toast.success("Product created successfully!")
          setShowAddModal(false)
          resetForm()
        } catch (error: any) {
          toast.error(error.response?.data?.message || "Failed to create product")
        }
      } else {
        // No new images, just create product with existing URLs
        createProductMutation.mutate({
          ...productData,
          categories: selectedCategories,
          subcategory_id: selectedSubcategory,
          min_quantity: parseInt(minQuantity) || 1,
          you_may_also_like: youMayAlsoLike,
          show_in_checkout: showInCheckout,
          featured_1: featured1,
          featured_2: featured2,
          options: selectedOptions.map(opt => ({
            option_value_id: opt.option_value_id,
            option_price: opt.option_price || 0,
            option_price_prefix: '+',
            option_required: 0,
            discount_percentage: opt.discount_percentage || 0
          })),
          product_images: existingImageUrls
        })
      }
    }
  }

  const handleConfirmDelete = () => {
    if (selectedProduct) {
      deleteProductMutation.mutate(selectedProduct.product_id)
    }
  }

  const handleCategoryToggle = (categoryId: number) => {
    const isDeselecting = selectedCategories.includes(categoryId)
    
    setSelectedCategories(prev => {
      const newCategories = isDeselecting
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
      
      // If deselecting a category, check if selected subcategory's parent is being removed
      if (isDeselecting && selectedSubcategory) {
        const selectedSubCat = subCategories.find((sc: any) => sc.category_id === selectedSubcategory)
        if (selectedSubCat && selectedSubCat.parent_category_id === categoryId) {
          // Clear subcategory if its parent is being deselected
          setSelectedSubcategory(null)
        }
      }
      
      return newCategories
    })
  }

  const handleOptionToggle = (optionValueId: number) => {
    setSelectedOptions(prev => {
      const exists = prev.find(o => o.option_value_id === optionValueId)
      if (exists) {
        return prev.filter(o => o.option_value_id !== optionValueId)
      } else {
        return [...prev, { option_value_id: optionValueId, option_price: 0 }]
      }
    })
  }

  const handleOptionPriceChange = (optionValueId: number, price: string) => {
    setSelectedOptions(prev =>
      prev.map(o =>
        o.option_value_id === optionValueId
          ? { ...o, option_price: price === '' ? 0 : parseFloat(price) || 0 }
          : o
      )
    )
  }

  const handleOptionDiscountChange = (optionValueId: number, discount: string) => {
    setSelectedOptions(prev =>
      prev.map(o =>
        o.option_value_id === optionValueId
          ? { ...o, discount_percentage: discount === '' ? 0 : parseFloat(discount) || 0 }
          : o
      )
    )
  }

  const validateFile = (file: File): string | null => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return "Please select a valid image file (PNG, JPG, GIF, WebP)"
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return "Image size must be less than 10MB"
    }

    return null
  }

  const uploadImage = async (file: File, previewId: string): Promise<string | null> => {
    const validationError = validateFile(file)
    if (validationError) {
      toast.error(validationError)
      return null
    }

    // Add to uploading set
    setUploadingImages(prev => new Set(prev).add(previewId))

    try {
      const formData = new FormData()
      formData.append("image", file)
      if (selectedProduct) {
        formData.append("product_id", selectedProduct.product_id.toString())
      }

      const response = await api.post("/admin/upload/product-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.data.success) {
        setUploadingImages(prev => {
          const newSet = new Set(prev)
          newSet.delete(previewId)
          return newSet
        })
        return response.data.url
      }
      setUploadingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(previewId)
        return newSet
      })
      return null
    } catch (error: any) {
      console.error("Image upload error:", error)
      // Don't show error toast - images are optional
      // Just log and continue
      console.warn("Image upload failed, but continuing without image (images are optional)")
      setUploadingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(previewId)
        return newSet
      })
      // Keep the preview but mark it as not uploaded
      // User can still save the product without the image
      return null
    }
  }

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const maxFiles = 10 // Maximum number of images allowed

    // Check total count
    if (imagePreviews.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed`)
      return
    }

    // Create previews immediately (don't upload yet - will upload when saving product)
    const newPreviews: Array<{ url: string; file: File; id: string }> = []
    
    fileArray.forEach((file) => {
      const validationError = validateFile(file)
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`)
        return
      }

      const previewId = `preview-${Date.now()}-${Math.random()}`
      const previewUrl = URL.createObjectURL(file)
      
      newPreviews.push({
        url: previewUrl,
        file,
        id: previewId
      })
    })

    // Add previews immediately (images will be uploaded when product is saved)
    setImagePreviews(prev => [...prev, ...newPreviews])
    toast.info(`${newPreviews.length} image(s) added. They will be uploaded when you save the product.`)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    await handleFiles(files)
    // Reset input
    event.target.value = ""
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await handleFiles(files)
    }
  }

  const handleRemoveImage = (index: number, previewId: string) => {
    // Revoke object URL if it's a preview
    const preview = imagePreviews[index]
    if (preview && preview.url.startsWith('blob:')) {
      URL.revokeObjectURL(preview.url)
    }

    // Remove from previews and URLs
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    setProductImageUrls(prev => prev.filter((_, i) => i !== index))
    toast.success("Image removed")
  }

  const resetForm = () => {
    setProductName("")
    setProductDescription("")
    setShortDescription("")
    setRoastLevel("")
    setShowSpecifications(false)
    setShowOtherInfo(false)
    setProductPrice("")
    setRetailPrice("")
    setRetailDiscountPercentage("40")
    setCustomerTypeVisibility('all')
    setProductStatus(1)
    setSelectedCategories([])
    setSelectedSubcategory(null)
    setSelectedOptions([])
    setMinQuantity("1")
    setYouMayAlsoLike(false)
    setShowInCheckout(false)
    setFeatured1(false)
    setFeatured2(false)
    setSelectedProduct(null)
    setErrors({})
    // Revoke all object URLs
    imagePreviews.forEach(preview => {
      if (preview.url.startsWith('blob:')) {
        URL.revokeObjectURL(preview.url)
      }
    })
    setProductImageUrls([])
    setImagePreviews([])
    setUploadingImages(new Set())
    setDragActive(false)
  }

  return (
    <div className="bg-gray-50 min-h-screen" style={{ fontFamily: 'Albert Sans' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-gray-900 text-2xl sm:text-3xl lg:text-4xl" style={{ 
          fontFamily: 'Albert Sans',
          fontWeight: 600,
          fontStyle: 'normal',
          lineHeight: '1.2',
          letterSpacing: '0%'
        }}>
          Manage Products
        </h1>
        <Button 
          onClick={handleAddProduct}
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
          Add New Product
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          className="px-6 py-2 rounded-full text-sm font-medium transition-colors bg-[#e7f1ff] text-[#055160]"
          style={{ fontWeight: 600 }}
        >
          Products
        </button>
        <Link href="/admin/categories">
          <button
            className="px-6 py-2 rounded-full text-sm font-medium transition-colors bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            style={{ fontWeight: 600 }}
          >
            Categories
          </button>
        </Link>
        <Link href="/admin/options">
          <button
            className="px-6 py-2 rounded-full text-sm font-medium transition-colors bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            style={{ fontWeight: 600 }}
          >
            Options
          </button>
        </Link>
      </div>

      {/* Search and Print */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search Order ID, Customer ID, Status etc."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-[488px] h-[54px] border border-gray-200 bg-white rounded-full focus:ring-2 focus:ring-[#055160] focus:border-[#055160] focus:outline-none"
            style={{ fontFamily: 'Albert Sans', paddingLeft: '44px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px' }}
          />
        </div>
        <Button 
          onClick={() => printTableData("Products")}
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

      {/* Table */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Product Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Categories
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Subcategory
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Option Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Options
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Product Price
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">Loading products...</td>
                </tr>
              ) : productsError ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-red-500">
                    Error loading products. Please try again.
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    {searchQuery ? "No products found matching your search" : "No products found"}
                  </td>
                </tr>
              ) : (
                products.map((product: Product) => {
                  const productOptions = product.options || []
                  const rowSpan = Math.max(1, productOptions.length)

                  if (productOptions.length === 0) {
                    return (
                      <tr key={product.product_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-900" style={{ 
                          fontFamily: 'Albert Sans',
                          fontWeight: 400,
                          fontStyle: 'normal',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0%'
                        }}>
                          {product.product_name}
                        </td>
                        <td className="px-4 py-3 text-gray-700" style={{ 
                          fontFamily: 'Albert Sans',
                          fontWeight: 400,
                          fontStyle: 'normal',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0%'
                        }}>
                          {product.categories && product.categories.length > 0 
                            ? product.categories.map((c: any) => c.category_name).join(", ")
                            : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-gray-700" style={{ 
                          fontFamily: 'Albert Sans',
                          fontWeight: 400,
                          fontStyle: 'normal',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0%'
                        }}>
                          {product.subcategory?.category_name || "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-700" style={{ 
                          fontFamily: 'Albert Sans',
                          fontWeight: 400,
                          fontStyle: 'normal',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0%'
                        }}>
                          -
                        </td>
                        <td className="px-4 py-3 text-gray-700" style={{ 
                          fontFamily: 'Albert Sans',
                          fontWeight: 400,
                          fontStyle: 'normal',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0%'
                        }}>
                          -
                        </td>
                        <td className="px-4 py-3 text-gray-900" style={{ 
                          fontFamily: 'Albert Sans',
                          fontWeight: 400,
                          fontStyle: 'normal',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0%'
                        }}>
                          ${parseFloat(product.product_price.toString()).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="p-1.5 text-[#055160] hover:bg-[#e7f1ff] rounded transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product)}
                              className="p-1.5 text-[#055160] hover:bg-[#e7f1ff] rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return productOptions.map((option, optionIndex) => (
                    <tr key={`${product.product_id}-${optionIndex}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      {optionIndex === 0 ? (
                        <>
                          <td className="px-4 py-3 text-sm text-gray-900" rowSpan={rowSpan} style={{ fontFamily: 'Albert Sans' }}>
                            {product.product_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700" rowSpan={rowSpan} style={{ fontFamily: 'Albert Sans' }}>
                            {product.categories && product.categories.length > 0 
                              ? product.categories.map((c: any) => c.category_name).join(", ")
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700" rowSpan={rowSpan} style={{ fontFamily: 'Albert Sans' }}>
                            {product.subcategory?.category_name || "-"}
                          </td>
                        </>
                      ) : null}
                      <td className="px-4 py-3 text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                        {option.option_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                        {option.option_value_name}
                      </td>
                      {optionIndex === 0 ? (
                        <>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900" rowSpan={rowSpan} style={{ fontFamily: 'Albert Sans' }}>
                            ${parseFloat(product.product_price.toString()).toFixed(2)}
                          </td>
                          <td className="px-4 py-3" rowSpan={rowSpan}>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="p-1.5 text-[#055160] hover:bg-[#e7f1ff] rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product)}
                                className="p-1.5 text-[#055160] hover:bg-[#e7f1ff] rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : null}
                    </tr>
                  ))
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
            className="bg-[#055160] hover:bg-[#04414d] text-white"
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

      {/* Add/Edit Product Modal */}
      <Dialog open={showAddModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          // Blur active element to prevent validation on blur
          if (document.activeElement && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
          setShowAddModal(false)
          setShowEditModal(false)
          resetForm()
        }
      }}>
        <DialogContent className="w-[95vw] sm:w-full max-w-3xl bg-white max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto" style={{ fontFamily: 'Albert Sans' }}>
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#e7f1ff] mx-auto mb-4">
              <Plus className="h-6 w-6 text-[#055160]" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold">
              {selectedProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
                  if (isValid) {
                    setErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors.productName
                      return newErrors
                    })
                  }
                }}
                className="h-11 border-gray-300 bg-white"
              />

              <ValidatedInput
                label="Retail Price (Base Price)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={productPrice}
                validationRule={ValidationRules.product.product_price}
                fieldName="Product Price"
                error={errors.productPrice}
                onChange={(value, isValid) => {
                  // Allow empty string, numbers, and decimal point
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setProductPrice(value)
                    // Auto-calculate wholesale price when retail price changes
                    if (value && !isNaN(parseFloat(value))) {
                      const retailPrice = parseFloat(value)
                      const discount = parseFloat(retailDiscountPercentage) || 40
                      const calculatedWholesalePrice = retailPrice * (1 - discount / 100)
                      setRetailPrice(calculatedWholesalePrice.toFixed(2))
                    } else {
                      setRetailPrice("")
                    }
                    if (isValid) {
                      setErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.productPrice
                        return newErrors
                      })
                    }
                  }
                }}
                className="h-11 border-gray-300 bg-white"
              />
              
              {/* Wholesale fields - Hidden for kj3 */}
              {false && (
                <>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Wholesale Discount Percentage (%)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="40.00"
                  value={retailDiscountPercentage}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setRetailDiscountPercentage(value)
                      // Recalculate wholesale price when discount percentage changes
                      if (productPrice && !isNaN(parseFloat(productPrice))) {
                        const retailPrice = parseFloat(productPrice)
                        const discount = parseFloat(value) || 40
                        const calculatedWholesalePrice = retailPrice * (1 - discount / 100)
                        setRetailPrice(calculatedWholesalePrice.toFixed(2))
                      }
                    }
                  }}
                  className="h-11 border-gray-300 bg-white"
                />
                <p className="text-xs text-gray-500">Default: 40% discount applied to retail price to calculate wholesale price</p>
              </div>
              
              <ValidatedInput
                label="Wholesale Price (Auto-calculated)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={retailPrice}
                fieldName="Wholesale Price"
                onChange={(value) => {
                  // Allow manual override of wholesale price
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setRetailPrice(value)
                  }
                }}
                className="h-11 border-gray-300 bg-white bg-gray-50"
                disabled={false}
              />
                </>
              )}
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Product Visibility
                </Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="customerTypeVisibility"
                      value="all"
                      checked={customerTypeVisibility === 'all'}
                      onChange={(e) => setCustomerTypeVisibility(e.target.value as 'all' | 'retailers' | 'wholesalers')}
                      className="w-4 h-4 text-[#055160] focus:ring-[#055160]"
                    />
                    <span className="text-sm text-gray-700">All Customers</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="customerTypeVisibility"
                      value="retailers"
                      checked={customerTypeVisibility === 'retailers'}
                      onChange={(e) => setCustomerTypeVisibility(e.target.value as 'all' | 'retailers' | 'wholesalers')}
                      className="w-4 h-4 text-[#055160] focus:ring-[#055160]"
                    />
                    <span className="text-sm text-gray-700">Only Retailers</span>
                  </label>
                  {/* Wholesalers option - Hidden for kj3 */}
                  {false && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="customerTypeVisibility"
                      value="wholesalers"
                      checked={customerTypeVisibility === 'wholesalers'}
                      onChange={(e) => setCustomerTypeVisibility(e.target.value as 'all' | 'retailers' | 'wholesalers')}
                      className="w-4 h-4 text-[#055160] focus:ring-[#055160]"
                    />
                    <span className="text-sm text-gray-700">Only Wholesalers</span>
                  </label>
                  )}
                </div>
                <p className="text-xs text-gray-500">Select which customer types can see this product</p>
              </div>
            </div>

            <ValidatedTextarea
              label="Product Description"
              placeholder="Brief description of the product..."
              value={productDescription}
              validationRule={ValidationRules.product.product_description}
              fieldName="Product Description"
              error={errors.productDescription}
              onChange={(value, isValid) => {
                setProductDescription(value)
                if (isValid) {
                  setErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors.productDescription
                    return newErrors
                  })
                }
              }}
              rows={3}
              className="border-gray-300 bg-white"
            />

            <ValidatedTextarea
              label="Short Description (Optional)"
              placeholder="Short description displayed on product detail page..."
              value={shortDescription}
              fieldName="Short Description"
              onChange={(value) => {
                setShortDescription(value)
              }}
              rows={2}
              className="border-gray-300 bg-white"
            />
            <p className="text-xs text-gray-500 -mt-2">This will be displayed prominently on the product detail page</p>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Roast Level (Optional)
              </Label>
              <select
                value={roastLevel}
                onChange={(e) => setRoastLevel(e.target.value)}
                className="w-full h-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#055160]"
                style={{ fontFamily: 'Albert Sans' }}
              >
                <option value="">No Roast Level (Don't show roast field)</option>
                <option value="Light">Light</option>
                <option value="Medium">Medium</option>
                <option value="Dark">Dark</option>
                <option value="Light-Medium">Light-Medium</option>
                <option value="Medium-Dark">Medium-Dark</option>
              </select>
              <p className="text-xs text-gray-500">Select roast level if applicable. Leave empty to hide roast field on product page.</p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Display Options</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSpecifications}
                    onChange={(e) => setShowSpecifications(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                    Show Specifications Tab
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOtherInfo}
                    onChange={(e) => setShowOtherInfo(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                    Show Other Info Tab
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500">Enable these options to show additional tabs on the product detail page</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">
                  Product Images <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </Label>
                {imagePreviews.length > 0 && (
                  <span className="text-xs text-gray-500" style={{ fontFamily: 'Albert Sans' }}>
                    {imagePreviews.length}/10 images
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 -mt-2" style={{ fontFamily: 'Albert Sans' }}>
                Images are optional. You can add products without images and add them later when S3 is ready.
              </p>
              
              {/* Image Previews Grid */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  {imagePreviews.map((preview, index) => (
                    <div key={preview.id} className="relative group">
                      <div className="relative aspect-square rounded-lg border-2 border-gray-300 overflow-hidden bg-white shadow-sm">
                        {uploadingImages.has(preview.id) ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-60 z-10">
                            <div className="text-white text-xs text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-3 border-white border-t-transparent mx-auto mb-2"></div>
                              <p className="font-medium">Uploading...</p>
                            </div>
                          </div>
                        ) : null}
                        <img
                          src={preview.url}
                          alt={`Product preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index, preview.id)}
                          className="absolute top-2 right-2 bg-[#e7f1ff]0 text-white rounded-full p-1.5 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 z-20 shadow-lg"
                          title="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs truncate" style={{ fontFamily: 'Albert Sans' }}>
                            Image {index + 1}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Area */}
              {imagePreviews.length < 10 && (
                <label
                  className={`flex flex-col items-center justify-center w-full min-h-[180px] border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                    dragActive
                      ? "border-[#055160] bg-[#e7f1ff] scale-[1.02] shadow-lg"
                      : "border-gray-300 bg-gray-50 hover:border-[#055160] hover:bg-[#e7f1ff]/50 hover:shadow-md"
                  } ${uploadingImages.size > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <div className={`mb-4 transition-transform ${dragActive ? "scale-110" : ""}`}>
                      <Upload className={`w-12 h-12 ${dragActive ? "text-[#055160]" : "text-gray-400"}`} />
                    </div>
                    <p className="mb-1 text-base font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                      {dragActive ? "Drop images here" : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-sm text-gray-500 text-center" style={{ fontFamily: 'Albert Sans' }}>
                      Supports multiple images • PNG, JPG, GIF, WebP
                    </p>
                    <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'Albert Sans' }}>
                      Maximum 10MB per image • Up to 10 images total
                    </p>
                    {imagePreviews.length > 0 && (
                      <p className="text-xs text-[#055160] mt-2 font-medium" style={{ fontFamily: 'Albert Sans' }}>
                        {10 - imagePreviews.length} more image{10 - imagePreviews.length !== 1 ? 's' : ''} can be added
                      </p>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={handleImageUpload}
                    multiple
                    disabled={uploadingImages.size > 0}
                  />
                </label>
              )}

              {imagePreviews.length >= 10 && (
                <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
                  <p className="text-sm text-amber-800 flex items-center gap-2" style={{ fontFamily: 'Albert Sans' }}>
                    <AlertCircle className="h-4 w-4" />
                    Maximum 10 images reached. Remove an image to add more.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Categories
              </Label>
              <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                {mainCategories.map((category: any) => (
                  <label key={category.category_id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.category_id)}
                      onChange={() => handleCategoryToggle(category.category_id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                      {category.category_name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Sub Category
              </Label>
              <select
                value={selectedSubcategory || ""}
                onChange={(e) => setSelectedSubcategory(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full h-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#055160]"
                style={{ fontFamily: 'Albert Sans' }}
                disabled={selectedCategories.length === 0}
              >
                <option value="">
                  {selectedCategories.length === 0 
                    ? "Select main categories first" 
                    : "Select Sub Category (Optional)"}
                </option>
                {filteredSubcategories.map((subCat: any) => {
                  const parentCat = categories.find((c: any) => c.category_id === subCat.parent_category_id)
                  return (
                    <option key={subCat.category_id} value={subCat.category_id}>
                      {subCat.category_name} {parentCat ? `(${parentCat.category_name})` : ''}
                    </option>
                  )
                })}
              </select>
              <p className="text-xs text-gray-500">
                {selectedCategories.length === 0 
                  ? "Please select at least one main category to see available subcategories"
                  : "Subcategories are child categories linked to the selected main categories"}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Minimum Quantity
              </Label>
              <Input
                type="number"
                min="1"
                value={minQuantity}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '' || /^\d+$/.test(val)) {
                    setMinQuantity(val || "1")
                  }
                }}
                className="h-11 border-gray-300 bg-white"
                style={{ fontFamily: 'Albert Sans' }}
              />
              <p className="text-xs text-gray-500">Minimum quantity required for purchase (default: 1)</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Product Options
              </Label>
              <div className="border border-gray-300 rounded-md p-3 max-h-60 overflow-y-auto">
                {options.map((option: any) => {
                  const optionType = option.option_type || 'dropdown'
                  const optionTypeLabel = optionType.charAt(0).toUpperCase() + optionType.slice(1)
                  
                  return (
                    <div key={option.option_id} className="mb-4 last:mb-0 border-b border-gray-200 pb-3 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                          {option.name}
                        </h4>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Type: {optionTypeLabel}
                        </span>
                      </div>
                      <div className="space-y-2 ml-4">
                        {option.values?.map((value: any) => {
                          const selectedOption = selectedOptions.find(o => o.option_value_id === value.option_value_id)
                          const isSelected = !!selectedOption
                          const standardPrice = value.standard_price || 0
                          const wholesalePrice = value.wholesale_price || 0

                          return (
                            <div key={value.option_value_id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                              <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                <input
                                  type={optionType === 'checkbox' ? 'checkbox' : optionType === 'radio' ? 'radio' : 'checkbox'}
                                  name={optionType === 'radio' ? `option-${option.option_id}` : undefined}
                                  checked={isSelected}
                                  onChange={() => handleOptionToggle(value.option_value_id)}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                                  {value.name}
                                </span>
                                {(standardPrice > 0 || wholesalePrice > 0) && (
                                  <span className="text-xs text-gray-500">
                                    (Std: ${standardPrice.toFixed(2)}, Wholesale: ${wholesalePrice.toFixed(2)})
                                  </span>
                                )}
                              </label>
                              {isSelected && (
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-500">Price</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder={standardPrice > 0 ? standardPrice.toFixed(2) : "0.00"}
                                      value={selectedOption.option_price === 0 ? '' : selectedOption.option_price}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                          handleOptionPriceChange(value.option_value_id, val)
                                        }
                                      }}
                                      className="w-24 h-8 text-sm border-gray-300"
                                      style={{ fontFamily: 'Albert Sans' }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500">Option types: Radio (single select), Checkbox (multiple select), Dropdown (single select), Text (free text)</p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium text-gray-700">
                Product Features
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={youMayAlsoLike}
                    onChange={(e) => setYouMayAlsoLike(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                    You May Also Like
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={showInCheckout}
                    onChange={(e) => setShowInCheckout(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                    Show in Checkout
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={featured1}
                    onChange={(e) => setFeatured1(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                    Featured 1 (Homepage First Option)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={featured2}
                    onChange={(e) => setFeatured2(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                    Featured 2 (Homepage Second Option)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowAddModal(false)
                  setShowEditModal(false)
                  resetForm()
                }}
                variant="outline"
                className="flex-1 border-gray-300 bg-white"
                style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProduct}
                disabled={createProductMutation.isPending || updateProductMutation.isPending}
                className="flex-1 bg-[#055160] hover:bg-[#04414d] text-white disabled:opacity-50"
                style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              >
                {createProductMutation.isPending || updateProductMutation.isPending 
                  ? "Saving..." 
                  : selectedProduct ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Albert Sans', fontWeight: 700 }}>
              Delete Product
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-[#e7f1ff]">
                <AlertCircle className="h-6 w-6 text-[#055160]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Albert Sans' }}>
                  Are you sure you want to permanently delete this product? This action cannot be undone.
                </p>
                <p className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  {selectedProduct?.product_name}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false)
                setSelectedProduct(null)
              }}
              className="border-gray-300"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleteProductMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              {deleteProductMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
