import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, Save, Globe, Shield, 
  Bell, CreditCard, Mail, Sliders,
  CheckCircle, Database, Lock
} from 'lucide-react'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'

const PlatformSettingsPage = () => {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
    }, 1500)
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
      ]
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
      ]
    },
    {
      id: 'security',
      title: 'Security & Auth',
      icon: Shield,
      description: 'Authentication policies and security measures.',
      fields: [
        { label: 'Session Timeout (Minutes)', placeholder: '60', type: 'number' },
        { label: 'Password Expiry (Days)', placeholder: '90', type: 'number' },
      ]
    }
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Configure global platform behavior and system parameters.</p>
        </div>
        <Button onClick={handleSave} isLoading={isSaving} className="min-w-[120px]">
          <Save size={18} className="mr-2" /> Save Changes
        </Button>
      </div>

      {/* Settings Grid */}
      <div className="space-y-8 pb-12">
        {sections.map((section, idx) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
          >
            <div className="p-6 border-b border-slate-100 flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                <section.icon size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{section.title}</h3>
                <p className="text-sm text-slate-500">{section.description}</p>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30">
              {section.fields.map((field, fIdx) => (
                <div key={fIdx} className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
                  <input 
                    type={field.type}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              ))}
            </div>

            {section.id === 'security' && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Lock size={16} /> Multi-Factor Authentication (MFA)
                </div>
                <div className="h-6 w-11 rounded-full bg-primary relative cursor-pointer">
                  <div className="h-5 w-5 rounded-full bg-white absolute top-0.5 right-0.5 shadow-sm" />
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {/* Danger Zone */}
        <div className="p-6 bg-danger/5 border border-danger/20 rounded-2xl">
          <h3 className="text-lg font-bold text-danger flex items-center gap-2">
            <AlertCircle size={20} /> Danger Zone
          </h3>
          <p className="text-sm text-slate-600 mt-1 mb-6">
            Actions performed here are irreversible. Please proceed with extreme caution.
          </p>
          <div className="flex flex-wrap gap-3">
             <Button variant="outline" className="text-danger border-danger/30 hover:bg-danger hover:text-white">
               Reset System Cache
             </Button>
             <Button variant="outline" className="text-danger border-danger/30 hover:bg-danger hover:text-white">
               Maintenance Mode
             </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const AlertCircle = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

export default PlatformSettingsPage
