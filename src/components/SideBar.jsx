import {
  HiOutlineRectangleGroup,
  HiOutlineHomeModern,
  HiOutlineCog6Tooth,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineSquaresPlus,
  HiOutlineClipboardDocumentList,
  HiOutlineCircleStack,
  HiOutlineArrowDownOnSquare,
  HiOutlineArrowUpOnSquare,
} from 'react-icons/hi2'

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HiOutlineArrowRightOnRectangle } from 'react-icons/hi2'

const SIDEBAR_MENUS = {
  ADMIN: [
    { text: 'Overview', icon: HiOutlineRectangleGroup, path: '/admin/dashboard' },
    { text: 'Warehouses Approval', icon: HiOutlineHomeModern, path: '/admin/listings' },
    { text: 'Analytics', icon: HiOutlineChartBar, path: '/admin/analytics' },
    { text: 'Deposits', icon: HiOutlineCheckCircle, path: '/admin/deposits' },
    { text: 'Transactions', icon: HiOutlineExclamationCircle, path: '/admin/transactions' },
    { text: 'Payments', icon: HiOutlineCurrencyDollar, path: '/admin/payments' },
    { text: 'Platform Settings', icon: HiOutlineDocumentText, path: '/admin/settings' },
  ],
  TENANT: [
    { text: 'Dashboard', icon: HiOutlineRectangleGroup, path: '/tenant/dashboard' },
    { text: 'Inventory', icon: HiOutlineCircleStack, path: '/tenant/inventory' },
    { text: 'Inbound', icon: HiOutlineArrowDownOnSquare, path: '/tenant/inbound' },
    { text: 'Outbound', icon: HiOutlineArrowUpOnSquare, path: '/tenant/outbound' },
    { text: 'My Bookings', icon: HiOutlineHomeModern, path: '/tenant/warehouses' },
    { text: 'Billing', icon: HiOutlineCurrencyDollar, path: '/tenant/payments' },
  ],
  OWNER: [
    { text: 'Dashboard', icon: HiOutlineRectangleGroup, path: '/owner/dashboard' },
    { text: 'My Warehouses', icon: HiOutlineHomeModern, path: '/owner/warehouses' },
    { text: 'Rental Requests', icon: HiOutlineSquaresPlus, path: '/owner/requests' },
    { text: 'Revenue', icon: HiOutlineCurrencyDollar, path: '/owner/revenue' },
  ],
  STAFF: [
    { text: 'Dashboard', icon: HiOutlineRectangleGroup, path: '/staff/dashboard' },
    { text: 'Tasks', icon: HiOutlineClipboardDocumentList, path: '/staff/tasks' },
    { text: 'Inventory', icon: HiOutlineCircleStack, path: '/staff/inventory' },
  ],
}

const Sidebar = ({ isSidebarExpanded, isMobileOpen, setIsMobileOpen, currentRole = 'ADMIN' }) => {
  const navigate = useNavigate()
  const location = useLocation()

  // Lấy menu tương ứng với role, nếu không có thì mặc định là mảng rỗng
  const menuItems = SIDEBAR_MENUS[currentRole] || []

  const handleNavigation = (path) => {
    navigate(path)
    if (setIsMobileOpen) setIsMobileOpen(false) // Đóng mobile sidebar nếu đang mở
  }

  return (
    <aside
      className={`fixed top-14 bottom-0 left-0 z-40 flex flex-col overflow-x-hidden overflow-y-auto bg-white transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'w-60 px-3' : 'w-18 px-1'} ${isMobileOpen ? 'w-60 translate-x-0 border-r px-3' : '-translate-x-full md:translate-x-0'} `}
    >
      {/* Danh sách Menu điều hướng động */}
      <nav className="flex-1 space-y-1 py-3">
        {menuItems.map((item, idx) => {
          // Check xem item này có đang active dựa trên URL hiện tại không
          const isActive = location.pathname === item.path

          return (
            <button
              key={idx}
              onClick={() => handleNavigation(item.path)}
              className={`group flex w-full items-center rounded-xl transition-all ${
                isSidebarExpanded
                  ? 'flex-row justify-start gap-5 px-4 py-3 text-sm font-medium'
                  : 'flex-col justify-center gap-1 py-3 font-sans text-[10px] font-normal'
              } ${
                isActive
                  ? 'bg-slate-100 font-semibold text-slate-950'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
              } `}
            >
              <item.icon
                className={`shrink-0 transition-transform group-hover:scale-105 ${
                  isSidebarExpanded ? 'h-5 w-5' : 'h-6 w-6'
                } ${isActive ? 'text-slate-950' : 'text-slate-600'} `}
              />

              {/* Text Menu */}
              <span
                className={`overflow-hidden text-ellipsis whitespace-nowrap ${
                  !isSidebarExpanded && 'tracking-tight'
                }`}
              >
                {item.text}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Nút Đăng xuất */}
      <div className="border-t border-slate-100 py-3">
        <button
          onClick={() => {
            // Xử lý logout tại đây (clear token, v.v...)
            navigate('/login')
          }}
          className={`flex w-full items-center rounded-xl text-red-600 transition-all hover:bg-red-50/60 ${
            isSidebarExpanded
              ? 'flex-row justify-start gap-5 px-4 py-3 text-sm font-medium'
              : 'flex-col justify-center gap-1 py-3 text-[10px]'
          } `}
        >
          <HiOutlineArrowRightOnRectangle
            className={`shrink-0 ${isSidebarExpanded ? 'h-5 w-5' : 'h-6 w-6'}`}
          />
          <span className="whitespace-nowrap">Logout</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
