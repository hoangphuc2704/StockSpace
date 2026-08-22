import { useState, useEffect, useMemo, useCallback } from 'react'
import { FormShell } from '@/form/FormControls'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import { ArrowDownLeft, Search, Plus, Download, Loader2, Eye } from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Modal from '@/components/organisms/Modal'
import TableActionMenu from '@/components/TableActionMenu'
import receiptApi from '@/services/wms/receiptApi'
import stockApi from '@/services/wms/stockApi'
import productApi from '../../../services/wms/productApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'
import ReceiptDetailModal from '@/features/inventory/components/ReceiptDetailModal'
import { showApiErrorToast } from '@/config/apiError'
import { positiveInteger, required } from '@/config/validation'

const CAPACITY_EPSILON = 1e-9

const InboundPage = () => {
  const dispatch = useDispatch()
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
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Form states
  const [formSkuId, setFormSkuId] = useState('')
  const [formTotalQuantity, setFormTotalQuantity] = useState(1)
  const [allocations, setAllocations] = useState({}) // { binId: quantity }
  const [binCapacities, setBinCapacities] = useState({})
  const [isCapacityLoading, setIsCapacityLoading] = useState(false)
  const [capacityRefreshKey, setCapacityRefreshKey] = useState(0)
  const [formNote, setFormNote] = useState('')

  const selectedSku = useMemo(
    () => skus.find((sku) => String(sku.id) === String(formSkuId)),
    [formSkuId, skus]
  )
  const selectedUnitWeightKg = Number(selectedSku?.unitWeightKg) || 0
  const selectedUnitVolumeM3 = Number(selectedSku?.unitVolumeM3) || 0
  const allocatedQuantity = useMemo(
    () => Object.values(allocations).reduce((total, value) => total + (Number(value) || 0), 0),
    [allocations]
  )

  useEffect(() => {
    let active = true
    const fetchCapacities = async () => {
      if (!selectedWarehouseId || !layout) return
      setIsCapacityLoading(true)
      try {
        const allStock = await stockApi.getAllStock(selectedWarehouseId)
        const skuById = new Map(skus.map((sku) => [String(sku.id), sku]))
        const usageByBin = allStock.reduce((result, batch) => {
          if (!batch.binId) return result
          const key = String(batch.binId)
          const quantity = Number(batch.quantity) || 0
          const sku = skuById.get(String(batch.skuId))
          const usage = result[key] || { units: 0, weightKg: 0, volumeM3: 0 }
          usage.units += quantity
          usage.weightKg += quantity * (Number(sku?.unitWeightKg ?? batch.unitWeightKg) || 0)
          usage.volumeM3 += quantity * (Number(sku?.unitVolumeM3 ?? batch.unitVolumeM3) || 0)
          result[key] = usage
          return result
        }, {})
        const nextCapacities = {}
        layout.racks?.forEach((rack) => {
          rack.bins?.forEach((bin) => {
            nextCapacities[bin.id] = {
              currentUnits: usageByBin[String(bin.id)]?.units || 0,
              currentWeightKg: usageByBin[String(bin.id)]?.weightKg || 0,
              currentVolumeM3: usageByBin[String(bin.id)]?.volumeM3 || 0,
              maxWeight: Number(bin.maxWeight) || 0,
              maxVolume: Number(bin.maxVolume) || 0,
            }
          })
        })
        if (active) setBinCapacities(nextCapacities)
      } catch (error) {
        console.error('Error fetching Bin usage', error)
        if (active) setBinCapacities({})
      } finally {
        if (active) setIsCapacityLoading(false)
      }
    }
    fetchCapacities()
    return () => {
      active = false
    }
  }, [selectedWarehouseId, layout, capacityRefreshKey, skus])

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
      if (whList.length > 0) {
        setSelectedWarehouseId(whList[0].id)
      }

      setSkus(Array.isArray(skuRes) ? skuRes : [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      if (error.response?.data?.errorCode === 'SUBSCRIPTION_REQUIRED') {
        showApiErrorToast(error, 'Subscription required for inbound.')
      } else {
        showApiErrorToast(error, 'Could not load inbound data.')
      }
    }
  }, [])

  const fetchLayout = useCallback(async () => {
    try {
      const res =
        currentRole === 'STAFF'
          ? await warehouseApi.getPublicWarehouseLayout(selectedWarehouseId, {
              skipErrorToast: true,
            })
          : await warehouseApi.getTenantWarehouseLayout(selectedWarehouseId, {
              skipErrorToast: true,
            })
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

  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    const skuError = required(formSkuId, 'Product')
    if (skuError) {
      toast.error('Select a product.')
      return
    }
    if (selectedUnitWeightKg <= 0 || selectedUnitVolumeM3 <= 0) {
      toast.error('Set SKU weight and volume first.')
      return
    }

    const requestedQuantity = Number(formTotalQuantity)
    const quantityError = positiveInteger(requestedQuantity)
    if (quantityError) {
      toast.error(quantityError)
      return
    }

    // Filter out bins with 0 or empty quantity
    const activeAllocations = Object.entries(allocations).filter(([, qty]) => Number(qty) > 0)

    if (activeAllocations.length === 0) {
      toast.error('Allocate quantity to a bin.')
      return
    }

    let totalAllocated = 0
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

      const capacity = binCapacities[binId] || {
        currentWeightKg: 0,
        currentVolumeM3: 0,
        maxWeight: Number(binContext.bin.maxWeight) || 0,
        maxVolume: Number(binContext.bin.maxVolume) || 0,
      }
      const incomingWeightKg = qty * selectedUnitWeightKg
      const incomingVolumeM3 = qty * selectedUnitVolumeM3
      const projectedBinWeight = (Number(capacity.currentWeightKg) || 0) + incomingWeightKg
      const projectedBinVolume = (Number(capacity.currentVolumeM3) || 0) + incomingVolumeM3
      if (
        Number(capacity.maxWeight) > 0 &&
        projectedBinWeight > Number(capacity.maxWeight) + CAPACITY_EPSILON
      ) {
        toast.error(
          `${binContext.bin.name || binContext.bin.code || 'Bin'} exceeds its weight limit.`
        )
        return
      }
      if (
        Number(capacity.maxVolume) > 0 &&
        projectedBinVolume > Number(capacity.maxVolume) + CAPACITY_EPSILON
      ) {
        toast.error(
          `${binContext.bin.name || binContext.bin.code || 'Bin'} exceeds its volume limit.`
        )
        return
      }
      const rackTotals = racksById.get(String(rackId))
      rackTotals.incomingUnits += qty
      rackTotals.incomingWeightKg += incomingWeightKg
      rackTotals.incomingVolumeM3 += incomingVolumeM3

      payloadItems.push({
        skuId: formSkuId,
        quantity: qty,
        rackId: rackId,
        binId: binId,
        note: formNote,
      })
    }

    for (const { rack, incomingWeightKg, incomingVolumeM3 } of racksById.values()) {
      const currentWeightKg = (rack.bins || []).reduce(
        (total, bin) => total + (Number(binCapacities[bin.id]?.currentWeightKg) || 0),
        0
      )
      const currentVolumeM3 = (rack.bins || []).reduce(
        (total, bin) => total + (Number(binCapacities[bin.id]?.currentVolumeM3) || 0),
        0
      )
      const rackMaxWeight = Number(rack.maxWeight) || 0
      const rackMaxVolume = Number(rack.maxVolume) || 0
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

    if (totalAllocated !== requestedQuantity) {
      toast.error(`Allocated ${totalAllocated}; expected ${requestedQuantity}.`)
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        type: 'INBOUND',
        items: payloadItems,
      }
      await receiptApi.createReceipt(payload)
      toast.success('Inbound receipt created.')
      setIsModalOpen(false)
      fetchReceipts()

      setFormSkuId('')
      setFormTotalQuantity(1)
      setAllocations({})
      setFormNote('')
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

  const columns = [
    ...(currentRole === 'TENANT' || currentRole === 'STAFF'
      ? []
      : [{ header: 'Receipt ID', render: (row) => row.id.substring(0, 8) }]),
    {
      header: 'Warehouse',
      render: () => {
        const wh = warehouses.find((w) => w.id === selectedWarehouseId)
        return wh ? wh.name : 'Unknown'
      },
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'warning' : 'danger'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    { header: 'Created Date', render: (row) => new Date(row.createdAt).toLocaleString() },
    {
      header: 'Actions',
      render: (row) => (
        <TableActionMenu
          items={[
            { label: 'Details', icon: Eye, onClick: () => handleViewDetail(row) },
            row.status === 'PENDING' &&
              currentRole === 'TENANT' && {
                label: 'Approve',
                onClick: () => handleApprove(row.id),
              },
            row.status === 'PENDING' &&
              currentRole === 'TENANT' && {
                label: 'Reject',
                danger: true,
                onClick: () => {
                  setRejectingReceiptId(row.id)
                  setIsRejectModalOpen(true)
                },
              },
            row.status === 'PENDING' &&
              currentRole !== 'TENANT' && { label: 'Wait for Tenant to approve', disabled: true },
            row.status !== 'PENDING' && {
              label: row.status === 'REJECTED' ? 'Rejected' : 'Approved',
              disabled: true,
            },
          ]}
        />
      ),
    },
  ]

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
          <main className="mx-auto w-full max-w-400 space-y-8 p-6 md:p-8">
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
                      setAllocations({})
                      setBinCapacities({})
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
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900">Recent Inbound Shipments</h3>
                      <div className="flex items-center gap-3">
                        <div className="relative w-64">
                          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <InputField placeholder="Search shipments..." className="h-9 pl-10" />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExport}
                          disabled={!selectedWarehouseId || isExporting}
                          className="flex items-center gap-2"
                        >
                          {isExporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Export CSV
                        </Button>
                      </div>
                    </div>
                    {isLoading ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin text-slate-400" />
                      </div>
                    ) : (
                      <DataTable columns={columns} data={receipts} />
                    )}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Select Product (SKU)
                      </label>
                      <select
                        required
                        className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                        value={formSkuId}
                        onChange={(e) => setFormSkuId(e.target.value)}
                      >
                        <option value="">-- Select product --</option>
                        {skus.map((sku) => (
                          <option key={sku.id} value={sku.id}>
                            [{sku.skuCode}] {sku.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Total Quantity</label>
                      <InputField
                        type="number"
                        min="1"
                        required
                        value={formTotalQuantity}
                        onChange={(e) => setFormTotalQuantity(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Allocate into Bins
                      </label>
                      <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Allocated: {allocatedQuantity} / {formTotalQuantity}{' '}
                        {selectedSku?.uomCode || selectedSku?.uomName || 'units'}
                      </span>
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

                    <div className="max-h-100 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
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
                          {layout.racks.map((rack) => {
                            const rackCurrentWeightKg = (rack.bins || []).reduce(
                              (total, bin) => total + (binCapacities[bin.id]?.currentWeightKg || 0),
                              0
                            )
                            const rackIncomingUnits = (rack.bins || []).reduce(
                              (total, bin) => total + (Number(allocations[bin.id]) || 0),
                              0
                            )
                            const rackCurrentVolumeM3 = (rack.bins || []).reduce(
                              (total, bin) => total + (binCapacities[bin.id]?.currentVolumeM3 || 0),
                              0
                            )
                            const rackIncomingWeightKg = rackIncomingUnits * selectedUnitWeightKg
                            const rackIncomingVolumeM3 = rackIncomingUnits * selectedUnitVolumeM3
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
                                      {Number(rack.maxWeight) > 0
                                        ? `${Number(rack.maxWeight).toLocaleString('en-US')} kg`
                                        : 'Not set'}
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                                      Bin limits: {totalBinWeightLimit.toLocaleString('en-US')} kg
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                                      Rack volume:{' '}
                                      {Number(rack.maxVolume) > 0
                                        ? `${Number(rack.maxVolume).toLocaleString('en-US')} m³`
                                        : 'Not set'}
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                                      Bin volume limits:{' '}
                                      {totalBinVolumeLimit.toLocaleString('en-US')} m³
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
                                  {rack.bins?.map((bin) => {
                                    const capacity = binCapacities[bin.id] || {
                                      currentUnits: 0,
                                      currentWeightKg: 0,
                                      currentVolumeM3: 0,
                                      maxWeight: Number(bin.maxWeight) || 0,
                                      maxVolume: Number(bin.maxVolume) || 0,
                                    }
                                    const currentAllocation = Number(allocations[bin.id]) || 0
                                    const remainingReceiptUnits = Math.max(
                                      Number(formTotalQuantity) -
                                        (allocatedQuantity - currentAllocation),
                                      0
                                    )
                                    const binWeightUnits =
                                      capacity.maxWeight > 0 && selectedUnitWeightKg > 0
                                        ? Math.floor(
                                            Math.max(
                                              capacity.maxWeight - capacity.currentWeightKg,
                                              0
                                            ) / selectedUnitWeightKg
                                          )
                                        : Number.POSITIVE_INFINITY
                                    const binVolumeUnits =
                                      capacity.maxVolume > 0 && selectedUnitVolumeM3 > 0
                                        ? Math.floor(
                                            Math.max(
                                              capacity.maxVolume - capacity.currentVolumeM3,
                                              0
                                            ) / selectedUnitVolumeM3
                                          )
                                        : Number.POSITIVE_INFINITY
                                    const otherRackIncomingUnits =
                                      rackIncomingUnits - currentAllocation
                                    const rackWeightUnits =
                                      Number(rack.maxWeight) > 0 && selectedUnitWeightKg > 0
                                        ? Math.floor(
                                            Math.max(
                                              Number(rack.maxWeight) -
                                                rackCurrentWeightKg -
                                                otherRackIncomingUnits * selectedUnitWeightKg,
                                              0
                                            ) / selectedUnitWeightKg
                                          )
                                        : Number.POSITIVE_INFINITY
                                    const rackVolumeUnits =
                                      Number(rack.maxVolume) > 0 && selectedUnitVolumeM3 > 0
                                        ? Math.floor(
                                            Math.max(
                                              Number(rack.maxVolume) -
                                                rackCurrentVolumeM3 -
                                                otherRackIncomingUnits * selectedUnitVolumeM3,
                                              0
                                            ) / selectedUnitVolumeM3
                                          )
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
                                        className="rounded-xl border border-slate-200 bg-white p-3"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-slate-800">
                                              {bin.name}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-slate-400">
                                              {bin.code || 'No code'} · Shelf {bin.shelfLevel || 1}
                                            </p>
                                          </div>
                                          <label className="shrink-0 text-right text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                                            Inbound
                                            <input
                                              type="number"
                                              min="0"
                                              max={inputMaximum}
                                              disabled={
                                                !selectedSku ||
                                                selectedUnitWeightKg <= 0 ||
                                                selectedUnitVolumeM3 <= 0
                                              }
                                              placeholder="0"
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
                                                setAllocations((previous) => ({
                                                  ...previous,
                                                  [bin.id]: nextValue,
                                                }))
                                              }}
                                            />
                                          </label>
                                        </div>

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
                        isSubmitting ||
                        isCapacityLoading ||
                        !formSkuId ||
                        selectedUnitWeightKg <= 0 ||
                        selectedUnitVolumeM3 <= 0 ||
                        allocatedQuantity !== Number(formTotalQuantity)
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
