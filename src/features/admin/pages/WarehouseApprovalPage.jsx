import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchWarehouses, verifyWarehouse, rejectWarehouse } from '../../../store/adminWarehouseSlice'
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
import { HiBars3 } from 'react-icons/hi2'
import DataTable from '../../../components/organisms/DataTable'
import Badge from '../../../components/atoms/Badge'
import Button from '../../../components/atoms/Button'
import Avatar from '../../../components/atoms/Avatar'
import Sidebar from '../../../components/SideBar' // <-- Tái sử dụng thanh điều hướng chung
import logoDaidien from '../../../assets/logoDaidien.png'

const WarehouseApprovalPage = () => {
  const dispatch = useDispatch()
  const { data: warehouses, loading } = useSelector((state) => state.adminWarehouse)

  useEffect(() => {
    dispatch(fetchWarehouses())
  }, [dispatch])
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Đồng bộ logic đóng mở cho cả màn hình Desktop và Mobile
  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      setIsSidebarExpanded(!isSidebarExpanded)
    }
  }

  const columns = [
    {
      header: 'Warehouse Details',
      render: (row) => (
        <div className="flex items-center gap-4 py-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Warehouse size={24} />
          </div>
          <div className="flex flex-col">
            {/* BE: WarehouseResponse.name */}
            <span className="font-bold text-slate-900">{row.name}</span>
            {/* BE: WarehouseResponse.address (object hoặc string tuỳ BE mapping) */}
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={12} /> {row.address || row.location || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Owner',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar alt={row.ownerName || row.owner} size="sm" />
          {/* BE: WarehouseResponse.ownerName (tên chủ kho) */}
          <span className="text-sm font-medium text-slate-700">{row.ownerName || row.owner || '—'}</span>
        </div>
      ),
    },
    {
      header: 'Specs',
      render: (row) => (
        <div className="flex flex-col gap-1 text-xs">
          {/* BE: WarehouseResponse.area (số m²), warehouseType.name */}
          <span className="flex items-center gap-1 font-medium text-slate-700">
            <Maximize size={12} /> {row.area ? `${row.area} m²` : row.size || '—'}
          </span>
          <span className="text-slate-500">{row.warehouseType?.name || row.type || '—'}</span>
        </div>
      ),
    },
    {
      header: 'Price / Month',
      render: (row) => (
        // BE: WarehouseResponse.pricePerMonth (số tiền, đơn vị VND)
        <span className="text-primary font-bold">
          {row.pricePerMonth != null
            ? row.pricePerMonth.toLocaleString('vi-VN') + ' đ'
            : row.price || '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => {
        const variantMap = {
          ACTIVE: 'success',
          INACTIVE: 'danger',
          PENDING: 'warning',
          UNDER_REVIEW: 'primary',
        }
        return (
          <Badge variant={variantMap[row.status] || 'slate'} size="sm">
            {/* BE: WarehouseResponse.status (WarehouseStatus enum) */}
            {row.isVerified ? '✓ Verified' : row.status || '—'}
          </Badge>
        )
      },
    },
    {
      header: 'Submitted',
      render: (row) =>
        // BE: WarehouseResponse.createdAt (LocalDateTime)
        row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '—',
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 px-3">
            <Eye size={16} className="mr-2" /> Details
          </Button>
          <button
            onClick={() => dispatch(verifyWarehouse(row.id))}
            title="Duyệt kho"
            className="text-success hover:bg-success/10 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 transition-colors"
          >
            <CheckCircle size={18} />
          </button>
          <button
            onClick={() => dispatch(rejectWarehouse(row.id))}
            title="Từ chối kho"
            className="text-danger hover:bg-danger/10 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 transition-colors"
          >
            <XCircle size={18} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 1. TOP HEADER */}
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
        {/* 2. SIDEBAR COMPONENT */}
        <Sidebar
          isSidebarExpanded={isSidebarExpanded}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          currentRole="ADMIN"
        />

        {/* 3. MAIN CONTENT CONTAINER */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
            }`}
        >
          <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
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

            {/* Table wrapper */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="p-4 text-center">Loading...</div>
                ) : (
                  <DataTable columns={columns} data={warehouses} />
                )}
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default WarehouseApprovalPage
