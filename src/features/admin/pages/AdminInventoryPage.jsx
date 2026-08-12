import React, { useState, useEffect } from 'react'
import {
  HiOutlineBuildingStorefront,
  HiOutlineArchiveBox,
  HiOutlineDocumentArrowDown,
  HiOutlineDocumentArrowUp,
  HiOutlineCalendar,
  HiOutlineUser,
} from 'react-icons/hi2'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import adminApi from '../../../services/admin/adminApi'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'
import { HiBars3 } from 'react-icons/hi2'

const AdminInventoryPage = () => {
  const { isSidebarExpanded } = useSelector((state) => state.ui)
  const [warehouses, setWarehouses] = useState([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [activeTab, setActiveTab] = useState('STOCK') // 'STOCK' | 'RECEIPTS'

  const [loading, setLoading] = useState(false)
  const [loadingWarehouses, setLoadingWarehouses] = useState(false)

  // Dữ liệu Stock
  const [stocks, setStocks] = useState([])
  const [stockPage, setStockPage] = useState(0)
  const [stockTotalPages, setStockTotalPages] = useState(0)

  // Dữ liệu Receipts
  const [receipts, setReceipts] = useState([])
  const [receiptPage, setReceiptPage] = useState(0)
  const [receiptTotalPages, setReceiptTotalPages] = useState(0)
  const [receiptType, setReceiptType] = useState('') // '' | 'INBOUND' | 'OUTBOUND'

  const formatDate = (dateString, showTime = false) => {
    if (!dateString) return 'N/A'
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' }
    if (showTime) {
      options.hour = '2-digit'
      options.minute = '2-digit'
    }
    return new Date(dateString).toLocaleDateString('en-US', options)
  }

  useEffect(() => {
    fetchWarehouses()
  }, [])

  useEffect(() => {
    if (!selectedWarehouseId) return

    if (activeTab === 'STOCK') {
      fetchStock(0)
    } else {
      fetchReceipts(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWarehouseId, activeTab, receiptType])

  const fetchWarehouses = async () => {
    try {
      setLoadingWarehouses(true)
      const res = await adminApi.getWarehouses({ size: 1000 })
      const data = res.data?.data?.content || []
      setWarehouses(data)
      if (data.length > 0) {
        setSelectedWarehouseId(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error)
      toast.error("Error loading inventory list")
    } finally {
      setLoadingWarehouses(false)
    }
  }

  const fetchStock = async (page = 0) => {
    if (!selectedWarehouseId) return
    try {
      setLoading(true)
      const res = await adminApi.getAdminStock({ warehouseId: selectedWarehouseId, page, size: 50 })
      const data = res.data?.data
      setStocks(data?.content || [])
      setStockTotalPages(data?.totalPages || 0)
      setStockPage(data?.pageNo ?? data?.page ?? 0)
    } catch (error) {
      console.error('Error fetching stock:', error)
      toast.error(error.response?.data?.message || "Error loading inventory data")
    } finally {
      setLoading(false)
    }
  }

  const fetchReceipts = async (page = 0) => {
    if (!selectedWarehouseId) return
    try {
      setLoading(true)
      const res = await adminApi.getAdminReceipts({
        warehouseId: selectedWarehouseId,
        type: receiptType || undefined,
        page,
        size: 20,
      })
      const data = res.data?.data
      setReceipts(data?.content || [])
      setReceiptTotalPages(data?.totalPages || 0)
      setReceiptPage(data?.pageNo ?? data?.page ?? 0)
    } catch (error) {
      console.error('Error fetching receipts:', error)
      toast.error(error.response?.data?.message || "Error when loading import/export ticket data")
    } finally {
      setLoading(false)
    }
  }

  const getReceiptBadge = (type) => {
    if (type === 'INBOUND')
      return <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">INBOUND</span>
    return <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">OUTBOUND</span>
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 border border-yellow-200">Waiting for approval</span>
      case 'APPROVED':
        return <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 border border-green-200">Approved</span>
      case 'REJECTED':
        return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">Refuse</span>
      default:
        return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-200">{status}</span>
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* TOP HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button className="rounded-full p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200">
            <HiBars3 className="h-6 w-6" />
          </button>
          <div className="flex cursor-pointer items-center gap-2">
            <div className="shrink-0 rounded-lg bg-white p-1.5">
              <a href="/" aria-label="Back to landing page">
                <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
              </a>
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-950">
              StockSpace Admin
            </span>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        <Sidebar currentRole="ADMIN" />

        <div className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-[72px]'}`}>
          <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8 flex flex-col h-[calc(100vh-3.5rem)]">
            {/* Header & Warehouse Selector */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-200 shrink-0">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Inventory &amp; Import/Export</h1>
                <p className="text-sm text-slate-500">View and compare detailed inventory of each warehouse.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Choose Warehouse:</label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  disabled={loadingWarehouses}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 min-w-[200px]"
                >
                  {loadingWarehouses ? (
                    <option value="">Loading inventory list...</option>
                  ) : warehouses.length === 0 ? (
                    <option value="">There are no warehouses yet</option>
                  ) : (
                    warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {!selectedWarehouseId ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl bg-white border border-slate-200 border-dashed">
                <div className="text-center text-slate-500">
                  <HiOutlineBuildingStorefront className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                  <p>Please select a warehouse to view data</p>
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex gap-4 border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab('STOCK')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'STOCK'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                  >
                    <HiOutlineArchiveBox className="h-5 w-5" />
                    Current inventory
                  </button>
                  <button
                    onClick={() => setActiveTab('RECEIPTS')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'RECEIPTS'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                  >
                    <HiOutlineDocumentArrowDown className="h-5 w-5" />
                    Import/Export Form
                  </button>
                </div>

                {/* Nội dung Tab */}
                <div className="flex-1 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col">
                  {activeTab === 'STOCK' && (
                    <div className="flex-1 flex flex-col">
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm text-slate-600">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                              <th className="px-6 py-4 font-semibold">Product (SKU)</th>
                              <th className="px-6 py-4 font-semibold">Location (Zone/Rack/Bin)</th>
                              <th className="px-6 py-4 font-semibold text-right">Quantity in stock</th>
                              <th className="px-6 py-4 font-semibold">Warehouse entry date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {loading ? (
                              <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-slate-500">Loading inventory data...</td>
                              </tr>
                            ) : stocks.length === 0 ? (
                              <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-slate-500">This warehouse has no inventory yet.</td>
                              </tr>
                            ) : (
                              stocks.map((stock) => (
                                <tr key={stock.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{stock.skuCode}</div>
                                    <div className="text-xs text-slate-500">{stock.skuName}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-slate-700">{stock.zoneName || '-'}</div>
                                    <div className="text-xs text-slate-500">
                                      {stock.rackName || '-'} / {stock.binName || '-'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right font-medium text-blue-600">
                                    {stock.quantity} <span className="text-xs text-slate-400 font-normal">{stock.uomSymbol}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                      <HiOutlineCalendar className="h-4 w-4 text-slate-400" />
                                      {formatDate(stock.arrivalDate || stock.createdAt)}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      {/* Phân trang Stock */}
                      {!loading && stockTotalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
                          <span className="text-sm text-slate-500">Page <span className="font-medium text-slate-900">{stockPage + 1}</span> / <span className="font-medium text-slate-900">{stockTotalPages}</span></span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => fetchStock(stockPage - 1)} disabled={stockPage === 0} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">Before</button>
                            <button onClick={() => fetchStock(stockPage + 1)} disabled={stockPage >= stockTotalPages - 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">Next</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'RECEIPTS' && (
                    <div className="flex-1 flex flex-col">
                      <div className="border-b border-slate-200 p-4 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600 font-medium">Filter by type:</span>
                          <select
                            value={receiptType}
                            onChange={(e) => setReceiptType(e.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">All (Inbound &amp; Outbound)</option>
                            <option value="INBOUND">Enter warehouse (INBOUND)</option>
                            <option value="OUTBOUND">OUTBOUND</option>
                          </select>
                        </div>
                      </div>
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm text-slate-600">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                              <th className="px-6 py-4 font-semibold">Voucher Code</th>
                              <th className="px-6 py-4 font-semibold">Voucher Type</th>
                              <th className="px-6 py-4 font-semibold">Creation date</th>
                              <th className="px-6 py-4 font-semibold">Founder</th>
                              <th className="px-6 py-4 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {loading ? (
                              <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-slate-500">Loading ticket data...</td>
                              </tr>
                            ) : receipts.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-slate-500">There are no import/export tickets yet.</td>
                              </tr>
                            ) : (
                              receipts.map((receipt) => (
                                <tr key={receipt.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 font-medium text-slate-900 truncate max-w-[150px]" title={receipt.id}>
                                    {receipt.id.substring(0, 8)}...
                                  </td>
                                  <td className="px-6 py-4">{getReceiptBadge(receipt.type)}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                      <HiOutlineCalendar className="h-4 w-4 text-slate-400" />
                                      {formatDate(receipt.createdAt, true)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5">
                                      <HiOutlineUser className="h-4 w-4 text-slate-400" />
                                      <span>{receipt.createdByFullName || 'N/A'}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">{getStatusBadge(receipt.status)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      {/* Phân trang Receipts */}
                      {!loading && receiptTotalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
                          <span className="text-sm text-slate-500">Page <span className="font-medium text-slate-900">{receiptPage + 1}</span> / <span className="font-medium text-slate-900">{receiptTotalPages}</span></span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => fetchReceipts(receiptPage - 1)} disabled={receiptPage === 0} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">Before</button>
                            <button onClick={() => fetchReceipts(receiptPage + 1)} disabled={receiptPage >= receiptTotalPages - 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">Next</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminInventoryPage
