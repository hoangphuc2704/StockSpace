import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Warehouse, ChevronLeft, ChevronRight, X, LogOut, Settings } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { NAVIGATION_CONFIG } from '@/config/navigation'
import SidebarItem from './components/SidebarItem'
import { twMerge } from 'tailwind-merge'

/**
 * Enterprise Sidebar Component
 * Supports:
 * - Dynamic role-based menus
 * - Collapsible desktop state
 * - Mobile drawer mode
 * - Nested sub-menus
 * - Framer Motion animations
 */
const Sidebar = ({ isMobileOpen, toggleMobileSidebar }) => {
  const { user, logout } = useAuthStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [openSubMenus, setOpenSubMenus] = useState({})

  const menuItems = useMemo(() => {
    const role = user?.role || 'TENANT'
    return [
      ...NAVIGATION_CONFIG[role],
      { type: 'divider' },
      ...NAVIGATION_CONFIG.COMMON
    ]
  }, [user?.role])

  const handleToggleSubMenu = (id) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 },
    mobile: { x: 0 },
    mobileClosed: { x: '-100%' }
  }

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleMobileSidebar}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar */}
      <motion.aside
        variants={sidebarVariants}
        animate={isMobileOpen ? 'mobile' : (isCollapsed ? 'collapsed' : 'expanded')}
        initial={isMobileOpen ? 'mobileClosed' : false}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className={twMerge(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-950 text-white border-r border-slate-800 transition-colors",
          !isMobileOpen && "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header / Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-900/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <Warehouse className="h-5 w-5 text-white" />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-lg font-bold tracking-tight whitespace-nowrap"
                >
                  StockSpace
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          
          {/* Collapse Toggle (Desktop) */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex h-6 w-6 rounded-md bg-slate-900 items-center justify-center text-slate-500 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Close Toggle (Mobile) */}
          <button onClick={toggleMobileSidebar} className="md:hidden text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="space-y-1.5">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Main Menu
              </p>
            )}
            {menuItems.map((item, idx) => {
              if (item.type === 'divider') {
                return <div key={idx} className="h-px bg-slate-900 my-4 mx-2" />
              }
              return (
                <SidebarItem 
                  key={item.id || idx}
                  item={item}
                  isCollapsed={isCollapsed}
                  isOpen={openSubMenus[item.id]}
                  toggleSubMenu={() => handleToggleSubMenu(item.id)}
                />
              )
            })}
          </div>
        </div>

        {/* Footer / User Profile */}
        <div className="p-4 border-t border-slate-900/50 bg-slate-950/50">
          <div className={twMerge(
            "flex items-center gap-3 p-2 rounded-xl transition-all",
            isCollapsed ? "justify-center" : "bg-slate-900/40 border border-slate-800/50"
          )}>
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-500 truncate uppercase font-medium">{user?.role || 'Guest'}</p>
              </div>
            )}
            {!isCollapsed && (
              <button 
                onClick={logout}
                className="p-1.5 text-slate-500 hover:text-danger transition-colors rounded-lg hover:bg-danger/5"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
          {isCollapsed && (
            <button 
              onClick={logout}
              className="mt-2 w-full flex justify-center p-2 text-slate-500 hover:text-danger transition-colors"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </motion.aside>
    </>
  )
}

export default Sidebar
