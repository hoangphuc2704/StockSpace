import { useState, useRef, useEffect } from 'react'
import { Bell, Package, Calendar, DollarSign, Info, Check, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import Button from '@/components/atoms/Button'

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications } = useSelector((state) => state.notification)
  const dispatch = useDispatch()
  const unreadCount = notifications.filter((n) => !n.isRead).length
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
      case 'booking':
        return <Calendar className="text-primary h-4 w-4" />
      case 'inventory':
        return <Package className="text-warning h-4 w-4" />
      case 'payment':
        return <DollarSign className="text-success h-4 w-4" />
      default:
        return <Info className="h-4 w-4 text-slate-400" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="bg-danger absolute top-2 right-2 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-white" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 z-[100] mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
              <h4 className="font-bold text-slate-900">Notifications</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => dispatch(markAllAsRead())}
                  className="text-primary text-xs font-bold hover:underline"
                >
                  Mark all read
                </button>
                <button
                  onClick={() => dispatch(clearAll())}
                  className="text-danger text-xs font-bold hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Bell className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => dispatch(markAsRead(n.id))}
                      className={`relative flex cursor-pointer gap-4 p-4 transition-colors hover:bg-slate-50 ${!n.isRead ? 'bg-primary/5' : ''}`}
                    >
                      {!n.isRead && (
                        <div className="bg-primary absolute top-0 bottom-0 left-0 w-1" />
                      )}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm">
                        {getTypeIcon(n.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">{n.title}</p>
                          <span className="text-[10px] font-medium whitespace-nowrap text-slate-400">
                            {n.time}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-slate-500">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-3 text-center">
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
