import { useEffect, useState } from 'react'
import { Edit3, Save, X } from 'lucide-react'
import Button from '@/components/atoms/Button'
import useEscapeKey from '@/hooks/useEscapeKey'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { showApiErrorToast } from '@/config/apiError'
import { toast } from 'react-hot-toast'

const apiData = (response) => response?.data?.data ?? response?.data ?? null

const toLayoutPayload = (layout, dimensions) => ({
  width: dimensions.width,
  length: dimensions.length,
  height: dimensions.height,
  positions: Array.isArray(layout?.positions) ? layout.positions : [],
  racks: (Array.isArray(layout?.racks) ? layout.racks : []).map((rack, rackIndex) => ({
    id: rack.id ?? null,
    name: String(rack.name || `Rack ${rackIndex + 1}`).trim(),
    code: String(rack.code || `RACK-${rackIndex + 1}`).trim(),
    maxWeight: rack.maxWeight,
    maxVolume: rack.maxVolume,
    coordinateX: rack.coordinateX,
    coordinateY: rack.coordinateY,
    positionZ: rack.positionZ,
    rotation: rack.rotation,
    width: rack.width,
    length: rack.length,
    height: rack.height,
    shelfCount: rack.shelfCount,
    maxBinCount: rack.maxBinCount,
    bins: (Array.isArray(rack.bins) ? rack.bins : []).map((bin, binIndex) => ({
      id: bin.id ?? null,
      shelfLevel: bin.shelfLevel,
      name: String(bin.name || `Bin ${rackIndex + 1}-${binIndex + 1}`).trim(),
      code: String(bin.code || `BIN-${rackIndex + 1}-${binIndex + 1}`).trim(),
      maxWeight: bin.maxWeight,
      maxVolume: bin.maxVolume,
      coordinateX: bin.coordinateX,
      coordinateY: bin.coordinateY,
      width: bin.width,
      length: bin.length,
      height: bin.height,
    })),
  })),
})

const EditWarehouseModal = ({ warehouse, onClose, onSaved }) => {
  useEscapeKey(true, onClose)
  const [form, setForm] = useState({
    name: warehouse.name || '',
    address: warehouse.address || '',
    description: warehouse.description || '',
    width: warehouse.width ?? warehouse.layout?.width ?? '',
    length: warehouse.length ?? warehouse.layout?.length ?? '',
    height: warehouse.height ?? warehouse.layout?.height ?? '',
    rentalPrice: warehouse.rentalPrice ?? '',
    rentalPricingType: warehouse.rentalPricingType || 'PER_SQUARE_METER_MONTHLY',
  })
  const [layout, setLayout] = useState(null)
  const [error, setError] = useState('')
  const [isLoadingLayout, setIsLoadingLayout] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  useEffect(() => {
    let isActive = true

    const loadLayout = async () => {
      try {
        setIsLoadingLayout(true)
        const response = await warehouseApi.getOwnerWarehouseLayout(warehouse.id)
        const currentLayout = apiData(response)
        if (!currentLayout) throw new Error('Warehouse layout is unavailable.')
        if (!isActive) return
        setLayout(currentLayout)
        setForm((current) => ({
          ...current,
          width: currentLayout.width ?? '',
          length: currentLayout.length ?? '',
          height: currentLayout.height ?? '',
        }))
      } catch (apiError) {
        if (isActive) {
          setLayout(null)
          setError(apiError.response?.data?.message || 'Could not load warehouse dimensions.')
        }
      } finally {
        if (isActive) setIsLoadingLayout(false)
      }
    }

    loadLayout()
    return () => {
      isActive = false
    }
  }, [warehouse.id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const name = form.name.trim()
    const address = form.address.trim()
    const width = Number(form.width)
    const length = Number(form.length)
    const height = Number(form.height)
    const rentalPrice = Number(form.rentalPrice)

    if (!name || !address) return setError('Name and address are required.')
    if (![width, length, height].every((value) => Number.isFinite(value) && value > 0)) {
      return setError('Length, width and height must be greater than 0.')
    }
    if (isLoadingLayout || !layout) return setError('Warehouse dimensions are not available yet.')
    if (form.rentalPricingType !== 'NEGOTIATED' && (!Number.isFinite(rentalPrice) || rentalPrice <= 0)) {
      return setError('Rental price must be greater than 0 for this pricing model.')
    }

    try {
      setIsSaving(true)
      await warehouseApi.saveOwnerWarehouseLayout(
        warehouse.id,
        toLayoutPayload(layout, { width, length, height })
      )
      await warehouseApi.updateWarehouseInfo(warehouse.id, {
        name,
        address,
        description: form.description.trim(),
        capacity: width * length,
        rentalPricingType: form.rentalPricingType,
        rentalPrice: form.rentalPricingType === 'NEGOTIATED' ? null : rentalPrice,
      })
      toast.success('Warehouse information updated.')
      onSaved()
      onClose()
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Could not update warehouse.')
      showApiErrorToast(apiError, 'Could not update warehouse.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between">
          <div><p className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-blue-600 uppercase"><Edit3 className="h-4 w-4" /> Owner update</p><h2 className="mt-2 text-xl font-bold text-slate-900">Edit warehouse</h2></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">Warehouse name<input value={form.name} onChange={(event) => updateField('name', event.target.value)} maxLength={255} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal focus:border-blue-500 focus:bg-white focus:outline-none" /></label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">Width (m)<input type="number" min="0.01" step="0.01" value={form.width} onChange={(event) => updateField('width', event.target.value)} disabled={isLoadingLayout} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal focus:border-blue-500 focus:bg-white focus:outline-none disabled:cursor-wait disabled:bg-slate-100" /></label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">Length (m)<input type="number" min="0.01" step="0.01" value={form.length} onChange={(event) => updateField('length', event.target.value)} disabled={isLoadingLayout} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal focus:border-blue-500 focus:bg-white focus:outline-none disabled:cursor-wait disabled:bg-slate-100" /></label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">Height (m)<input type="number" min="0.01" step="0.01" value={form.height} onChange={(event) => updateField('height', event.target.value)} disabled={isLoadingLayout} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal focus:border-blue-500 focus:bg-white focus:outline-none disabled:cursor-wait disabled:bg-slate-100" /></label>
          </div>
          <label className="block space-y-1.5 text-sm font-semibold text-slate-700">Address<input value={form.address} onChange={(event) => updateField('address', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal focus:border-blue-500 focus:bg-white focus:outline-none" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Pricing model<select value={form.rentalPricingType} onChange={(event) => updateField('rentalPricingType', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal focus:border-blue-500 focus:bg-white focus:outline-none"><option value="FIXED_MONTHLY">Fixed total monthly price</option><option value="PER_SQUARE_METER_MONTHLY">Price per m²</option><option value="NEGOTIATED">Negotiated with tenant</option></select></label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">Public rental price<input type="number" min="0.01" step="0.01" disabled={form.rentalPricingType === 'NEGOTIATED'} value={form.rentalPrice} onChange={(event) => updateField('rentalPrice', event.target.value)} placeholder={form.rentalPricingType === 'NEGOTIATED' ? 'Agreed directly' : '30000000'} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal focus:border-blue-500 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100" /></label>
          </div>
          <label className="block space-y-1.5 text-sm font-semibold text-slate-700">Description<textarea rows={4} value={form.description} onChange={(event) => updateField('description', event.target.value)} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal leading-6 focus:border-blue-500 focus:bg-white focus:outline-none" /></label>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" isLoading={isSaving} disabled={isLoadingLayout || !layout}><Save className="mr-2 h-4 w-4" /> Save changes</Button></div>
        </form>
      </div>
    </div>
  )
}

export default EditWarehouseModal
