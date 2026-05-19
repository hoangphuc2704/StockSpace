import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

const SidebarItem = ({ item, isCollapsed, isOpen, toggleSubMenu }) => {
  const location = useLocation()
  const hasChildren = item.children && item.children.length > 0
  const isSubOpen = isOpen
  
  // Check if any child is active
  const isChildActive = hasChildren && item.children.some(child => location.pathname === child.path)
  const isActive = location.pathname === item.path || isChildActive

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          onClick={toggleSubMenu}
          className={twMerge(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group",
            isCollapsed ? "justify-center" : "justify-between",
            isActive ? "bg-primary/10 text-primary" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className={twMerge("h-5 w-5 shrink-0", isActive ? "text-primary" : "group-hover:text-white")} />
            {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
          </div>
          {!isCollapsed && (
            <motion.div
              animate={{ rotate: isSubOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          )}
        </button>
        
        <AnimatePresence>
          {isSubOpen && !isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pl-11 space-y-1"
            >
              {item.children.map((child, idx) => (
                <NavLink
                  key={idx}
                  to={child.path}
                  className={({ isActive }) => twMerge(
                    "block py-2 text-sm transition-colors relative",
                    isActive 
                      ? "text-primary font-bold" 
                      : "text-slate-500 hover:text-white"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div 
                          layoutId="sub-active"
                          className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary"
                        />
                      )}
                      {child.label}
                    </>
                  )}
                </NavLink>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => twMerge(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
        isCollapsed ? "justify-center" : "justify-start",
        isActive 
          ? "bg-primary text-white shadow-lg shadow-primary/20" 
          : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
      {isCollapsed && (
        <div className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {item.label}
        </div>
      )}
    </NavLink>
  )
}

export default SidebarItem
