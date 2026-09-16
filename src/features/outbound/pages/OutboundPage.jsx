import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FormShell } from '@/form/FormControls'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Minus,
  Plus,
  Loader2,
  Download,
  Eye,
  Map as MapIcon,
  MapPin,
} from 'lucide-react'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Modal from '@/components/organisms/Modal'
import receiptApi from '@/services/wms/receiptApi'
import stockApi from '@/services/wms/stockApi'
import productApi from '@/services/wms/productApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'
import ReceiptDetailModal from '@/features/inventory/components/ReceiptDetailModal'
import { showApiErrorToast } from '@/config/apiError'
import { positiveInteger, required } from '@/config/validation'
import useActiveWarehouseContext from '@/hooks/useActiveWarehouseContext'

const RECEIPT_PAGE_SIZE_OPTIONS = [10, 20, 50]

const formatOutboundDate = (dateString) => {
  if (!dateString) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

const compareReceiptsByDateDesc = (firstReceipt, secondReceipt) => {
  const firstTime = Date.parse(firstReceipt?.createdAt || '')
  const secondTime = Date.parse(secondReceipt?.createdAt || '')
  const firstHasValidDate = Number.isFinite(firstTime)
  const secondHasValidDate = Number.isFinite(secondTime)

  if (!firstHasValidDate || !secondHasValidDate) {
    if (firstHasValidDate === secondHasValidDate) {
      return String(secondReceipt?.id || '').localeCompare(String(firstReceipt?.id || ''))
    }
    return firstHasValidDate ? -1 : 1
  }

  return secondTime - firstTime || String(secondReceipt?.id || '').localeCompare(String(firstReceipt?.id || ''))
}

const parseOutboundLocation = (locationValue) => {
  try {
    return locationValue ? JSON.parse(locationValue) : null
  } catch {
    return null
  }
}

const getOutboundAllocationCapacity = (allocations = []) => allocations.reduce((total, allocation) => {
  const location = parseOutboundLocation(allocation.location)
  return total + (Number(location?.quantity) || 0)
}, 0)

const OutboundPage = () => {
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)
  const currentRole = user?.role === 'ROLE_STAFF' ? 'STAFF' : 'TENANT'

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingReceiptId, setRejectingReceiptId] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailReceipt, setDetailReceipt] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Data states
  const [receipts, setReceipts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [skus, setSkus] = useState([])
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const receiptRequestIdRef = useRef(0)

  // Selection states
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  useActiveWarehouseContext(selectedWarehouseId)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('ALL')

  // Form states. Manual outbound lines can be split across multiple Rack/Bin
  // allocations; each allocation becomes one item in the API payload.
  const [outboundMethod, setOutboundMethod] = useState('AUTO') // 'AUTO' | 'MANUAL'
  const createOutboundAllocation = () => ({
    id: `allocation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    location: '',
    quantity: 1,
  })
  const createOutboundLine = () => ({
    id: `outbound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    skuId: '',
    quantity: 1,
    allocations: [createOutboundAllocation()],
  })
  const [outboundLines, setOutboundLines] = useState(() => [createOutboundLine()])
  const [activeOutboundLineId, setActiveOutboundLineId] = useState(null)
  const [formNote, setFormNote] = useState('')
  const [formReceiverName, setFormReceiverName] = useState('')
  
  // Manual Outbound states
  const [isLocationsLoading, setIsLocationsLoading] = useState(false)
  const [warehouseStockBatches, setWarehouseStockBatches] = useState([])

  // Auto Outbound states
  const [previewData, setPreviewData] = useState(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const fetchInitialData = useCallback(async () => {
    try {
      const [whRes, skuRes] = await Promise.all([
        warehouseApi.getMyWarehouses(),
        productApi.getAllSKUs(),
      ])

      const whData = whRes.data?.data?.content || whRes.data?.data || []
      const whList = whData.map((w) => ({
        id: w.id || w.warehouseId,
        name: w.name || w.warehouseName,
      }))
      setWarehouses(whList)
      const requestedWarehouseId = searchParams.get('warehouseId')
      const requestedWarehouse = whList.find(
        (warehouse) => String(warehouse.id) === String(requestedWarehouseId)
      )
      if (whList.length > 0) setSelectedWarehouseId(requestedWarehouse?.id || whList[0].id)

      setSkus(Array.isArray(skuRes) ? skuRes : [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      if (error.response?.data?.errorCode === 'SUBSCRIPTION_REQUIRED') {
        showApiErrorToast(error, 'Subscription required for outbound.')
      } else {
        showApiErrorToast(error, 'Could not load outbound data.')
      }
    }
  }, [searchParams])

  const fetchReceipts = useCallback(async () => {
    const requestId = receiptRequestIdRef.current + 1
    receiptRequestIdRef.current = requestId
    setIsLoading(true)
    try {
      const res = await receiptApi.getReceipts(selectedWarehouseId, {
        type: 'OUTBOUND',
        page,
        size: pageSize,
        sortBy: 'createdAt',
        sortDir: 'desc',
      })
      if (requestId !== receiptRequestIdRef.current) return

      const payload = res.data?.data || {}
      const content = Array.isArray(payload) ? payload : payload.content || []
      const responsePage = Number(payload.page ?? payload.pageNo ?? page)
      const responseSize = Number(payload.size ?? payload.pageSize ?? pageSize)
      const responseTotalElements = Number(payload.totalElements ?? content.length)
      const calculatedTotalPages = responseSize > 0
        ? Math.ceil(responseTotalElements / responseSize)
        : 1
      const responseTotalPages = Number(payload.totalPages ?? calculatedTotalPages)

      setReceipts(content)
      setTotalElements(Number.isFinite(responseTotalElements) ? responseTotalElements : 0)
      setTotalPages(
        Number.isFinite(responseTotalPages) ? Math.max(responseTotalPages, 1) : 1
      )
      if (Number.isInteger(responsePage) && responsePage >= 0 && responsePage !== page) {
        setPage(responsePage)
      }
    } catch (error) {
      if (requestId !== receiptRequestIdRef.current) return
      console.error('Error fetching receipts:', error)
      setReceipts([])
      setTotalElements(0)
      setTotalPages(1)
      if (error.response?.data?.errorCode === 'SUBSCRIPTION_REQUIRED') {
        // Only show if not already shown by initial data
      } else {
        showApiErrorToast(error, 'Could not load receipts.')
      }
    } finally {
      if (requestId === receiptRequestIdRef.current) setIsLoading(false)
    }
  }, [page, pageSize, selectedWarehouseId])

  useEffect(() => {
    // Load the initial warehouse and SKU data for this page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInitialData()
  }, [fetchInitialData])

  useEffect(() => {
    if (selectedWarehouseId) {
      // Refresh the receipt list whenever the warehouse context changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchReceipts()
    }
  }, [fetchReceipts, selectedWarehouseId])

  const activeOutboundLine = outboundLines.find((line) => line.id === activeOutboundLineId) || outboundLines[0]
  const formSkuId = activeOutboundLine?.skuId || ''
  const formTotalQuantity = activeOutboundLine?.quantity ?? 1
  const updateOutboundLine = (lineId, patch) => {
    setOutboundLines((previous) => previous.map((line) => (
      line.id === lineId ? { ...line, ...patch } : line
    )))
  }
  const updateOutboundAllocation = (lineId, allocationId, patch) => {
    setOutboundLines((previous) => previous.map((line) => {
      if (line.id !== lineId) return line

      let allocations = (line.allocations || []).map((allocation) => (
        allocation.id === allocationId ? { ...allocation, ...patch } : allocation
      ))

      if (outboundMethod === 'MANUAL' && patch.location) {
        const selectedLocation = parseOutboundLocation(patch.location)
        const quantityFromOtherLocations = allocations
          .filter((allocation) => allocation.id !== allocationId)
          .reduce((total, allocation) => total + (Number(allocation.quantity) || 0), 0)
        const remainingQuantity = Math.max(
          Number(line.quantity) - quantityFromOtherLocations,
          1
        )
        const selectedLocationQuantity = Number(selectedLocation?.quantity) || 1

        allocations = allocations.map((allocation) => (
          allocation.id === allocationId
            ? {
                ...allocation,
                quantity: Math.min(remainingQuantity, selectedLocationQuantity),
              }
            : allocation
        ))
      }

      const requestedQuantity = Number(line.quantity)
      const hasEmptyAllocation = allocations.some((allocation) => !allocation.location)
      if (
        outboundMethod === 'MANUAL'
        && Number.isFinite(requestedQuantity)
        && requestedQuantity > getOutboundAllocationCapacity(allocations)
        && !hasEmptyAllocation
      ) {
        allocations = [
          ...allocations,
          {
            ...createOutboundAllocation(),
            quantity: Math.max(requestedQuantity - getOutboundAllocationCapacity(allocations), 1),
          },
        ]
      }

      return { ...line, allocations }
    }))
  }
  const addOutboundAllocation = (lineId) => {
    setOutboundLines((previous) => previous.map((line) => (
      line.id === lineId
        ? {
            ...line,
            allocations: [
              ...(line.allocations || []),
              {
                ...createOutboundAllocation(),
                quantity: Math.max(
                  Number(line.quantity) - getOutboundAllocationCapacity(line.allocations || []),
                  1
                ),
              },
            ],
          }
        : line
    )))
  }
  const removeOutboundAllocation = (lineId, allocationId) => {
    setOutboundLines((previous) => previous.map((line) => (
      line.id === lineId
        ? {
            ...line,
            allocations: (line.allocations || []).filter((allocation) => allocation.id !== allocationId),
          }
        : line
    )))
  }

  useEffect(() => {
    if (outboundLines.length > 0 && !outboundLines.some((line) => line.id === activeOutboundLineId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveOutboundLineId(outboundLines[0].id)
    }
  }, [activeOutboundLineId, outboundLines])

  // Fetch stock once for the selected warehouse and derive availability for
  // every SKU line from the same snapshot.
  useEffect(() => {
    if (!isModalOpen || !selectedWarehouseId) {
      return undefined
    }

    let cancelled = false
    const fetchStockAvailability = async () => {
      setIsLocationsLoading(true)
      setWarehouseStockBatches([])
      try {
        const batches = await stockApi.getAllStock(selectedWarehouseId, { size: 500 })
        if (cancelled) return
        setWarehouseStockBatches(Array.isArray(batches) ? batches : [])
      } catch (error) {
        if (!cancelled) showApiErrorToast(error, 'Could not load stock availability.')
      } finally {
        if (!cancelled) setIsLocationsLoading(false)
      }
    }

    fetchStockAvailability()
    return () => {
      cancelled = true
    }
  }, [isModalOpen, selectedWarehouseId])

  const stockSummaryByLine = useMemo(() => {
    const summaries = {}
    outboundLines.forEach((line) => {
      const skuBatches = warehouseStockBatches.filter(
        (batch) => String(batch.skuId) === String(line.skuId)
      )
      const grouped = skuBatches.reduce((acc, batch) => {
        const key = `${batch.rackId || batch.rackName || 'rack'}_${batch.binId || batch.binName || 'bin'}`
        const totalQuantity = Number(batch.quantity) || 0
        const reservedQuantity = Number(batch.reservedQuantity) || 0
        const availableQuantity = Math.max(
          0,
          Number(batch.availableQuantity ?? (totalQuantity - reservedQuantity)) || 0
        )
        if (!acc[key]) {
          acc[key] = {
            rackId: batch.rackId,
            rackName: batch.rackName,
            binId: batch.binId,
            binName: batch.binName,
            quantity: 0,
            totalQuantity: 0,
            reservedQuantity: 0,
          }
        }
        acc[key].quantity += availableQuantity
        acc[key].totalQuantity += totalQuantity
        acc[key].reservedQuantity += reservedQuantity
        return acc
      }, {})
      const allLocations = Object.values(grouped)
      const locations = allLocations
        .filter((location) => location.quantity > 0)
        .sort((first, second) => second.quantity - first.quantity)
      summaries[line.id] = {
        totalQuantity: allLocations.reduce((sum, location) => sum + location.quantity, 0),
        grossQuantity: allLocations.reduce((sum, location) => sum + location.totalQuantity, 0),
        reservedQuantity: allLocations.reduce((sum, location) => sum + location.reservedQuantity, 0),
        locations,
      }
    })
    return summaries
  }, [outboundLines, warehouseStockBatches])

  const activeStockSummary = stockSummaryByLine[activeOutboundLine?.id] || null
  const stockSummary = activeStockSummary

  const handleExport = async () => {
    if (!selectedWarehouseId) return
    setIsExporting(true)
    try {
      const response = await receiptApi.exportReceipts(selectedWarehouseId, 'OUTBOUND')
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'outbound-receipts.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('File exported.')
    } catch (error) {
      console.error('Error when exporting file:', error)
      showApiErrorToast(error, 'Export failed.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSingleReceipt = (receipt) => {
    if (!receipt || !receipt.items) {
      toast.error('Không có dữ liệu chi tiết để xuất.')
      return
    }
    const csvRows = []
    csvRows.push(['Mã Phiếu', 'Trạng thái', 'Ngày xuất hàng', 'Người phụ trách', 'Tên nơi nhận', 'Tên mặt hàng', 'Mã SKU', 'Số lượng'].join(','))
    
    receipt.items.forEach(item => {
      csvRows.push([
        receipt.id.substring(0, 8).toUpperCase(),
        receipt.status,
        new Date(receipt.createdAt).toLocaleDateString('vi-VN'),
        `"${receipt.createdByFullName || ''}"`,
        `"${receipt.receiverName || ''}"`,
        `"${item.skuName || ''}"`,
        item.skuCode || '',
        item.quantity || 0
      ].join(','))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `phieu-xuat-${receipt.id.substring(0,8)}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    toast.success('Đã xuất file chi tiết phiếu xuất.')
  }

  const handlePreview = async () => {
    if (outboundLines.some((line) => required(line.skuId, 'Product'))) {
      toast.error('Select a product for every line.')
      return
    }
    if (outboundLines.some((line) => positiveInteger(Number(line.quantity)))) {
      toast.error('Enter a valid whole quantity for every SKU.')
      return
    }

    setIsPreviewLoading(true)
    setPreviewData(null)
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        items: outboundLines.map((line) => ({
          skuId: line.skuId,
          quantity: Number(line.quantity),
        })),
      }
      const response = await receiptApi.getPickListSuggestions(payload)
      setPreviewData(response.data?.data || response.data)
      toast.success('Preview generated successfully.')
    } catch (error) {
      showApiErrorToast(error, 'Could not generate preview.')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    if (outboundLines.some((line) => !line.skuId)) {
      toast.error('Select a product for every line.')
      return
    }
    if (outboundLines.some((line) => positiveInteger(Number(line.quantity)))) {
      toast.error('Enter a valid whole quantity for every SKU.')
      return
    }
    if (outboundMethod === 'AUTO' && !previewData?.complete) {
      toast.error('Cannot create outbound receipt with shortage.')
      return
    }

    const payloadItems = []
    if (outboundMethod === 'MANUAL') {
      for (const line of outboundLines) {
        const allocations = Array.isArray(line.allocations) ? line.allocations : []
        if (allocations.length === 0) {
          toast.error('Chọn ít nhất một Rack/Bin cho mỗi SKU.')
          return
        }

        const requestedQuantity = Number(line.quantity)
        const allocatedQuantity = allocations.reduce(
          (total, allocation) => total + (Number(allocation.quantity) || 0),
          0
        )
        if (allocatedQuantity !== requestedQuantity) {
          toast.error(
            `Tổng số lượng phân bổ cho SKU phải bằng ${requestedQuantity}.`
          )
          return
        }

        const quantitiesByLocation = new Map()
        for (const allocation of allocations) {
          if (positiveInteger(Number(allocation.quantity)) !== '') {
            toast.error('Số lượng tại mỗi Rack/Bin phải là số nguyên dương.')
            return
          }

          let location
          try {
            location = JSON.parse(allocation.location)
          } catch {
            toast.error('Vui lòng chọn Rack/Bin cho từng dòng phân bổ.')
            return
          }

          const locationKey = `${location.rackId}_${location.binId}`
          const existing = quantitiesByLocation.get(locationKey)
          quantitiesByLocation.set(locationKey, {
            location,
            quantity: (existing?.quantity || 0) + Number(allocation.quantity),
          })
        }

        for (const { location, quantity } of quantitiesByLocation.values()) {
          if (quantity > Number(location.quantity)) {
            toast.error(
              `Số lượng phân bổ tại ${location.rackName || 'Rack đã chọn'} vượt quá tồn kho.`
            )
            return
          }

          payloadItems.push({
            skuId: line.skuId,
            quantity,
            note: formNote,
            rackId: location.rackId,
            binId: location.binId,
          })
        }
      }
    } else {
      outboundLines.forEach((line) => {
        payloadItems.push({
          skuId: line.skuId,
          quantity: Number(line.quantity),
          note: formNote,
        })
      })
    }

    setIsSubmitting(true)
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        type: 'OUTBOUND',
        receiverName: formReceiverName,
        items: payloadItems,
      }
      await receiptApi.createReceipt(payload)
      toast.success('Outbound receipt created.')
      setIsModalOpen(false)
      if (page === 0) await fetchReceipts()
      else setPage(0)

      const emptyLine = createOutboundLine()
      setOutboundLines([emptyLine])
      setActiveOutboundLineId(emptyLine.id)
      setFormNote('')
      setFormReceiverName('')
      setPreviewData(null)
    } catch (error) {
      console.error('Error creating receipt:', error)
      showApiErrorToast(error, 'Could not create receipt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async (e) => {
    e.preventDefault()
    if (required(rejectReason, 'Rejection reason')) {
      toast.error('Enter a rejection reason.')
      return
    }
    setIsSubmitting(true)
    try {
      await receiptApi.rejectReceipt(rejectingReceiptId, rejectReason)
      toast.success('Receipt rejected.')
      setIsRejectModalOpen(false)
      setRejectReason('')
      setRejectingReceiptId(null)
      await fetchReceipts()
    } catch (error) {
      console.error('Error rejecting receipt:', error)
      showApiErrorToast(error, 'Could not reject receipt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await receiptApi.approveReceipt(id)
      toast.success('Outbound receipt approved.')
      await fetchReceipts()
    } catch (error) {
      if (
        error.response?.data?.errorCode === 'OUTBOUND_PICK_LIST_STALE' ||
        error.response?.data?.code === 'OUTBOUND_PICK_LIST_STALE'
      ) {
        try {
          await receiptApi.replanPickList(id)
          toast.success('Pick list replanned. Please review the new picking order.')
          await fetchReceipts()
          const res = await receiptApi.getReceiptDetail(id)
          setDetailReceipt(res?.data?.data ?? res?.data)
          setIsDetailModalOpen(true)
        } catch (replanError) {
          const replanErrorCode =
            replanError.response?.data?.errorCode || replanError.response?.data?.code

          if (replanErrorCode === 'OUTBOUND_PICK_LIST_STALE') {
            toast.error(
              'Tồn kho hiện tại không đủ để xuất phiếu này. Vui lòng kiểm tra và điều chỉnh số lượng.'
            )
          } else {
            showApiErrorToast(replanError, 'Replan failed. Please try again.')
          }
          await fetchReceipts()
        }
      } else {
        console.error('Error approving receipt:', error)
        showApiErrorToast(error, 'Could not approve receipt.')
      }
    }
  }

  const handleViewDetail = async (receipt) => {
    setIsDetailModalOpen(true)
    setDetailReceipt(null)
    setIsDetailLoading(true)
    try {
      const response = await receiptApi.getReceiptDetail(receipt.id)
      setDetailReceipt(response?.data?.data ?? response?.data ?? receipt)
    } catch (error) {
      setDetailReceipt(receipt)
      showApiErrorToast(error, 'Could not load receipt details.')
    } finally {
      setIsDetailLoading(false)
    }
  }

  const filteredReceipts = useMemo(() => {
    return receipts
      .filter((r) => {
        if (activeTab === 'ALL') return true
        if (activeTab === 'PENDING' && r.status === 'PENDING') return true
        if (activeTab === 'APPROVED' && r.status === 'APPROVED') return true
        if (activeTab === 'IN_PROGRESS' && r.status === 'IN_PROGRESS') return true
        if (activeTab === 'COMPLETED' && r.status === 'COMPLETED') return true
        return false
      })
      .sort(compareReceiptsByDateDesc)
  }, [receipts, activeTab])

  const firstReceiptNumber = totalElements === 0 ? 0 : page * pageSize + 1
  const lastReceiptNumber = Math.min(totalElements, page * pageSize + receipts.length)

  const selectedSku = skus.find((sku) => String(sku.id) === String(formSkuId))
  const requestedQuantity = Number(formTotalQuantity) || 0
  const warehouseStockQuantity = stockSummary?.totalQuantity || 0
  const manualAllocationCapacity = (line) => getOutboundAllocationCapacity(line?.allocations || [])
  const availableForRequest = outboundMethod === 'MANUAL'
    ? manualAllocationCapacity(activeOutboundLine)
    : warehouseStockQuantity
  const shortageQuantity = Math.max(requestedQuantity - availableForRequest, 0)
  const projectedRemainingQuantity = Math.max(warehouseStockQuantity - requestedQuantity, 0)
  const hasStockShortage = Boolean(stockSummary) && shortageQuantity > 0
  const outboundLineSummaries = outboundLines.map((line) => {
    const summary = stockSummaryByLine[line.id]
    const quantity = Number(line.quantity) || 0
    const availableQuantity = outboundMethod === 'MANUAL'
      ? manualAllocationCapacity(line)
      : Number(summary?.totalQuantity) || 0
    return {
      ...line,
      summary,
      quantity,
      availableQuantity,
      shortageQuantity: Math.max(quantity - availableQuantity, 0),
    }
  })
  const hasAnyStockShortage = outboundLineSummaries.some((line) => line.shortageQuantity > 0)
  const allOutboundLinesValid = outboundLineSummaries.every(
    (line) => line.skuId && positiveInteger(line.quantity) === '' && line.summary
  )
  const previewShortageQuantity = (previewData?.items || []).reduce(
    (total, item) => total + (Number(item.shortageQuantity) || 0),
    0
  )
  const allManualAllocationsValid = outboundLines.every((line) => {
    const allocations = Array.isArray(line.allocations) ? line.allocations : []
    const allocatedQuantity = allocations.reduce(
      (total, allocation) => total + (Number(allocation.quantity) || 0),
      0
    )
    return allocations.length > 0
      && allocations.every((allocation) => (
        Boolean(allocation.location) && positiveInteger(Number(allocation.quantity)) === ''
      ))
      && allocatedQuantity === Number(line.quantity)
  })

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>
      <div className="flex pt-14">
        <Sidebar currentRole={currentRole} />
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-8 p-4 sm:p-6 md:p-8">
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                    <div className="bg-primary/10 text-primary rounded-lg p-2">
                      <ArrowUpRight className="h-6 w-6" />
                    </div>
                    Outbound Operations
                  </h1>
                  <p className="text-sm text-slate-500">
                    Coordinate outgoing shipments and order fulfillment.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-md border border-slate-200 p-2 text-sm"
                    value={selectedWarehouseId}
                    onChange={(event) => {
                      const warehouseId = event.target.value
                      setSelectedWarehouseId(warehouseId)
                      setPage(0)
                      if (!warehouseId) {
                        receiptRequestIdRef.current += 1
                        setReceipts([])
                        setTotalElements(0)
                        setTotalPages(1)
                        setIsLoading(false)
                      }
                    }}
                  >
                    <option value="">-- Select Warehouse --</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                    disabled={!selectedWarehouseId}
                  >
                    <Minus className="mr-2 h-4 w-4" /> New
                  </Button>
                </div>
              </div>

              <div>
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-6 border-b border-slate-200 bg-slate-50 px-4 pt-2">
                      {[
                        { id: 'ALL', label: 'Tất cả' },
                        { id: 'PENDING', label: 'Chờ duyệt' },
                        { id: 'APPROVED', label: 'Đã xác nhận' },
                        { id: 'IN_PROGRESS', label: 'Đang xử lý' },
                        { id: 'COMPLETED', label: 'Đã hoàn tất' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id)
                            setPage(0)
                          }}
                          className={`relative pb-3 text-sm font-medium transition-colors ${
                            activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {tab.label}
                          {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary rounded-t-md" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white">
                      <div className="flex items-center gap-3">
                        <div className="relative w-72">
                          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <InputField placeholder="Tìm kiếm phiếu xuất..." className="h-9 pl-9" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExport}
                          disabled={!selectedWarehouseId || isExporting}
                          className="flex items-center gap-2 h-9"
                        >
                          {isExporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Xuất Excel
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto bg-white">
                      {isLoading ? (
                        <div className="flex justify-center p-8">
                          <Loader2 className="animate-spin text-slate-400 h-6 w-6" />
                        </div>
                      ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="border-x border-slate-200 px-4 py-3">Mã Phiếu</th>
                              <th className="border-r border-slate-200 px-4 py-3">Trạng thái</th>
                              <th className="border-r border-slate-200 px-4 py-3">Phương thức</th>
                              <th className="border-r border-slate-200 px-4 py-3">Ngày xuất hàng</th>
                              <th className="border-r border-slate-200 px-4 py-3">Nơi nhận</th>
                              <th className="border-r border-slate-200 px-4 py-3">Người phụ trách</th>
                              <th className="border-r border-slate-200 px-4 py-3">Mặt hàng</th>
                              <th className="border-r border-slate-200 px-4 py-3 text-right">Tổng SL</th>
                              <th className="border-r border-slate-200 px-4 py-3 text-center">Hành động</th>
                              <th className="px-4 py-3 text-center">Xuất</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredReceipts.length === 0 && (
                              <tr>
                                <td colSpan="10" className="px-4 py-8 text-center text-slate-500">
                                  Không tìm thấy phiếu xuất kho.
                                </td>
                              </tr>
                            )}
                            {filteredReceipts.map((r) => {
                              const totalItems = r.items?.length || 0
                              const totalQty = r.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
                              const itemNames = r.items?.map((item) => item.skuName || item.skuCode).filter(Boolean) || []
                              const itemSummary = itemNames.length > 1
                                ? `${itemNames[0]} +${itemNames.length - 1}`
                                : itemNames[0] || '—'
                              
                              return (
                                <tr key={r.id} className="transition-colors hover:bg-slate-50/80">
                                  <td className="border-r border-slate-100 px-4 py-3 font-medium text-primary">
                                    {r.id.substring(0, 8).toUpperCase()}
                                  </td>
                                  <td className="border-r border-slate-100 px-4 py-3 text-center">
                                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                        r.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                                          r.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-700' :
                                            r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                              r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-slate-100 text-slate-600'
                                    }`}>
                                      {r.status}
                                    </span>
                                  </td>
                                  <td className="border-r border-slate-100 px-4 py-3">
                                    <span className="text-slate-500">OUTBOUND</span>
                                  </td>
                                  <td className="border-r border-slate-100 px-4 py-3 text-slate-600">
                                    {formatOutboundDate(r.createdAt)}
                                  </td>
                                  <td className="max-w-52 border-r border-slate-100 px-4 py-3">
                                    <span
                                      className="block max-w-52 truncate font-medium text-slate-700"
                                      title={r.receiverName || 'Chưa cập nhật nơi nhận'}
                                    >
                                      {r.receiverName || '—'}
                                    </span>
                                  </td>
                                  <td className="max-w-52 border-r border-slate-100 px-4 py-3">
                                    <span
                                      className="block max-w-52 truncate font-medium text-slate-700"
                                      title={r.createdByFullName || 'Chưa cập nhật người phụ trách'}
                                    >
                                      {r.createdByFullName || '—'}
                                    </span>
                                  </td>
                                  <td className="max-w-60 border-r border-slate-100 px-4 py-3 whitespace-normal">
                                    <span className="block max-w-60 truncate font-medium text-slate-800" title={itemNames.join(', ')}>
                                      {itemSummary}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-slate-400">
                                      {totalItems} mặt hàng
                                    </span>
                                  </td>
                                  <td className="border-r border-slate-100 px-4 py-3 text-right font-semibold text-slate-700">
                                    {totalQty}
                                  </td>
                                  <td className="border-r border-slate-100 px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1">
                                        <button
                                          onClick={() => handleViewDetail(r)}
                                          className="flex items-center gap-1 text-xs font-medium text-slate-600 transition-colors hover:text-primary"
                                        >
                                          <Eye className="h-3.5 w-3.5" /> Chi tiết
                                        </button>
                                        {r.status === 'PENDING' && currentRole === 'TENANT' && (
                                          <>
                                            <span className="text-slate-300">|</span>
                                            <button
                                              onClick={() => handleApprove(r.id)}
                                              className="text-emerald-600 hover:underline text-xs font-medium"
                                            >
                                              Duyệt
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button
                                              onClick={() => {
                                                setRejectingReceiptId(r.id)
                                                setIsRejectModalOpen(true)
                                              }}
                                              className="text-red-600 hover:underline text-xs font-medium"
                                            >
                                              Từ chối
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => handleExportSingleReceipt(r)}
                                      className="text-slate-400 hover:text-slate-600 transition-colors p-1" 
                                      title="In/Xuất phiếu"
                                    >
                                      <Download className="h-4 w-4 mx-auto" />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                    <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-slate-500">
                        Showing {firstReceiptNumber}-{lastReceiptNumber} of {totalElements} receipts
                      </span>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-slate-500">
                          Rows per page
                          <select
                            value={pageSize}
                            disabled={isLoading}
                            onChange={(event) => {
                              setPageSize(Number(event.target.value))
                              setPage(0)
                            }}
                            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                          >
                            {RECEIPT_PAGE_SIZE_OPTIONS.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </label>
                        <span className="min-w-24 text-center text-slate-600">
                          Page {page + 1} of {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={page === 0 || isLoading}
                            onClick={() => setPage((current) => Math.max(0, current - 1))}
                            aria-label="Previous receipt page"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={page >= totalPages - 1 || isLoading}
                            onClick={() => setPage((current) => current + 1)}
                            aria-label="Next receipt page"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </footer>
                  </div>
                </div>
              </div>

              {/* New Outbound Modal */}
              <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create New Outbound Shipment"
                className="max-h-[calc(100vh-1rem)] max-w-4xl overflow-auto sm:max-h-[calc(100vh-2rem)]"
              >
                <FormShell onSubmit={handleCreateReceipt} className="space-y-4">
                  <div className="space-y-2 border-b border-slate-200 pb-4">
                    <label className="text-sm font-medium text-slate-700">Phương thức xuất kho</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="outboundMethod" 
                          className="accent-brand-600"
                          checked={outboundMethod === 'AUTO'}
                          onChange={() => setOutboundMethod('AUTO')}
                        />
                        <span className="text-sm text-slate-700">Tự động lấy hàng (FIFO)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="outboundMethod" 
                          className="accent-brand-600"
                          checked={outboundMethod === 'MANUAL'}
                          onChange={() => {
                            setOutboundMethod('MANUAL')
                            setPreviewData(null)
                          }}
                        />
                        <span className="text-sm text-slate-700">Thủ công (Chọn vị trí cụ thể)</span>
                      </label>
                    </div>
                  </div>

                  <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Products in this shipment</h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Add multiple SKUs. FIFO preview and stock validation run for every line.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const nextLine = createOutboundLine()
                          setOutboundLines((previous) => [...previous, nextLine])
                          setActiveOutboundLineId(nextLine.id)
                          setPreviewData(null)
                        }}
                      >
                        <Plus className="mr-1.5 h-4 w-4" /> Add SKU
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {outboundLines.map((line, index) => {
                        const lineSku = skus.find((sku) => String(sku.id) === String(line.skuId))
                        const lineSummary = stockSummaryByLine[line.id]
                        const lineAllocations = Array.isArray(line.allocations) ? line.allocations : []
                        const allocatedQuantity = lineAllocations.reduce(
                          (total, allocation) => total + (Number(allocation.quantity) || 0),
                          0
                        )
                        const isActive = line.id === activeOutboundLine?.id
                        const lineShortage = Math.max(
                          Number(line.quantity || 0) - Number(lineSummary?.totalQuantity || 0),
                          0
                        )
                        return (
                          <div
                            key={line.id}
                            className={`rounded-lg border p-3 transition-colors ${isActive ? 'border-blue-300 bg-white ring-1 ring-blue-100' : 'border-slate-200 bg-white/80'}`}
                          >
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600">SKU {index + 1}</label>
                                <select
                                  required
                                  value={line.skuId}
                                  onFocus={() => setActiveOutboundLineId(line.id)}
                                  onChange={(event) => {
                                    updateOutboundLine(line.id, {
                                      skuId: event.target.value,
                                      allocations: [createOutboundAllocation()],
                                    })
                                    setActiveOutboundLineId(line.id)
                                    setPreviewData(null)
                                  }}
                                  className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                                >
                                  <option value="">-- Select product --</option>
                                  {skus
                                    .filter((sku) => !outboundLines.some((other) => other.id !== line.id && String(other.skuId) === String(sku.id)))
                                    .map((sku) => (
                                      <option key={sku.id} value={sku.id}>
                                        [{sku.skuCode}] {sku.name}
                                      </option>
                                    ))}
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600">Quantity</label>
                                <InputField
                                  type="number"
                                  min="1"
                                  required
                                  value={line.quantity}
                                  onFocus={() => setActiveOutboundLineId(line.id)}
                                  onChange={(event) => {
                                    updateOutboundLine(line.id, { quantity: event.target.value })
                                    setPreviewData(null)
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                disabled={outboundLines.length === 1}
                                onClick={() => {
                                  setOutboundLines((previous) => previous.filter((item) => item.id !== line.id))
                                  if (line.id === activeOutboundLine?.id) {
                                    const nextLine = outboundLines.find((item) => item.id !== line.id)
                                    setActiveOutboundLineId(nextLine?.id || null)
                                  }
                                  setPreviewData(null)
                                }}
                                className="h-9 rounded-md px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="text-slate-500">
                                {lineSku ? `${lineSku.name} · ${lineSku.uomCode || lineSku.uomName || 'units'}` : 'Choose a SKU to check warehouse stock'}
                              </span>
                              {line.skuId && !isLocationsLoading && (
                                <span className={lineShortage > 0 ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-600'}>
                                  {lineShortage > 0 ? `Short ${lineShortage}` : `Available ${lineSummary?.totalQuantity || 0}`}
                                </span>
                              )}
                            </div>

                            {outboundMethod === 'MANUAL' && (
                              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-semibold text-slate-700">
                                      Phân bổ theo Rack/Bin
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      Đã phân bổ {allocatedQuantity} / {Number(line.quantity) || 0}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addOutboundAllocation(line.id)}
                                    disabled={!line.skuId || isLocationsLoading}
                                    className="rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Plus className="mr-1 inline h-3.5 w-3.5" />
                                    Thêm Rack/Bin
                                  </button>
                                </div>

                                <div className="mt-2 space-y-2">
                                  {lineAllocations.map((allocation, allocationIndex) => (
                                    <div
                                      key={allocation.id}
                                      className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto] sm:items-end"
                                    >
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-slate-500">
                                          Rack/Bin {allocationIndex + 1}
                                        </label>
                                        <select
                                          required
                                          value={allocation.location}
                                          onFocus={() => setActiveOutboundLineId(line.id)}
                                          onChange={(event) => updateOutboundAllocation(
                                            line.id,
                                            allocation.id,
                                            { location: event.target.value }
                                          )}
                                          disabled={!line.skuId || isLocationsLoading}
                                          className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                                        >
                                          <option value="">-- Chọn Rack/Bin --</option>
                                          {(lineSummary?.locations || []).map((location) => {
                                            const locationValue = JSON.stringify(location)
                                            const alreadySelected = lineAllocations.some(
                                              (otherAllocation) => (
                                                otherAllocation.id !== allocation.id
                                                && otherAllocation.location === locationValue
                                              )
                                            )
                                            return (
                                              <option
                                                key={`${location.rackId}_${location.binId}`}
                                                value={locationValue}
                                                disabled={alreadySelected}
                                              >
                                                Kệ {location.rackName} — Ô {location.binName} (Khả dụng: {location.quantity}
                                                {location.reservedQuantity > 0
                                                  ? ` · Đang giữ: ${location.reservedQuantity}`
                                                  : ''})
                                              </option>
                                            )
                                          })}
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-slate-500">Số lượng</label>
                                        <InputField
                                          type="number"
                                          min="1"
                                          required
                                          value={allocation.quantity}
                                          onFocus={() => setActiveOutboundLineId(line.id)}
                                          onChange={(event) => updateOutboundAllocation(
                                            line.id,
                                            allocation.id,
                                            { quantity: event.target.value }
                                          )}
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        disabled={lineAllocations.length === 1}
                                        onClick={() => removeOutboundAllocation(line.id, allocation.id)}
                                        className="h-9 rounded-md px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </section>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Tên nơi nhận (Receiver Name)</label>
                      <InputField
                        placeholder="Ví dụ: Khách hàng B"
                        value={formReceiverName}
                        onChange={(e) => setFormReceiverName(e.target.value)}
                      />
                    </div>

                  {formSkuId && (
                    <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4" aria-live="polite">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold tracking-[0.08em] text-slate-500 uppercase">
                            Kiểm tra tồn kho trước khi xuất
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Số liệu được tổng hợp từ toàn bộ kệ và ô trong kho đã chọn.
                          </p>
                        </div>
                        {isLocationsLoading ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang kiểm tra
                          </span>
                        ) : stockSummary ? (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${hasStockShortage ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {hasStockShortage ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            {hasStockShortage ? `Thiếu ${shortageQuantity.toLocaleString('vi-VN')} đơn vị` : 'Đủ hàng để xuất'}
                          </span>
                        ) : null}
                      </div>

                      {isLocationsLoading ? (
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {[1, 2, 3].map((item) => (
                            <div key={item} className="h-20 animate-pulse rounded-lg bg-white" />
                          ))}
                        </div>
                      ) : stockSummary ? (
                        <>
                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-3">
                              <p className="text-xs text-slate-500">Tồn khả dụng để xuất</p>
                              <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">
                                {warehouseStockQuantity.toLocaleString('vi-VN')}
                                <span className="ml-1 text-xs font-medium text-slate-500">{selectedSku?.uomCode || selectedSku?.uomName || 'đơn vị'}</span>
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                Tổng {Number(stockSummary.grossQuantity || 0).toLocaleString('vi-VN')}
                                {stockSummary.reservedQuantity > 0
                                  ? ` · Đang giữ ${Number(stockSummary.reservedQuantity).toLocaleString('vi-VN')}`
                                  : ''}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">{stockSummary.locations.length} kệ/ô còn khả dụng</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-3">
                              <p className="text-xs text-slate-500">Số lượng yêu cầu xuất</p>
                              <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">
                                {requestedQuantity.toLocaleString('vi-VN')}
                                <span className="ml-1 text-xs font-medium text-slate-500">{selectedSku?.uomCode || selectedSku?.uomName || 'đơn vị'}</span>
                              </p>
                              <p className="mt-1 text-xs text-slate-400">{outboundMethod === 'AUTO' ? 'Phân bổ theo FIFO' : 'Theo các vị trí đã chọn'}</p>
                            </div>
                            <div className={`rounded-lg border px-3.5 py-3 ${hasStockShortage ? 'border-rose-200 bg-rose-50/70' : 'border-emerald-200 bg-emerald-50/70'}`}>
                              <p className="text-xs text-slate-500">Còn lại dự kiến sau xuất</p>
                              <p className={`mt-1 text-xl font-bold tabular-nums ${hasStockShortage ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {projectedRemainingQuantity.toLocaleString('vi-VN')}
                                <span className="ml-1 text-xs font-medium text-slate-500">{selectedSku?.uomCode || selectedSku?.uomName || 'đơn vị'}</span>
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {hasStockShortage
                                  ? `Cần bổ sung ${shortageQuantity.toLocaleString('vi-VN')} đơn vị`
                                  : 'Tồn kho đáp ứng yêu cầu'}
                              </p>
                            </div>
                          </div>

                          {stockSummary.locations.length > 0 && (
                            <div className="mt-4 border-t border-slate-200 pt-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-semibold text-slate-700">Phân bổ hàng trên kệ</p>
                                <span className="text-xs text-slate-400">{stockSummary.locations.length} vị trí</span>
                              </div>
                              <div className="mt-2 grid max-h-32 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                                {stockSummary.locations.map((location) => (
                                  <div key={`${location.rackId || location.rackName}_${location.binId || location.binName}`} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs">
                                    <span className="min-w-0 truncate text-slate-600">
                                      Kệ {location.rackName || '—'} · Ô {location.binName || '—'}
                                      {location.reservedQuantity > 0
                                        ? ` · Đang giữ ${location.reservedQuantity}`
                                        : ''}
                                    </span>
                                    <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                                      Khả dụng {location.quantity.toLocaleString('vi-VN')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : null}
                    </section>
                  )}

                  {outboundMethod === 'AUTO' && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <MapIcon className="h-4 w-4 text-emerald-600" /> Lộ trình lấy hàng đề xuất (FIFO)
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handlePreview}
                          isLoading={isPreviewLoading}
                          disabled={!formSkuId || !formTotalQuantity}
                        >
                          Xem trước lộ trình
                        </Button>
                      </div>

                      {!previewData ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                          Nhấn "Xem trước lộ trình" để hệ thống tính toán tuyến đường lấy hàng tối ưu.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {!previewData.complete && (
                            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                              <strong>Phát hiện thiếu hàng!</strong> Hệ thống đang thiếu{' '}
                              {previewShortageQuantity} sản phẩm so với yêu cầu. Bạn không thể tạo phiếu xuất này.
                            </div>
                          )}
                          <div className="max-h-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                            <div className="relative border-l-2 border-emerald-200 ml-3 space-y-6">
                              {previewData.stops?.map((stop, index) => (
                                <div
                                  key={index}
                                  className="relative pl-6"
                                >
                                  <div className="absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 border-4 border-white text-sm font-bold text-emerald-600 shadow-sm">
                                    {stop.sequence}
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                                      <div className="flex min-w-0 items-start gap-2">
                                        <MapPin className="h-4 w-4 text-rose-500" />
                                        <span className="min-w-0 break-words text-sm font-bold text-slate-800">
                                          Kệ {stop.rackCode} — Ô {stop.binCode}
                                        </span>
                                      </div>
                                      <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                        Tầng {stop.shelfLevel}
                                      </span>
                                    </div>
                                    
                                    <div className="overflow-x-auto rounded-lg border border-slate-100">
                                      <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-xs text-slate-500">
                                          <tr>
                                            <th className="px-3 py-2 font-medium">Sản phẩm (SKU)</th>
                                            <th className="px-3 py-2 font-medium">Ngày nhập</th>
                                            <th className="px-3 py-2 text-right font-medium">Cần lấy</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {stop.lines?.map((line, lIndex) => (
                                            <tr key={lIndex}>
                                              <td className="px-3 py-2 font-mono font-medium text-slate-800">{line.skuCode}</td>
                                              <td className="px-3 py-2 text-slate-500">
                                                {line.arrivalDate ? new Date(line.arrivalDate).toLocaleDateString('vi-VN') : '—'}
                                              </td>
                                              <td className="px-3 py-2 text-right font-bold text-emerald-700">
                                                {line.quantity}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Note (Optional)</label>
                    <InputField
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      placeholder="Enter notes..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isSubmitting}
                      disabled={
                        !allOutboundLinesValid ||
                        isLocationsLoading ||
                        hasAnyStockShortage ||
                        (outboundMethod === 'AUTO' && !previewData?.complete) ||
                        (outboundMethod === 'MANUAL' && !allManualAllocationsValid)
                      }
                    >
                      Confirm Outbound
                    </Button>
                  </div>
                </FormShell>
              </Modal>

              <Modal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                title="Reject Receipt"
              >
                <FormShell onSubmit={handleReject} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Reason for rejection *
                    </label>
                    <InputField
                      placeholder="Enter reason..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsRejectModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="danger" isLoading={isSubmitting}>
                      Confirm Reject
                    </Button>
                  </div>
                </FormShell>
              </Modal>

              <ReceiptDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                receipt={detailReceipt}
                isLoading={isDetailLoading}
                type="OUTBOUND"
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default OutboundPage
