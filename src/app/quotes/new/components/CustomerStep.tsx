"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ValidatedInput } from "@/components/ui/validated-input"
import { ValidatedTextarea } from "@/components/ui/validated-textarea"
import { ValidationRules } from "@/lib/validation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { companiesAPI, customersAPI, locationsAPI } from "@/lib/api"
import { QuoteData } from "../page"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"
import { formatAustralianPhone, cleanPhoneNumber, getPhonePlaceholder, getPhoneValidationError } from "@/lib/phone-mask"

interface CustomerStepProps {
  data: QuoteData
  onUpdate: (data: Partial<QuoteData>) => void
  onNext: () => void
  showAddCustomerModal?: boolean
  onCloseAddCustomerModal?: () => void
  onOpenAddCustomerModal?: () => void
}

interface Company {
  company_id: number
  company_name: string
}

interface Department {
  department_id: number
  department_name: string
}

interface Customer {
  customer_id: number
  firstname: string
  lastname: string
  email: string
  telephone: string
  customer_type?: string
  company_id?: number
  department_id?: number
  archived?: boolean
  status?: number
}

interface Location {
  location_id: number
  location_name: string
}

export function CustomerStep({ data, onUpdate, onNext, showAddCustomerModal = false, onCloseAddCustomerModal, onOpenAddCustomerModal }: CustomerStepProps) {
  const queryClient = useQueryClient()
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  // Initialize with data prop values, but will sync via useEffect
  const [selectedCompany, setSelectedCompany] = useState(0)
  const [selectedDepartment, setSelectedDepartment] = useState(0)
  const [selectedCustomer, setSelectedCustomer] = useState(0)
  const [selectedLocation, setSelectedLocation] = useState(0)
  const [customerName, setCustomerName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  // Modal states
  const [showAddCustomerModalInternal, setShowAddCustomerModalInternal] = useState(false)
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false)
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false)

  // Company form state
  const [companyName, setCompanyName] = useState("")
  const [companyAbn, setCompanyAbn] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")

  // Department form state
  const [departmentName, setDepartmentName] = useState("")
  const [departmentComments, setDepartmentComments] = useState("")

  // Customer form state
  const [customerFirstname, setCustomerFirstname] = useState("")
  const [customerLastname, setCustomerLastname] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [customerType, setCustomerType] = useState("Retail")
  const [customerNotes, setCustomerNotes] = useState("")
  const [customerCostCentre, setCustomerCostCentre] = useState("")

  // Fetch companies using React Query
  const { data: companiesData, isLoading: loadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await companiesAPI.list()
      return response.data
    }
  })

  // Fetch departments when company is selected
  const { data: departmentsData, isLoading: loadingDepartments } = useQuery({
    queryKey: ['departments', selectedCompany],
    queryFn: async () => {
      console.log("Fetching departments for company:", selectedCompany)
      const response = await companiesAPI.getDepartments(selectedCompany)
      console.log("Departments loaded:", response.data)
      return response.data
    },
    enabled: selectedCompany > 0
  })

  // Always fetch ALL customers - customer is selected first, before company
  // Do NOT filter by company here, otherwise selecting company would refetch and clear the customer
  // Pass a high limit so we don't get capped by the backend's default page size (20),
  // which would otherwise hide customers that exist but fall outside the most recent 20.
  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers', 'active'],
    queryFn: async () => {
      // Only fetch active (non-deleted/non-archived) customers
      const response = await customersAPI.list({ limit: 1000, archived: 'false' })
      return response.data
    },
  })

  // Fetch locations
  const { data: locationsData, isLoading: loadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await locationsAPI.list({ limit: 100 })
      return response.data
    }
  })

  const companies = [...(companiesData?.companies || [])].sort((a, b) => 
    a.company_name.localeCompare(b.company_name)
  )
  const departments = [...(departmentsData?.departments || [])].sort((a, b) => 
    a.department_name.localeCompare(b.department_name)
  )
  const customers = [...(customersData?.customers || [])]
    // Defensive client-side guard: never show deleted/archived customers
    .filter((c: Customer) => !c.archived)
    .sort((a, b) => 
      a.firstname.localeCompare(b.firstname) || a.lastname.localeCompare(b.lastname)
    )
  const locations = [...(locationsData?.locations || [])].sort((a, b) => 
    a.location_name.localeCompare(b.location_name)
  )

  // Get selected customer data to filter companies
  const selectedCustomerData = customers.find((c: Customer) => c.customer_id === selectedCustomer)
  const customerCompanyId = selectedCustomerData?.company_id

  // Display only the associated company if the user has one.
  // If a customer is selected but has NO company, an empty array is returned 
  // so the dropdown only shows "Select", obligating the user to use "+ Add New"
  // If NO customer is selected, no companies should show.
  const displayedCompanies = selectedCustomer > 0
    ? (customerCompanyId ? companies.filter((c: Company) => c.company_id === customerCompanyId) : [])
    : []

  // Auto-select location if only one exists
  useEffect(() => {
    if (locations.length === 1 && selectedLocation === 0 && !loadingLocations) {
      const singleLocation = locations[0]
      setSelectedLocation(singleLocation.location_id)
      onUpdate({ location_id: singleLocation.location_id })
    }
  }, [locations, selectedLocation, loadingLocations])

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await customersAPI.update(id, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      // No toast here as this is usually a background update triggered by other actions
    },
    onError: (error: any) => {
      console.error("Error updating customer:", error)
      toast.error("Failed to link customer to the new record")
    }
  })

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (companyData: any) => {
      const response = await companiesAPI.create(companyData)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success("Company added successfully!")
      setShowAddCompanyModal(false)
      
      const newCompanyId = data?.company?.company_id
      if (newCompanyId) {
        setSelectedCompany(newCompanyId)
        
        // If a customer is selected, link this new company to them
        if (selectedCustomer > 0) {
          const customer = customers.find((c: Customer) => c.customer_id === selectedCustomer)
          if (customer) {
            updateCustomerMutation.mutate({
              id: selectedCustomer,
              data: {
                ...customer,
                company_id: newCompanyId
              }
            })
          }
        }
      }
      
      // Reset form
      setCompanyName("")
      setCompanyAbn("")
      setCompanyPhone("")
      setCompanyAddress("")
    },
    onError: (error: any) => {
      console.error("Error creating company:", error)
      toast.error(error.response?.data?.message || "Failed to add company")
    },
  })

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (departmentData: any) => {
      const response = await companiesAPI.createDepartment(departmentData)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['departments', selectedCompany] })
      toast.success("Department added successfully!")
      setShowAddDepartmentModal(false)
      
      const newDeptId = data?.department?.department_id
      if (newDeptId) {
        setSelectedDepartment(newDeptId)
        
        // If a customer is selected, link this new department to them
        if (selectedCustomer > 0) {
          const customer = customers.find((c: Customer) => c.customer_id === selectedCustomer)
          if (customer) {
            updateCustomerMutation.mutate({
              id: selectedCustomer,
              data: {
                ...customer,
                company_id: selectedCompany,
                department_id: newDeptId
              }
            })
          }
        }
      }
      
      // Reset form
      setDepartmentName("")
      setDepartmentComments("")
    },
    onError: (error: any) => {
      console.error("Error creating department:", error)
      const errorMessage = error.response?.data?.message || error.message || "Failed to add department"
      toast.error(errorMessage)
    },
  })

  const handleSaveCompany = () => {
    if (!companyName.trim()) {
      toast.error("Company name is required")
      return
    }
    if (!companyPhone.trim()) {
      toast.error("Phone number is required")
      return
    }

    createCompanyMutation.mutate({
      company_name: companyName.trim(),
      company_abn: companyAbn.trim() || null,
      company_phone: cleanPhoneNumber(companyPhone),
      company_address: companyAddress.trim() || null,
      company_status: 1,
    })
  }

  const handleSaveDepartment = () => {
    if (!selectedCompany || selectedCompany === 0) {
      toast.error("Please select a company first")
      return
    }
    if (!departmentName.trim()) {
      toast.error("Department name is required")
      return
    }

    createDepartmentMutation.mutate({
      department_name: departmentName.trim(),
      company_id: selectedCompany,
      comments: departmentComments.trim() || null,
    })
  }

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const response = await customersAPI.create(customerData)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success("Customer added successfully!")
      
      // Close the modal (both internal and from props)
      setShowAddCustomerModalInternal(false)
      if (onCloseAddCustomerModal) {
        onCloseAddCustomerModal()
      }
      // Select the newly created customer
      if (data?.customer?.customer_id) {
        setSelectedCustomer(data.customer.customer_id)
        // Update customer details
        const customer = data.customer
        setCustomerName(`${customer.firstname} ${customer.lastname}`)
        setPhone(customer.telephone || "")
        setEmail(customer.email || "")
        // Update parent state
        onUpdate({
          customer_id: customer.customer_id,
          customer_name: `${customer.firstname} ${customer.lastname}`,
          customer_type: customer.customer_type || "Retail",
          phone: customer.telephone,
          email: customer.email,
          company_id: customer.company_id || selectedCompany,
          department_id: customer.department_id || selectedDepartment,
        })
      }
      // Reset form
      setCustomerFirstname("")
      setCustomerLastname("")
      setCustomerEmail("")
      setCustomerPhone("")
      setCustomerAddress("")
      setCustomerNotes("")
      setCustomerCostCentre("")
    },
    onError: (error: any) => {
      console.error("Error creating customer:", error)
      toast.error(error.response?.data?.message || "Failed to add customer")
    },
  })

  const handleSaveCustomer = () => {
    if (!customerFirstname.trim() || !customerLastname.trim()) {
      toast.error("First name and last name are required")
      return
    }

    createCustomerMutation.mutate({
      firstname: customerFirstname.trim(),
      lastname: customerLastname.trim(),
      email: customerEmail.trim() || null,
      telephone: cleanPhoneNumber(customerPhone) || null,
      customer_address: customerAddress.trim() || null,
      customer_type: customerType || "Retail",
      customer_notes: customerNotes.trim() || null,
      customer_cost_centre: customerCostCentre.trim() || null,
      company_id: selectedCompany > 0 ? selectedCompany : null,
      department_id: selectedDepartment > 0 ? selectedDepartment : null,
      status: 1,
      archived: false,
    })
  }

  // Sync with incoming data prop (for edit mode)
  // This effect ensures data is synced when it becomes available
  useEffect(() => {
    // Use a small delay to ensure data is fully loaded and avoid race conditions
    const timer = setTimeout(() => {
      // Handle company_id (can be undefined/null for customers without company)
      if (data.company_id !== undefined) {
        const newCompanyId = data.company_id || 0
        if (newCompanyId !== selectedCompany) {
          setSelectedCompany(newCompanyId)
        }
      }
      // Handle department_id (can be undefined/null for customers without department)
      if (data.department_id !== undefined) {
        const newDeptId = data.department_id || 0
        if (newDeptId !== selectedDepartment) {
          setSelectedDepartment(newDeptId)
        }
      }
      // Handle customer_id
      if (data.customer_id !== undefined) {
        const newCustomerId = data.customer_id || 0
        if (newCustomerId !== selectedCustomer) {
          setSelectedCustomer(newCustomerId)
        }
      }
      // Handle location_id
      if (data.location_id !== undefined) {
        const newLocationId = data.location_id || 0
        if (newLocationId !== selectedLocation) {
          setSelectedLocation(newLocationId)
        }
      }
      // Handle customer_name
      if (data.customer_name !== undefined) {
        const newCustomerName = data.customer_name || ''
        if (newCustomerName !== customerName) {
          setCustomerName(newCustomerName)
        }
      }
      // Handle phone
      if (data.phone !== undefined) {
        const newPhone = data.phone || ''
        if (newPhone !== phone) {
          setPhone(newPhone)
        }
      }
      // Handle email
      if (data.email !== undefined) {
        const newEmail = data.email || ''
        if (newEmail !== email) {
          setEmail(newEmail)
        }
      }
    }, 50) // Small delay to ensure data is ready

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.company_id, data.department_id, data.customer_id, data.location_id, data.customer_name, data.phone, data.email])

  // Mark initial load as complete once we have all the data loaded
  useEffect(() => {
    if (isInitialLoad) {
      // Check if we have valid data (either from props or state)
      const hasDataFromProps = (data.company_id !== undefined && data.company_id !== null) ||
        (data.customer_id !== undefined && data.customer_id !== null) ||
        (data.location_id !== undefined && data.location_id !== null)

      const hasDataFromState = selectedCompany > 0 || selectedCustomer > 0 || selectedLocation > 0

      // Wait for all queries to finish loading
      const allLoaded = !loadingDepartments && !loadingCustomers && !loadingCompanies && !loadingLocations

      if ((hasDataFromProps || hasDataFromState) && allLoaded) {
        // Add a delay to ensure everything is rendered and synced
        const timer = setTimeout(() => {
          setIsInitialLoad(false)
        }, 200) // Increased delay to ensure data is fully synced
        return () => clearTimeout(timer)
      } else if (!hasDataFromProps && !hasDataFromState && allLoaded) {
        // No initial data, but all queries loaded - mark as loaded
        const timer = setTimeout(() => {
          setIsInitialLoad(false)
        }, 100)
        return () => clearTimeout(timer)
      }
    }
  }, [isInitialLoad, selectedCompany, selectedCustomer, selectedLocation, loadingDepartments, loadingCustomers, loadingCompanies, loadingLocations, data.company_id, data.customer_id, data.location_id])

  // Reset department when company changes manually (not during initial load)
  // Customer is selected first now, so we don't reset customer here
  const handleCompanyChange = (companyId: number) => {
    setSelectedCompany(companyId)
    if (!isInitialLoad) {
      setSelectedDepartment(0)
    }
  }

  // Update customer details when customer is selected manually
  const handleCustomerChange = (customerId: number) => {
    setSelectedCustomer(customerId)
    if (!isInitialLoad && customerId > 0) {
      const customer = customers.find((c: Customer) => c.customer_id === customerId)
      if (customer) {
        setCustomerName(`${customer.firstname} ${customer.lastname}`)
        setPhone(customer.telephone || "")
        setEmail(customer.email || "")

        // Update customer_type and company details immediately when customer is selected
        onUpdate({
          customer_id: customerId,
          customer_name: `${customer.firstname} ${customer.lastname}`,
          customer_type: customer.customer_type || "Retail",
          phone: customer.telephone || "",
          email: customer.email || "",
          company_id: customer.company_id || undefined,
          department_id: customer.department_id || undefined,
        })
      }
    } else if (customerId === 0) {
      // Clear data when deselected
      setCustomerName("")
      setPhone("")
      setEmail("")
      setSelectedCompany(0)
      setSelectedDepartment(0)
    }
  }

  const handleProceed = () => {
    // Validation - Company and Department are now optional
    if (!selectedCustomer || selectedCustomer === 0) {
      toast.error("Please select a customer")
      return
    }

    if (!selectedLocation || selectedLocation === 0) {
      toast.error("Please select a location")
      return
    }

    if (!phone || !email) {
      toast.error("Phone and email are required")
      return
    }

    // Update parent state with all customer data
    // Company and department are optional - only include if selected
    const customer = customers.find((c: Customer) => c.customer_id === selectedCustomer)
    onUpdate({
      company_id: selectedCompany > 0 ? selectedCompany : undefined,
      department_id: selectedDepartment > 0 ? selectedDepartment : undefined,
      customer_id: selectedCustomer,
      location_id: selectedLocation,
      customer_name: customerName,
      customer_type: customer?.customer_type || "Retail",
      phone,
      email,
    })

    toast.success("Customer details saved")
    onNext()
  }

  return (
    <Card className="p-4 sm:p-8 bg-white border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}>
          Enter Customer Details
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Customer Name */}
        <div className="space-y-2">
          <Label htmlFor="customer" className="text-sm font-medium text-gray-700">
            Customer Name <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <SearchableSelect
              id="customer"
              value={selectedCustomer ? selectedCustomer.toString() : ""}
              onValueChange={(value) => handleCustomerChange(Number(value))}
              disabled={loadingCustomers}
              loading={loadingCustomers}
              placeholder="Enter"
              searchPlaceholder="Search customer..."
              emptyText="No customers found"
              className="flex-1"
              options={customers.map((customer: Customer) => ({
                value: customer.customer_id.toString(),
                label: `${customer.firstname} ${customer.lastname}`,
              }))}
            />
            <button
              type="button"
              onClick={() => setShowAddCustomerModalInternal(true)}
              style={{ fontFamily: 'Albert Sans', fontWeight: 600, cursor: 'pointer' }}
              className="flex items-center justify-center gap-1 px-3 h-11 rounded-md border border-gray-300 text-[#C62828] hover:bg-gray-50 bg-white text-sm whitespace-nowrap min-w-[44px]"
              title="Add New"
            >
              <span className="text-lg leading-none">+</span>
              <span className="hidden sm:inline">Add New</span>
            </button>
          </div>
        </div>

        {/* Company */}
        <div className="space-y-2">
          <Label htmlFor="company" className="text-sm font-medium text-gray-700">
            Company
          </Label>
          <div className="flex gap-2">
            <SearchableSelect
              id="company"
              value={selectedCompany ? selectedCompany.toString() : ""}
              onValueChange={(value) => handleCompanyChange(Number(value))}
              disabled={loadingCompanies || (selectedCustomer > 0 && displayedCompanies.length === 0)}
              loading={loadingCompanies}
              placeholder="Select"
              searchPlaceholder="Search company..."
              emptyText="No companies found"
              className="flex-1"
              options={displayedCompanies.map((company: Company) => ({
                value: company.company_id.toString(),
                label: company.company_name,
              }))}
            />
            <button
              type="button"
              onClick={() => setShowAddCompanyModal(true)}
              style={{ fontFamily: 'Albert Sans', fontWeight: 600, cursor: 'pointer' }}
              className="flex items-center gap-1 px-3 h-11 rounded-md border border-gray-300 text-[#C62828] hover:bg-gray-50 bg-white text-sm whitespace-nowrap"
            >
              <span className="text-lg leading-none">+</span>
              Add New
            </button>
          </div>
        </div>

        {/* Department */}
        <div className="space-y-2">
          <Label htmlFor="department" className="text-sm font-medium text-gray-700">
            Department
          </Label>
          <div className="flex gap-2">
            <Select
              value={selectedDepartment.toString()}
              onValueChange={(value) => setSelectedDepartment(Number(value))}
              disabled={loadingDepartments}
            >
              <SelectTrigger 
                id="department"
                className="flex-1 h-11 border-gray-300 bg-white"
                style={{ fontFamily: 'Albert Sans' }}
              >
                <SelectValue placeholder={loadingDepartments ? "Loading..." : "Select"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Select</SelectItem>
                {departments.map((dept: Department) => (
                  <SelectItem key={dept.department_id} value={dept.department_id.toString()}>
                    {dept.department_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => setShowAddDepartmentModal(true)}
              style={{ fontFamily: 'Albert Sans', fontWeight: 600, cursor: 'pointer' }}
              className="flex items-center gap-1 px-3 h-11 rounded-md border border-gray-300 text-[#C62828] hover:bg-gray-50 bg-white text-sm whitespace-nowrap"
            >
              <span className="text-lg leading-none">+</span>
              Add New
            </button>
          </div>
        </div>

        {/* Phone Number */}
        <ValidatedInput
          label="Phone Number *"
          type="tel"
          placeholder={getPhonePlaceholder()}
          value={phone}
          validationRule={ValidationRules.customer.telephone}
          fieldName="Phone Number"
          disabled={selectedCustomer === 0}
          onChange={(value, isValid) => {
            const previousValue = phone
            const formatted = formatAustralianPhone(value, previousValue)
            setPhone(formatted)
          }}
          className="h-11 border-gray-300"
        />

        {/* Email */}
        <ValidatedInput
          label="Email *"
          type="email"
          placeholder="Enter"
          value={email}
          validationRule={ValidationRules.customer.email}
          fieldName="Email"
          disabled={selectedCustomer === 0}
          onChange={(value) => setEmail(value)}
          className="h-11 border-gray-300"
        />

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium text-gray-700">
            Kitchen Location <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedLocation.toString()}
            onValueChange={(value) => setSelectedLocation(Number(value))}
            disabled={loadingLocations || selectedCustomer === 0}
          >
            <SelectTrigger 
              id="location"
              className="h-11 border-gray-300 bg-white"
              style={{ fontFamily: 'Albert Sans' }}
            >
              <SelectValue placeholder={loadingLocations ? "Loading..." : "Enter"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Enter</SelectItem>
              {locations.map((loc: Location) => (
                <SelectItem key={loc.location_id} value={loc.location_id.toString()}>
                  {loc.location_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Proceed Button */}
      <div className="flex justify-center sm:justify-end mt-8">
        <Button
          onClick={handleProceed}
          className="bg-[#C62828] hover:bg-[#B71C1C] text-white px-8 py-2 rounded-full"
          style={{
            fontFamily: 'Albert Sans',
            fontWeight: 600,
            height: '50px',
            minWidth: '196px'
          }}
        >
          Proceed
        </Button>
      </div>

      {/* Add Company Modal */}
      <Dialog open={showAddCompanyModal} onOpenChange={(open) => {
        if (!open) {
          // Blur active element to prevent validation on blur
          if (document.activeElement && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
        }
        setShowAddCompanyModal(open)
      }}>
        <DialogContent className="max-w-md" style={{ fontFamily: 'Albert Sans' }}>
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#FFEBEE] mx-auto mb-4">
              <Plus className="h-6 w-6 text-[#C62828]" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold">
              Add Company
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Company Name */}
            <ValidatedInput
              label="Company Name"
              placeholder="Name"
              value={companyName}
              validationRule={ValidationRules.company.company_name}
              fieldName="Company Name"
              onChange={(value) => setCompanyName(value)}
              className="h-11 border-gray-300"
            />

            {/* ABN */}
            <ValidatedInput
              label="ABN"
              placeholder="Enter ABN (11 digits)"
              value={companyAbn}
              validationRule={ValidationRules.company.company_abn}
              fieldName="ABN"
              onChange={(value) => setCompanyAbn(value)}
              className="h-11 border-gray-300"
            />

            {/* Phone */}
            <ValidatedInput
              label="Phone"
              type="tel"
              placeholder={getPhonePlaceholder()}
              value={companyPhone}
              validationRule={ValidationRules.company.company_phone}
              fieldName="Phone"
              onChange={(value, isValid) => {
                const previousValue = companyPhone
                const formatted = formatAustralianPhone(value, previousValue)
                setCompanyPhone(formatted)
              }}
              className="h-11 border-gray-300"
            />

            {/* Address */}
            <ValidatedTextarea
              label="Address"
              placeholder="Enter address"
              value={companyAddress}
              validationRule={ValidationRules.company.company_address}
              fieldName="Address"
              onChange={(value) => setCompanyAddress(value)}
              rows={3}
              className="border-gray-300 resize-none"
            />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowAddCompanyModal(false)
                  setCompanyName("")
                  setCompanyAbn("")
                  setCompanyPhone("")
                  setCompanyAddress("")
                }}
                variant="outline"
                className="flex-1 border-gray-300"
                disabled={createCompanyMutation.isPending}
                style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCompany}
                disabled={createCompanyMutation.isPending}
                className="flex-1 bg-[#C62828] hover:bg-[#B71C1C] text-white"
                style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              >
                {createCompanyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                    Saving...
                  </>
                ) : (
                  'Add'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Department Modal */}
      <Dialog open={showAddDepartmentModal} onOpenChange={(open) => {
        if (!open) {
          // Blur active element to prevent validation on blur
          if (document.activeElement && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
        }
        setShowAddDepartmentModal(open)
      }}>
        <DialogContent className="max-w-md" style={{ fontFamily: 'Albert Sans' }}>
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#FFEBEE] mx-auto mb-4">
              <Plus className="h-6 w-6 text-[#C62828]" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold">
              Add Department
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Company Info (read-only) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Company
              </Label>
              <Input
                value={companies.find((c: Company) => c.company_id === selectedCompany)?.company_name || "No company selected"}
                disabled
                className="h-11 border-gray-300 bg-gray-100"
                style={{ fontFamily: 'Albert Sans' }}
              />
              {selectedCompany === 0 && (
                <p className="text-xs text-red-500">Please select a company first</p>
              )}
            </div>

            {/* Department Name */}
            <ValidatedInput
              label="Department Name"
              placeholder="Enter department name"
              value={departmentName}
              validationRule={ValidationRules.department.department_name}
              fieldName="Department Name"
              onChange={(value) => setDepartmentName(value)}
              className="h-11 border-gray-300"
            />

            {/* Comments */}
            <ValidatedTextarea
              label="Comments"
              placeholder="Enter comments (optional)"
              value={departmentComments}
              validationRule={ValidationRules.department.department_comments}
              fieldName="Comments"
              onChange={(value) => setDepartmentComments(value)}
              rows={3}
              className="border-gray-300 resize-none"
            />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowAddDepartmentModal(false)
                  setDepartmentName("")
                  setDepartmentComments("")
                }}
                variant="outline"
                className="flex-1 border-gray-300"
                disabled={createDepartmentMutation.isPending}
                style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDepartment}
                disabled={createDepartmentMutation.isPending || selectedCompany === 0}
                className="flex-1 bg-[#C62828] hover:bg-[#B71C1C] text-white disabled:opacity-50"
                style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              >
                {createDepartmentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                    Saving...
                  </>
                ) : (
                  'Add'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Customer Modal */}
      <Dialog open={showAddCustomerModal || showAddCustomerModalInternal} onOpenChange={(open) => {
        if (!open) {
          // Blur active element to prevent validation on blur
          if (document.activeElement && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
          setShowAddCustomerModalInternal(false)
          if (onCloseAddCustomerModal) {
            onCloseAddCustomerModal()
          }
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ fontFamily: 'Albert Sans' }}>
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#FFEBEE] mx-auto mb-4">
              <Plus className="h-6 w-6 text-[#C62828]" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold">
              Add Customer
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <ValidatedInput
                label="First Name"
                placeholder="Enter first name"
                value={customerFirstname}
                validationRule={ValidationRules.customer.firstname}
                fieldName="First Name"
                onChange={(value) => setCustomerFirstname(value)}
                className="h-11 border-gray-300"
              />

              {/* Last Name */}
              <ValidatedInput
                label="Last Name"
                placeholder="Enter last name"
                value={customerLastname}
                validationRule={ValidationRules.customer.lastname}
                fieldName="Last Name"
                onChange={(value) => setCustomerLastname(value)}
                className="h-11 border-gray-300"
              />

              {/* Email */}
              <ValidatedInput
                label="Email"
                type="email"
                placeholder="Enter email"
                value={customerEmail}
                validationRule={ValidationRules.customer.email}
                fieldName="Email"
                onChange={(value) => setCustomerEmail(value)}
                className="h-11 border-gray-300"
              />

              {/* Phone */}
              <ValidatedInput
                label="Phone"
                type="tel"
                placeholder={getPhonePlaceholder()}
                value={customerPhone}
                validationRule={ValidationRules.customer.telephone}
                fieldName="Phone"
                onChange={(value, isValid) => {
                  const previousValue = customerPhone
                  const formatted = formatAustralianPhone(value, previousValue)
                  setCustomerPhone(formatted)
                }}
                className="h-11 border-gray-300"
              />

              {/* Customer Type */}
              <div className="space-y-2">
                <Label htmlFor="customerType" className="text-sm font-medium text-gray-700">
                  Customer Type
                </Label>
                <select
                  id="customerType"
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C62828] focus:border-transparent"
                  style={{ fontFamily: 'Albert Sans' }}
                >
                  <option value="Retail">Retail</option>
                  {/* Wholesale options hidden for kj3 */}
                  {false && (
                    <>
                      <option value="Full Service Wholesale">Full Service Wholesale</option>
                      <option value="Partial Service Wholesale">Partial Service Wholesale</option>
                    </>
                  )}
                </select>
              </div>

              {/* Cost Centre */}
              <ValidatedInput
                label="Cost Centre"
                placeholder="Enter cost centre"
                value={customerCostCentre}
                validationRule={ValidationRules.customer.customer_cost_centre}
                fieldName="Cost Centre"
                onChange={(value) => setCustomerCostCentre(value)}
                className="h-11 border-gray-300"
              />
            </div>

            {/* Billing Address */}
            <ValidatedTextarea
              label="Billing Address"
              placeholder="Enter billing address"
              value={customerAddress}
              validationRule={ValidationRules.customer.customer_address}
              fieldName="Billing Address"
              onChange={(value) => setCustomerAddress(value)}
              rows={3}
              className="border-gray-300 resize-none"
            />

            {/* Notes */}
            <ValidatedTextarea
              label="Notes"
              placeholder="Enter additional notes"
              value={customerNotes}
              validationRule={ValidationRules.customer.customer_notes}
              fieldName="Notes"
              onChange={(value) => setCustomerNotes(value)}
              rows={3}
              className="border-gray-300 resize-none"
            />

            {/* Company/Department Info */}
            {selectedCompany > 0 && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Company:</span> {companies.find((c: Company) => c.company_id === selectedCompany)?.company_name || "N/A"}
                  {selectedDepartment > 0 && (
                    <>
                      {" | "}
                      <span className="font-medium">Department:</span> {departments.find((d: Department) => d.department_id === selectedDepartment)?.department_name || "N/A"}
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Customer will be associated with the selected company and department
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  if (onCloseAddCustomerModal) {
                    onCloseAddCustomerModal()
                  }
                  setCustomerFirstname("")
                  setCustomerLastname("")
                  setCustomerEmail("")
                  setCustomerPhone("")
                  setCustomerAddress("")
                  setCustomerNotes("")
                  setCustomerCostCentre("")
                }}
                variant="outline"
                className="flex-1 border-gray-300"
                disabled={createCustomerMutation.isPending}
                style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCustomer}
                disabled={createCustomerMutation.isPending}
                className="flex-1 bg-[#C62828] hover:bg-[#B71C1C] text-white"
                style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              >
                {createCustomerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                    Saving...
                  </>
                ) : (
                  'Add Customer'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

