import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { motion, AnimatePresence } from 'framer-motion'

const DashboardLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  // phần này nên xem sét lại để toggle sidebar trên mobile, hiện tại đang bị lỗi là khi mở sidebar trên mobile thì nó sẽ bị đẩy sang phải và không thể đóng lại được
  const toggleMobileSidebar = () => setIsMobileOpen(!isMobileOpen)

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Component */}
      <Sidebar isMobileOpen={isMobileOpen} toggleMobileSidebar={toggleMobileSidebar} />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col transition-all duration-300 md:pl-[280px] group-data-[collapsed=true]:md:pl-[80px]">
        <Navbar toggleSidebar={toggleMobileSidebar} />

        <main className="flex-1 overflow-x-hidden p-4 md:p-8">
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
