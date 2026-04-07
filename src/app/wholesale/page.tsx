"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Printer, Edit, Trash2, Save } from "lucide-react"
import { printTableData } from "@/lib/print-utils"

interface WholesalePrice {
  customer_name: string
  customer_type: string
  product_name: string
  option_name: string
  options: { size: string; price: string; discount: string; total: string }[]
  isEditing?: boolean
}

const sampleWholesalePrices: WholesalePrice[] = [
  {
    customer_name: "John Doe",
    customer_type: "Full Service Wholesaler",
    product_name: "Coffee Blend",
    option_name: "Size",
    options: [
      { size: "250g", price: "25", discount: "5%", total: "25" },
      { size: "550g", price: "30", discount: "10%", total: "25" },
      { size: "1000g", price: "35", discount: "15%", total: "25" },
    ],
    isEditing: false
  },
  {
    customer_name: "John Doe",
    customer_type: "Full Service Wholesaler",
    product_name: "Coffee Blend",
    option_name: "Flavour",
    options: [
      { size: "Regular", price: "25", discount: "5%", total: "25" },
      { size: "Hazelnut", price: "30", discount: "10%", total: "25" },
      { size: "Dark Roast", price: "35", discount: "15%", total: "25" },
    ],
    isEditing: false
  },
  {
    customer_name: "Utsav Reddy",
    customer_type: "Full Service Wholesaler",
    product_name: "Coffee Blend",
    option_name: "Size",
    options: [
      { size: "250g", price: "25", discount: "5%", total: "25" },
      { size: "550g", price: "30", discount: "10%", total: "25" },
      { size: "100g", price: "35", discount: "15%", total: "25" },
    ],
    isEditing: false
  },
  {
    customer_name: "Utsav Reddy",
    customer_type: "Full Service Wholesaler",
    product_name: "Coffee Blend",
    option_name: "Flavour",
    options: [
      { size: "Regular", price: "25", discount: "5%", total: "25" },
      { size: "Hazelnut", price: "30", discount: "10%", total: "25" },
      { size: "Dark Roast", price: "35", discount: "15%", total: "25" },
    ],
    isEditing: false
  },
]

export default function WholesalePricingPage() {
  const [activeTab, setActiveTab] = useState<"partial" | "full">("partial")
  const [searchQuery, setSearchQuery] = useState("")
  const [wholesalePrices, setWholesalePrices] = useState(sampleWholesalePrices)

  const handleEdit = (customerName: string, optionName: string) => {
    setWholesalePrices(wholesalePrices.map(price => 
      price.customer_name === customerName && price.option_name === optionName
        ? { ...price, isEditing: true }
        : price
    ))
  }

  const handleSave = (customerName: string, optionName: string) => {
    setWholesalePrices(wholesalePrices.map(price => 
      price.customer_name === customerName && price.option_name === optionName
        ? { ...price, isEditing: false }
        : price
    ))
  }

  const handleDeleteListing = (customerName: string, optionName: string) => {
    if (confirm("Are you sure you want to delete this listing?")) {
      setWholesalePrices(wholesalePrices.filter(
        price => !(price.customer_name === customerName && price.option_name === optionName)
      ))
    }
  }

  const handleDeleteRow = (customerName: string, optionName: string, rowIndex: number) => {
    setWholesalePrices(wholesalePrices.map(price => {
      if (price.customer_name === customerName && price.option_name === optionName) {
        return {
          ...price,
          options: price.options.filter((_, index) => index !== rowIndex)
        }
      }
      return price
    }))
  }

  const updateOptionValue = (customerName: string, optionName: string, rowIndex: number, field: string, value: string) => {
    setWholesalePrices(wholesalePrices.map(price => {
      if (price.customer_name === customerName && price.option_name === optionName) {
        const newOptions = [...price.options]
        newOptions[rowIndex] = { ...newOptions[rowIndex], [field]: value }
        return { ...price, options: newOptions }
      }
      return price
    }))
  }

  return (
    <div className="bg-gray-50 min-h-screen w-full max-w-full overflow-x-hidden" style={{ fontFamily: 'Albert Sans' }}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-gray-900" style={{ 
          fontFamily: 'Albert Sans',
          fontWeight: 600,
          fontStyle: 'normal',
          fontSize: '40px',
          lineHeight: '1.2',
          letterSpacing: '0%'
        }}>
          Wholesale Pricing List
        </h1>
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => printTableData("Wholesale Pricing")}
            className="gap-2 whitespace-nowrap border-0 shadow-none hover:bg-red-50 rounded-full h-10 px-4 transition-colors"
            style={{ 
              fontFamily: 'Albert Sans', 
              fontWeight: 600,
              fontSize: '15px',
              color: '#C62828',
              backgroundColor: 'transparent',
            }}
          >
            <Printer className="h-5 w-5 text-[#C62828]" />
            Print List
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 items-stretch sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search customer, product or option..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[54px] border border-gray-200 bg-white rounded-full focus:ring-2 focus:ring-[#C62828] focus:border-[#C62828] focus:outline-none transition-all shadow-sm"
            style={{ fontFamily: 'Albert Sans', paddingLeft: '44px', paddingRight: '12px' }}
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setActiveTab("partial")}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "partial"
                ? "bg-[#FFEBEE] text-[#C62828] border-2 border-[#C62828] shadow-sm"
                : "bg-white text-gray-600 border-2 border-gray-100 hover:border-gray-200"
            }`}
          >
            Partial Service Wholesalers
          </button>
          <button
            onClick={() => setActiveTab("full")}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "full"
                ? "bg-[#FFEBEE] text-[#C62828] border-2 border-[#C62828] shadow-sm"
                : "bg-white text-gray-600 border-2 border-gray-100 hover:border-gray-200"
            }`}
          >
            Full Service Wholesalers
          </button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-none shadow-md overflow-hidden rounded-2xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Customer Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Customer Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Product Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Option Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Size/Variant
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Product Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Discount (%)
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Total
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {wholesalePrices.map((priceItem, priceIndex) => {
                const totalRows = priceItem.options.length
                
                return priceItem.options.map((option, optionIndex) => {
                  const isFirstRow = optionIndex === 0
                  const rowSpan = isFirstRow ? totalRows : 0

                  return (
                    <tr key={`${priceIndex}-${optionIndex}`} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      {isFirstRow && (
                        <>
                          <td className="px-6 py-4 align-top" rowSpan={rowSpan}>
                            <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                              {priceItem.customer_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top" rowSpan={rowSpan}>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {priceItem.customer_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top" rowSpan={rowSpan}>
                            <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                              {priceItem.product_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top" rowSpan={rowSpan}>
                            <span className="text-sm font-medium text-gray-600" style={{ fontFamily: 'Albert Sans' }}>
                              {priceItem.option_name}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-6 py-3">
                        {priceItem.isEditing ? (
                          <Input
                            value={option.size}
                            onChange={(e) => updateOptionValue(priceItem.customer_name, priceItem.option_name, optionIndex, 'size', e.target.value)}
                            className="h-9 text-sm border-gray-200 focus:border-[#C62828] focus:ring-[#C62828]/10"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                            {option.size}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {priceItem.isEditing ? (
                          <Input
                            value={option.price}
                            onChange={(e) => updateOptionValue(priceItem.customer_name, priceItem.option_name, optionIndex, 'price', e.target.value)}
                            className="h-9 text-sm border-gray-200 focus:border-[#C62828] focus:ring-[#C62828]/10"
                          />
                        ) : (
                          <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                            ${option.price}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {priceItem.isEditing ? (
                          <Input
                            value={option.discount}
                            onChange={(e) => updateOptionValue(priceItem.customer_name, priceItem.option_name, optionIndex, 'discount', e.target.value)}
                            className="h-9 text-sm border-gray-200 focus:border-[#C62828] focus:ring-[#C62828]/10"
                          />
                        ) : (
                          <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                            {option.discount}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {priceItem.isEditing ? (
                          <Input
                            value={option.total}
                            onChange={(e) => updateOptionValue(priceItem.customer_name, priceItem.option_name, optionIndex, 'total', e.target.value)}
                            className="h-9 text-sm border-gray-200 focus:border-[#C62828] focus:ring-[#C62828]/10"
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                            ${option.total}
                          </span>
                        )}
                      </td>
                      {isFirstRow ? (
                        <td className="px-6 py-4 align-top text-right" rowSpan={rowSpan}>
                          <div className="flex flex-col items-end gap-2">
                            {priceItem.isEditing ? (
                              <button
                                onClick={() => handleSave(priceItem.customer_name, priceItem.option_name)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C62828] text-white hover:bg-[#B71C1C] transition-colors"
                              >
                                <Save className="h-3.5 w-3.5" />
                                Save Changes
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEdit(priceItem.customer_name, priceItem.option_name)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 border border-gray-200 hover:border-[#C62828] hover:text-[#C62828] transition-all"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit Pricing
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteListing(priceItem.customer_name, priceItem.option_name)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#C62828] hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Listing
                            </button>
                          </div>
                        </td>
                      ) : (
                        <td className="px-6 py-3 text-right">
                          {priceItem.isEditing && (
                            <button
                              onClick={() => handleDeleteRow(priceItem.customer_name, priceItem.option_name, optionIndex)}
                              className="p-1.5 text-[#C62828] hover:bg-red-50 rounded-md transition-colors"
                              title="Delete Row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

