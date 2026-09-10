import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FormShell } from '@/form/FormControls'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import { ArrowDownLeft, Search, Plus, Download, Loader2 } from 'lucide-react'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Modal from '@/components/organisms/Modal'
import receiptApi from '@/services/wms/receiptApi'
import productApi from '../../../services/wms/productApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import layoutApi from '@/services/layoutApi'
import putawayApi from '@/services/wms/putawayApi'
import { toast } from 'react-hot-toast'
import ReceiptDetailModal from '@/features/inventory/components/ReceiptDetailModal'
import { showApiErrorToast } from '@/config/apiError'
import useActiveWarehouseContext from '@/hooks/useActiveWarehouseContext'
import { positiveInteger, required } from '@/config/validation'

const CAPACITY_EPSILON = 1e-9

const InboundPage = () => {
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
  const [layout, setLayout] = useState(null)

  // Selection states
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  useActiveWarehouseContext(selectedWarehouseId)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('ALL')

  // Form states. The BE accepts multiple receipt items, so keep one editable
  // line per SKU and only use the active line for the bin allocation view.
  const createInboundLine = () => ({
    id: `inbound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    skuId: '',
    quantity: 1,
    allocations: {},
    note: '',
  })
  const [inboundLines, setInboundLines] = useState(() => [createInboundLine()])
  const [activeInboundLineId, setActiveInboundLineId] = useState(null)
  const [binCapacities, setBinCapacities] = useState({})
  const [rackCapacities, setRackCapacities] = useState({})
  const allocationScrollRef = useRef(null)
  const allocationBinRefs = useRef({})
  const [suggestionScrollTarget, setSuggestionScrollTarget] = useState(null)
  const [suggestedBinIdsByLine, setSuggestedBinIdsByLine] = useState({})
  const [isCapacityLoading, setIsCapacityLoading] = useState(false)
  const [capacityRefreshKey, setCapacityRefreshKey] = useState(0)
  const [formSenderName, setFormSenderName] = useState('')

  const activeInboundLine = inboundLines.find((line) => line.id === activeInboundLineId && line.skuId)
    || inboundLines.find((line) => line.skuId)
    || inboundLines[0]
  const formSkuId = activeInboundLine?.skuId || ''
  const formTotalQuantity = activeInboundLine?.quantity ?? 1
  const allocations = useMemo(() => activeInboundLine?.allocations || {}, [activeInboundLine])
  const formNote = activeInboundLine?.note || ''
  const updateInboundLine = (lineId, patch) => {
    setInboundLines((previous) => previous.map((line) => (
      line.id === lineId ? { ...line, ...patch } : line
    )))
  }

  const selectedSku = useMemo(
    () => skus.find((sku) => String(sku.id) === String(formSkuId)),
    [formSkuId, skus]
  )
  const selectedUnitWeightKg = Number(selectedSku?.unitWeightKg) || 0
  const selectedUnitVolumeM3 = Number(selectedSku?.unitVolumeM3) || 0
  const getRackCapacity = (rack) =>
    rackCapacities[String(rack?.id)] || {
      currentWeightKg: 0,
      currentVolumeM3: 0,
      maxWeight: Number(rack?.maxWeight) || 0,
      maxVolume: Number(rack?.maxVolume) || 0,
    }
  const allocatedQuantity = useMemo(
    () => Object.values(allocations).reduce((total, value) => total + (Number(value) || 0), 0),
    [allocations]
  )
  const inboundTotals = useMemo(() => inboundLines.reduce(
    (totals, line) => ({
      requested: totals.requested + (Number(line.quantity) || 0),
      allocated: totals.allocated + Object.values(line.allocations || {}).reduce(
        (lineTotal, value) => lineTotal + (Number(value) || 0),
        0
      ),
    }),
    { requested: 0, allocated: 0 }
  ), [inboundLines])
  const inboundAllocationsByBin = useMemo(() => {
    const allocationsByBin = {}
    inboundLines.forEach((line) => {
      const sku = skus.find((item) => String(item.id) === String(line.skuId))
      Object.entries(line.allocations || {}).forEach(([binId, value]) => {
        const quantity = Number(value) || 0
        if (quantity <= 0) return
        if (!allocationsByBin[String(binId)]) allocationsByBin[String(binId)] = []
        allocationsByBin[String(binId)].push({
          lineId: line.id,
          skuCode: sku?.skuCode || sku?.code || line.skuId,
          skuName: sku?.name || 'SKU',
          quantity,
        })
      })
    })
    return allocationsByBin
  }, [inboundLines, skus])
  const suggestedBinIds = useMemo(() => {
    const allSuggestedBinIds = new Set()
    Object.values(suggestedBinIdsByLine).forEach((lineBinIds) => {
      if (!lineBinIds) return
      lineBinIds.forEach((binId) => allSuggestedBinIds.add(String(binId)))
    })
    return allSuggestedBinIds
  }, [suggestedBinIdsByLine])

  const inboundBinMetrics = useMemo(() => {
    const metrics = {}
    inboundLines.forEach((line) => {
      const sku = skus.find((item) => String(item.id) === String(line.skuId))
      const unitWeightKg = Number(sku?.unitWeightKg) || 0
      const unitVolumeM3 = Number(sku?.unitVolumeM3) || 0
      Object.entries(line.allocations || {}).forEach(([binId, quantityValue]) => {
        const quantity = Number(quantityValue) || 0
        if (quantity <= 0) return
        if (!metrics[binId]) {
          metrics[binId] = { units: 0, weightKg: 0, volumeM3: 0 }
        }
        metrics[binId].units += quantity
        metrics[binId].weightKg += quantity * unitWeightKg
        metrics[binId].volumeM3 += quantity * unitVolumeM3
      })
    })
    return metrics
  }, [inboundLines, skus])

  const inboundRackMetrics = useMemo(() => {
    const metrics = {}
    layout?.racks?.forEach((rack) => {
      metrics[String(rack.id)] = { units: 0, weightKg: 0, volumeM3: 0 }
    })
    layout?.racks?.forEach((rack) => {
      rack.bins?.forEach((bin) => {
        const binMetric = inboundBinMetrics[String(bin.id)]
        if (!binMetric) return
        const rackMetric = metrics[String(rack.id)] || { units: 0, weightKg: 0, volumeM3: 0 }
        rackMetric.units += binMetric.units
        rackMetric.weightKg += binMetric.weightKg
        rackMetric.volumeM3 += binMetric.volumeM3
        metrics[String(rack.id)] = rackMetric
      })
    })
    return metrics
  }, [inboundBinMetrics, layout])

  const allInboundLinesReady = inboundLines.every((line) => {
    const sku = skus.find((item) => String(item.id) === String(line.skuId))
    const lineAllocated = Object.values(line.allocations || {}).reduce(
      (total, value) => total + (Number(value) || 0),
      0
    )
    return Boolean(
      line.skuId &&
      sku &&
      Number(sku.unitWeightKg) > 0 &&
      Number(sku.unitVolumeM3) > 0 &&
      !positiveInteger(Number(line.quantity)) &&
      lineAllocated === Number(line.quantity)
    )
  })

  useEffect(() => {
    if (inboundLines.length > 0 && !inboundLines.some((line) => line.id === activeInboundLineId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveInboundLineId(inboundLines[0].id)
    }
  }, [activeInboundLineId, inboundLines])

  useEffect(() => {
    const targetId = suggestionScrollTarget?.binId
    const scrollContainer = allocationScrollRef.current
    const targetElement = targetId ? allocationBinRefs.current[String(targetId)] : null
    if (!scrollContainer || !targetElement) return undefined

    const animationFrame = window.requestAnimationFrame(() => {
      const containerRect = scrollContainer.getBoundingClientRect()
      const targetRect = targetElement.getBoundingClientRect()
      const targetScrollTop = scrollContainer.scrollTop + (targetRect.top - containerRect.top) - 12
      scrollContainer.scrollTo({ top: Math.max(targetScrollTop, 0), behavior: 'smooth' })
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [isCapacityLoading, layout, suggestionScrollTarget])

  useEffect(() => {
    let active = true
    const fetchCapacities = async () => {
      if (!selectedWarehouseId || !layout) return
      setIsCapacityLoading(true)
      try {
        const nextCapacities = {}
        const nextRackCapacities = {}
        const response = await layoutApi.getCapacity(selectedWarehouseId)
        const capacityPayload = response?.data?.data ?? response?.data ?? {}

        // Capacity API is the source of truth for physical load. It already
        // calculates current kg/m³ independently for each Rack and Bin.
        const capacityRacks = Array.isArray(capacityPayload.racks) ? capacityPayload.racks : []
        capacityRacks.forEach((rackMetric) => {
          if (rackMetric?.rackId) {
            nextRackCapacities[String(rackMetric.rackId)] = {
              currentWeightKg: Number(rackMetric.currentWeightKg) || 0,
              currentVolumeM3: Number(rackMetric.currentVolumeM3) || 0,
              maxWeight: Number(rackMetric.maxWeightKg) || 0,
              maxVolume: Number(rackMetric.maxVolumeM3) || 0,
            }
          }

          const capacityBins = Array.isArray(rackMetric?.bins) ? rackMetric.bins : []
          capacityBins.forEach((binMetric) => {
            if (!binMetric?.binId) return
            nextCapacities[String(binMetric.binId)] = {
              currentUnits: (binMetric.storedSkus || []).reduce(
                (total, sku) => total + (Number(sku.quantity) || 0),
                0
              ),
              currentWeightKg: Number(binMetric.currentWeightKg) || 0,
              currentVolumeM3: Number(binMetric.currentVolumeM3) || 0,
              maxWeight: Number(binMetric.maxWeightKg) || 0,
              maxVolume: Number(binMetric.maxVolumeM3) || 0,
            }
          })
        })

        // Keep newly-created/legacy layout bins usable if the capacity
        // response does not contain them yet.
        layout.racks?.forEach((rack) => {
          rack.bins?.forEach((bin) => {
            const binId = String(bin.id)
            if (!nextCapacities[binId]) {
              nextCapacities[binId] = {
                currentUnits: 0,
                currentWeightKg: 0,
                currentVolumeM3: 0,
                maxWeight: Number(bin.maxWeight) || 0,
                maxVolume: Number(bin.maxVolume) || 0,
              }
            }
          })
        })

        if (active) setBinCapacities(nextCapacities)
        if (active) setRackCapacities(nextRackCapacities)
      } catch (error) {
        console.error('Error fetching Bin usage', error)
        if (active) {
          setBinCapacities({})
          setRackCapacities({})
        }
      } finally {
        if (active) setIsCapacityLoading(false)
      }
    }
    fetchCapacities()
    return () => {
      active = false
    }
  }, [selectedWarehouseId, layout, capacityRefreshKey])

  const fetchInitialData = useCallback(async () => {
    try {
      const [whRes, skuRes] = await Promise.all([
        warehouseApi.getMyWarehouses(),
        productApi.getAllSKUs(),
      ])

      // API trả về danh sách kho, có thể ở data.data hoặc data.data.content
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
        showApiErrorToast(error, 'Subscription required for inbound.')
      } else {
        showApiErrorToast(error, 'Could not load inbound data.')
      }
    }
  }, [searchParams])

  const fetchLayout = useCallback(async () => {
    try {
      const res =
        currentRole === 'STAFF'
          ? await warehouseApi.getPublicWarehouseLayout(selectedWarehouseId, {
            skipErrorToast: true,
          })
          : await layoutApi.getTenantWarehouseLayout(selectedWarehouseId)
      setLayout(res.data?.data)
    } catch (error) {
      setLayout(null)
      if (error.response?.status !== 404) {
        console.error('Error fetching layout:', error)
      }
    }
  }, [currentRole, selectedWarehouseId])

  const fetchReceipts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await receiptApi.getReceipts(selectedWarehouseId, {
        type: 'INBOUND',
        page: 0,
        size: 20,
      })
      setReceipts(res.data?.data?.content || [])
    } catch (error) {
      console.error('Error fetching receipts:', error)
      if (error.response?.data?.errorCode === 'SUBSCRIPTION_REQUIRED') {
        // Only show if not already shown by initial data
      } else {
        showApiErrorToast(error, 'Could not load receipts.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedWarehouseId])

  useEffect(() => {
    // Initial server data is intentionally loaded when this screen mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInitialData()
  }, [fetchInitialData])

  useEffect(() => {
    if (selectedWarehouseId) {
      // Refresh server-backed data whenever the active warehouse changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchReceipts()
      fetchLayout()
    }
  }, [fetchLayout, fetchReceipts, selectedWarehouseId])

  const handleExport = async () => {
    if (!selectedWarehouseId) return
    setIsExporting(true)
    try {
      const response = await receiptApi.exportReceipts(selectedWarehouseId, 'INBOUND')
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'inbound-receipts.csv')
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
    // Headers
    csvRows.push(['Mã Phiếu', 'Trạng thái', 'Ngày tạo', 'Tên mặt hàng', 'Mã SKU', 'Số lượng'].join(','))

    receipt.items.forEach(item => {
      csvRows.push([
        receipt.id.substring(0, 8).toUpperCase(),
        receipt.status,
        new Date(receipt.createdAt).toLocaleDateString('vi-VN'),
        `"${item.skuName || ''}"`,
        item.skuCode || '',
        item.quantity || 0
      ].join(','))
    })

    const csvContent = csvRows.join('\n')
    // Add BOM for UTF-8 Excel compatibility
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `phieu-nhap-${receipt.id.substring(0, 8)}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    toast.success('Đã xuất file chi tiết phiếu nhập.')
  }

  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    const payloadItems = []
    const binsById = new Map()
    const racksById = new Map()
    layout?.racks?.forEach((rack) => {
      racksById.set(String(rack.id), {
        rack,
        incomingUnits: 0,
        incomingWeightKg: 0,
        incomingVolumeM3: 0,
      })
      rack.bins?.forEach((bin) => {
        binsById.set(String(bin.id), { bin, rack })
      })
    })

    const selectedSkuIds = new Set()
    const incomingByBin = {}
    let totalRequestedUnits = 0

    for (const line of inboundLines) {
      const skuError = required(line.skuId, 'Product')
      if (skuError) {
        toast.error('Select a product for every line.')
        return
      }
      if (selectedSkuIds.has(String(line.skuId))) {
        toast.error('Each SKU can only appear once in a receipt.')
        return
      }
      selectedSkuIds.add(String(line.skuId))

      const sku = skus.find((item) => String(item.id) === String(line.skuId))
      const unitWeightKg = Number(sku?.unitWeightKg) || 0
      const unitVolumeM3 = Number(sku?.unitVolumeM3) || 0
      if (unitWeightKg <= 0 || unitVolumeM3 <= 0) {
        toast.error(`Set weight and volume for ${sku?.name || 'each selected SKU'} first.`)
        return
      }

      const requestedQuantity = Number(line.quantity)
      const quantityError = positiveInteger(requestedQuantity)
      if (quantityError) {
        toast.error(quantityError)
        return
      }
      totalRequestedUnits += requestedQuantity

      const activeAllocations = Object.entries(line.allocations || {}).filter(([, qty]) => Number(qty) > 0)
      if (activeAllocations.length === 0) {
        toast.error(`Allocate ${sku?.name || 'the SKU'} to at least one bin.`)
        return
      }
      let totalAllocated = 0

      for (const [binId, qtyStr] of activeAllocations) {
        const qty = Number(qtyStr)
        if (positiveInteger(qty)) {
          toast.error('Each bin quantity must be a positive whole number.')
          return
        }
        totalAllocated += qty

        const binContext = binsById.get(String(binId))
        const rackId = binContext?.rack?.id
        if (!binContext || rackId == null || rackId === '') {
          toast.error('Rack not found for a selected bin.')
          return
        }

        const binMetric = incomingByBin[String(binId)] || {
          units: 0,
          weightKg: 0,
          volumeM3: 0,
        }
        binMetric.units += qty
        binMetric.weightKg += qty * unitWeightKg
        binMetric.volumeM3 += qty * unitVolumeM3
        incomingByBin[String(binId)] = binMetric

        const rackTotals = racksById.get(String(rackId))
        rackTotals.incomingUnits += qty
        rackTotals.incomingWeightKg += qty * unitWeightKg
        rackTotals.incomingVolumeM3 += qty * unitVolumeM3

        payloadItems.push({
          skuId: line.skuId,
          quantity: qty,
          rackId,
          binId,
          note: line.note,
        })
      }

      if (totalAllocated !== requestedQuantity) {
        toast.error(`Allocated ${totalAllocated} for ${sku?.name || 'the SKU'}; expected ${requestedQuantity}.`)
        return
      }
    }

    if (totalRequestedUnits <= 0 || payloadItems.length === 0) {
      toast.error('Add at least one SKU and allocate its quantity to bins.')
      return
    }

    for (const [binId, incoming] of Object.entries(incomingByBin)) {
      const binContext = binsById.get(String(binId))
      const capacity = binCapacities[binId] || {
        currentWeightKg: 0,
        currentVolumeM3: 0,
        maxWeight: Number(binContext?.bin?.maxWeight) || 0,
        maxVolume: Number(binContext?.bin?.maxVolume) || 0,
      }
      const projectedBinWeight = (Number(capacity.currentWeightKg) || 0) + incoming.weightKg
      const projectedBinVolume = (Number(capacity.currentVolumeM3) || 0) + incoming.volumeM3
      if (Number(capacity.maxWeight) > 0 && projectedBinWeight > Number(capacity.maxWeight) + CAPACITY_EPSILON) {
        toast.error(`${binContext?.bin?.name || binContext?.bin?.code || 'Bin'} exceeds its weight limit.`)
        return
      }
      if (Number(capacity.maxVolume) > 0 && projectedBinVolume > Number(capacity.maxVolume) + CAPACITY_EPSILON) {
        toast.error(`${binContext?.bin?.name || binContext?.bin?.code || 'Bin'} exceeds its volume limit.`)
        return
      }
    }

    for (const { rack, incomingWeightKg, incomingVolumeM3 } of racksById.values()) {
      const rackCapacity = getRackCapacity(rack)
      const currentWeightKg = Number(rackCapacity.currentWeightKg) || 0
      const currentVolumeM3 = Number(rackCapacity.currentVolumeM3) || 0
      const rackMaxWeight = Number(rackCapacity.maxWeight) || 0
      const rackMaxVolume = Number(rackCapacity.maxVolume) || 0
      if (
        rackMaxWeight > 0 &&
        currentWeightKg + incomingWeightKg > rackMaxWeight + CAPACITY_EPSILON
      ) {
        toast.error(`${rack.name || rack.code || 'Rack'} exceeds its weight limit.`)
        return
      }
      if (
        rackMaxVolume > 0 &&
        currentVolumeM3 + incomingVolumeM3 > rackMaxVolume + CAPACITY_EPSILON
      ) {
        toast.error(`${rack.name || rack.code || 'Rack'} exceeds its volume limit.`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        type: 'INBOUND',
        senderName: formSenderName,
        items: payloadItems,
      }
      await receiptApi.createReceipt(payload)
      toast.success('Inbound receipt created.')
      setIsModalOpen(false)
      fetchReceipts()

      const emptyLine = createInboundLine()
      setInboundLines([emptyLine])
      setActiveInboundLineId(emptyLine.id)
      setSuggestedBinIdsByLine({})
      setSuggestionScrollTarget(null)
      setFormSenderName('')
    } catch (error) {
      console.error('Error creating receipt:', error)
      showApiErrorToast(error, 'Could not create receipt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGetSuggestions = async () => {
    const suggestionItems = inboundLines.map((line) => ({
      skuId: line.skuId,
      quantity: Number(line.quantity),
    }))
    if (
      !selectedWarehouseId ||
      suggestionItems.some((item) => !item.skuId || positiveInteger(item.quantity))
    ) {
      toast.error('Select a SKU and enter a valid quantity for every line.')
      return
    }
    try {
      setIsLoading(true)
      const res = await putawayApi.getSuggestions({
        warehouseId: selectedWarehouseId,
        context: 'INBOUND',
        items: suggestionItems,
      })

      const data = res.data?.data || {}
      const responseItems = Array.isArray(data.items) ? data.items : []
      const unallocatedQuantity = responseItems.reduce(
        (total, item) => total + (Number(item.unallocatedQuantity) || 0),
        0
      )

      if (unallocatedQuantity > 0) {
        toast.error(
          `Warning: ${unallocatedQuantity} units could not be allocated due to capacity limits!`
        )
      } else {
        toast.success('Suggestions loaded successfully.')
      }

      const allocationsBySku = {}
      const suggestedBinsBySku = {}
      responseItems.forEach((item) => {
        const skuKey = String(item.skuId)
        const newAllocations = {}
        item.allocations?.forEach((allocation) => {
          if (allocation.binId && Number(allocation.quantity) > 0) {
            newAllocations[allocation.binId] =
              (newAllocations[allocation.binId] || 0) + Number(allocation.quantity)
          }
        })
        allocationsBySku[skuKey] = newAllocations
        suggestedBinsBySku[skuKey] = new Set(Object.keys(newAllocations).map(String))
      })

      setInboundLines((previous) => previous.map((line) => ({
        ...line,
        allocations: allocationsBySku[String(line.skuId)] || {},
      })))
      setSuggestedBinIdsByLine((previous) => {
        const next = { ...previous }
        inboundLines.forEach((line) => {
          next[line.id] = suggestedBinsBySku[String(line.skuId)] || new Set()
        })
        return next
      })
      const firstSuggestedLine = inboundLines.find(
        (line) => Object.keys(allocationsBySku[String(line.skuId)] || {}).length > 0
      )
      if (firstSuggestedLine) setActiveInboundLineId(firstSuggestedLine.id)
      const activeSuggestedBins = suggestedBinsBySku[String(firstSuggestedLine?.skuId || activeInboundLine?.skuId)] || new Set()
      const firstSuggestedBinId = [...activeSuggestedBins][0]
      if (firstSuggestedBinId) {
        setSuggestionScrollTarget({ binId: firstSuggestedBinId, requestedAt: Date.now() })
      } else {
        setSuggestionScrollTarget(null)
      }

    } catch (error) {
      console.error('Error getting suggestions:', error)
      showApiErrorToast(error, 'Could not load put-away suggestions.')
    } finally {
      setIsLoading(false)
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
      fetchReceipts()
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
      toast.success('Inbound receipt approved.')
      fetchReceipts()
      setCapacityRefreshKey((current) => current + 1)
    } catch (error) {
      console.error('Error approving receipt:', error)
      showApiErrorToast(error, 'Could not approve receipt.')
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
    return receipts.filter((r) => {
      if (activeTab === 'ALL') return true
      if (activeTab === 'PENDING' && r.status === 'PENDING') return true
      if (activeTab === 'APPROVED' && r.status === 'APPROVED') return true
      if (activeTab === 'IN_PROGRESS' && r.status === 'IN_PROGRESS') return true
      if (activeTab === 'COMPLETED' && r.status === 'COMPLETED') return true
      return false
    })
  }, [receipts, activeTab])


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
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
            }`}
        >
          <main className="mx-auto w-full max-w-400 space-y-8 p-4 sm:p-6 md:p-8">
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                    <div className="bg-success/10 text-success rounded-lg p-2">
                      <ArrowDownLeft className="h-6 w-6" />
                    </div>
                    Inbound Operations
                  </h1>
                  <p className="text-sm text-slate-500">
                    Manage incoming shipments and stock replenishment.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-md border border-slate-200 p-2 text-sm"
                    value={selectedWarehouseId}
                    onChange={(e) => {
                      setSelectedWarehouseId(e.target.value)
                      setInboundLines((previous) => previous.map((line) => ({ ...line, allocations: {} })))
                      setBinCapacities({})
                      setSuggestedBinIdsByLine({})
                      setSuggestionScrollTarget(null)
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
                    <Plus className="mr-2 h-4 w-4" /> New
                  </Button>
                </div>
              </div>

              <div>
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {/* Tabs */}
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
                          onClick={() => setActiveTab(tab.id)}
                          className={`relative pb-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                          {tab.label}
                          {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary rounded-t-md" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Toolbar */}
                    <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white">
                      <div className="flex items-center gap-3">
                        <div className="relative w-72">
                          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <InputField placeholder="Tìm kiếm phiếu nhập..." className="h-9 pl-9" />
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

                    {/* Table */}
                    <div className="overflow-x-auto bg-white">
                      {isLoading ? (
                        <div className="flex justify-center p-8">
                          <Loader2 className="animate-spin text-slate-400 h-6 w-6" />
                        </div>
                      ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="rounded border-slate-300" /></th>
                              <th className="px-4 py-3 border-x border-slate-200">Số dự kiến nhập kho</th>
                              <th className="px-4 py-3 border-r border-slate-200">Tên nơi gửi</th>
                              <th className="px-4 py-3 border-r border-slate-200">Tên người phụ trách</th>
                              <th className="px-4 py-3 border-r border-slate-200">Tên mặt hàng [Thông số]</th>
                              <th className="px-4 py-3 border-r border-slate-200">Ngày nhập kho</th>
                              <th className="px-4 py-3 border-r border-slate-200 text-right">Tổng số lượng dự kiến</th>
                              <th className="px-4 py-3 border-r border-slate-200 text-center">Hiện trạng</th>
                              <th className="px-4 py-3 text-center">In</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredReceipts.length === 0 ? (
                              <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                                  Không có dữ liệu phiếu nhập.
                                </td>
                              </tr>
                            ) : filteredReceipts.map(r => {
                              const totalQty = (r.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
                              const itemName = r.items?.length > 0
                                ? `${r.items[0].skuName}${r.items.length > 1 ? ` và ${r.items.length - 1} mục khác` : ''}`
                                : '—'
                              return (
                                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-4 py-3 text-center border-r border-slate-100"><input type="checkbox" className="rounded border-slate-300" /></td>
                                  <td className="px-4 py-3 border-r border-slate-100 text-primary font-medium">{r.id.substring(0, 8).toUpperCase()}</td>
                                  <td className="px-4 py-3 border-r border-slate-100 text-slate-500">{r.senderName || '—'}</td>
                                  <td className="px-4 py-3 border-r border-slate-100 text-slate-700">{r.createdByFullName || '—'}</td>
                                  <td className="px-4 py-3 border-r border-slate-100 whitespace-normal min-w-[200px]">{itemName}</td>
                                  <td className="px-4 py-3 border-r border-slate-100">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                                  <td className="px-4 py-3 border-r border-slate-100 text-right font-semibold text-slate-700">{totalQty}</td>
                                  <td className="px-4 py-3 border-r border-slate-100 text-center">
                                    <div className="flex flex-col gap-1 items-center">
                                      <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                          r.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                                            r.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-700' :
                                              r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        {r.status}
                                      </span>
                                      <div className="flex items-center justify-center gap-2 mt-1">
                                        <button
                                          onClick={() => handleViewDetail(r)}
                                          className="text-primary hover:underline text-xs font-medium"
                                        >
                                          Xem
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
                  </div>
                </div>
              </div>

              {/* New Inbound Modal */}
              <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Register New Inbound Shipment"
                className="max-h-[92vh] max-w-5xl overflow-y-auto"
              >
                <FormShell onSubmit={handleCreateReceipt} className="space-y-4">
                  <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Products in this receipt</h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Add multiple SKUs and allocate each one to its destination bins.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleGetSuggestions}
                          isLoading={isLoading}
                          disabled={inboundLines.some((line) => !line.skuId || positiveInteger(Number(line.quantity)))}
                        >
                          Suggest all bins
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const nextLine = createInboundLine()
                            setInboundLines((previous) => [...previous, nextLine])
                            setActiveInboundLineId(nextLine.id)
                          }}
                        >
                          <Plus className="mr-1.5 h-4 w-4" /> Add SKU
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {inboundLines.map((line, index) => {
                        const lineSku = skus.find((sku) => String(sku.id) === String(line.skuId))
                        const lineAllocated = Object.values(line.allocations || {}).reduce(
                          (total, value) => total + (Number(value) || 0),
                          0
                        )
                        const isActive = line.id === activeInboundLine?.id
                        return (
                          <div
                            key={line.id}
                            className={`rounded-lg border p-3 transition-colors ${isActive ? 'border-blue-300 bg-white ring-1 ring-blue-100' : 'border-slate-200 bg-white/80'}`}
                          >
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600">
                                  SKU {index + 1}
                                </label>
                                <select
                                  required
                                  value={line.skuId}
                                  onFocus={() => setActiveInboundLineId(line.id)}
                                  onChange={(event) => {
                                    updateInboundLine(line.id, {
                                      skuId: event.target.value,
                                      allocations: {},
                                    })
                                    setActiveInboundLineId(line.id)
                                    setSuggestedBinIdsByLine((previous) => ({ ...previous, [line.id]: new Set() }))
                                    setSuggestionScrollTarget(null)
                                  }}
                                  className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                                >
                                  <option value="">-- Select product --</option>
                                  {skus
                                    .filter((sku) => !inboundLines.some((other) => other.id !== line.id && String(other.skuId) === String(sku.id)))
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
                                  onFocus={() => setActiveInboundLineId(line.id)}
                                  onChange={(event) => updateInboundLine(line.id, { quantity: event.target.value })}
                                />
                              </div>
                              <button
                                type="button"
                                disabled={inboundLines.length === 1}
                                onClick={() => {
                                  setInboundLines((previous) => previous.filter((item) => item.id !== line.id))
                                  setSuggestedBinIdsByLine((previous) => {
                                    const next = { ...previous }
                                    delete next[line.id]
                                    return next
                                  })
                                  if (line.id === activeInboundLine?.id) {
                                    const nextLine = inboundLines.find((item) => item.id !== line.id)
                                    setActiveInboundLineId(nextLine?.id || null)
                                  }
                                }}
                                className="h-9 rounded-md px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                              <span>{lineSku ? `${lineSku.name} · ${lineSku.uomCode || lineSku.uomName || 'units'}` : 'Choose a SKU to configure bin allocation'}</span>
                              <button type="button" onClick={() => setActiveInboundLineId(line.id)} className="font-semibold text-blue-700 hover:underline">
                                {isActive ? `Allocating ${lineAllocated}/${Number(line.quantity) || 0}` : `Configure allocation (${lineAllocated}/${Number(line.quantity) || 0})`}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Tên nơi gửi (Sender Name)</label>
                      <InputField
                        placeholder="Ví dụ: Nhà cung cấp A"
                        value={formSenderName}
                        onChange={(e) => setFormSenderName(e.target.value)}
                      />
                    </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <label className="text-sm font-medium text-slate-700">
                          Allocate into Bins
                          </label>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Auto-Suggest calculates all {inboundLines.length} SKU lines together.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleGetSuggestions}
                          disabled={inboundLines.some((line) => !line.skuId || positiveInteger(Number(line.quantity)))}
                        >
                          ✨ Auto-Suggest
                        </Button>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-right text-xs font-semibold text-slate-600">
                        <span className="block">Total allocated: {inboundTotals.allocated} / {inboundTotals.requested} units</span>
                        <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
                          All selected SKU lines are included in this total.
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                      {selectedSku ? (
                        selectedUnitWeightKg > 0 && selectedUnitVolumeM3 > 0 ? (
                          <>
                            Each unit weighs {selectedUnitWeightKg.toLocaleString('en-US')} kg. The
                            allocation is limited automatically by the available Rack and Bin
                            capacity.
                          </>
                        ) : (
                          'This SKU is missing physical properties. Update its unit weight and volume before inbound.'
                        )
                      ) : (
                        'Select an SKU to calculate the available Rack and Bin capacity.'
                      )}
                    </div>

                    <div
                      ref={allocationScrollRef}
                      className="max-h-100 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      {isCapacityLoading ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading Rack and Bin
                          limits...
                        </div>
                      ) : !layout?.racks?.length ? (
                        <div className="py-4 text-center text-sm text-slate-500">
                          No Racks found in this warehouse.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {[...layout.racks]
                            .sort((firstRack, secondRack) => {
                              const firstHasSuggestion = (firstRack.bins || []).some((bin) => suggestedBinIds.has(String(bin.id)))
                              const secondHasSuggestion = (secondRack.bins || []).some((bin) => suggestedBinIds.has(String(bin.id)))
                              return Number(secondHasSuggestion) - Number(firstHasSuggestion)
                            })
                            .map((rack) => {
                            const rackCapacity = getRackCapacity(rack)
                            const rackCurrentWeightKg = Number(rackCapacity.currentWeightKg) || 0
                            const rackMetric = inboundRackMetrics[String(rack.id)] || {
                              units: 0,
                              weightKg: 0,
                              volumeM3: 0,
                            }
                            const rackCurrentVolumeM3 = Number(rackCapacity.currentVolumeM3) || 0
                            const rackIncomingWeightKg = rackMetric.weightKg
                            const rackIncomingVolumeM3 = rackMetric.volumeM3
                            const totalBinWeightLimit = (rack.bins || []).reduce(
                              (total, bin) => total + (Number(bin.maxWeight) || 0),
                              0
                            )
                            const totalBinVolumeLimit = (rack.bins || []).reduce(
                              (total, bin) => total + (Number(bin.maxVolume) || 0),
                              0
                            )
                            return (
                              <section
                                key={rack.id}
                                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-900">
                                      {rack.name}
                                      {rack.code && (
                                        <span className="ml-2 font-normal text-slate-400">
                                          {rack.code}
                                        </span>
                                      )}
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {(rack.bins || []).length} bins · Current load{' '}
                                      {rackCurrentWeightKg.toLocaleString('en-US', {
                                        maximumFractionDigits: 6,
                                      })}{' '}
                                      kg · Incoming{' '}
                                      {rackIncomingWeightKg.toLocaleString('en-US', {
                                        maximumFractionDigits: 6,
                                      })}{' '}
                                      kg · Incoming volume{' '}
                                      {rackIncomingVolumeM3.toLocaleString('en-US', {
                                        maximumFractionDigits: 6,
                                      })}{' '}
                                      m³
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                                      Rack limit:{' '}
                                      {Number(rackCapacity.maxWeight) > 0
                                        ? `${Number(rackCapacity.maxWeight).toLocaleString('en-US')} kg`
                                        : 'Not set'}
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                                      Bin limits: {totalBinWeightLimit.toLocaleString('en-US')} kg
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                                      Rack volume:{' '}
                                      {Number(rackCapacity.maxVolume) > 0
                                        ? `${Number(rackCapacity.maxVolume).toLocaleString('en-US')} m³`
                                        : 'Not set'}
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                                      Bin volume limits:{' '}
                                      {totalBinVolumeLimit.toLocaleString('en-US')} m³
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
                                  {[...(rack.bins || [])]
                                    .sort((firstBin, secondBin) => (
                                      Number(suggestedBinIds.has(String(secondBin.id))) -
                                      Number(suggestedBinIds.has(String(firstBin.id)))
                                    ))
                                    .map((bin) => {
                                    const capacity = binCapacities[bin.id] || {
                                      currentUnits: 0,
                                      currentWeightKg: 0,
                                      currentVolumeM3: 0,
                                      maxWeight: Number(bin.maxWeight) || 0,
                                      maxVolume: Number(bin.maxVolume) || 0,
                                    }
                                    const currentAllocation = Number(allocations[bin.id]) || 0
                                    const isSuggestedBin = suggestedBinIds.has(String(bin.id))
                                    const binMetric = inboundBinMetrics[String(bin.id)] || {
                                      units: 0,
                                      weightKg: 0,
                                      volumeM3: 0,
                                    }
                                    const binAllocationLines = inboundAllocationsByBin[String(bin.id)] || []
                                    const remainingReceiptUnits = Math.max(
                                      Number(formTotalQuantity) -
                                      (allocatedQuantity - currentAllocation),
                                      0
                                    )
                                    const binWeightUnits =
                                      capacity.maxWeight > 0 && selectedUnitWeightKg > 0
                                        ? Math.floor(
                                          Math.max(
                                            capacity.maxWeight -
                                            capacity.currentWeightKg -
                                            (binMetric.weightKg - currentAllocation * selectedUnitWeightKg),
                                            0
                                          ) / selectedUnitWeightKg
                                        ) + currentAllocation
                                        : Number.POSITIVE_INFINITY
                                    const binVolumeUnits =
                                      capacity.maxVolume > 0 && selectedUnitVolumeM3 > 0
                                        ? Math.floor(
                                          Math.max(
                                            capacity.maxVolume -
                                            capacity.currentVolumeM3 -
                                            (binMetric.volumeM3 - currentAllocation * selectedUnitVolumeM3),
                                            0
                                          ) / selectedUnitVolumeM3
                                        ) + currentAllocation
                                        : Number.POSITIVE_INFINITY
                                    const otherRackIncomingWeight =
                                      rackMetric.weightKg - currentAllocation * selectedUnitWeightKg
                                    const otherRackIncomingVolume =
                                      rackMetric.volumeM3 - currentAllocation * selectedUnitVolumeM3
                                    const rackWeightUnits =
                                      Number(rackCapacity.maxWeight) > 0 && selectedUnitWeightKg > 0
                                        ? Math.floor(
                                          Math.max(
                                            Number(rackCapacity.maxWeight) -
                                            rackCurrentWeightKg -
                                            otherRackIncomingWeight,
                                            0
                                          ) / selectedUnitWeightKg
                                        ) + currentAllocation
                                        : Number.POSITIVE_INFINITY
                                    const rackVolumeUnits =
                                      Number(rackCapacity.maxVolume) > 0 && selectedUnitVolumeM3 > 0
                                        ? Math.floor(
                                          Math.max(
                                            Number(rackCapacity.maxVolume) -
                                            rackCurrentVolumeM3 -
                                            otherRackIncomingVolume,
                                            0
                                          ) / selectedUnitVolumeM3
                                        ) + currentAllocation
                                        : Number.POSITIVE_INFINITY
                                    const maximumForBin = Math.max(
                                      Math.min(
                                        remainingReceiptUnits,
                                        binWeightUnits,
                                        binVolumeUnits,
                                        rackWeightUnits,
                                        rackVolumeUnits
                                      ),
                                      0
                                    )
                                    const inputMaximum = Number.isFinite(maximumForBin)
                                      ? maximumForBin
                                      : undefined
                                    return (
                                      <article
                                        key={bin.id}
                                        ref={(element) => {
                                          if (element) allocationBinRefs.current[String(bin.id)] = element
                                          else delete allocationBinRefs.current[String(bin.id)]
                                        }}
                                        className={`rounded-xl border bg-white p-3 transition-shadow ${isSuggestedBin
                                            ? 'border-emerald-300 bg-emerald-50/20 ring-2 ring-emerald-100'
                                            : 'border-slate-200'
                                          }`}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-slate-800">
                                              {bin.name}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-slate-400">
                                              {bin.code || 'No code'} · Shelf {bin.shelfLevel ?? '—'}
                                            </p>
                                          </div>
                                          <label className="shrink-0 text-right text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                                            {currentAllocation > 0
                                              ? `Edit ${selectedSku?.skuCode || 'SKU'}`
                                              : `${selectedSku?.skuCode || 'SKU'} not assigned`}
                                            <input
                                              type="number"
                                              min="0"
                                              max={inputMaximum}
                                              disabled={
                                                !selectedSku ||
                                                selectedUnitWeightKg <= 0 ||
                                                selectedUnitVolumeM3 <= 0
                                              }
                                              placeholder={isSuggestedBin ? 'Not assigned' : '0'}
                                              className="focus:ring-primary mt-1 block w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-semibold text-slate-800 focus:ring-2 focus:outline-none"
                                              value={allocations[bin.id] || ''}
                                              onChange={(event) => {
                                                const rawValue = event.target.value
                                                const nextValue =
                                                  rawValue === ''
                                                    ? ''
                                                    : Math.min(
                                                      Math.floor(
                                                        Math.max(Number(rawValue) || 0, 0)
                                                      ),
                                                      maximumForBin
                                                    )
                                                updateInboundLine(activeInboundLine?.id, {
                                                  allocations: {
                                                    ...(activeInboundLine?.allocations || {}),
                                                    [bin.id]: nextValue,
                                                  },
                                                })
                                              }}
                                            />
                                          </label>
                                        </div>

                                        {binAllocationLines.length > 0 && (
                                          <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/60 px-2.5 py-2 text-[11px]">
                                            <p className="font-semibold text-blue-700">Suggested by SKU</p>
                                            <div className="mt-1 space-y-1">
                                              {binAllocationLines.map((allocationLine) => (
                                                <button
                                                  key={allocationLine.lineId}
                                                  type="button"
                                                  onClick={() => setActiveInboundLineId(allocationLine.lineId)}
                                                  className="flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left text-blue-700 transition-colors hover:bg-blue-100"
                                                  title={`Edit ${allocationLine.skuCode} allocation`}
                                                >
                                                  <span className="truncate">{allocationLine.skuCode} · {allocationLine.skuName}</span>
                                                  <strong className="shrink-0">{allocationLine.quantity} units</strong>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                                          <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-slate-600">
                                            <span className="block text-slate-400">
                                              Current load
                                            </span>
                                            <strong>
                                              {capacity.currentWeightKg.toLocaleString('en-US', {
                                                maximumFractionDigits: 6,
                                              })}{' '}
                                              kg
                                            </strong>
                                          </div>
                                          <div className="rounded-lg bg-blue-50 px-2.5 py-2 text-blue-700">
                                            <span className="block text-blue-400">
                                              Planned total (all SKUs)
                                            </span>
                                            <strong>{binMetric.units.toLocaleString('en-US')} units</strong>
                                          </div>
                                          <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-slate-600">
                                            <span className="block text-slate-400">
                                              Weight limit
                                            </span>
                                            <strong>
                                              {capacity.maxWeight > 0
                                                ? `${capacity.maxWeight.toLocaleString('en-US')} kg`
                                                : 'Not set'}
                                            </strong>
                                          </div>
                                          <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-slate-600">
                                            <span className="block text-slate-400">
                                              Current volume
                                            </span>
                                            <strong>
                                              {capacity.currentVolumeM3.toLocaleString('en-US', {
                                                maximumFractionDigits: 6,
                                              })}{' '}
                                              m³
                                            </strong>
                                          </div>
                                          <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-slate-600">
                                            <span className="block text-slate-400">
                                              Volume limit
                                            </span>
                                            <strong>
                                              {capacity.maxVolume > 0
                                                ? `${capacity.maxVolume.toLocaleString('en-US')} m³`
                                                : 'Not set'}
                                            </strong>
                                          </div>
                                        </div>
                                      </article>
                                    )
                                  })}
                                </div>
                              </section>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Note (Optional)</label>
                    <InputField
                      value={formNote}
                      onChange={(e) => updateInboundLine(activeInboundLine?.id, { note: e.target.value })}
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
                        isSubmitting ||
                        isCapacityLoading ||
                        !allInboundLinesReady ||
                        selectedUnitWeightKg <= 0 ||
                        selectedUnitVolumeM3 <= 0
                      }
                    >
                      Confirm Inbound
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
                type="INBOUND"
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default InboundPage
