import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { motion, AnimatePresence } from 'framer-motion'

const DashboardLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const toggleMobileSidebar = () => setIsMobileOpen(!isMobileOpen)

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Component */}
      <Sidebar 
        isMobileOpen={isMobileOpen} 
        toggleMobileSidebar={toggleMobileSidebar} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-[280px] group-data-[collapsed=true]:md:pl-[80px] transition-all duration-300">
        <Navbar toggleSidebar={toggleMobileSidebar} />
        
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
