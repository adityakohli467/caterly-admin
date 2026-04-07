"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Calendar, Mail, Printer, MapPin, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { printTableData } from "@/lib/print-utils"

interface ReminderOrder {
  order_id: string
  customer_name: string
  company: string
  email: string
  delivery_date: string
  mail_status: "Sent" | "Not Sent"
}

const sampleReminderOrders: ReminderOrder[] = [
  {
    order_id: "#150",
    customer_name: "John Doe",
    company: "Airtel Vodafone",
    email: "jondoe@gmail.com",
    delivery_date: "06-08-2024",
    mail_status: "Not Sent"
  },
  {
    order_id: "#150",
    customer_name: "John Doe",
    company: "Airtel Vodafone",
    email: "jondoe@gmail.com",
    delivery_date: "06-08-2024",
    mail_status: "Sent"
  },
  {
    order_id: "#150",
    customer_name: "John Doe",
    company: "Airtel Vodafone",
    email: "jondoe@gmail.com",
    delivery_date: "06-08-2024",
    mail_status: "Not Sent"
  },
  {
    order_id: "#150",
    customer_name: "John Doe",
    company: "Airtel Vodafone",
    email: "jondoe@gmail.com",
    delivery_date: "06-08-2024",
    mail_status: "Sent"
  },
  {
    order_id: "#150",
    customer_name: "John Doe",
    company: "Airtel Vodafone",
    email: "jondoe@gmail.com",
    delivery_date: "06-08-2024",
    mail_status: "Not Sent"
  },
  {
    order_id: "#150",
    customer_name: "John Doe",
    company: "Airtel Vodafone",
    email: "jondoe@gmail.com",
    delivery_date: "06-08-2024",
    mail_status: "Sent"
  },
  {
    order_id: "#150",
    customer_name: "John Doe",
    company: "Airtel Vodafone",
    email: "jondoe@gmail.com",
    delivery_date: "06-08-2024",
    mail_status: "Not Sent"
  },
  {
    order_id: "#150",
    customer_name: "John Doe",
    company: "Airtel Vodafone",
    email: "jondoe@gmail.com",
    delivery_date: "06-08-2024",
    mail_status: "Sent"
  },
]

const locationTabs = [
  { id: "box-hill", name: "Box Hill" },
  { id: "green-ville", name: "Green Ville" },
  { id: "maroondah", name: "Maroondah" },
  { id: "box-hill-2", name: "Box Hill" },
  { id: "box-hill-3", name: "Box Hill" },
]

export default function ReminderOrdersPage() {
  const [activeMainTab, setActiveMainTab] = useState<"past" | "future" | "reminder">("reminder")
  const [activeLocationTab, setActiveLocationTab] = useState("maroondah")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDate, setSelectedDate] = useState("06-08-2024")
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  const orders = sampleReminderOrders

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map(order => order.order_id))
    } else {
      setSelectedOrders([])
    }
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId])
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
    }
  }

  const handleSendReminderEmail = () => {
    console.log("Sending reminder email to selected orders:", selectedOrders)
    setShowSuccessMessage(true)
    setTimeout(() => {
      setShowSuccessMessage(false)
    }, 3000)
  }

  const handleSendIndividualEmail = (orderId: string) => {
    console.log("Sending reminder email to order:", orderId)
    setShowSuccessMessage(true)
    setTimeout(() => {
      setShowSuccessMessage(false)
    }, 3000)
  }

  return (
    <div className="bg-gray-50 min-h-screen w-full max-w-full overflow-x-hidden" style={{ fontFamily: 'Albert Sans' }}>
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Reminder Email successfully sent!</span>
        </div>
      )}

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
          Reminder Orders
        </h1>
        <Button 
          onClick={() => printTableData("Reminder Orders")}
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

      {/* Main Tabs */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveMainTab("past")}
          className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
            activeMainTab === "past"
              ? "bg-[#FFEBEE] text-[#C62828] border-2 border-[#C62828] shadow-sm"
              : "bg-white text-gray-600 border-2 border-gray-100 hover:border-gray-200"
          }`}
        >
          Past Orders
        </button>
        <button
          onClick={() => setActiveMainTab("future")}
          className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
            activeMainTab === "future"
              ? "bg-[#FFEBEE] text-[#C62828] border-2 border-[#C62828] shadow-sm"
              : "bg-white text-gray-600 border-2 border-gray-100 hover:border-gray-200"
          }`}
        >
          Future Orders
        </button>
        <button
          onClick={() => setActiveMainTab("reminder")}
          className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
            activeMainTab === "reminder"
              ? "bg-[#FFEBEE] text-[#C62828] border-2 border-[#C62828] shadow-sm"
              : "bg-white text-gray-600 border-2 border-gray-100 hover:border-gray-200"
          }`}
        >
          Reminder Orders
        </button>
      </div>

      {/* Search, Date Filter, Clear, and Send Email */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8 items-stretch">
        <div className="lg:col-span-5 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search Order ID, Customer ID, Status etc."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[54px] border border-gray-200 bg-white rounded-full focus:ring-2 focus:ring-[#C62828] focus:border-[#C62828] focus:outline-none transition-all shadow-sm"
            style={{ fontFamily: 'Albert Sans', paddingLeft: '44px' }}
          />
        </div>
        <div className="lg:col-span-2 relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full h-[54px] border border-gray-200 bg-white rounded-full focus:ring-2 focus:ring-[#C62828] focus:border-[#C62828] focus:outline-none transition-all shadow-sm pl-10"
            style={{ fontFamily: 'Albert Sans' }}
          />
        </div>
        <div className="lg:col-span-2">
          <Button 
            variant="ghost" 
            className="w-full h-[54px] rounded-full text-[#C62828] hover:bg-red-50 hover:text-[#B71C1C] transition-colors"
            style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
          >
            Clear Filters
          </Button>
        </div>
        <div className="lg:col-span-3">
          <Button 
            onClick={handleSendReminderEmail}
            disabled={selectedOrders.length === 0}
            className="w-full h-[54px] bg-[#C62828] hover:bg-[#B71C1C] text-white gap-2 rounded-full shadow-lg hover:shadow-red-900/20 disabled:bg-gray-300 disabled:shadow-none transition-all"
            style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
          >
            <Mail className="h-5 w-5" />
            Send Reminder Email
          </Button>
        </div>
      </div>

      {/* Location Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap border-b border-gray-100">
        {locationTabs.map((location: any) => (
          <button
            key={location.id}
            onClick={() => setActiveLocationTab(location.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all relative ${
              activeLocationTab === location.id
                ? "text-[#C62828]"
                : "text-gray-400 hover:text-gray-600"
            }`}
            style={{ fontFamily: 'Albert Sans' }}
          >
            <MapPin className={`h-4 w-4 ${activeLocationTab === location.id ? "text-[#C62828]" : "text-gray-400"}`} />
            {location.name}
            {activeLocationTab === location.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#C62828] rounded-t-full"></div>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="border-none shadow-md overflow-hidden rounded-2xl bg-white mb-8">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-left w-10">
                  <Checkbox
                    checked={orders.length > 0 && selectedOrders.length === orders.length}
                    onCheckedChange={handleSelectAll}
                    className="border-gray-300 data-[state=checked]:bg-[#C62828] data-[state=checked]:border-[#C62828]"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Order ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Customer Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Delivery Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Mail Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Albert Sans' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <tr key={`${order.order_id}-${index}`} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <Checkbox
                      checked={selectedOrders.includes(order.order_id)}
                      onCheckedChange={(checked) => handleSelectOrder(order.order_id, checked as boolean)}
                      className="border-gray-300 data-[state=checked]:bg-[#C62828] data-[state=checked]:border-[#C62828]"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#C62828] font-bold cursor-pointer hover:underline" style={{ fontFamily: 'Albert Sans' }}>
                      {order.order_id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Albert Sans' }}>
                      {order.customer_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Albert Sans' }}>
                      {order.company}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 font-medium" style={{ fontFamily: 'Albert Sans' }}>
                      {order.email}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 font-medium" style={{ fontFamily: 'Albert Sans' }}>
                      {order.delivery_date}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {order.mail_status === "Sent" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold ring-1 ring-inset ring-green-600/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold ring-1 ring-inset ring-amber-600/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        Not Sent
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleSendIndividualEmail(order.order_id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C62828] hover:text-[#B71C1C] transition-colors"
                      style={{ fontFamily: 'Albert Sans' }}
                    >
                      <Mail className="h-4 w-4" />
                      Send Reminder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <p className="text-sm font-medium text-gray-500" style={{ fontFamily: 'Albert Sans' }}>
          Showing 1 - {orders.length} of {orders.length} Entries
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 px-4 h-9">
            Previous
          </Button>
          <div className="flex items-center gap-1">
            <Button 
              size="sm" 
              className="w-9 h-9 rounded-lg bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold"
            >
              1
            </Button>
          </div>
          <Button variant="outline" size="sm" className="rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 px-4 h-9">
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

