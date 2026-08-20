import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import { ArrowUpRight, Search, Minus, Loader2, Download, Eye } from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Modal from '@/components/organisms/Modal'
import TableActionMenu from '@/components/TableActionMenu'
import receiptApi from '@/services/wms/receiptApi'
import stockApi from '@/services/wms/stockApi'
import productApi from '@/services/wms/productApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'
import ReceiptDetailModal from '@/features/inventory/components/ReceiptDetailModal'
import { showApiErrorToast } from '@/config/apiError'
import { positiveInteger, required } from '@/config/validation'

const OutboundPage = () => {
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

  // Selection states
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Form states
  const [formSkuId, setFormSkuId] = useState('')
  const [formTotalQuantity, setFormTotalQuantity] = useState(1)
  const [allocations, setAllocations] = useState({}) // { binId: quantity }
  const [skuLocations, setSkuLocations] = useState([])
  const [formNote, setFormNote] = useState('')
  const availableWarehouseQuantity = useMemo(
    () => skuLocations.reduce((total, location) => total + (Number(location.quantity) || 0), 0),
    [skuLocations]
  )

  const distributeQuantityAcrossBins = useCallback((requestedQuantity, locations = []) => {
    let remaining = Math.max(Math.floor(Number(requestedQuantity) || 0), 0)
    return locations.reduce((result, location) => {
      if (remaining <= 0) return result
      const quantity = Math.min(remaining, Number(location.quantity) || 0)
      if (quantity > 0) {
        result[location.binId] = quantity
        remaining -= quantity
      }
      return result
    }, {})
  }, [])

  useEffect(() => {
    let active = true
    const fetchLocations = async () => {
      if (!formSkuId || !selectedWarehouseId) {
        if (active) setSkuLocations([])
        return
      }
      try {
        // Load every stock batch in the selected warehouse. The SKU summary endpoint
        // is tenant-wide, so using it here could miss bins or mix locations from other warehouses.
        const allStock = await stockApi.getAllStock(selectedWarehouseId)
        const locationsByBin = new Map()

        allStock
          .filter(
            (batch) =>
              String(batch.skuId) === String(formSkuId) &&
              String(batch.warehouseId) === String(selectedWarehouseId) &&
              Number(batch.quantity) > 0 &&
              batch.rackId &&
              batch.binId
          )
          .forEach((batch) => {
            const key = `${batch.rackId}:${batch.binId}`
            const existing = locationsByBin.get(key)
            if (existing) {
              existing.quantity += Number(batch.quantity) || 0
            } else {
              locationsByBin.set(key, {
                ...batch,
                quantity: Number(batch.quantity) || 0,
                rackId: String(batch.rackId),
                binId: String(batch.binId),
              })
            }
          })

        const nextLocations = Array.from(locationsByBin.values())
        if (!active) return
        setSkuLocations(nextLocations)

        // Reset allocations when the available warehouse locations change.
        setAllocations({})
      } catch (error) {
        console.error('Failed to fetch SKU stock locations', error)
        if (active) setSkuLocations([])
      }
    }
    fetchLocations()
    return () => {
      active = false
    }
  }, [formSkuId, selectedWarehouseId])

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
        showApiErrorToast(error, 'Subscription required for outbound.')
      } else {
        showApiErrorToast(error, 'Could not load outbound data.')
      }
    }
  }, [])

  const fetchReceipts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await receiptApi.getReceipts(selectedWarehouseId, {
        type: 'OUTBOUND',
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
    }
  }, [fetchReceipts, selectedWarehouseId])

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

  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    const skuError = required(formSkuId, 'Product')
    if (skuError) {
      toast.error('Select a product.')
      return
    }

    const requestedQuantity = Number(formTotalQuantity)
    const quantityError = positiveInteger(requestedQuantity)
    if (quantityError) {
      toast.error(quantityError)
      return
    }
    if (requestedQuantity > availableWarehouseQuantity) {
      toast.error(`Only ${availableWarehouseQuantity} units are available.`)
      return
    }

    const activeAllocations = Object.entries(allocations).filter(([, qty]) => Number(qty) > 0)

    if (activeAllocations.length === 0) {
      toast.error('Allocate quantity to a bin.')
      return
    }

    let totalAllocated = 0
    const payloadItems = []

    for (const [binId, qtyStr] of activeAllocations) {
      const qty = Number(qtyStr)

      const loc = skuLocations.find((l) => l.binId === binId)
      if (!loc) {
        toast.error(`Bin ${binId.substring(0, 6)} has no stock for this SKU.`)
        return
      }
      if (qty > loc.quantity) {
        toast.error(`Bin ${loc.binName} has only ${loc.quantity} units.`)
        return
      }

      totalAllocated += qty
      payloadItems.push({
        skuId: formSkuId,
        quantity: qty,
        rackId: loc.rackId,
        binId: loc.binId,
        note: formNote,
      })
    }

    if (totalAllocated !== requestedQuantity) {
      toast.error(`Allocated ${totalAllocated}; expected ${requestedQuantity}.`)
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        type: 'OUTBOUND',
        items: payloadItems,
      }
      await receiptApi.createReceipt(payload)
      toast.success('Outbound receipt created.')
      setIsModalOpen(false)
      fetchReceipts()

      setFormSkuId('')
      setFormTotalQuantity(1)
      setAllocations({})
      setFormNote('')
      setSkuLocations([])
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
      toast.success('Outbound receipt approved.')
      fetchReceipts()
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
          <main className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">
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
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
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
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900">Recent Outbound Shipments</h3>
                      <div className="flex items-center gap-3">
                        <div className="relative w-64">
                          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <InputField placeholder="Search orders..." className="h-9 pl-10" />
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

              {/* New Outbound Modal */}
              <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create New Outbound Shipment"
              >
                <form onSubmit={handleCreateReceipt} className="space-y-4">
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
                        onChange={(e) => {
                          const value = e.target.value
                          setFormTotalQuantity(value)
                          setAllocations(distributeQuantityAcrossBins(value, skuLocations))
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Pick from Bins</label>
                      <div className="flex flex-wrap justify-end gap-2 text-xs font-semibold">
                        <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">
                          Available in warehouse: {availableWarehouseQuantity}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
                          Total picked:{' '}
                          {Object.values(allocations).reduce(
                            (acc, val) => acc + (Number(val) || 0),
                            0
                          )}{' '}
                          / {formTotalQuantity}
                        </span>
                      </div>
                    </div>

                    {!formSkuId ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        Please select an SKU first to see available locations.
                      </div>
                    ) : skuLocations.length === 0 ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
                        This SKU is currently not in stock at this warehouse.
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {skuLocations.map((loc) => (
                            <div
                              key={loc.binId}
                              className="relative flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="text-xs font-medium text-slate-500">
                                    {loc.rackName}
                                  </div>
                                  <div className="text-sm font-bold text-slate-800">
                                    {loc.binName}
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  className="focus:ring-primary w-20 rounded-md border border-slate-200 bg-slate-50 p-1 text-center text-sm focus:ring-2 focus:outline-none"
                                  value={allocations[loc.binId] || ''}
                                  onChange={(e) => {
                                    setAllocations((prev) => ({
                                      ...prev,
                                      [loc.binId]: e.target.value,
                                    }))
                                  }}
                                />
                              </div>
                              <div className="text-xs text-slate-500">
                                Current Stock:{' '}
                                <span className="font-semibold text-emerald-600">
                                  {loc.quantity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                      disabled={!formSkuId || skuLocations.length === 0}
                    >
                      Confirm Outbound
                    </Button>
                  </div>
                </form>
              </Modal>

              <Modal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                title="Reject Receipt"
              >
                <form onSubmit={handleReject} className="space-y-4">
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
                </form>
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
