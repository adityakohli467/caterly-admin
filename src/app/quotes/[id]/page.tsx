"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Send } from "lucide-react"
import api, { settingsAPI } from "@/lib/api"
import Link from "next/link"
import { toast } from "sonner"
import { format } from "date-fns"
import { useState } from "react"

interface QuoteProduct {
  product_id: number
  product_name: string
  product_description?: string
  quantity: number
  price: number
  total: number
  product_comment?: string
  options?: Array<{
    option_name: string
    option_value: string
    option_quantity: number
    option_price: number
  }>
}

interface QuoteDetails {
  order_id: number
  customer_id?: number
  firstname?: string
  lastname?: string
  email?: string
  telephone?: string
  delivery_date_time?: string
  delivery_time?: string
  order_comments?: string
  company_name?: string
  company_abn?: string
  department_name?: string
  company_id?: number
  department_id?: number
  delivery_address?: string
  delivery_method?: string
  delivery_contact?: string
  delivery_details?: string
  location_name?: string
  location_id?: number
  products: QuoteProduct[]
  subtotal: number
  delivery_fee: number
  wholesale_discount?: number
  coupon_discount?: number
  total_discount?: number
  coupon_code?: string
  coupon_type?: string
  coupon_id?: number
  gst: number
  calculated_total: number
  order_total: number
}

// Sample data
const sampleQuote: QuoteDetails = {
  order_id: 83,
  firstname: "Johnathan",
  lastname: "Smith",
  email: "johnsmith@gmail.com",
  telephone: "(+61)8989898989",
  delivery_date_time: "2025-08-06T11:20:00",
  order_comments: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi.",
  company_name: "Company Name",
  department_name: "Company Name",
  delivery_address: "Order Date",
  location_name: "Location Name",
  products: [
    {
      product_id: 1,
      product_name: "Sandwich",
      product_description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      quantity: 5,
      price: 12.00,
      total: 60.00,
      options: [
        { option_name: "Add-on", option_value: "Mayonnaise", option_quantity: 3, option_price: 1.00 },
        { option_name: "Add-on", option_value: "Ketchup", option_quantity: 2, option_price: 1.00 },
        { option_name: "Add-on", option_value: "Southwest", option_quantity: 5, option_price: 1.00 },
      ]
    },
    {
      product_id: 2,
      product_name: "Americano",
      product_description: "Lorem ipsum dolor sit amet, consectetur",
      quantity: 5,
      price: 12.00,
      total: 60.00,
    },
    {
      product_id: 3,
      product_name: "Cream Cheese Bagel",
      product_description: "Lorem ipsum dolor sit amet, consectetur",
      quantity: 5,
      price: 12.00,
      total: 60.00,
    },
  ],
  subtotal: 190,
  delivery_fee: 50,
  coupon_discount: 50,
  coupon_code: "Check50",
  gst: 17.27,
  calculated_total: 190,
  order_total: 190,
}

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const quoteId = params?.id as string | undefined
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)
  const [sendingQuoteEmail, setSendingQuoteEmail] = useState(false)

  // Fetch quote from API
  const { data: quoteData, isLoading, error, isFetching } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: async () => {
      if (!quoteId) {
        throw new Error('Quote ID is required')
      }
      console.log('Fetching quote:', quoteId)
      const response = await api.get(`/admin/quotes/${quoteId}`)
      console.log('Quote fetched:', response.data?.quote)
      return response.data
    },
    enabled: !!quoteId, // Only fetch if quoteId exists
    retry: 2, // Retry twice on failure
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Always refetch on mount
  })

  const quote = quoteData?.quote || sampleQuote

  // Ensure products array exists and filter out invalid products
  const safeQuote = {
    ...quote,
    products: Array.isArray(quote?.products)
      ? quote.products.filter((product: QuoteProduct) => {
        if (!product) return false
        const productId = Number(product.product_id)
        const productName = product.product_name?.trim() || ''
        return productId > 0 && productName !== ''
      })
      : []
  }

  // Show loading state instead of blank page (check both isLoading and isFetching)
  if (isLoading || isFetching) {
    return (
      <div className="flex items-center justify-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#055160] mx-auto mb-4"></div>
          <p className="text-gray-600" style={{ fontFamily: 'Albert Sans' }}>Loading quote details...</p>
          {quoteId && (
            <p className="text-sm text-gray-500 mt-2" style={{ fontFamily: 'Albert Sans' }}>
              Quote ID: {quoteId}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Show error state only if there's an actual error
  if (error) {
    return (
      <div className="flex items-center justify-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <p className="text-[#055160] mb-2" style={{ fontFamily: 'Albert Sans' }}>
            Failed to load quote details
          </p>
          {quoteId && (
            <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Albert Sans' }}>
              Quote ID: {quoteId}
            </p>
          )}
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-[#C62828] text-white rounded-lg hover:bg-[#B71C1C] transition-colors"
            style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const handleDownloadInvoice = async () => {
    if (!safeQuote?.order_id) {
      toast.error("Order ID not found")
      return
    }

    setDownloadingInvoice(true)
    try {
      // Fetch admin settings for header/footer branding
      let biz: Record<string, string> = {}
      try {
        const settingsRes = await settingsAPI.get()
        biz = settingsRes.data?.settings || {}
      } catch { /* use blank fallback */ }

      const companyName = biz.companyName || 'Caterly'
      const companyEmail = biz.companyEmail || ''
      const companyPhone = biz.companyPhone || ''
      const companyAbn = biz.companyAbn || ''
      const companyAddr = biz.companyAddress || ''

      // ── Delivery date / time formatting ──────────────────────────────
      const dtRaw = safeQuote.delivery_date_time
      const dtObj = dtRaw ? new Date(dtRaw) : null
      const deliveryDay = dtObj ? format(dtObj, 'EEEE') : ''
      const deliveryDate = dtObj ? format(dtObj, 'dd MMM yyyy') : ''

      let deliveryTimeStr = ''
      let rawTime = safeQuote.delivery_time
      if (!rawTime && dtObj) {
        const h = dtObj.getHours(), m = dtObj.getMinutes()
        rawTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }
      if (rawTime) {
        const [hh, mm] = rawTime.split(':').map(Number)
        if (!isNaN(hh) && !isNaN(mm)) {
          const h12 = hh % 12 || 12
          const ampm = hh >= 12 ? 'PM' : 'AM'
          deliveryTimeStr = `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`
        }
      }

      // ── Delivery contact parsing ─────────────────────────────────────
      const [dcName = '', dcPhone = ''] = (safeQuote.delivery_contact || '').split('|').map((s: string) => s.trim())

      // ── Financials ───────────────────────────────────────────────────
      const subtotal = Number(safeQuote.subtotal || 0)
      const deliveryFee = Number(safeQuote.delivery_fee || 0)
      const couponDisc = Number(safeQuote.coupon_discount || 0)
      const gst = Number(safeQuote.gst) || parseFloat((subtotal * 0.10).toFixed(2))
      const grandTotal = Number(safeQuote.calculated_total || safeQuote.order_total || 0)
      const quoteDate = format(new Date(), 'dd MMM yyyy')

      // ── Products HTML ────────────────────────────────────────────────
      const rowsHTML = (safeQuote.products || []).map((p: QuoteProduct) => {
        const optRows = (p.options || []).map(o => `
          <tr style="background:#fafafa;">
            <td style="padding:5px 10px 5px 24px;color:#555;font-size:12px;border-bottom:1px solid #f0f0f0;">
              &rarr; <em>${o.option_name}: ${o.option_value}${o.option_quantity > 1 ? ` (x${o.option_quantity})` : ''}</em>
            </td>
            <td style="padding:5px 10px;text-align:center;color:#555;font-size:12px;border-bottom:1px solid #f0f0f0;">${o.option_quantity}</td>
            <td style="padding:5px 10px;text-align:right;color:#555;font-size:12px;border-bottom:1px solid #f0f0f0;">$${Number(o.option_price).toFixed(2)}</td>
            <td style="padding:5px 10px;text-align:right;color:#555;font-size:12px;border-bottom:1px solid #f0f0f0;">$${(Number(o.option_quantity) * Number(o.option_price)).toFixed(2)}</td>
          </tr>`).join('')
        return `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #f0f0f0;">
              <div style="font-weight:600;color:#1a1a1a;">${p.product_name}</div>
              ${p.product_description && p.product_description !== '0' ? `<div style="color:#666;font-size:12px;margin-top:3px;">${p.product_description}</div>` : ''}
              ${p.product_comment && p.product_comment !== '0' ? `<div style="color:#888;font-size:11px;font-style:italic;margin-top:2px;">Note: ${p.product_comment}</div>` : ''}
            </td>
            <td style="padding:10px;text-align:center;border-bottom:1px solid #f0f0f0;">${p.quantity}</td>
            <td style="padding:10px;text-align:right;border-bottom:1px solid #f0f0f0;">$${Number(p.price).toFixed(2)}</td>
            <td style="padding:10px;text-align:right;border-bottom:1px solid #f0f0f0;font-weight:600;">$${Number(p.total).toFixed(2)}</td>
          </tr>${optRows}`
      }).join('')

      // ── Full HTML template ───────────────────────────────────────────
      const html = `<!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <title>Quote #${safeQuote.order_id}</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box;}
          body{font-family:Arial,sans-serif;font-size:13px;color:#333;background:#fff;}
          @media print{
            body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
            @page{margin:1cm;size:A4;}
          }
        </style>
      </head><body><div style="padding:30px;max-width:820px;margin:0 auto;">

        <!-- HEADER -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;">
          <div style="font-size:44px;font-weight:900;color:#C62828;letter-spacing:-1px;">${companyName}</div>
          <div style="text-align:right;font-size:12px;color:#555;line-height:1.9;">
            ${companyAddr ? `<div>${companyAddr}</div>` : ''}
            ${companyPhone ? `<div>Phone: ${companyPhone}</div>` : ''}
            ${companyEmail ? `<div>Email: ${companyEmail}</div>` : ''}
            ${companyAbn ? `<div>ABN: ${companyAbn}</div>` : ''}
          </div>
        </div>

        <!-- QUOTE BANNER -->
        <div style="background:#C62828;color:#fff;text-align:center;padding:13px;font-size:22px;font-weight:700;letter-spacing:4px;margin-bottom:24px;">QUOTE</div>

        <!-- QUOTE META + BILL TO -->
        <div style="display:flex;justify-content:space-between;margin-bottom:22px;gap:20px;">
          <div style="line-height:2;">
            <div><strong>Quote Number:</strong>&nbsp;#${safeQuote.order_id}</div>
            <div><strong>Quote Date:</strong>&nbsp;${quoteDate}</div>
            ${deliveryDay ? `<div><strong>Delivery Day:</strong>&nbsp;${deliveryDay}</div>` : ''}
            ${deliveryDate ? `<div><strong>Delivery Date:</strong>&nbsp;${deliveryDate}</div>` : ''}
            ${deliveryTimeStr ? `<div><strong>Delivery Time:</strong>&nbsp;${deliveryTimeStr}</div>` : ''}
          </div>
          <div style="min-width:280px;">
            <div style="color:#C62828;font-weight:700;font-size:15px;border-bottom:2px solid #C62828;padding-bottom:4px;margin-bottom:8px;">Bill To:</div>
            <div style="font-weight:700;margin-bottom:4px;">${safeQuote.firstname || ''} ${safeQuote.lastname || ''}</div>
            ${safeQuote.company_name ? `<div style="color:#555;">Company: ${safeQuote.company_name}</div>` : ''}
            ${safeQuote.department_name ? `<div style="color:#555;">Department: ${safeQuote.department_name}</div>` : ''}
            ${safeQuote.email ? `<div style="color:#555;">Email: ${safeQuote.email}</div>` : ''}
            ${safeQuote.telephone ? `<div style="color:#555;">Phone: ${safeQuote.telephone}</div>` : ''}
          </div>
        </div>

        <!-- DELIVERY DETAILS (separate section) -->
        ${(safeQuote.delivery_address || dcName || dcPhone || safeQuote.delivery_details) ? `
        <div style="background:#f8f9fa;border-left:4px solid #C62828;padding:14px 16px;margin-bottom:24px;border-radius:0 6px 6px 0;">
          <div style="font-weight:700;color:#C62828;margin-bottom:8px;font-size:14px;">Delivery Details</div>
          <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:12px;color:#444;">
            ${safeQuote.delivery_method ? `<div><strong>Method:</strong> ${safeQuote.delivery_method === 'pickup' ? 'Pick Up' : 'Delivery'}</div>` : ''}
            ${safeQuote.delivery_address ? `<div><strong>Address:</strong> ${safeQuote.delivery_address}</div>` : ''}
            ${dcName ? `<div><strong>Contact:</strong> ${dcName}</div>` : ''}
            ${dcPhone ? `<div><strong>Contact Phone:</strong> ${dcPhone}</div>` : ''}
            ${safeQuote.location_name ? `<div><strong>Location:</strong> ${safeQuote.location_name}</div>` : ''}
            ${safeQuote.delivery_details ? `<div style="width:100%;"><strong>Notes:</strong> ${safeQuote.delivery_details}</div>` : ''}
          </div>
        </div>` : ''}

        <!-- PRODUCTS TABLE -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#C62828;color:#fff;">
              <th style="padding:12px 10px;text-align:left;">Description</th>
              <th style="padding:12px 10px;text-align:center;">Qty</th>
              <th style="padding:12px 10px;text-align:right;">Unit Price</th>
              <th style="padding:12px 10px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${rowsHTML}</tbody>
        </table>

        <!-- TOTALS -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:28px;">
          <div style="min-width:290px;font-size:13px;">
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;"><span style="color:#555;">Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>
            ${deliveryFee > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;"><span style="color:#555;">Delivery Fee:</span><span>$${deliveryFee.toFixed(2)}</span></div>` : ''}
            ${couponDisc > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;"><span style="color:#16a34a;">Discount${safeQuote.coupon_code ? ` (${safeQuote.coupon_code})` : ''}:</span><span style="color:#16a34a;">-$${couponDisc.toFixed(2)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;"><span style="color:#555;">GST (10%):</span><span>$${gst.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:2px solid #333;font-weight:700;font-size:15px;"><span>Total Amount:</span><span>$${grandTotal.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700;font-size:15px;color:#C62828;"><span>Balance Due:</span><span>$${grandTotal.toFixed(2)}</span></div>
          </div>
        </div>

        ${safeQuote.order_comments ? `
        <div style="margin-bottom:28px;padding:14px;background:#f8f9fa;border-radius:6px;">
          <div style="font-weight:600;margin-bottom:6px;">Order Comments:</div>
          <div style="color:#555;font-size:13px;">${safeQuote.order_comments}</div>
        </div>` : ''}

        <!-- FOOTER -->
        <div style="border-top:2px solid #e5e7eb;padding-top:18px;text-align:center;font-size:12px;color:#888;">
          <div>Thank you for your business!</div>
          ${companyEmail || companyPhone ? `<div style="margin-top:4px;">For inquiries: ${[companyEmail, companyPhone].filter(Boolean).join(' or ')}</div>` : ''}
          ${companyAbn ? `<div style="margin-top:2px;">${companyAbn}</div>` : ''}
        </div>

      </div><script>window.onload=function(){window.print();}<\/script></body></html>`

      const pw = window.open('', '_blank')
      if (!pw) { toast.error("Allow popups to download the quote"); return }
      pw.document.write(html)
      pw.document.close()
      toast.success("Quote ready — use 'Save as PDF' in the print dialog")
    } catch (error: any) {
      console.error("Download invoice error:", error)
      toast.error("Failed to generate quote")
    } finally {
      setDownloadingInvoice(false)
    }
  }


  const handleSendQuoteEmail = async () => {
    if (!safeQuote?.order_id) {
      toast.error("Quote ID not found")
      return
    }

    setSendingQuoteEmail(true)
    try {
      const response = await api.post(`/admin/quotes/${safeQuote.order_id}/send-email`, {
        recipient_email: safeQuote.email,
        custom_message: ""
      })

      if (response.data.success) {
        // Invalidate quotes query cache to refresh the list
        queryClient.invalidateQueries({ queryKey: ["quotes"] })
        // Also invalidate the specific quote cache to refresh the detail page
        queryClient.invalidateQueries({ queryKey: ["quote", quoteId] })
        toast.success("Quote email sent successfully!", {
          description: `Sent to: ${response.data.sent_to}. Customer can review and provide feedback via the link.`,
        })
      } else {
        toast.error(response.data.message || "Failed to send quote email")
      }
    } catch (error: any) {
      console.error("Failed to send quote email:", error)
      const errorMessage = error.response?.data?.message || error.message || "Failed to send quote email"
      toast.error(errorMessage)
    } finally {
      setSendingQuoteEmail(false)
    }
  }

  if (error || (!isLoading && !quote)) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#055160]" style={{ fontFamily: 'Albert Sans' }}>Failed to load quote details</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-[#055160] hover:underline"
            style={{ fontFamily: 'Albert Sans' }}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Show skeleton while loading
  if (isLoading || !quote) {
    return null // Next.js loading.tsx will handle this
  }

  return (
    <div className="bg-gray-50 " style={{ fontFamily: 'Albert Sans' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900" style={{ fontWeight: 700 }}>
              Viewing Quote Details
            </h1>
            <p className="text-gray-600 mt-1">
              Order <span className="text-[#055160] font-semibold">#{safeQuote.order_id}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2 border-gray-300 text-gray-700 hover:text-gray-900"
            style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            onClick={handleDownloadInvoice}
            disabled={downloadingInvoice || !safeQuote?.order_id}
          >
            <Download className="h-4 w-4" />
            {downloadingInvoice ? "Downloading..." : "Download Quote"}
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
            style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            onClick={handleSendQuoteEmail}
            disabled={sendingQuoteEmail || !safeQuote?.order_id}
          >
            <Send className="h-4 w-4" />
            {sendingQuoteEmail ? "Sending..." : "Send Quote Email"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Products Table */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-white border-gray-200">
            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                      No.
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                      Product Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                      Product Description
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                      Total Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(safeQuote.products || []).map((product: QuoteProduct, index: number) => {
                    const displayIndex = index + 1
                    return (
                      <tr key={product.product_id || index} className="border-b border-gray-100">
                        <td className="px-4 py-4 align-top">
                          <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                            {displayIndex}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                              {product.product_name}
                            </p>
                            {product.product_comment && product.product_comment !== '0' && (
                              <p className="text-xs text-gray-600 italic mt-1" style={{ fontFamily: 'Albert Sans' }}>
                                Note: {product.product_comment}
                              </p>
                            )}
                            {product.options && product.options.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-600 font-medium" style={{ fontFamily: 'Albert Sans' }}>
                                  Options:
                                </p>
                                {product.options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="text-xs text-gray-600 ml-2" style={{ fontFamily: 'Albert Sans' }}>
                                    {option.option_name}: {option.option_value} {option.option_quantity > 1 ? `(x${option.option_quantity})` : ''}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                            {product.product_description && product.product_description !== '0' ? product.product_description : '-'}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top text-center">
                          <div>
                            <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                              {product.quantity}
                            </p>
                            {product.options && product.options.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {product.options.map((option, optionIndex) => (
                                  <p key={optionIndex} className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                                    {option.option_quantity}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-right">
                          <div>
                            <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                              ${Number(product.price).toFixed(2)}
                            </p>
                            {product.options && product.options.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {product.options.map((option, optionIndex) => (
                                  <p key={optionIndex} className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                                    ${Number(option.option_price).toFixed(2)}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-right">
                          <div>
                            <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                              ${Number(product.total).toFixed(2)}
                            </p>
                            {product.options && product.options.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {product.options.map((option, optionIndex) => (
                                  <p key={optionIndex} className="text-xs text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                                    ${(Number(option.option_quantity) * Number(option.option_price)).toFixed(2)}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Totals */}
                  <tr className="border-b border-gray-100">
                    <td colSpan={5} className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                        Sub Total
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                        ${Number(safeQuote.subtotal || 0).toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  {/* Wholesale discount - Hidden for kj3 */}
                  {false && (safeQuote.wholesale_discount || 0) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td colSpan={5} className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-green-600" style={{ fontFamily: 'Albert Sans' }}>
                          Wholesale Discount
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-green-600" style={{ fontFamily: 'Albert Sans' }}>
                          -${Number(safeQuote.wholesale_discount || 0).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )}

                  {(safeQuote.coupon_id || (safeQuote.coupon_discount && safeQuote.coupon_discount > 0)) ? (
                    <tr className="border-b border-gray-100">
                      <td colSpan={5} className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-green-600" style={{ fontFamily: 'Albert Sans' }}>
                            Coupon Discount
                          </span>
                          {safeQuote.coupon_code && (
                            <span className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Albert Sans' }}>
                              🎟️ {safeQuote.coupon_code}
                            </span>
                          )}
                          {safeQuote.coupon_id && !safeQuote.coupon_code && (
                            <span className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Albert Sans' }}>
                              🎟️ Coupon Applied (Deleted)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-green-600" style={{ fontFamily: 'Albert Sans' }}>
                          -${Number(safeQuote.coupon_discount || 0).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ) : null}

                  {Number(safeQuote.delivery_fee || 0) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td colSpan={5} className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                          Delivery Fee
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                          ${Number(safeQuote.delivery_fee || 0).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )}

                  {Number(safeQuote.gst || 0) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td colSpan={5} className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-500 italic" style={{ fontFamily: 'Albert Sans' }}>
                          GST (10%) incl.
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-500 italic" style={{ fontFamily: 'Albert Sans' }}>
                          ${Number(safeQuote.gst || 0).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )}

                  <tr className="border-b border-gray-200">
                    <td colSpan={5} className="px-4 py-3 text-right">
                      <span className="text-base font-semibold text-[#055160]" style={{ fontFamily: 'Albert Sans' }}>
                        Total <span className="text-xs font-normal text-gray-500">(Inc. GST)</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-base font-bold text-[#055160]" style={{ fontFamily: 'Albert Sans' }}>
                        ${(Number(safeQuote.calculated_total || safeQuote.order_total || 0) - Number(safeQuote.gst || 0)).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Company Details and Order Comments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-gray-200">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Company Details
                </h3>
                <div className="space-y-1 text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                  <p>Company Name : {safeQuote.company_name || 'N/A'}</p>
                  {safeQuote.company_abn && (
                    <p>ABN : {safeQuote.company_abn}</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  Order Comments
                </h3>
                <p className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                  {safeQuote.order_comments || 'No comments'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Order Details & Delivery Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Details */}
          <Card className="p-6 bg-white border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
                Customer Details
              </h3>
            </div>

            <div className="space-y-4">
              {safeQuote.company_name && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                    Company Name
                  </p>
                  <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                    {safeQuote.company_name}
                  </p>
                </div>
              )}

              {safeQuote.department_name && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                    Department
                  </p>
                  <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                    {safeQuote.department_name}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                  Customer Name
                </p>
                <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                  {safeQuote.firstname && safeQuote.lastname ? `${safeQuote.firstname} ${safeQuote.lastname}` : 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                  Customer Email
                </p>
                <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                  {safeQuote.email || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                  Customer Phone
                </p>
                <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                  {safeQuote.telephone || 'N/A'}
                </p>
              </div>

              {safeQuote.location_name && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                    Order Location
                  </p>
                  <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                    {safeQuote.location_name}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Delivery/Pick Up Details */}
          <Card className="p-6 bg-white border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
              {safeQuote.delivery_method === 'pickup' ? 'Pick Up Details' : 'Delivery Details'}
            </h3>

            <div className="space-y-4">
              {safeQuote.delivery_date_time && (
                <>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                      Delivery Date
                    </p>
                    <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                      {format(new Date(safeQuote.delivery_date_time), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                      Delivery Time
                    </p>
                    <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                      {(() => {
                        // Format time in 12-hour format with AM/PM
                        let timeToFormat = safeQuote.delivery_time
                        if (!timeToFormat && safeQuote.delivery_date_time) {
                          // Extract time from delivery_date_time if delivery_time is not available
                          const date = new Date(safeQuote.delivery_date_time)
                          const hours = date.getHours()
                          const minutes = date.getMinutes()
                          timeToFormat = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                        }
                        if (timeToFormat) {
                          // Parse HH:mm format and convert to 12-hour format
                          const [hours, minutes] = timeToFormat.split(':').map(Number)
                          if (!isNaN(hours) && !isNaN(minutes)) {
                            const hour12 = hours % 12 || 12
                            const ampm = hours >= 12 ? 'PM' : 'AM'
                            return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`
                          }
                        }
                        return timeToFormat || 'N/A'
                      })()}
                    </p>
                  </div>
                </>
              )}

              {safeQuote.delivery_address && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                    Delivery Address
                  </p>
                  <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                    {safeQuote.delivery_address}
                  </p>
                </div>
              )}

              {safeQuote.delivery_contact ? (
                <>
                  {(() => {
                    const parts = safeQuote.delivery_contact.split('|')
                    const contactName = parts[0]?.trim() || ''
                    const contactNumber = parts[1]?.trim() || ''
                    return (
                      <>
                        {contactName && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                              Delivery Contact
                            </p>
                            <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                              {contactName}
                            </p>
                          </div>
                        )}
                        {contactNumber && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                              Delivery Contact Number
                            </p>
                            <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                              {contactNumber}
                            </p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </>
              ) : (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                    Delivery Contact
                  </p>
                  <p className="text-sm text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                    N/A
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Albert Sans' }}>
                  Delivery Notes
                </p>
                <p className="text-sm text-gray-900 whitespace-pre-line" style={{ fontFamily: 'Albert Sans' }}>
                  {safeQuote.delivery_details || 'N/A'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

