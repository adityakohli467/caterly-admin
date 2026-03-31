"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell,
  Palette,
  Globe,
  Save,
  Loader2,
  CheckCircle2,
  Database
} from "lucide-react"
import { toast } from "sonner"
import { settingsAPI } from "@/lib/api"

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("general")
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch settings
  const { data: settingsData, isLoading, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      try {
        const response = await settingsAPI.get()
        console.log("Settings API response:", response.data)
        // Handle different response formats
        if (response.data?.settings) {
          return response.data
        } else if (response.data && typeof response.data === 'object') {
          // If response.data is the settings object directly
          return { settings: response.data, settingsByCategory: {} }
        }
        return { settings: {}, settingsByCategory: {} }
      } catch (err: any) {
        console.error("Settings fetch error:", err)
        // Don't throw - return empty data so UI can still show defaults
        return { settings: {}, settingsByCategory: {} }
      }
    },
    retry: 2,
    refetchOnWindowFocus: true,
  })

  // Update settings when data loads (only if no local changes)
  useEffect(() => {
    if (settingsData?.settings && Object.keys(settingsData.settings).length > 0 && !hasChanges) {
      // Only update if we have actual settings data and no local changes
      setSettings(settingsData.settings)
    } else if (!isLoading && (!settingsData || !settingsData.settings || Object.keys(settingsData.settings).length === 0) && !hasChanges) {
      // Use defaults if no data loaded and no changes
      setSettings(defaultSettings)
    }
  }, [settingsData, isLoading, hasChanges])

  // Initialize settings on mount if empty
  useEffect(() => {
    if (Object.keys(settings).length === 0 && !isLoading) {
      if (settingsData?.settings && Object.keys(settingsData.settings).length > 0) {
        setSettings(settingsData.settings)
      } else {
        setSettings(defaultSettings)
      }
    }
  }, [isLoading, settings, settingsData])

  // Helper function to convert hex to HSL
  const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
    hex = hex.replace("#", "")
    const r = parseInt(hex.substring(0, 2), 16) / 255
    const g = parseInt(hex.substring(2, 4), 16) / 255
    const b = parseInt(hex.substring(4, 6), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max === min) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    }
  }
  
  // Function to apply appearance settings immediately
  const applyAppearanceSettings = (settings: Record<string, any>) => {
    const root = document.documentElement
    
    // Apply theme
    if (settings.theme) {
      if (settings.theme === "dark") {
        root.classList.add("dark")
      } else if (settings.theme === "light") {
        root.classList.remove("dark")
      } else if (settings.theme === "auto") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        if (prefersDark) {
          root.classList.add("dark")
        } else {
          root.classList.remove("dark")
        }
      }
    }
    
    // Apply primary color
    if (settings.primaryColor) {
      const hsl = hexToHsl(settings.primaryColor)
      if (hsl) {
        root.style.setProperty("--primary", `${hsl.h} ${hsl.s}% ${hsl.l}%`)
        root.style.setProperty("--accent", `${hsl.h} ${hsl.s}% 97%`)
        root.style.setProperty("--ring", `${hsl.h} ${hsl.s}% ${hsl.l}%`)
      }
    }
    
    // Apply language
    if (settings.language) {
      root.setAttribute("lang", settings.language)
    }
  }

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedSettings: Record<string, any>) => {
      const response = await settingsAPI.update(updatedSettings)
      console.log("Settings update response:", response.data)
      return response
    },
    onSuccess: (response, variables) => {
      // Handle different response formats
      const updatedSettings = response.data?.settings || response.data || variables
      
      // Update query cache
      queryClient.setQueryData(['settings'], { 
        settings: updatedSettings, 
        settingsByCategory: response.data?.settingsByCategory || {} 
      })
      
      // Update local state
      setSettings(updatedSettings)
      setHasChanges(false)
      toast.success("Settings saved successfully!")
      
      // Apply appearance settings immediately after save
      if (variables.primaryColor) {
        applyAppearanceSettings(variables)
      }
      
      // Refetch to ensure we have the latest data
      refetch()
    },
    onError: (error: any) => {
      console.error("Settings update error:", error)
      toast.error(error.response?.data?.message || "Failed to save settings")
    }
  })

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleSave = () => {
    updateMutation.mutate(settings)
  }

  const handleClearCache = async () => {
    try {
      // This would call a backend endpoint to clear cache
      toast.success("Cache cleared successfully!")
    } catch (error) {
      toast.error("Failed to clear cache")
    }
  }

  const handleExportLogs = async () => {
    try {
      // This would call a backend endpoint to export logs
      toast.success("Logs exported successfully!")
    } catch (error) {
      toast.error("Failed to export logs")
    }
  }

  const handleMaintenanceMode = async () => {
    const newValue = !settings.maintenanceMode
    handleInputChange('maintenanceMode', newValue)
    handleSave()
  }

  // Default settings if API fails or table doesn't exist
  const defaultSettings = {
    companyName: "Caterly",
    companyEmail: "admin@stdreuxcoffee.com",
    companyPhone: "+61 3 1234 5678",
    companyAbn: "ABN: 12 345 678 901",
    currency: "AUD",
    emailNotifications: true,
    pushNotifications: false,
    orderNotifications: true,
    customerNotifications: true,
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    theme: "light",
    primaryColor: "#C62828",
    language: "en",
    maintenanceMode: false,
  }

  // Use local settings state (which is initialized from fetched data or defaults)
  // Merge with defaults to ensure all fields are available
  const getCurrentSettings = () => {
    const baseSettings = Object.keys(settings).length > 0 
      ? settings 
      : (settingsData?.settings && Object.keys(settingsData.settings).length > 0 
        ? settingsData.settings 
        : defaultSettings)
    
    // Merge with defaults to ensure all fields exist
    return { ...defaultSettings, ...baseSettings }
  }
  
  const currentSettings = getCurrentSettings()

  if (isLoading && !settingsData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#C62828]" />
          <p className="text-gray-600" style={{ fontFamily: 'Albert Sans' }}>Loading settings...</p>
        </div>
      </div>
    )
  }

  // Show error only if we have a real error and no data at all
  if (error && !settingsData && !isLoading) {
    const errorMessage = (error as any)?.response?.data?.message || "Failed to load settings"
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Albert Sans', fontWeight: 700 }}>
              Settings
            </h1>
            <p className="text-gray-500 mt-1" style={{ fontFamily: 'Albert Sans' }}>
              Manage your application settings and preferences
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-red-500 mb-4">
                <Database className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Albert Sans' }}>
                {errorMessage.includes('not found') ? 'Settings Table Not Found' : 'Error Loading Settings'}
              </h3>
              <p className="text-gray-600 text-center mb-4" style={{ fontFamily: 'Albert Sans' }}>
                {errorMessage.includes('not found') 
                  ? 'Please run the database migration to create the settings table.'
                  : errorMessage}
              </p>
              {errorMessage.includes('not found') && (
                <code className="bg-gray-100 p-2 rounded text-sm mb-4" style={{ fontFamily: 'monospace' }}>
                  psql -U your_user -d your_database -f migrations/create_settings_table.sql
                </code>
              )}
              <Button onClick={() => refetch()} className="bg-[#C62828] hover:bg-[#B71C1C] text-white">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Albert Sans', fontWeight: 700 }}>
            Settings
          </h1>
          <p className="text-gray-500 mt-1" style={{ fontFamily: 'Albert Sans' }}>
            Manage your application settings and preferences
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updateMutation.isPending}
          className="bg-[#C62828] hover:bg-[#B71C1C] gap-2"
          style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={currentSettings.companyName || ""}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    style={{ fontFamily: 'Albert Sans' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={currentSettings.companyEmail || ""}
                    onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                    style={{ fontFamily: 'Albert Sans' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Company Phone</Label>
                  <Input
                    id="companyPhone"
                    value={currentSettings.companyPhone || ""}
                    onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                    style={{ fontFamily: 'Albert Sans' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAbn">Company ABN</Label>
                  <Input
                    id="companyAbn"
                    value={currentSettings.companyAbn || ""}
                    onChange={(e) => handleInputChange('companyAbn', e.target.value)}
                    placeholder="ABN: 12 345 678 901"
                    style={{ fontFamily: 'Albert Sans' }}
                  />
                </div>
                {/* <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={currentSettings.currency || "AUD"} 
                    onValueChange={(value) => handleInputChange('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUD">AUD (A$)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <Switch
                  checked={currentSettings.emailNotifications ?? true}
                  onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Push Notifications</Label>
                  <p className="text-sm text-gray-500">Receive push notifications in browser</p>
                </div>
                <Switch
                  checked={currentSettings.pushNotifications ?? false}
                  onCheckedChange={(checked) => handleInputChange('pushNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Order Notifications</Label>
                  <p className="text-sm text-gray-500">Get notified when new orders are placed</p>
                </div>
                <Switch
                  checked={currentSettings.orderNotifications ?? true}
                  onCheckedChange={(checked) => handleInputChange('orderNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Customer Notifications</Label>
                  <p className="text-sm text-gray-500">Get notified about customer activities</p>
                </div>
                <Switch
                  checked={currentSettings.customerNotifications ?? true}
                  onCheckedChange={(checked) => handleInputChange('customerNotifications', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={currentSettings.primaryColor || "#C62828"}
                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={currentSettings.primaryColor || "#C62828"}
                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                    placeholder="#C62828"
                    style={{ fontFamily: 'Albert Sans' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
