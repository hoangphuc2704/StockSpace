import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Warehouse, ChevronLeft, ChevronRight, X, LogOut, Settings } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '@/store/authSlice'
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
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [openSubMenus, setOpenSubMenus] = useState({})

  const menuItems = useMemo(() => {
    const role = user?.role || 'TENANT'
    return [...NAVIGATION_CONFIG[role], { type: 'divider' }, ...NAVIGATION_CONFIG.COMMON]
  }, [user?.role])

  const handleToggleSubMenu = (id) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 },
    mobile: { x: 0 },
    mobileClosed: { x: '-100%' },
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
        animate={isMobileOpen ? 'mobile' : isCollapsed ? 'collapsed' : 'expanded'}
        initial={isMobileOpen ? 'mobileClosed' : false}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className={twMerge(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-950 text-white transition-colors',
          !isMobileOpen && '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header / Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-900/50 px-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-primary shadow-primary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-lg">
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
            className="hidden h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-slate-500 transition-colors hover:text-white md:flex"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Close Toggle (Mobile) */}
          <button
            onClick={toggleMobileSidebar}
            className="text-slate-500 hover:text-white md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 scrollbar-thin scrollbar-thumb-slate-800 space-y-8 overflow-y-auto px-4 py-6">
          <div className="space-y-1.5">
            {!isCollapsed && (
              <p className="mb-3 px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                Main Menu
              </p>
            )}
            {menuItems.map((item, idx) => {
              if (item.type === 'divider') {
                return <div key={idx} className="mx-2 my-4 h-px bg-slate-900" />
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
        <div className="border-t border-slate-900/50 bg-slate-950/50 p-4">
          <div
            className={twMerge(
              'flex items-center gap-3 rounded-xl p-2 transition-all',
              isCollapsed ? 'justify-center' : 'border border-slate-800/50 bg-slate-900/40'
            )}
          >
            <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">{user?.name || 'User'}</p>
                <p className="truncate text-[10px] font-medium text-slate-500 uppercase">
                  {user?.role || 'Guest'}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={() => dispatch(logout())}
                className="hover:text-danger hover:bg-danger/5 rounded-lg p-1.5 text-slate-500 transition-colors"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
          {isCollapsed && (
            <button
              onClick={() => dispatch(logout())}
              className="hover:text-danger mt-2 flex w-full justify-center p-2 text-slate-500 transition-colors"
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
