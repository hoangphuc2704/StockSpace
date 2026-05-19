import { useState, useRef, useEffect } from 'react'
import { Bell, Package, Calendar, DollarSign, Info, Check, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '@/store/notificationStore'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore()
  const unreadCount = notifications.filter(n => !n.isRead).length
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getTypeIcon = (type) => {
    switch (type) {
      case 'booking': return <Calendar className="h-4 w-4 text-primary" />
      case 'inventory': return <Package className="h-4 w-4 text-warning" />
      case 'payment': return <DollarSign className="h-4 w-4 text-success" />
      default: return <Info className="h-4 w-4 text-slate-400" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger border-2 border-white animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-[100]"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h4 className="font-bold text-slate-900">Notifications</h4>
              <div className="flex gap-2">
                <button onClick={markAllAsRead} className="text-xs font-bold text-primary hover:underline">
                  Mark all read
                </button>
                <button onClick={clearAll} className="text-xs font-bold text-danger hover:underline">
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Bell className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => markAsRead(n.id)}
                      className={`p-4 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer relative ${!n.isRead ? 'bg-primary/5' : ''}`}
                    >
                      {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                      <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
                        {getTypeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-bold text-slate-900 truncate">{n.title}</p>
                          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-100 text-center">
              <Button variant="ghost" size="sm" className="w-full text-xs font-bold">
                View All Activity
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationBell
