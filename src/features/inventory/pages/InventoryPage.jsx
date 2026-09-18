import React, { useCallback, useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  ChevronDown,
  ChevronRight,
  Warehouse,
  Map as MapIcon,
  Loader2,
  LayoutGrid,
  ListTree,
  PackageSearch,
  History,
  Download,
  FileSpreadsheet,
  Upload,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import stockApi from '../../../services/wms/stockApi'
import warehouseApi from '../../../services/warehouse/warehouseApi'
import layoutApi from '../../../services/layoutApi'
import staffApi from '../../../services/staff/staffApi'
import { showApiErrorToast } from '@/config/apiError'
import Modal from '@/components/organisms/Modal'
import DataTable from '@/components/organisms/DataTable'
import useActiveWarehouseContext from '@/hooks/useActiveWarehouseContext'
import Button from '@/components/atoms/Button'
import WmsImportDialog from '@/features/inventory/components/WmsImportDialog'
import dataContinuityApi from '@/services/wms/dataContinuityApi'
import { WMS_IMPORT_TYPE } from '@/services/wms/wmsDataTypes'
import { formatStockQuantity, sumStockQuantity } from '@/utils/stockQuantity'
import { toast } from 'react-hot-toast'

const InventoryPage = () => {
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

  // Rack folders are collapsed by default. Keep expanded rack ids so the
  // same tree works for both Tenant and Staff views.
  const [expandedRacks, setExpandedRacks] = useState(new Set())

  // Search filters
  const [locationSearch, setLocationSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')

  // History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [batchHistory, setBatchHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isOfflineImportOpen, setIsOfflineImportOpen] = useState(false)
  const [downloadingWorkbook, setDownloadingWorkbook] = useState('')

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
      showApiErrorToast(error, 'Could not load warehouses.')
      setIsLoading(false)
      return null
    }
  }, [searchParams])

  const fetchData = useCallback(async () => {
    if (!selectedWarehouseId) {
      setLayout(null)
      setAllStock([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const layoutRequest =
        currentRole === 'STAFF'
          ? staffApi.getStaffLayout(selectedWarehouseId)
          : layoutApi.getTenantWarehouseLayout(selectedWarehouseId)

      const [layoutRes, stockRes] = await Promise.all([
        layoutRequest,
        stockApi.getAllStock(selectedWarehouseId),
      ])

      setLayout(layoutRes.data?.data || null)
      setAllStock(Array.isArray(stockRes) ? stockRes : stockRes.data?.data?.content || [])
    } catch (error) {
      setLayout(null)
      setAllStock([])
      showApiErrorToast(error, 'Could not load inventory data.')
    } finally {
      setIsLoading(false)
    }
  }, [currentRole, selectedWarehouseId])

  useEffect(() => {
    // Load the server-backed warehouse list when the page scope changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWarehouses()
  }, [loadWarehouses])

  useEffect(() => {
    // Synchronize stock and layout with the selected warehouse.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  // Lọc và Nhóm dữ liệu
  useEffect(() => {
    const handleInventoryRefresh = (event) => {
      const warehouseId = event.detail?.warehouseId
      if (!warehouseId || String(warehouseId) === String(selectedWarehouseId)) {
        fetchData()
      }
    }

    window.addEventListener('stockspace:inventory-refresh', handleInventoryRefresh)
    return () => window.removeEventListener('stockspace:inventory-refresh', handleInventoryRefresh)
  }, [fetchData, selectedWarehouseId])

  const groupedStock = useMemo(() => {
    const maskedSkuIds = new Set(
      allStock
        .filter((batch) => batch?.quantityMasked === true)
        .map((batch) => String(batch.skuId))
    )
    const filtered = allStock.filter((batch) => {
      // 1. Filter by location
      if (
        selectedLocation.type === 'rack' &&
        String(batch.rackId) !== String(selectedLocation.id)
      )
        return false
      if (selectedLocation.type === 'bin' && String(batch.binId) !== String(selectedLocation.id))
        return false

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
          quantityMasked: false,
          rackNames: new Set(),
          binNames: new Set(),
          batches: [],
        }
      }
      if (batch.rackName) acc[batch.skuId].rackNames.add(batch.rackName)
      if (batch.binName) acc[batch.skuId].binNames.add(batch.binName)
      acc[batch.skuId].batches.push(batch)
      return acc
    }, {})

    return Object.values(groups)
      .map((group) => {
        const quantityMasked =
          maskedSkuIds.has(String(group.skuId)) ||
          group.batches.some((batch) => batch?.quantityMasked === true)
        return {
          ...group,
          quantityMasked,
          totalQuantity: quantityMasked ? null : sumStockQuantity(group.batches, 'quantity'),
          totalReservedQuantity: quantityMasked
            ? null
            : sumStockQuantity(group.batches, 'reservedQuantity'),
          totalAvailableQuantity: quantityMasked
            ? null
            : sumStockQuantity(group.batches, 'availableQuantity'),
        }
      })
      .sort((a, b) => String(a.skuCode || '').localeCompare(String(b.skuCode || '')))
  }, [allStock, selectedLocation, productSearch])

  const hasMaskedQuantities = useMemo(
    () => allStock.some((batch) => batch?.quantityMasked === true),
    [allStock]
  )

  const toggleExpand = (skuId) => {
    const newExpanded = new Set(expandedSkus)
    if (newExpanded.has(skuId)) {
      newExpanded.delete(skuId)
    } else {
      newExpanded.add(skuId)
    }
    setExpandedSkus(newExpanded)
  }

  const toggleRack = (rackId) => {
    setExpandedRacks((current) => {
      const next = new Set(current)
      const normalizedRackId = String(rackId)

      if (next.has(normalizedRackId)) {
        next.delete(normalizedRackId)
      } else {
        next.add(normalizedRackId)
      }

      return next
    })
  }

  const handleViewHistory = async (batchId) => {
    setIsHistoryModalOpen(true)
    setIsHistoryLoading(true)
    try {
      const res = await stockApi.getStockTransactions(batchId)
      setBatchHistory(res.data?.data?.content || [])
    } catch (err) {
      showApiErrorToast(err, 'Could not load transaction history.')
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const handleDownloadWorkbook = async (type) => {
    if (!selectedWarehouseId || downloadingWorkbook) return
    if (type === 'snapshot' && hasMaskedQuantities) {
      toast.error('Inventory snapshot export is unavailable during a blind count.')
      return
    }
    try {
      setDownloadingWorkbook(type)
      if (type === 'snapshot') {
        await dataContinuityApi.exportInventorySnapshot(selectedWarehouseId)
        toast.success('Inventory snapshot downloaded.')
      } else {
        await dataContinuityApi.downloadOfflineMovementTemplate(selectedWarehouseId)
        toast.success('Offline movement template downloaded.')
      }
    } catch (error) {
      const errorCode = error?.response?.data?.errorCode || error?.response?.data?.code
      if (type === 'snapshot' && errorCode === 'AUDIT_MOVEMENT_LOCKED') {
        toast.error(
          'The warehouse is under a blind count. Wait for the staff audit to finish before exporting the snapshot.'
        )
        return
      }
      showApiErrorToast(
        error,
        type === 'snapshot'
          ? 'Could not export the inventory snapshot.'
          : 'Could not download the offline movement template.'
      )
    } finally {
      setDownloadingWorkbook('')
    }
  }

  // Lọc Racks/Bins cho Tree View
  const treeRacks = useMemo(() => {
    if (!layout?.racks) return []
    if (!locationSearch) return layout.racks

    const search = locationSearch.toLowerCase()
    return layout.racks
      .map((rack) => {
        const rackMatches =
          rack.name?.toLowerCase().includes(search) || rack.code?.toLowerCase().includes(search)
        const matchingBins =
          rack.bins?.filter(
            (bin) =>
              bin.name?.toLowerCase().includes(search) || bin.code?.toLowerCase().includes(search)
          ) || []

        if (rackMatches || matchingBins.length > 0) {
          return { ...rack, bins: matchingBins }
        }
        return null
      })
      .filter(Boolean)
  }, [layout, locationSearch])

  // Render
  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar currentRole={currentRole} />
      <div
        className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-20'}`}
      >
        <Header />

        <main className="flex flex-1 flex-col gap-4 overflow-hidden p-4 pt-20 md:p-6 md:pt-24">
          {/* Top Bar */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <PackageSearch className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Quản lý Hàng Tồn Kho</h1>
                <p className="text-sm text-slate-500">Xem chi tiết tồn kho theo sơ đồ vật lý</p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none sm:w-64"
                value={selectedWarehouseId}
                onChange={(e) => {
                  setSelectedWarehouseId(e.target.value)
                  setSelectedLocation({ type: 'all', id: null })
                }}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadWorkbook('snapshot')}
                  isLoading={downloadingWorkbook === 'snapshot'}
                  disabled={
                    !selectedWarehouseId || Boolean(downloadingWorkbook) || hasMaskedQuantities
                  }
                  title={
                    hasMaskedQuantities
                      ? 'Không thể xuất snapshot khi đang kiểm kê mù'
                      : 'Export inventory snapshot'
                  }
                  className="w-full gap-2 sm:w-auto"
                >
                  <Download className="h-4 w-4" /> Export snapshot
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadWorkbook('template')}
                  isLoading={downloadingWorkbook === 'template'}
                  disabled={!selectedWarehouseId || Boolean(downloadingWorkbook)}
                  className="w-full gap-2 sm:w-auto"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Offline template
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsOfflineImportOpen(true)}
                  disabled={!selectedWarehouseId}
                  className="w-full gap-2 sm:w-auto"
                >
                  <Upload className="h-4 w-4" /> Import movements
                </Button>
              </div>
            </div>
          </div>

          {hasMaskedQuantities && (
            <div
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              Kho đang được kiểm kê. Số lượng hệ thống trong phạm vi kiểm kê được ẩn cho đến khi Staff gửi kết quả.
            </div>
          )}

          {/* Split Pane Content */}
          <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* LEFT PANE: Tree View */}
            <div className="flex hidden w-72 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50/30 md:flex">
              <div className="border-b border-slate-200 bg-white p-4">
                <div className="relative">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm Dãy/Ô..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 pr-3 pl-9 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto p-3">
                {isLoading && !layout ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <>
                    {/* Root Node */}
                    <button
                      onClick={() => setSelectedLocation({ type: 'all', id: null })}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${selectedLocation.type === 'all' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                      <Warehouse className="h-4 w-4 text-emerald-600" />
                      [Tất cả] Kho Hàng
                    </button>

                    {/* Racks */}
                    {treeRacks.map((rack) => {
                      const isRackExpanded = expandedRacks.has(String(rack.id))
                      const isRackSelected =
                        selectedLocation.type === 'rack' && selectedLocation.id === rack.id

                      return (
                        <div key={rack.id} className="mt-1 pl-4">
                          <div
                            className={`flex items-center rounded-lg text-sm transition-colors ${isRackSelected ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
                          >
                            <button
                              type="button"
                              aria-label={`${isRackExpanded ? 'Thu gọn' : 'Mở rộng'} ${rack.name || rack.code}`}
                              aria-expanded={isRackExpanded}
                              onClick={() => toggleRack(rack.id)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-emerald-600"
                            >
                              {isRackExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedLocation({ type: 'rack', id: rack.id })}
                              className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-left"
                            >
                              <LayoutGrid className="h-4 w-4 shrink-0 text-slate-400" />
                              <span className="truncate">{rack.name || rack.code}</span>
                            </button>
                          </div>

                          {/* Bins */}
                          {isRackExpanded &&
                            rack.bins?.map((bin) => (
                              <div key={bin.id} className="relative mt-0.5 pl-6">
                                {/* Tree line */}
                                <div className="absolute top-0 left-3 h-full w-px bg-slate-200" />
                                <div className="absolute top-1/2 left-3 h-px w-3 bg-slate-200" />

                                <button
                                  type="button"
                                  onClick={() => setSelectedLocation({ type: 'bin', id: bin.id })}
                                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors ${selectedLocation.type === 'bin' && selectedLocation.id === bin.id ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                  <MapIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                  <span className="truncate">{bin.name || bin.code}</span>
                                </button>
                              </div>
                            ))}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>

            {/* RIGHT PANE: Data Table */}
            <div className="flex flex-1 flex-col overflow-hidden bg-white">
              {/* Table Toolbar */}
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ListTree className="h-4 w-4" />
                  <span>
                    Đang xem:{' '}
                    <strong className="text-slate-900">
                      {selectedLocation.type === 'all'
                        ? 'Tất cả vị trí'
                        : selectedLocation.type === 'rack'
                          ? `Dãy ${treeRacks.find((r) => r.id === selectedLocation.id)?.name || ''}`
                          : `Ô ${treeRacks.flatMap((r) => r.bins).find((b) => b?.id === selectedLocation.id)?.name || ''}`}
                    </strong>
                  </span>
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {groupedStock.length} Nhóm Sản Phẩm
                  </span>
                </div>
                <div className="relative w-64">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo Mã/Tên sản phẩm..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 pr-3 pl-9 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
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
                    <PackageSearch className="mb-3 h-12 w-12 text-slate-300" />
                    <p>Không có hàng hóa nào tại vị trí này.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="sticky top-0 z-10 bg-slate-50 font-medium text-slate-600 shadow-sm">
                      <tr>
                        <th className="w-10 px-4 py-3"></th>
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
                      {groupedStock.map((group) => {
                        const isExpanded = expandedSkus.has(group.skuId)
                        const rackDisplay =
                          group.rackNames.size > 1
                            ? `Nhiều dãy (${group.rackNames.size})`
                            : [...group.rackNames][0] || '—'
                        const binDisplay =
                          group.binNames.size > 1
                            ? `Nhiều ô (${group.binNames.size})`
                            : [...group.binNames][0] || '—'

                        return (
                          <React.Fragment key={group.skuId}>
                            {/* Parent Row */}
                            <tr
                              className={`cursor-pointer transition-colors hover:bg-emerald-50/50 ${isExpanded ? 'bg-slate-50/50' : ''}`}
                              onClick={() => toggleExpand(group.skuId)}
                            >
                              <td className="px-4 py-3 text-slate-400">
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <ChevronRight className="h-5 w-5" />
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {group.skuCode}
                              </td>
                              <td className="min-w-[200px] px-4 py-3 font-medium whitespace-normal text-slate-700">
                                {group.skuName}
                              </td>
                              <td className="px-4 py-3 text-slate-500">{group.uomName}</td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                {formatStockQuantity(group.totalQuantity, group.quantityMasked)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-700">
                                <div>
                                  {formatStockQuantity(
                                    group.totalAvailableQuantity,
                                    group.quantityMasked
                                  )}
                                </div>
                                {!group.quantityMasked && (
                                  <span className="text-xs font-normal text-slate-400">
                                    Giữ: {formatStockQuantity(group.totalReservedQuantity, false)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{rackDisplay}</td>
                              <td className="px-4 py-3 text-slate-600">{binDisplay}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                                  {group.batches.length}
                                </span>
                              </td>
                            </tr>

                            {/* Child Rows (Batches) */}
                            {isExpanded &&
                              group.batches.map((batch) => (
                                <tr
                                  key={batch.id}
                                  className="border-b border-white bg-slate-50/80 text-slate-600"
                                >
                                  <td className="px-4 py-2.5"></td>
                                  <td className="relative px-4 py-2.5">
                                    {/* Tree Connector Line */}
                                    <div className="absolute top-0 -left-6 h-full w-px bg-slate-200" />
                                    <div className="absolute top-1/2 -left-6 h-px w-4 bg-slate-200" />

                                    {/* <div className="flex items-center gap-2">
                                      <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-xs text-slate-400">
                                        {batch.id.substring(0, 8).toUpperCase()}
                                      </span>
                                    </div> */}
                                  </td>
                                  <td
                                    colSpan={2}
                                    className="px-4 py-2.5 text-sm whitespace-normal text-slate-500"
                                  >
                                    Ngày nhập:{' '}
                                    <span className="font-medium text-slate-700">
                                      {batch.arrivalDate
                                        ? new Date(batch.arrivalDate).toLocaleDateString('vi-VN')
                                        : '—'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                                    {formatStockQuantity(batch.quantity, batch.quantityMasked)}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                                    <div>
                                      {formatStockQuantity(
                                        batch.availableQuantity,
                                        batch.quantityMasked
                                      )}
                                    </div>
                                    {!batch.quantityMasked && (
                                      <span className="text-xs font-normal text-slate-400">
                                        Giữ: {formatStockQuantity(batch.reservedQuantity, false)}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-sm">{batch.rackName || '—'}</td>
                                  <td className="px-4 py-2.5 text-sm">{batch.binName || '—'}</td>
                                  <td className="px-4 py-2.5 text-right">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleViewHistory(batch.id)
                                      }}
                                      className="ml-auto flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
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
              {
                header: 'Loại',
                render: (row) => (
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium ${row.quantityChanged > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                  >
                    {row.quantityChanged > 0 ? 'IN' : 'OUT'}
                  </span>
                ),
              },
              {
                header: 'Thay đổi',
                render: (row) => (
                  <span
                    className={`font-bold ${row.quantityChanged > 0 ? 'text-emerald-600' : 'text-amber-600'}`}
                  >
                    {row.quantityChanged > 0 ? '+' : ''}
                    {row.quantityChanged}
                  </span>
                ),
              },
              {
                header: 'Mã phiếu',
                render: (row) =>
                  row.receiptId ? row.receiptId.substring(0, 8).toUpperCase() : '—',
              },
            ]}
            data={batchHistory}
          />
        )}
      </Modal>

      <WmsImportDialog
        isOpen={isOfflineImportOpen}
        onClose={() => setIsOfflineImportOpen(false)}
        title="Import offline inbound / outbound movements"
        description="Use only the newest template downloaded for the selected warehouse. Movements are validated and later applied in sequence_no order as one atomic operation."
        importType={WMS_IMPORT_TYPE.OFFLINE_MOVEMENT}
        scopeKey={selectedWarehouseId}
        validateWorkbook={(file) =>
          dataContinuityApi.validateOfflineMovements(selectedWarehouseId, file)
        }
        applyWorkbook={dataContinuityApi.applyOfflineMovements}
        allowApply={currentRole === 'TENANT'}
        applyUnavailableMessage="Staff can validate offline movements when permitted, but only the tenant can apply them."
        confirmation={{
          title: 'Apply offline movements',
          message:
            'Create and approve every inbound/outbound receipt in workbook sequence. Inventory will change atomically. Are you sure you want to continue?',
          confirmText: 'Apply movements',
        }}
        onApplied={fetchData}
        onStale={fetchData}
      />
    </div>
  )
}

export default InventoryPage
