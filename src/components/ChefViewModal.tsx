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
import { format } from "date-fns"
import { Loader2, ChefHat, Printer } from "lucide-react"

interface OrderProduct {
    order_product_id: number
    product_id: number
    product_name: string
    product_description?: string
    quantity: number
    price: number
    total: number
    product_comment?: string
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
    order_status?: number
    is_completed?: number
    delivery_contact?: string
    delivery_details?: string
}

interface ChefViewModalProps {
    orderId: number | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ChefViewModal({ orderId, open, onOpenChange }: ChefViewModalProps) {
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

    const handlePrint = () => {
        if (!order) return
        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        const deliveryDate = order.delivery_date_time
            ? new Date(order.delivery_date_time).toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'N/A'

        const productsHtml = (order.order_products || []).map((p: any, i: number) => `
            <tr>
                <td style="text-align:center; font-size:16px; font-weight:700">${p.quantity}</td>
                <td>
                    ${p.product_name}
                    ${p.options && p.options.length > 0 ? '<br/><small>' + p.options.map((o: any) => `${o.option_name}: ${o.option_value} (Qty: ${o.option_quantity})`).join(', ') + '</small>' : ''}
                    ${p.product_comment ? '<br/><em>Note: ' + p.product_comment + '</em>' : ''}
                </td>
            </tr>
        `).join('')

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Chef View — Order #${order.order_id}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
                        h1 { font-size: 22px; margin-bottom: 4px; }
                        .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                        th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; font-size: 13px; }
                        th { background: #f5f5f5; font-weight: 600; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
                        .info-item label { font-size: 11px; color: #888; display: block; }
                        .info-item span { font-size: 13px; }
                    </style>
                </head>
                <body>
                    <h1>Chef View — Order #${order.order_id}</h1>
                    <div class="meta">Delivery: ${deliveryDate}</div>
                    <div class="info-grid">
                        <div class="info-item"><label>Customer</label><span>${order.customer_order_name || 'N/A'}</span></div>
                        ${order.location_name ? `<div class="info-item"><label>Location</label><span>${order.location_name}</span></div>` : ''}
                        ${order.delivery_contact ? `<div class="info-item"><label>Delivery Contact</label><span>${order.delivery_contact.replace('|', ' - ')}</span></div>` : ''}
                        ${order.delivery_details ? `<div class="info-item"><label>Delivery Notes</label><span>${order.delivery_details}</span></div>` : ''}
                        ${order.order_comments ? `<div class="info-item"><label>Notes</label><span>${order.order_comments}</span></div>` : ''}
                    </div>
                    <table>
                        <thead><tr><th style="text-align:center">Qty</th><th>Product</th></tr></thead>
                        <tbody>${productsHtml}</tbody>
                    </table>
                </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.print()
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
                    <DialogTitle style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-2xl flex items-center gap-2">
                        <ChefHat className="h-6 w-6 text-orange-600" />
                        Chef View — Order #{orderId}
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Products Table — NO price/total columns */}
                            <div className="lg:col-span-2">
                                <Card className="bg-white border border-gray-200">
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-center px-4 py-3 text-sm text-gray-700 w-24">
                                                            Quantity
                                                        </th>
                                                        <th style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-left px-4 py-3 text-sm text-gray-700">
                                                            Product Name
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {order.order_products && order.order_products.length > 0 ? (
                                                        order.order_products.map((product, index) => (
                                                            <tr key={product.order_product_id} className="border-b border-gray-100">
                                                                <td className="px-4 py-4 text-center">
                                                                    <span style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-lg text-gray-900">
                                                                        {product.quantity}
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
                                                                                        {option.option_name}: {option.option_value} (Qty: {option.option_quantity})
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
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                                                                <span style={{ fontFamily: 'Albert Sans' }}>No products in this order</span>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* No totals section for chef view */}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right: Customer & Delivery Details */}
                            <div className="space-y-4">
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

                                <Card className="bg-white border border-gray-200">
                                    <CardContent className="p-4">
                                        <h3 style={{ fontFamily: 'Albert Sans', fontWeight: 600 }} className="text-base font-semibold text-gray-900 mb-4">
                                            Delivery Details
                                        </h3>
                                        <div className="space-y-3">
                                            <div>
                                                <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Delivery Date &amp; Time</p>
                                                <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700">
                                                    {order.delivery_date_time
                                                        ? format(new Date(order.delivery_date_time), 'dd MMM, yyyy HH:mm')
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
                                                <div className="min-w-0">
                                                    <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Delivery Address</p>
                                                    <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                                                        {order.delivery_address}
                                                    </p>
                                                </div>
                                            )}
                                            {order.delivery_contact && (
                                                <div className="min-w-0">
                                                    <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Delivery Contact</p>
                                                    <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                                                        {order.delivery_contact.replace('|', ' - ')}
                                                    </p>
                                                </div>
                                            )}
                                            {order.delivery_details && (
                                                <div className="min-w-0">
                                                    <p style={{ fontFamily: 'Albert Sans' }} className="text-xs text-gray-500">Delivery Notes</p>
                                                    <p style={{ fontFamily: 'Albert Sans' }} className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                                                        {order.delivery_details}
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
