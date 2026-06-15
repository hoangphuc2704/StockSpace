import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Warehouse,
  ShieldCheck,
  MapPin,
  Maximize,
  CheckCircle,
  XCircle,
  Eye,
  Search,
} from 'lucide-react'
import {
  HiBars3,
  HiOutlineRectangleGroup,
  HiOutlineHomeModern,
  HiOutlineCog6Tooth,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import Avatar from '@/components/atoms/Avatar'
import logoDaidien from '../../../assets/logoDaidien.png'

const MOCK_LISTINGS = [
  {
    id: 'W-001',
    name: 'Main Logistics Hub',
    owner: 'Sarah Chen',
    location: 'District 7, HCMC',
    size: '1,200 m²',
    price: '$15,000/mo',
    status: 'PENDING',
    type: 'Cold Storage',
    submittedAt: '2024-05-12',
  },
  {
    id: 'W-002',
    name: 'Industrial Park A',
    owner: 'David Miller',
    location: 'Binh Duong Province',
    size: '5,000 m²',
    price: '$45,000/mo',
    status: 'PENDING',
    type: 'General Warehouse',
    submittedAt: '2024-05-11',
  },
  {
    id: 'W-003',
    name: 'Dockside Terminal',
    owner: 'Robert King',
    location: 'Cat Lai Port',
    size: '3,500 m²',
    price: '$28,000/mo',
    status: 'PENDING',
    type: 'Bonded Warehouse',
    submittedAt: '2024-05-10',
  },
]

const WarehouseApprovalPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const location = useLocation()
  const navigate = useNavigate()

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded)
  }

  // Danh mục Menu đồng bộ chính xác tuyệt đối với các trang trước
  const menuItems = [
    { text: 'Overview', icon: HiOutlineRectangleGroup, path: '/admin/dashboard' },
    { text: 'Warehouses Approval', icon: HiOutlineHomeModern, path: '/admin/listings' },
    { text: 'Analytics', icon: HiOutlineChartBar, path: '/admin/analytics' },
    { text: 'Deposits', icon: HiOutlineCheckCircle, path: '/admin/deposits' },
    { text: 'Transactions', icon: HiOutlineExclamationCircle, path: '/admin/transactions' },
    { text: 'Payments', icon: HiOutlineCurrencyDollar, path: '/admin/payments' },
    { text: 'Platform Settings', icon: HiOutlineDocumentText, path: '/admin/settings' },
  ]

  const columns = [
    {
      header: 'Warehouse Details',
      render: (row) => (
        <div className="flex items-center gap-4 py-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Warehouse size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{row.name}</span>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={12} /> {row.location}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Owner',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar alt={row.owner} size="sm" />
          <span className="text-sm font-medium text-slate-700">{row.owner}</span>
        </div>
      ),
    },
    {
      header: 'Specs',
      render: (row) => (
        <div className="flex flex-col gap-1 text-xs">
          <span className="flex items-center gap-1 font-medium text-slate-700">
            <Maximize size={12} /> {row.size}
          </span>
          <span className="text-slate-500">{row.type}</span>
        </div>
      ),
    },
    {
      header: 'Price',
      render: (row) => <span className="text-primary font-bold">{row.price}</span>,
    },
    {
      header: 'Submitted',
      accessor: 'submittedAt',
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 px-3">
            <Eye size={16} className="mr-2" /> Details
          </Button>
          <button className="text-success hover:bg-success/10 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 transition-colors">
            <CheckCircle size={18} />
          </button>
          <button className="text-danger hover:bg-danger/10 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 transition-colors">
            <XCircle size={18} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 1. TOP HEADER (Đồng bộ chuẩn hệ thống) */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <HiBars3 className="h-6 w-6" />
          </button>

          <div className="flex cursor-pointer items-center gap-2">
            <div className="shrink-0 rounded-lg bg-white p-1.5 text-white">
              <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-950">
              StockSpace Admin
            </span>
          </div>
        </div>
      </header>

      {/* MOBILE TRIGGER */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* 2. SIDEBAR (Giữ nguyên trạng thái co giãn khi đổi trang) */}
        <aside
          className={`fixed top-14 bottom-0 left-0 z-40 flex flex-col overflow-x-hidden overflow-y-auto bg-white transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'w-60 px-3' : 'w-18 px-1'} ${isMobileOpen ? 'w-60 translate-x-0 border-r px-3' : '-translate-x-full md:translate-x-0'} `}
        >
          <nav className="flex-1 space-y-1 py-3">
            {menuItems.map((item, idx) => {
              const isActive = location.pathname === item.path

              return (
                <button
                  key={idx}
                  onClick={() => navigate(item.path)}
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
                    className={`shrink-0 transition-transform group-hover:scale-105 ${isSidebarExpanded ? 'h-5 w-5' : 'h-6 w-6'} ${isActive ? 'text-slate-950' : 'text-slate-600'} `}
                  />
                  <span
                    className={`overflow-hidden text-ellipsis whitespace-nowrap ${!isSidebarExpanded && 'tracking-tight'}`}
                  >
                    {item.text}
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="border-t border-slate-100 py-3">
            <button
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

        {/* 3. MAIN CONTENT CONTAINER (Nội dung kiểm duyệt kho hàng) */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'} `}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Warehouse Approvals</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Review and approve new warehouse listings before they go live.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Avatar key={i} size="sm" className="border-2 border-white" />
                  ))}
                </div>
                <span className="text-xs font-medium text-slate-500 underline">
                  4 reviewers active
                </span>
              </div>
            </div>

            {/* Hero Alert */}
            <div className="bg-primary/5 border-primary/20 flex items-start gap-4 rounded-xl border p-4">
              <div className="bg-primary/10 text-primary shrink-0 rounded-lg p-2">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">3 Pending Verifications</h4>
                <p className="mt-1 text-sm text-slate-600">
                  New listings require physical inspection or document verification before approval.
                  Automated verification has flagged 1 listing for manual review.
                </p>
              </div>
            </div>

            {/* Filters Section */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
              <div className="relative w-full md:w-80">
                <Search
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by name, owner or city..."
                  className="focus:ring-primary/20 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
                />
              </div>
              <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0">
                <Badge variant="primary" className="cursor-pointer whitespace-nowrap">
                  Pending (3)
                </Badge>
                <Badge variant="slate" className="cursor-pointer whitespace-nowrap">
                  Under Review (5)
                </Badge>
                <Badge variant="slate" className="cursor-pointer whitespace-nowrap">
                  Rejected (12)
                </Badge>
              </div>
            </div>

            {/* Table wrapper đồng bộ cấu trúc UI nền và shadow */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <DataTable columns={columns} data={MOCK_LISTINGS} />
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default WarehouseApprovalPage
