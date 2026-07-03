import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '../../../store/uiSlide'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Calendar,
  CreditCard,
  RefreshCw,
} from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'

// Import Layout chung
import Sidebar from '../../../components/SideBar'
import Header from '../../../components/HeaderDashboard'

// Import API config
import walletApi from '../../../services/wallet/walletApi'

const withdrawHistory = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 1,
  })

  // --- HÀM GỌI API LẤY LỊCH SỬ ---
  const fetchTransactions = async (page = 0) => {
    try {
      setLoading(true)
      const res = await walletApi.getWalletTransactions({ page, size: 10 })

      if (res?.data?.success) {
        // Map dữ liệu từ res.data.data.content theo cấu trúc của BE bạn trả về
        setTransactions(res.data.data.content || [])
        setPagination({
          page: res.data.data.page,
          size: res.data.data.size,
          totalElements: res.data.data.totalElements,
          totalPages: res.data.data.totalPages,
        })
      }
    } catch (error) {
      console.error('Lỗi lấy lịch sử giao dịch:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // --- HELPER ĐỊNH DẠNG HIỂN THỊ ---
  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  const getTransactionTypeBadge = (type) => {
    switch (type) {
      case 'TOP_UP':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">
            Nạp tiền
          </span>
        )
      case 'COMMISSION':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-700/10 ring-inset">
            Chiết khấu
          </span>
        )
      case 'WITHDRAW':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-700/10 ring-inset">
            Rút tiền
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-700/10 ring-inset">
            {type}
          </span>
        )
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'SUCCESS') return <Badge variant="success">Thành công</Badge>
    if (status === 'PENDING') return <Badge variant="warning">Đang xử lý</Badge>
    return <Badge variant="danger">Thất bại</Badge>
  }

  // --- ĐỊNH NGHĨA CÁC CỘT CHO DATATABLE ---
  const columns = [
    {
      header: 'Mã giao dịch / Mã thanh toán',
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-slate-400">
            ID: <span className="font-sans text-slate-600">{row.id.substring(0, 8)}...</span>
          </p>
          {row.paymentCode && (
            <p className="mt-0.5 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-600">
              Code: {row.paymentCode}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Loại & Phương thức',
      render: (row) => (
        <div className="space-y-1">
          <div>{getTransactionTypeBadge(row.transactionType)}</div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <CreditCard className="h-3 w-3" /> {row.paymentMethod}
          </div>
        </div>
      ),
    },
    {
      header: 'Số tiền',
      render: (row) => {
        const isPlus = row.transactionType === 'TOP_UP'
        return (
          <span className={`font-bold ${isPlus ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPlus ? '+' : '-'} {formatVND(row.amount)}
          </span>
        )
      },
    },
    {
      header: 'Trạng thái',
      render: (row) => getStatusBadge(row.status),
    },
    {
      header: 'Thời gian tạo',
      render: (row) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          <p className="font-medium">{new Date(row.createdAt).toLocaleDateString('vi-VN')}</p>
          <p className="text-[11px] text-slate-400">
            {new Date(row.createdAt).toLocaleTimeString('vi-VN')}
          </p>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />

      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole="OWNER" />

        {/* CONTAINER CHÍNH */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-4000 space-y-6 p-6 md:p-8">
            {/* Tiêu đề & Nút làm mới */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <CircleDollarSign className="h-7 w-7 text-blue-600" /> Lịch sử giao dịch ví
                </h1>
                <p className="text-sm text-slate-500">
                  Xem và quản lý tất cả các yêu cầu nạp tiền, rút tiền và dòng tiền chiết khấu của
                  bạn.
                </p>
              </div>

              <Button variant="outline" size="sm" onClick={() => fetchTransactions(0)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Làm mới dữ liệu
              </Button>
            </div>

            {/* BẢNG LỊCH SỬ GIAO DỊCH */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <DataTable columns={columns} data={transactions} isLoading={loading} />

              {/* THANH PHÂN TRANG (PAGINATION) */}
              {pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500">
                    Hiển thị{' '}
                    <span className="font-semibold text-slate-700">{transactions.length}</span> trên
                    tổng số{' '}
                    <span className="font-semibold text-slate-700">{pagination.totalElements}</span>{' '}
                    giao dịch
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={pagination.page === 0}
                      onClick={() => fetchTransactions(pagination.page - 1)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      Trước
                    </button>
                    {[...Array(pagination.totalPages).keys()].map((p) => (
                      <button
                        key={p}
                        onClick={() => fetchTransactions(p)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          pagination.page === p
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p + 1}
                      </button>
                    ))}
                    <button
                      disabled={pagination.page === pagination.totalPages - 1}
                      onClick={() => fetchTransactions(pagination.page + 1)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default withdrawHistory
