"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { formatDateOnly, formatTimeInAU } from "@/lib/utils"
import { Loader2, Printer } from "lucide-react"

interface OrderProduct {
  order_product_id: number
  product_id: number
  product_name: string
  product_description?: string
  quantity: number
  price: number
  total: number
  product_comment?: string
  item_comments?: string
  is_prepared?: boolean
  options?: Array<{
    option_name: string
    option_value: string
    option_quantity: number
    option_price: number
  }>
}

interface OrderDetails {
  order_id: number
  customer_order_name: string
  customer_order_email?: string
  customer_order_telephone?: string
  firstname?: string
  lastname?: string
  email?: string
  telephone?: string
  delivery_date_time?: string
  order_comments?: string
  company_name?: string
  department_name?: string
  delivery_address?: string
  location_name?: string
  order_products?: OrderProduct[]
  subtotal?: string
  wholesale_discount?: string | number
  delivery_fee?: string
  late_fee?: string | number
  coupon_discount?: string
  coupon_code?: string
  gst?: string
  calculated_total?: string
  order_total?: string
  order_status?: number
  is_completed?: number
}

interface OrderDetailModalProps {
  orderId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderUpdated?: () => void
}

export function OrderDetailModal({ orderId, open, onOpenChange, onOrderUpdated }: OrderDetailModalProps) {
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails()
    } else {
      setOrder(null)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId])

  const handlePrint = () => {
    if (!order) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const deliveryDate = order.delivery_date_time
      ? `${formatDateOnly(order.delivery_date_time)}, ${formatTimeInAU(order.delivery_date_time)}`
      : 'N/A'

    const productsHtml = (order.order_products || []).map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          ${p.product_name}
          ${p.options && p.options.length > 0 ? '<br/><small>' + p.options.map(o => `${o.option_name}: ${o.option_value} (Qty: ${o.option_quantity}, $${Number(o.option_price).toFixed(2)})`).join(', ') + '</small>' : ''}
          ${p.product_comment ? '<br/><em>Note: ' + p.product_comment + '</em>' : ''}
        </td>
        <td>${p.item_comments || '-'}</td>
        <td style="text-align:center">${p.quantity}</td>
        <td style="text-align:right">$${Number(p.price).toFixed(2)}</td>
        <td style="text-align:right">$${Number(p.total).toFixed(2)}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order #${order.order_id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; font-size: 13px; }
            th { background: #f5f5f5; font-weight: 600; }
            .totals { margin-top: 16px; width: 320px; margin-left: auto; }
            .totals td { border: none; padding: 4px 8px; }
            .totals .total-row td { font-weight: 700; border-top: 2px solid #333; }
            .section { margin-top: 24px; }
            .section h2 { font-size: 15px; margin-bottom: 8px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .info-item label { font-size: 11px; color: #888; display: block; }
            .info-item span { font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>Order #${order.order_id}</h1>
          <div class="meta">Delivery: ${deliveryDate}</div>
          <div class="info-grid">
            <div class="info-item"><label>Customer</label><span>${order.customer_order_name || 'N/A'}</span></div>
            <div class="info-item"><label>Phone</label><span>${order.customer_order_telephone || 'N/A'}</span></div>
            ${order.company_name ? `<div class="info-item"><label>Company</label><span>${order.company_name}</span></div>` : ''}
            ${order.delivery_address ? `<div class="info-item"><label>Delivery Address</label><span>${order.delivery_address}</span></div>` : ''}
          </div>
          <table>
            <thead><tr><th>No.</th><th>Product</th><th>Item Comments</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>${productsHtml}</tbody>
          </table>
          <table class="totals">
            ${(() => {
              const productSum = order.order_products?.reduce((sum: number, p: any) => {
                const productTotal = Number(p.total) || (Number(p.price) * Number(p.quantity));
                const optionsTotal = p.options?.reduce((optSum: number, o: any) => optSum + (Number(o.option_price) * Number(o.option_quantity)), 0) || 0;
                return sum + productTotal + optionsTotal;
              }, 0) || Number(order.subtotal) || 0;
              const deliveryFeeVal = Number(order.delivery_fee || 0);
              const lateFeeVal = Number(order.late_fee || 0);
              const wholesaleDiscountVal = Number(order.wholesale_discount || 0);
              const couponDiscountVal = Number(order.coupon_discount || 0);
              
              const netProductPrice = productSum - wholesaleDiscountVal - couponDiscountVal;
              const baseTotal = productSum + deliveryFeeVal + lateFeeVal - wholesaleDiscountVal - couponDiscountVal;
              const gstDisplay = Math.max(0, netProductPrice) * 0.11;
              
              let rows = `<tr><td>Sub Total</td><td style="text-align:right">$${productSum.toFixed(2)}</td></tr>`;
              if (deliveryFeeVal > 0) rows += `<tr><td>Delivery Fee</td><td style="text-align:right">$${deliveryFeeVal.toFixed(2)}</td></tr>`;
              if (lateFeeVal > 0) rows += `<tr><td>Late Fee</td><td style="text-align:right">$${lateFeeVal.toFixed(2)}</td></tr>`;
              if (wholesaleDiscountVal > 0) rows += `<tr><td>Wholesale Discount</td><td style="text-align:right">-$${wholesaleDiscountVal.toFixed(2)}</td></tr>`;
              if (couponDiscountVal > 0) rows += `<tr><td>Coupon Discount</td><td style="text-align:right">-$${couponDiscountVal.toFixed(2)}</td></tr>`;
              
              rows += `<tr><td>GST (11%) incl.</td><td style="text-align:right">$${gstDisplay.toFixed(2)}</td></tr>`;
              rows += `<tr class="total-row"><td>Total</td><td style="text-align:right">$${baseTotal.toFixed(2)}</td></tr>`;
              
              return rows;
            })()}
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const fetchOrderDetails = async () => {
    if (!orderId) return

    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/admin/orders/${orderId}`)
      if (response.data && response.data.order) {
        setOrder(response.data.order)
      } else {
        setError("Order data not found in response")
      }
    } catch (error: any) {
      console.error("Failed to fetch order details:", error)
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch order details"
      setError(errorMessage)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status?: number) => {
    switch (status) {
      case 0: return "Cancelled"
      case 1: return "New"
      case 2: return "Paid"
      case 4: return "Awaiting Approval"
      case 7: return "Approved"
      case 8: return "Rejected"
      case 9: return "Modified"
      default: return "Unknown"
    }
  }

  const getStatusColor = (status?: number) => {
    switch (status) {
      case 1: return "bg-orange-50 text-orange-700"
      case 2: return "bg-green-50 text-green-700"
      case 4: return "bg-yellow-50 text-yellow-700"
      case 7: return "bg-blue-50 text-blue-700"
      case 0: return "bg-red-50 text-red-700"
      default: return "bg-gray-50 text-gray-700"
    }
  }

  if (!orderId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-2xl">
            Order Details #{orderId}
          </DialogTitle>
          {order && (
            <button
              onClick={handlePrint}
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors mr-8"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span style={{ fontFamily: 'Albert Sans' }} className="ml-3 text-gray-600">Loading order details...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p style={{ fontFamily: 'Albert Sans' }} className="text-red-600 mb-2">{error}</p>
            <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-500">Order ID: {orderId}</p>
            <Button
              onClick={fetchOrderDetails}
              className="mt-4"
              variant="outline"
              style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
            >
              Retry
            </Button>
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Order Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.order_status)}`}>
                  {getStatusText(order.order_status)}
                </span>
                {order.is_completed === 1 && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700">
                    Completed
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Products Table */}
              <div className="lg:col-span-2">
                <Card className="bg-white border border-gray-200">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-4 py-3 text-sm text-gray-700">
                              No.
                            </th>
                            <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-4 py-3 text-sm text-gray-700">
                              Product Name
                            </th>
                            <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-center px-4 py-3 text-sm text-gray-700">
                              Quantity
                            </th>
                            <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-4 py-3 text-sm text-gray-700">
                              Item Comments
                            </th>
                            <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-right px-4 py-3 text-sm text-gray-700">
                              Price
                            </th>
                            <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-right px-4 py-3 text-sm text-gray-700">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.order_products && order.order_products.length > 0 ? (
                            order.order_products.map((product, index) => (
                              <tr key={product.order_product_id} className="border-b border-gray-100">
                                <td className="px-4 py-4">
                                  <span style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700">
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <div>
                                    <p style={{ fontFamily: 'Albert Sans' }} className="text-sm font-medium text-gray-900">
                                      {product.product_name}
                                    </p>
                                    {product.product_description && (
                                      <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500 mt-1">
                                        {product.product_description}
                                      </p>
                                    )}
                                    {product.options && product.options.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-600 font-medium">
                                          Options:
                                        </p>
                                        {product.options.map((option, optIdx) => (
                                          <div key={optIdx} style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-600 ml-2">
                                            {option.option_name}: {option.option_value} (Qty: {option.option_quantity}, ${Number(option.option_price).toFixed(2)})
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {product.product_comment && (
                                      <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500 mt-1 italic">
                                        Note: {product.product_comment}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <span style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-900">
                                    {product.quantity}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <span style={{ fontFamily: 'Albert Sans' }} className="text-sm font-medium text-orange-600">
                                    {product.item_comments || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <span style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-900">
                                    ${Number(product.price).toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <div>
                                    <p style={{ fontFamily: 'Albert Sans' }} className="text-sm font-medium text-gray-900">
                                      ${((Number(product.price) * Number(product.quantity)) + (product.options?.reduce((sum, o) => sum + (Number(o.option_price) * Number(o.option_quantity)), 0) || 0)).toFixed(2)}
                                    </p>
                                    {product.options && product.options.filter(o => Number(o.option_price) > 0).length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        <p style={{ fontFamily: 'Albert Sans' }} className="text-[10px] text-gray-400">Incl. options:</p>
                                        {product.options.filter(o => Number(o.option_price) > 0).map((option, optIdx) => (
                                          <div key={optIdx} style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500 ml-2">
                                            +${(Number(option.option_quantity) * Number(option.option_price)).toFixed(2)}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                <span style={{ fontFamily: 'Albert Sans' }}>No products in this order</span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700">Sub Total</span>
                          <span style={{ fontFamily: 'Albert Sans' }} className="text-sm font-medium text-gray-900">
                            ${(order.order_products?.reduce((sum, p) => {
                                const productTotal = Number(p.total) || (Number(p.price) * Number(p.quantity));
                                const optionsTotal = p.options?.reduce((optSum, o) => optSum + (Number(o.option_price) * Number(o.option_quantity)), 0) || 0;
                                return sum + productTotal + optionsTotal;
                              }, 0) || Number(order.subtotal) || 0).toFixed(2)}
                          </span>
                        </div>
                        {Number(order.wholesale_discount) > 0 && (
                          <div className="flex justify-between">
                            <span style={{ fontFamily: 'Albert Sans' }} className="text-sm text-green-600">
                              Wholesale Discount
                            </span>
                            <span style={{ fontFamily: 'Albert Sans' }} className="text-sm text-green-600">
                              -${Number(order.wholesale_discount).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {Number(order.coupon_discount) > 0 && (
                          <div className="flex justify-between">
                            <span style={{ fontFamily: 'Albert Sans' }} className="text-sm text-green-600">
                              Coupon Discount {order.coupon_code && `(${order.coupon_code})`}
                            </span>
                            <span style={{ fontFamily: 'Albert Sans' }} className="text-sm text-green-600">
                              -${Number(order.coupon_discount || 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700">Delivery Fee</span>
                          <span style={{ fontFamily: 'Albert Sans' }} className="text-sm font-medium text-gray-900">
                            ${Number(order.delivery_fee || 0).toFixed(2)}
                          </span>
                        </div>
                        {Number(order.late_fee || 0) > 0 && (
                          <div className="flex justify-between">
                            <span style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700">Late Fee</span>
                            <span style={{ fontFamily: 'Albert Sans' }} className="text-sm font-medium text-gray-900">
                              ${Number(order.late_fee || 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {(() => {
                          const productSum = order.order_products?.reduce((sum: number, p: any) => {
                            const productTotal = Number(p.total) || (Number(p.price) * Number(p.quantity));
                            const optionsTotal = p.options?.reduce((optSum: number, o: any) => optSum + (Number(o.option_price) * Number(o.option_quantity)), 0) || 0;
                            return sum + productTotal + optionsTotal;
                          }, 0) || Number(order.subtotal) || 0;
                          const wholesaleDiscountVal = Number(order.wholesale_discount || 0);
                          const couponDiscountVal = Number(order.coupon_discount || 0);
                          const netProductPrice = productSum - wholesaleDiscountVal - couponDiscountVal;
                          const gstDisplay = Math.max(0, netProductPrice) * 0.11;
                          return (
                            <div className="flex justify-between">
                              <span style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-500 italic">GST (11%) incl.</span>
                              <span style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-500 italic">
                                ${gstDisplay.toFixed(2)}
                              </span>
                            </div>
                          );
                        })()}
                        <div className="flex justify-between pt-2 border-t border-gray-300">
                          <span style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-base text-gray-900">Total <span className="text-xs font-normal text-gray-500">(Inc. GST)</span></span>
                          <span style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-base text-gray-900">
                            ${(() => {
                              const productSum = order.order_products?.reduce((sum: number, p: any) => {
                                const productTotal = Number(p.total) || (Number(p.price) * Number(p.quantity));
                                const optionsTotal = p.options?.reduce((optSum: number, o: any) => optSum + (Number(o.option_price) * Number(o.option_quantity)), 0) || 0;
                                return sum + productTotal + optionsTotal;
                              }, 0) || Number(order.subtotal) || 0;
                              const deliveryVal = Number(order.delivery_fee || 0)
                              const lateVal = Number(order.late_fee || 0)
                              const wholesaleVal = Number(order.wholesale_discount || 0)
                              const couponVal = Number(order.coupon_discount || 0)
                              return (productSum + deliveryVal + lateVal - wholesaleVal - couponVal).toFixed(2)
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Order Details */}
              <div className="space-y-4 min-w-0 overflow-hidden">
                <Card className="bg-white border border-gray-200">
                  <CardContent className="p-4">
                    <h3 style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-base font-semibold text-gray-900 mb-4">
                      Customer Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Name</p>
                        <p style={{ fontFamily: 'Albert Sans' }} className="text-sm font-medium text-gray-900">
                          {order.customer_order_name || `${order.firstname || ''} ${order.lastname || ''}`.trim() || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Email</p>
                        <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700">
                          {order.customer_order_email || order.email || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Phone</p>
                        <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700">
                          {order.customer_order_telephone || order.telephone || 'N/A'}
                        </p>
                      </div>
                      {order.company_name && (
                        <div>
                          <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Company</p>
                          <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700">
                            {order.company_name}
                          </p>
                        </div>
                      )}
                      {order.department_name && (
                        <div>
                          <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Department</p>
                          <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700">
                            {order.department_name}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <CardContent className="p-4">
                    <h3 style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-base font-semibold text-gray-900 mb-4">
                      Delivery Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Delivery Date & Time</p>
                        <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700">
                          {order.delivery_date_time
                            ? `${formatDateOnly(order.delivery_date_time)}, ${formatTimeInAU(order.delivery_date_time)}`
                            : 'N/A'}
                        </p>
                      </div>
                      {order.location_name && (
                        <div>
                          <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Location</p>
                          <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700">
                            {order.location_name}
                          </p>
                        </div>
                      )}
                      {order.delivery_address && (
                        <div>
                          <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Delivery Address</p>
                          <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700 break-words">
                            {order.delivery_address}
                          </p>
                        </div>
                      )}
                      {order.order_comments && (
                        <div>
                          <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Order Comments</p>
                          <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700">
                            {order.order_comments}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
            <span style={{ fontFamily: 'Albert Sans' }}>Order not found</span>
            {orderId && (
              <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-400 mt-2">Order ID: {orderId}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

