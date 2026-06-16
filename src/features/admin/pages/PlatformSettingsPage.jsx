import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Globe, Shield, CreditCard, Lock, AlertCircle } from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import Button from '../../../components/atoms/Button'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

const PlatformSettingsPage = () => {
  const [isSaving, setIsSaving] = useState(false)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Đồng bộ logic đóng mở cho cả màn hình máy tính và thiết bị di động
  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      setIsSidebarExpanded(!isSidebarExpanded)
    }
  }

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 1500)
  }

  const sections = [
    {
      id: 'general',
      title: 'General Settings',
      icon: Globe,
      description: 'Global platform configuration and regional settings.',
      fields: [
        { label: 'Platform Name', placeholder: 'StockSpace', type: 'text' },
        { label: 'System Language', placeholder: 'English (US)', type: 'text' },
        { label: 'Base Currency', placeholder: 'USD ($)', type: 'text' },
      ],
    },
    {
      id: 'fees',
      title: 'Fee Structure',
      icon: CreditCard,
      description: 'Manage commission rates and service fees.',
      fields: [
        { label: 'Tenant Service Fee (%)', placeholder: '2.5', type: 'number' },
        { label: 'Owner Commission (%)', placeholder: '5.0', type: 'number' },
        { label: 'Fixed Booking Fee', placeholder: '$10.00', type: 'text' },
      ],
    },
    {
      id: 'security',
      title: 'Security & Auth',
      icon: Shield,
      description: 'Authentication policies and security measures.',
      fields: [
        { label: 'Session Timeout (Minutes)', placeholder: '60', type: 'number' },
        { label: 'Password Expiry (Days)', placeholder: '90', type: 'number' },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 1. TOP HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <HiBars3 className="h-6 w-6" />
          </button>

          <div className="flex cursor-pointer items-center gap-2">
            <div className="shrink-0 rounded-lg bg-white p-1.5 text-white">
              <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-950">
              StockSpace Admin
            </span>
          </div>
        </div>
      </header>

      {/* MOBILE TRIGGER */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* 2. SIDEBAR COMPONENT */}
        <Sidebar
          isSidebarExpanded={isSidebarExpanded}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          currentRole="ADMIN"
        />

        {/* 3. MAIN CONTENT CONTAINER */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
            {/* Header cài đặt */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Configure global platform behavior and system parameters.
                </p>
              </div>
              <Button onClick={handleSave} isLoading={isSaving} className="min-w-30">
                <Save size={18} className="mr-2" /> Save Changes
              </Button>
            </div>

            {/* Khối Cài đặt chi tiết */}
            <div className="max-w-4xl space-y-8 pb-12">
              {sections.map((section, idx) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-start gap-4 border-b border-slate-100 p-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                      <section.icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{section.title}</h3>
                      <p className="text-sm text-slate-500">{section.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 bg-slate-50/30 p-6 md:grid-cols-2">
                    {section.fields.map((field, fIdx) => (
                      <div key={fIdx} className="space-y-1.5">
                        <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          className="focus:ring-primary/20 focus:border-primary w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {section.id === 'security' && (
                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Lock size={16} /> Multi-Factor Authentication (MFA)
                      </div>
                      <div className="bg-primary relative h-6 w-11 cursor-pointer rounded-full">
                        <div className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Khu vực Danger Zone */}
              <div className="bg-danger/5 border-danger/20 rounded-2xl border p-6">
                <h3 className="text-danger flex items-center gap-2 text-lg font-bold">
                  <AlertCircle size={20} /> Danger Zone
                </h3>
                <p className="mt-1 mb-6 text-sm text-slate-600">
                  Actions performed here are irreversible. Please proceed with extreme caution.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="text-danger border-danger/30 hover:bg-danger hover:text-white"
                  >
                    Reset System Cache
                  </Button>
                  <Button
                    variant="outline"
                    className="text-danger border-danger/30 hover:bg-danger hover:text-white"
                  >
                    Maintenance Mode
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default PlatformSettingsPage
