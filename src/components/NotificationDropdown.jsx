import React, { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck, Loader2, Info, Wallet, CalendarCheck, FileText, AlertTriangle, Warehouse, ClipboardCheck, Boxes } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import notificationApi from '../services/notificationApi'
import { toast } from 'react-hot-toast'

const timeAgo = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)

  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + ' năm trước'
  
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' tháng trước'
  
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' ngày trước'
  
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' giờ trước'
  
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' phút trước'
  
  return 'Vài giây trước'
}

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const user = useSelector(state => state.auth.user)

  // Ánh xạ Type thành Icon và Route
  const getNotificationProps = (type) => {
    const role = user?.role

    switch (type) {
      case 'PAYMENT':
        return { 
          Icon: Wallet, 
          color: 'text-green-500', 
          bg: 'bg-green-100', 
          route: role === 'ROLE_TENANT' ? '/tenant/wallet' : (role === 'ROLE_ADMIN' ? '/admin/deposits' : null) 
        }
      case 'BOOKING':
        return { 
          Icon: CalendarCheck, 
          color: 'text-blue-500', 
          bg: 'bg-blue-100', 
          route: role === 'ROLE_TENANT' ? '/tenant/warehouses' : '/owner/listwarehouse'
        }
      case 'CONTRACT':
        return { 
          Icon: FileText, 
          color: 'text-purple-500', 
          bg: 'bg-purple-100', 
          route: role === 'ROLE_TENANT' ? '/tenant/contracts' : '/owner/contracts'
        }
      case 'DISPUTE':
        return { 
          Icon: AlertTriangle, 
          color: 'text-red-500', 
          bg: 'bg-red-100', 
          route: role === 'ROLE_TENANT' ? '/tenant/disputes' : '/owner/disputes' 
        }
      case 'WAREHOUSE':
        return { 
          Icon: Warehouse, 
          color: 'text-orange-500', 
          bg: 'bg-orange-100', 
          route: role === 'ROLE_OWNER' ? '/owner/listwarehouse' : '/admin/listings' 
        }
      case 'INSPECTION':
        return { 
          Icon: ClipboardCheck, 
          color: 'text-teal-500', 
          bg: 'bg-teal-100', 
          route: role === 'ROLE_INSPECTOR' ? '/inspector/inspections' : '/owner/listwarehouse' 
        }
      case 'AUDIT':
        return { 
          Icon: Boxes, 
          color: 'text-slate-700', 
          bg: 'bg-slate-200', 
          route: role === 'ROLE_TENANT' ? '/tenant/inventory' : '/staff/inventory' 
        }
      default:
        return { 
          Icon: Info, 
          color: 'text-primary', 
          bg: 'bg-primary/10', 
          route: null 
        }
    }
  }

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load số lượng thông báo chưa đọc lần đầu tiên
  useEffect(() => {
    fetchUnreadCount()
    
    // Auto refresh unread count mỗi phút
    const interval = setInterval(fetchUnreadCount, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationApi.getUnreadCount()
      if (res.success) {
        setUnreadCount(res.data)
      }
    } catch (error) {
      console.error('Lỗi khi lấy số lượng thông báo:', error)
    }
  }

  const fetchNotifications = async (isLoadMore = false) => {
    try {
      if (!isLoadMore) setIsLoading(true)
      else setIsLoadingMore(true)
      
      const targetPage = isLoadMore ? page + 1 : 0
      const res = await notificationApi.getMyNotifications({ page: targetPage, size: 10 })
      
      if (res.success && res.data) {
        if (isLoadMore) {
          setNotifications(prev => [...prev, ...res.data.content])
        } else {
          setNotifications(res.data.content)
        }
        
        setPage(res.data.page)
        setHasMore(!res.data.last)
      }
    } catch (error) {
      console.error('Lỗi khi tải thông báo:', error)
      toast.error('Không thể tải thông báo lúc này.')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const handleToggle = () => {
    const nextState = !isOpen
    setIsOpen(nextState)
    if (nextState) {
      fetchNotifications()
    }
  }

  const handleMarkAsRead = async (notif) => {
    // 1. Đánh dấu đã đọc nếu chưa đọc
    if (!notif.read) {
      try {
        const res = await notificationApi.markAsRead(notif.id)
        if (res.success) {
          setNotifications(prev => 
            prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
          )
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      } catch (error) {
        console.error('Lỗi khi đánh dấu đã đọc:', error)
      }
    }

    // 2. Lấy thông tin route và điều hướng
    setIsOpen(false)
    const props = getNotificationProps(notif.type)
    if (props.route) {
      navigate(props.route)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return
    
    try {
      const res = await notificationApi.markAllAsRead()
      if (res.success) {
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
        setUnreadCount(0)
        toast.success('Đã đánh dấu tất cả là đã đọc.')
      }
    } catch (error) {
      console.error('Lỗi khi đánh dấu đọc tất cả:', error)
      toast.error('Lỗi khi cập nhật trạng thái.')
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút Chuông (Bell Icon) */}
      <button
        onClick={handleToggle}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors focus:outline-none"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none flex flex-col overflow-hidden max-h-[85vh]">
          {/* Header của Dropdown */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Đánh dấu tất cả
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                <p className="text-xs text-slate-400">Đang tải thông báo...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="rounded-full bg-slate-50 p-3 mb-3">
                  <Bell className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-600">Chưa có thông báo nào</p>
                <p className="text-xs text-slate-400 mt-1">Khi có thông báo mới, chúng sẽ xuất hiện ở đây.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notif) => {
                  const { Icon, color, bg } = getNotificationProps(notif.type)
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkAsRead(notif)}
                      className={`block cursor-pointer px-4 py-3 transition-colors hover:bg-slate-50 ${!notif.read ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 rounded-full p-2 ${!notif.read ? `${bg} ${color}` : 'bg-slate-100 text-slate-400'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notif.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {notif.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="mt-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            {timeAgo(notif.createdAt)}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="shrink-0 flex items-center h-full pt-1.5">
                            <span className="h-2 w-2 rounded-full bg-primary ring-4 ring-primary/10"></span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {/* Nút Load More */}
                {hasMore && (
                  <div className="p-3 bg-white border-t border-slate-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        fetchNotifications(true)
                      }}
                      disabled={isLoadingMore}
                      className="w-full rounded-md bg-slate-50 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isLoadingMore ? 'Đang tải...' : 'Xem thông báo cũ hơn'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown
