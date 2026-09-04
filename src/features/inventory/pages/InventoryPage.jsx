import React, { useCallback, useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ChevronDown, ChevronRight, Warehouse, Map as MapIcon, Loader2, LayoutGrid, ListTree, PackageSearch, History } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import stockApi from '../../../services/wms/stockApi'
import warehouseApi from '../../../services/warehouse/warehouseApi'
import layoutApi from '../../../services/layoutApi'
import { showApiErrorToast } from '@/config/apiError'
import Modal from '@/components/organisms/Modal'
import DataTable from '@/components/organisms/DataTable'
import useActiveWarehouseContext from '@/hooks/useActiveWarehouseContext'

const InventoryPage = () => {
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const { isSidebarExpanded } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)
  const currentRole = user?.role === 'ROLE_STAFF' ? 'STAFF' : 'TENANT'

  const [isLoading, setIsLoading] = useState(true)
  const [warehouses, setWarehouses] = useState([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [layout, setLayout] = useState(null)
  const [allStock, setAllStock] = useState([])

  useActiveWarehouseContext(selectedWarehouseId)
  
  // { type: 'all' | 'rack' | 'bin', id: null }
  const [selectedLocation, setSelectedLocation] = useState({ type: 'all', id: null })
  
  // Expanded SKU rows
  const [expandedSkus, setExpandedSkus] = useState(new Set())
  
  // Search filters
  const [locationSearch, setLocationSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')

  // History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [batchHistory, setBatchHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const loadWarehouses = useCallback(async () => {
    try {
      const res = await warehouseApi.getMyWarehouses()
      const list = res.data?.data?.content || res.data?.data || []
      setWarehouses(list)
      setSelectedWarehouseId((current) => {
        const requestedWarehouseId = searchParams.get('warehouseId')
        if (list.some((w) => String(w.id) === String(requestedWarehouseId))) {
          return requestedWarehouseId
        }
        return list.some((w) => String(w.id) === String(current)) ? current : list[0]?.id || ''
      })
      if (!list.length) setIsLoading(false)
      return list
    } catch (error) {
      showApiErrorToast(error, 'Không thể tải danh sách kho.')
      setIsLoading(false)
      return null
    }
  }, [searchParams])

  const fetchData = useCallback(async () => {
    if (!selectedWarehouseId) return
    setIsLoading(true)
    try {
      const [layoutRes, stockRes] = await Promise.all([
        layoutApi.getTenantWarehouseLayout(selectedWarehouseId),
        stockApi.getAllStock(selectedWarehouseId)
      ])
      
      setLayout(layoutRes.data?.data || null)
      setAllStock(Array.isArray(stockRes) ? stockRes : stockRes.data?.data?.content || [])
    } catch (error) {
      showApiErrorToast(error, 'Lỗi tải dữ liệu tồn kho.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWarehouseId])

  useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Lọc và Nhóm dữ liệu
  const groupedStock = useMemo(() => {
    const filtered = allStock.filter(batch => {
      // 1. Filter by location
      if (selectedLocation.type === 'rack' && batch.rackId !== selectedLocation.id) return false
      if (selectedLocation.type === 'bin' && batch.binId !== selectedLocation.id) return false
      
      // 2. Filter by product search
      if (productSearch) {
        const search = productSearch.toLowerCase()
        if (
          !batch.skuCode?.toLowerCase().includes(search) &&
          !batch.skuName?.toLowerCase().includes(search) &&
          !batch.id?.toLowerCase().includes(search)
        ) {
          return false
        }
      }
      return true
    })

    const groups = filtered.reduce((acc, batch) => {
      if (!acc[batch.skuId]) {
        acc[batch.skuId] = {
          skuId: batch.skuId,
          skuCode: batch.skuCode,
          skuName: batch.skuName,
          uomName: batch.uomName,
          totalQuantity: 0,
          rackNames: new Set(),
          binNames: new Set(),
          batches: []
        }
      }
      acc[batch.skuId].totalQuantity += batch.quantity
      if (batch.rackName) acc[batch.skuId].rackNames.add(batch.rackName)
      if (batch.binName) acc[batch.skuId].binNames.add(batch.binName)
      acc[batch.skuId].batches.push(batch)
      return acc
    }, {})

    return Object.values(groups).sort((a, b) => a.skuCode.localeCompare(b.skuCode))
  }, [allStock, selectedLocation, productSearch])

  const toggleExpand = (skuId) => {
    const newExpanded = new Set(expandedSkus)
    if (newExpanded.has(skuId)) {
      newExpanded.delete(skuId)
    } else {
      newExpanded.add(skuId)
    }
    setExpandedSkus(newExpanded)
  }

  const handleViewHistory = async (batchId) => {
    setIsHistoryModalOpen(true)
    setIsHistoryLoading(true)
    try {
      const res = await stockApi.getStockTransactions(batchId)
      setBatchHistory(res.data?.data?.content || [])
    } catch (err) {
      showApiErrorToast(err, 'Lỗi khi tải lịch sử giao dịch.')
    } finally {
      setIsHistoryLoading(false)
    }
  }

  // Lọc Racks/Bins cho Tree View
  const treeRacks = useMemo(() => {
    if (!layout?.racks) return []
    if (!locationSearch) return layout.racks
    
    const search = locationSearch.toLowerCase()
    return layout.racks.map(rack => {
      const rackMatches = rack.name?.toLowerCase().includes(search) || rack.code?.toLowerCase().includes(search)
      const matchingBins = rack.bins?.filter(bin => 
        bin.name?.toLowerCase().includes(search) || bin.code?.toLowerCase().includes(search)
      ) || []
      
      if (rackMatches || matchingBins.length > 0) {
        return { ...rack, bins: matchingBins }
      }
      return null
    }).filter(Boolean)
  }, [layout, locationSearch])

  // Render
  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar currentRole={currentRole} />
      <div className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-20'}`}>
        <Header />
        
        <main className="flex-1 overflow-hidden p-4 md:p-6 pt-20 md:pt-24 flex flex-col gap-4">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <PackageSearch className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Quản lý Hàng Tồn Kho</h1>
                <p className="text-sm text-slate-500">Xem chi tiết tồn kho theo sơ đồ vật lý</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                className="w-full sm:w-64 h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={selectedWarehouseId}
                onChange={(e) => {
                  setSelectedWarehouseId(e.target.value)
                  setSelectedLocation({ type: 'all', id: null })
                }}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Pane Content */}
          <div className="flex flex-1 overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
            
            {/* LEFT PANE: Tree View */}
            <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col hidden md:flex">
              <div className="p-4 border-b border-slate-200 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Tìm Dãy/Ô..." 
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {isLoading && !layout ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                ) : (
                  <>
                    {/* Root Node */}
                    <button 
                      onClick={() => setSelectedLocation({ type: 'all', id: null })}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${selectedLocation.type === 'all' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                      <Warehouse className="h-4 w-4 text-emerald-600" />
                      [Tất cả] Kho Hàng
                    </button>
                    
                    {/* Racks */}
                    {treeRacks.map(rack => (
                      <div key={rack.id} className="pl-4 mt-1">
                        <button
                          onClick={() => setSelectedLocation({ type: 'rack', id: rack.id })}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${selectedLocation.type === 'rack' && selectedLocation.id === rack.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                          <LayoutGrid className="h-4 w-4 text-slate-400" />
                          {rack.name || rack.code}
                        </button>
                        
                        {/* Bins */}
                        {rack.bins?.map(bin => (
                          <div key={bin.id} className="pl-6 mt-0.5 relative">
                            {/* Tree line */}
                            <div className="absolute left-3 top-0 w-px h-full bg-slate-200" />
                            <div className="absolute left-3 top-1/2 w-3 h-px bg-slate-200" />
                            
                            <button
                              onClick={() => setSelectedLocation({ type: 'bin', id: bin.id })}
                              className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-sm transition-colors ${selectedLocation.type === 'bin' && selectedLocation.id === bin.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                              <MapIcon className="h-3.5 w-3.5 text-slate-400" />
                              {bin.name || bin.code}
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* RIGHT PANE: Data Table */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Table Toolbar */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ListTree className="h-4 w-4" />
                  <span>
                    Đang xem: <strong className="text-slate-900">
                      {selectedLocation.type === 'all' ? 'Tất cả vị trí' : 
                       selectedLocation.type === 'rack' ? `Dãy ${treeRacks.find(r => r.id === selectedLocation.id)?.name || ''}` : 
                       `Ô ${treeRacks.flatMap(r => r.bins).find(b => b?.id === selectedLocation.id)?.name || ''}`}
                    </strong>
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                    {groupedStock.length} Nhóm Sản Phẩm
                  </span>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Tìm theo Mã/Tên sản phẩm..." 
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                  />
                </div>
              </div>
              
              {/* Table Content */}
              <div className="flex-1 overflow-auto">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  </div>
                ) : groupedStock.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-slate-500">
                    <PackageSearch className="h-12 w-12 text-slate-300 mb-3" />
                    <p>Không có hàng hóa nào tại vị trí này.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 w-10"></th>
                        <th className="px-4 py-3">Mã SKU</th>
                        <th className="px-4 py-3">Tên sản phẩm</th>
                        <th className="px-4 py-3">Đơn vị</th>
                        <th className="px-4 py-3 text-right">Tổng số lượng</th>
                        <th className="px-4 py-3 text-right">Khả dụng</th>
                        <th className="px-4 py-3">Tên khu vực (Dãy)</th>
                        <th className="px-4 py-3">Tên vị trí (Ô)</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedStock.map(group => {
                        const isExpanded = expandedSkus.has(group.skuId)
                        const rackDisplay = group.rackNames.size > 1 ? `Nhiều dãy (${group.rackNames.size})` : [...group.rackNames][0] || '—'
                        const binDisplay = group.binNames.size > 1 ? `Nhiều ô (${group.binNames.size})` : [...group.binNames][0] || '—'

                        return (
                          <React.Fragment key={group.skuId}>
                            {/* Parent Row */}
                            <tr 
                              className={`hover:bg-emerald-50/50 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50/50' : ''}`}
                              onClick={() => toggleExpand(group.skuId)}
                            >
                              <td className="px-4 py-3 text-slate-400">
                                {isExpanded ? <ChevronDown className="h-5 w-5 text-emerald-600" /> : <ChevronRight className="h-5 w-5" />}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-900">{group.skuCode}</td>
                              <td className="px-4 py-3 font-medium text-slate-700 whitespace-normal min-w-[200px]">{group.skuName}</td>
                              <td className="px-4 py-3 text-slate-500">{group.uomName}</td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-600">{group.totalQuantity}</td>
                              <td className="px-4 py-3 text-right font-medium text-slate-700">{group.totalQuantity}</td>
                              <td className="px-4 py-3 text-slate-600">{rackDisplay}</td>
                              <td className="px-4 py-3 text-slate-600">{binDisplay}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                                  {group.batches.length}
                                </span>
                              </td>
                            </tr>

                            {/* Child Rows (Batches) */}
                            {isExpanded && group.batches.map(batch => (
                              <tr key={batch.id} className="bg-slate-50/80 border-b border-white text-slate-600">
                                <td className="px-4 py-2.5"></td>
                                <td className="px-4 py-2.5 relative">
                                  {/* Tree Connector Line */}
                                  <div className="absolute -left-6 top-0 w-px h-full bg-slate-200" />
                                  <div className="absolute -left-6 top-1/2 w-4 h-px bg-slate-200" />
                                  
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                      {batch.id.substring(0, 8).toUpperCase()}
                                    </span>
                                  </div>
                                </td>
                                <td colSpan={2} className="px-4 py-2.5 text-slate-500 text-sm whitespace-normal">
                                  Ngày nhập: <span className="font-medium text-slate-700">{batch.arrivalDate ? new Date(batch.arrivalDate).toLocaleDateString('vi-VN') : '—'}</span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-medium text-slate-700">{batch.quantity}</td>
                                <td className="px-4 py-2.5 text-right font-medium text-slate-700">{batch.quantity}</td>
                                <td className="px-4 py-2.5 text-sm">{batch.rackName || '—'}</td>
                                <td className="px-4 py-2.5 text-sm">{batch.binName || '—'}</td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleViewHistory(batch.id)
                                    }}
                                    className="flex items-center justify-center p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors ml-auto"
                                    title="Lịch sử giao dịch"
                                  >
                                    <History className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            
          </div>
        </main>
      </div>

      {/* History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Lịch sử Lô hàng"
        className="max-w-4xl"
      >
        {isHistoryLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : (
          <DataTable
            columns={[
              { header: 'Ngày', render: (row) => new Date(row.createdAt).toLocaleString('vi-VN') },
              { header: 'Loại', render: (row) => (
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${row.quantityChanged > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {row.quantityChanged > 0 ? 'IN' : 'OUT'}
                  </span>
                )
              },
              { header: 'Thay đổi', render: (row) => (
                  <span className={`font-bold ${row.quantityChanged > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {row.quantityChanged > 0 ? '+' : ''}{row.quantityChanged}
                  </span>
                )
              },
              { header: 'Mã phiếu', render: (row) => row.receiptId ? row.receiptId.substring(0,8).toUpperCase() : '—' }
            ]}
            data={batchHistory}
          />
        )}
      </Modal>

    </div>
  )
}

export default InventoryPage
