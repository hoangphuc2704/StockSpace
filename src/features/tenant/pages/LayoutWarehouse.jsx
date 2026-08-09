import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  AlertCircle,
  Box,
  Grid3X3,
  Loader2,
  Package2,
  PackagePlus,
  RotateCcw,
  Save,
  Trash2,
  Warehouse,
} from 'lucide-react'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import WarehouseLayoutPreview3D from '@/components/WarehouseLayoutPreview3D'
import { closeMobileSidebar } from '@/store/uiSlide'
import contractApi from '@/services/contractApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import stockApi from '@/services/wms/stockApi'

const DEFAULT_LAYOUT_SIZE = 100
const MIN_ENTITY_SIZE = 4
const FOOTPRINT_GRID_SIZE = 10
const BIN_MAX_RATIO = 0.8

const keyOf = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const numberOf = (value, fallback = 0) => {
  const valueAsNumber = Number(value)
  return Number.isFinite(valueAsNumber) ? valueAsNumber : fallback
}
const integerOf = (value, fallback = 0) => Math.round(numberOf(value, fallback))
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const apiData = (response) => response?.data?.data ?? response?.data ?? null
const nullableId = (value) => (value == null || value === '' ? null : String(value))
const cellKey = (row, column) => `${row}:${column}`
const fullFootprint = () =>
  Array.from({ length: FOOTPRINT_GRID_SIZE ** 2 }, (_, index) =>
    cellKey(Math.floor(index / FOOTPRINT_GRID_SIZE), index % FOOTPRINT_GRID_SIZE)
  )

const normalizeFootprint = (cells) => {
  if (!Array.isArray(cells)) return fullFootprint()
  return [...new Set(cells.map(String))].filter((cell) => {
    const [row, column] = cell.split(':').map(Number)
    return (
      Number.isInteger(row) &&
      Number.isInteger(column) &&
      row >= 0 &&
      row < FOOTPRINT_GRID_SIZE &&
      column >= 0 &&
      column < FOOTPRINT_GRID_SIZE
    )
  })
}

const normalizeBin = (bin = {}) => ({
  clientKey: keyOf('bin'),
  id: nullableId(bin.id),
  name: bin.name == null ? 'Bin mới' : String(bin.name),
  code: bin.code == null ? '' : String(bin.code),
  shelfLevel: Math.max(integerOf(bin.shelfLevel, 1), 1),
  maxWeight: numberOf(bin.maxWeight, 0),
  maxVolume: numberOf(bin.maxVolume, 0),
  coordinateX: numberOf(bin.coordinateX, 0),
  coordinateY: numberOf(bin.coordinateY, 0),
  positionZ: numberOf(bin.positionZ, 0),
  width: Math.max(numberOf(bin.width, 8), MIN_ENTITY_SIZE),
  length: Math.max(numberOf(bin.length, 8), MIN_ENTITY_SIZE),
  height: Math.max(numberOf(bin.height, 8), MIN_ENTITY_SIZE),
})

const normalizeRack = (rack = {}) => ({
  clientKey: keyOf('rack'),
  id: nullableId(rack.id),
  name: rack.name == null ? 'Rack mới' : String(rack.name),
  code: rack.code == null ? '' : String(rack.code),
  maxWeight: numberOf(rack.maxWeight, 0),
  maxVolume: numberOf(rack.maxVolume, 0),
  coordinateX: numberOf(rack.coordinateX, 0),
  coordinateY: numberOf(rack.coordinateY, 0),
  positionZ: numberOf(rack.positionZ, 0),
  rotation: numberOf(rack.rotation, 0),
  width: Math.max(numberOf(rack.width, 18), MIN_ENTITY_SIZE),
  length: Math.max(numberOf(rack.length, 18), MIN_ENTITY_SIZE),
  height: Math.max(numberOf(rack.height, 18), MIN_ENTITY_SIZE),
  bins: Array.isArray(rack.bins) ? rack.bins.map(normalizeBin) : [],
})

const normalizeLayout = (payload = {}) => ({
  width: Math.max(numberOf(payload.width, DEFAULT_LAYOUT_SIZE), 20),
  length: Math.max(numberOf(payload.length, DEFAULT_LAYOUT_SIZE), 20),
  height: Math.max(numberOf(payload.height, DEFAULT_LAYOUT_SIZE), 20),
  footprintCells: normalizeFootprint(payload.footprintCells),
  racks: Array.isArray(payload.racks) ? payload.racks.map(normalizeRack) : [],
})

const serializeBin = (bin, rackIndex, binIndex, rackWidth, rackLength) => {
  const width = clamp(
    integerOf(bin.width, 8),
    MIN_ENTITY_SIZE,
    Math.max(MIN_ENTITY_SIZE, Math.floor(rackWidth * BIN_MAX_RATIO))
  )
  const length = clamp(
    integerOf(bin.length, 8),
    MIN_ENTITY_SIZE,
    Math.max(MIN_ENTITY_SIZE, Math.floor(rackLength * BIN_MAX_RATIO))
  )
  return {
    id: nullableId(bin.id),
    shelfLevel: Math.max(integerOf(bin.shelfLevel, 1), 1),
    name: bin.name?.trim() || 'Bin',
    code: bin.code?.trim() || `BIN-${rackIndex + 1}-${binIndex + 1}`,
    maxWeight: numberOf(bin.maxWeight),
    maxVolume: numberOf(bin.maxVolume),
    coordinateX: clamp(integerOf(bin.coordinateX), 0, Math.max(rackWidth - width, 0)),
    coordinateY: clamp(integerOf(bin.coordinateY), 0, Math.max(rackLength - length, 0)),
    positionZ: integerOf(bin.positionZ),
    width,
    length,
    height: Math.max(integerOf(bin.height, 8), MIN_ENTITY_SIZE),
  }
}

const serializeRack = (rack, rackIndex, layoutWidth, layoutLength) => {
  const width = clamp(integerOf(rack.width, 18), MIN_ENTITY_SIZE, layoutWidth)
  const length = clamp(integerOf(rack.length, 18), MIN_ENTITY_SIZE, layoutLength)
  return {
    id: nullableId(rack.id),
    name: rack.name?.trim() || 'Rack',
    code: rack.code?.trim() || `RACK-${rackIndex + 1}`,
    maxWeight: numberOf(rack.maxWeight),
    maxVolume: numberOf(rack.maxVolume),
    coordinateX: clamp(integerOf(rack.coordinateX), 0, Math.max(layoutWidth - width, 0)),
    coordinateY: clamp(integerOf(rack.coordinateY), 0, Math.max(layoutLength - length, 0)),
    positionZ: integerOf(rack.positionZ),
    rotation: integerOf(rack.rotation),
    width,
    length,
    height: Math.max(integerOf(rack.height, 18), MIN_ENTITY_SIZE),
    bins: rack.bins.map((bin, binIndex) => serializeBin(bin, rackIndex, binIndex, width, length)),
  }
}

const toPayload = (layout) => {
  const width = Math.max(integerOf(layout.width, DEFAULT_LAYOUT_SIZE), 20)
  const length = Math.max(integerOf(layout.length, DEFAULT_LAYOUT_SIZE), 20)
  return {
    width,
    length,
    height: Math.max(integerOf(layout.height, DEFAULT_LAYOUT_SIZE), 20),
    footprintCells: layout.footprintCells,
    racks: layout.racks.map((rack, rackIndex) => serializeRack(rack, rackIndex, width, length)),
  }
}

const updateRack = (layout, rackKey, updater) => ({
  ...layout,
  racks: layout.racks.map((rack) => (rack.clientKey === rackKey ? updater(rack) : rack)),
})

const updateBin = (layout, binKey, updater) => ({
  ...layout,
  racks: layout.racks.map((rack) => ({
    ...rack,
    bins: rack.bins.map((bin) => (bin.clientKey === binKey ? updater(bin, rack) : bin)),
  })),
})

const getSelected = (layout, selection) => {
  if (selection.type === 'layout') return layout
  if (selection.type === 'rack')
    return layout.racks.find((rack) => rack.clientKey === selection.key)
  return layout.racks.flatMap((rack) => rack.bins).find((bin) => bin.clientKey === selection.key)
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500'

function BinStockMiniMap({ layout, selection, onSelectBin }) {
  const activeCells = new Set(layout.footprintCells)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-800">Chọn Bin trên layout 2D</h3>
        <p className="mt-0.5 text-xs text-slate-500">Sơ đồ chỉ cho phép xem và chọn Bin.</p>
      </div>
      <div className="overflow-auto rounded-xl bg-slate-100 p-2">
        <div className="relative mx-auto aspect-square w-full max-w-90 min-w-65 overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-inner">
          <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
            {Array.from({ length: FOOTPRINT_GRID_SIZE ** 2 }, (_, index) => {
              const row = Math.floor(index / FOOTPRINT_GRID_SIZE)
              const column = index % FOOTPRINT_GRID_SIZE
              return (
                <div
                  key={cellKey(row, column)}
                  className={`border border-slate-200/70 ${
                    activeCells.has(cellKey(row, column)) ? 'bg-blue-50' : 'bg-slate-300/80'
                  }`}
                />
              )
            })}
          </div>

          {layout.racks.map((rack) => (
            <div
              key={rack.clientKey}
              className="pointer-events-none absolute z-10 overflow-hidden rounded border border-blue-700 bg-blue-500/75 shadow-sm"
              style={{
                left: `${(rack.coordinateX / layout.width) * 100}%`,
                top: `${(rack.coordinateY / layout.length) * 100}%`,
                width: `${(rack.width / layout.width) * 100}%`,
                height: `${(rack.length / layout.length) * 100}%`,
              }}
            >
              <span className="block truncate bg-blue-800/80 px-1 py-0.5 text-[8px] font-bold text-white">
                {rack.name || rack.code}
              </span>
              {rack.bins.map((bin) => (
                <button
                  key={bin.clientKey}
                  type="button"
                  title={`Xem hàng trong ${bin.name || bin.code}`}
                  aria-label={`Xem hàng trong ${bin.name || bin.code}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelectBin(bin.clientKey)
                  }}
                  className={`pointer-events-auto absolute min-h-3.5 min-w-3.5 cursor-pointer rounded-sm border bg-emerald-500/95 shadow transition hover:z-30 hover:scale-110 hover:bg-emerald-400 ${
                    selection.type === 'bin' && selection.key === bin.clientKey
                      ? 'z-20 border-white ring-2 ring-emerald-200'
                      : 'z-10 border-emerald-900'
                  }`}
                  style={{
                    left: `${(bin.coordinateX / rack.width) * 100}%`,
                    top: `${(bin.coordinateY / rack.length) * 100}%`,
                    width: `${(bin.width / rack.width) * 100}%`,
                    height: `${(bin.length / rack.length) * 100}%`,
                  }}
                >
                  <span className="sr-only">{bin.name || bin.code}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Rack
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Bin có thể chọn
        </span>
      </div>
    </div>
  )
}

function LayoutWarehouse({ currentRole = 'TENANT', initialView = '2d', stockOnly = false }) {
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const dragRef = useRef(null)
  const isOwner = currentRole === 'OWNER'

  const [contracts, setContracts] = useState([])
  const [ownedWarehouses, setOwnedWarehouses] = useState([])
  const [preferredWarehouseId, setPreferredWarehouseId] = useState('')
  const [layout, setLayout] = useState(() => normalizeLayout())
  const [selection, setSelection] = useState({ type: 'layout', key: null })
  const [view, setView] = useState(stockOnly ? 'stock' : initialView)
  const [footprintMode, setFootprintMode] = useState(false)
  const [footprintTool, setFootprintTool] = useState('add')
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingLayout, setLoadingLayout] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tenantDefault, setTenantDefault] = useState(false)
  const [stockRefreshKey, setStockRefreshKey] = useState(0)
  const [binStockState, setBinStockState] = useState({
    binId: null,
    status: 'idle',
    content: [],
    totalElements: 0,
    totalQuantity: 0,
    error: '',
  })

  const warehouses = useMemo(() => {
    if (isOwner) {
      return ownedWarehouses
        .filter((warehouse) => warehouse?.id)
        .map((warehouse) => ({
          id: String(warehouse.id),
          name: warehouse.name || `Warehouse ${warehouse.id}`,
          width: warehouse.width ?? warehouse.warehouseWidth,
          length: warehouse.length ?? warehouse.warehouseLength ?? warehouse.height,
          height: warehouse.height ?? warehouse.warehouseHeight,
        }))
    }
    const unique = new Map()
    contracts
      .filter((contract) => contract?.status === 'ACTIVE' && contract?.warehouseId)
      .forEach((contract) => {
        const id = String(contract.warehouseId)
        if (!unique.has(id))
          unique.set(id, { id, name: contract.warehouseName || `Warehouse ${id}` })
      })
    return [...unique.values()]
  }, [contracts, isOwner, ownedWarehouses])

  const selectedWarehouseId = useMemo(() => {
    if (!warehouses.length) return ''
    const requested = searchParams.get('warehouseId')
    if (requested && warehouses.some((warehouse) => warehouse.id === requested)) return requested
    if (warehouses.some((warehouse) => warehouse.id === preferredWarehouseId)) {
      return preferredWarehouseId
    }
    return warehouses[0].id
  }, [preferredWarehouseId, searchParams, warehouses])

  const selectedEntity = useMemo(() => getSelected(layout, selection), [layout, selection])
  const selectedRack = useMemo(() => {
    if (selection.type === 'rack') return selectedEntity
    if (selection.type === 'bin') {
      return layout.racks.find((rack) => rack.bins.some((bin) => bin.clientKey === selection.key))
    }
    return null
  }, [layout.racks, selectedEntity, selection])
  const footprintSet = useMemo(() => new Set(layout.footprintCells), [layout.footprintCells])
  const binCount = useMemo(
    () => layout.racks.reduce((total, rack) => total + rack.bins.length, 0),
    [layout.racks]
  )
  const selectedBinId =
    !isOwner && selection.type === 'bin' && selectedEntity?.id
      ? String(selectedEntity.id)
      : null

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        setLoadingOptions(true)
        setError('')
        if (isOwner) {
          const response = await warehouseApi.getOwnerWarehouses({
            page: 0,
            size: 100,
            sortBy: 'createdAt',
            sortDir: 'desc',
          })
          if (alive) setOwnedWarehouses(apiData(response)?.content ?? [])
        } else {
          const response = await contractApi.getMyContracts({ page: 0, size: 100 })
          if (alive) setContracts(apiData(response)?.content ?? [])
        }
      } catch (requestError) {
        if (alive) setError(requestError.response?.data?.message || 'Không tải được danh sách kho.')
      } finally {
        if (alive) setLoadingOptions(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [isOwner])

  const loadLayout = useCallback(async () => {
    if (!selectedWarehouseId) return
    const warehouse = warehouses.find((item) => item.id === selectedWarehouseId)
    try {
      setLoadingLayout(true)
      setError('')
      setMessage('')
      const response = isOwner
        ? await warehouseApi.getOwnerWarehouseLayout(selectedWarehouseId)
        : await warehouseApi.getTenantWarehouseLayout(selectedWarehouseId)
      const payload = apiData(response) || {}
      setLayout(normalizeLayout(payload))
      setTenantDefault(!isOwner && Boolean(payload.isDefault ?? payload.default))
      setSelection({ type: 'layout', key: null })
    } catch (requestError) {
      const notFound = requestError.response?.status === 404
      if (isOwner && notFound) {
        setLayout(
          normalizeLayout({
            width: warehouse?.width,
            length: warehouse?.length,
            height: warehouse?.height,
            racks: [],
          })
        )
        setMessage('Kho chưa có layout. Bạn có thể tạo layout mới và lưu lại.')
      } else {
        setError(requestError.response?.data?.message || 'Không tải được layout kho.')
      }
    } finally {
      setLoadingLayout(false)
    }
  }, [isOwner, selectedWarehouseId, warehouses])

  useEffect(() => {
    // Loading the selected warehouse is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLayout()
  }, [loadLayout])

  useEffect(() => {
    if (isOwner || view !== 'stock' || !selectedWarehouseId || !selectedBinId) return undefined

    let alive = true
    stockApi
      .getStockByBin(selectedWarehouseId, selectedBinId)
      .then((result) => {
        if (!alive) return
        setBinStockState({
          binId: selectedBinId,
          status: 'success',
          content: result.content,
          totalElements: result.totalElements,
          totalQuantity: result.totalQuantity,
          error: '',
        })
      })
      .catch((requestError) => {
        if (!alive) return
        setBinStockState({
          binId: selectedBinId,
          status: 'error',
          content: [],
          totalElements: 0,
          totalQuantity: 0,
          error:
            requestError.response?.data?.message ||
            requestError.message ||
            'Không tải được tồn kho trong Bin.',
        })
      })

    return () => {
      alive = false
    }
  }, [isOwner, selectedBinId, selectedWarehouseId, stockRefreshKey, view])

  useEffect(() => {
    const onMove = (event) => {
      const drag = dragRef.current
      if (!drag) return
      const deltaX = ((event.clientX - drag.startX) / drag.parentPixelWidth) * drag.parentWidth
      const deltaY = ((event.clientY - drag.startY) / drag.parentPixelHeight) * drag.parentLength

      if (drag.mode === 'move') {
        const x = clamp(drag.x + deltaX, 0, Math.max(drag.parentWidth - drag.width, 0))
        const y = clamp(drag.y + deltaY, 0, Math.max(drag.parentLength - drag.length, 0))
        setLayout((current) =>
          drag.type === 'rack'
            ? updateRack(current, drag.key, (rack) => ({ ...rack, coordinateX: x, coordinateY: y }))
            : updateBin(current, drag.key, (bin) => ({ ...bin, coordinateX: x, coordinateY: y }))
        )
        return
      }

      const maxRatio = drag.type === 'bin' ? BIN_MAX_RATIO : 1
      const maxWidth = Math.max(
        MIN_ENTITY_SIZE,
        Math.min(drag.parentWidth - drag.x, drag.parentWidth * maxRatio)
      )
      const maxLength = Math.max(
        MIN_ENTITY_SIZE,
        Math.min(drag.parentLength - drag.y, drag.parentLength * maxRatio)
      )
      const width = clamp(drag.width + deltaX, MIN_ENTITY_SIZE, maxWidth)
      const length = clamp(drag.length + deltaY, MIN_ENTITY_SIZE, maxLength)
      setLayout((current) =>
        drag.type === 'rack'
          ? updateRack(current, drag.key, (rack) => ({ ...rack, width, length }))
          : updateBin(current, drag.key, (bin) => ({ ...bin, width, length }))
      )
    }
    const onUp = () => {
      dragRef.current = null
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const startInteraction = (event, type, entity, mode, parentElement) => {
    if (footprintMode || (mode === 'resize' && !isOwner) || !parentElement) return
    event.preventDefault()
    event.stopPropagation()
    const rect = parentElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const parentRack =
      type === 'bin'
        ? layout.racks.find((rack) => rack.bins.some((bin) => bin.clientKey === entity.clientKey))
        : null
    const parent =
      type === 'rack'
        ? { width: layout.width, length: layout.length }
        : { width: parentRack?.width ?? 1, length: parentRack?.length ?? 1 }
    dragRef.current = {
      type,
      mode,
      key: entity.clientKey,
      startX: event.clientX,
      startY: event.clientY,
      parentPixelWidth: rect.width,
      parentPixelHeight: rect.height,
      parentWidth: parent.width,
      parentLength: parent.length,
      x: entity.coordinateX,
      y: entity.coordinateY,
      width: entity.width,
      length: entity.length,
    }
    // eslint-disable-next-line react-hooks/immutability
    document.body.style.userSelect = 'none'
    setSelection({ type, key: entity.clientKey })
  }

  const addRack = () => {
    if (!isOwner) return
    const rack = normalizeRack({
      name: `Rack ${layout.racks.length + 1}`,
      code: `RACK-${Date.now().toString().slice(-6)}`,
      coordinateX: 2,
      coordinateY: 2,
      width: 18,
      length: 18,
      height: 18,
      bins: [],
    })
    setLayout((current) => ({ ...current, racks: [...current.racks, rack] }))
    setSelection({ type: 'rack', key: rack.clientKey })
    setFootprintMode(false)
  }

  const addBin = () => {
    if (!isOwner || !selectedRack) {
      setError('Hãy chọn một Rack trước khi thêm Bin.')
      return
    }
    const bin = normalizeBin({
      name: `Bin ${selectedRack.bins.length + 1}`,
      code: `BIN-${Date.now().toString().slice(-6)}`,
      coordinateX: 1,
      coordinateY: 1,
      width: Math.min(8, Math.max(selectedRack.width / 2, 4)),
      length: Math.min(8, Math.max(selectedRack.length / 4, 4)),
      height: 8,
    })
    setLayout((current) =>
      updateRack(current, selectedRack.clientKey, (rack) => ({
        ...rack,
        bins: [...rack.bins, bin],
      }))
    )
    setSelection({ type: 'bin', key: bin.clientKey })
    setError('')
  }

  const removeSelected = () => {
    if (!isOwner || selection.type === 'layout') return
    setLayout((current) => {
      if (selection.type === 'rack') {
        return {
          ...current,
          racks: current.racks.filter((rack) => rack.clientKey !== selection.key),
        }
      }
      return {
        ...current,
        racks: current.racks.map((rack) => ({
          ...rack,
          bins: rack.bins.filter((bin) => bin.clientKey !== selection.key),
        })),
      }
    })
    setSelection({ type: 'layout', key: null })
  }

  const saveLayout = async () => {
    if (!selectedWarehouseId || tenantDefault) return
    try {
      setSaving(true)
      setError('')
      const response = isOwner
        ? await warehouseApi.saveOwnerWarehouseLayout(selectedWarehouseId, toPayload(layout))
        : await warehouseApi.saveTenantWarehouseLayout(selectedWarehouseId, toPayload(layout))
      const saved = apiData(response)
      if (saved) setLayout(normalizeLayout(saved))
      setSelection({ type: 'layout', key: null })
      setMessage('Đã lưu layout kho thành công.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Lưu layout không thành công.')
    } finally {
      setSaving(false)
    }
  }

  const changeProperty = (field, value) => {
    const numericFields = new Set([
      'width',
      'length',
      'height',
      'coordinateX',
      'coordinateY',
      'positionZ',
      'rotation',
      'shelfLevel',
      'maxWeight',
      'maxVolume',
    ])
    const nextValue = numericFields.has(field) ? numberOf(value) : value
    setLayout((current) => {
      if (selection.type === 'layout') return { ...current, [field]: nextValue }
      if (selection.type === 'rack') {
        return updateRack(current, selection.key, (rack) => ({ ...rack, [field]: nextValue }))
      }
      return updateBin(current, selection.key, (bin) => ({ ...bin, [field]: nextValue }))
    })
  }

  const toggleFootprint = (row, column) => {
    if (!isOwner || !footprintMode) return
    const key = cellKey(row, column)
    setLayout((current) => {
      const cells = new Set(current.footprintCells)
      if (footprintTool === 'add') cells.add(key)
      else cells.delete(key)
      return { ...current, footprintCells: [...cells] }
    })
  }

  const propertyFields =
    selection.type === 'layout'
      ? [
          ['width', 'Rộng'],
          ['length', 'Dài'],
          ['height', 'Cao'],
        ]
      : selection.type === 'rack'
        ? [
            ['name', 'Tên'],
            ['code', 'Mã'],
            ['coordinateX', 'Tọa độ X'],
            ['coordinateY', 'Tọa độ Y'],
            ['width', 'Rộng'],
            ['length', 'Dài'],
            ['height', 'Cao'],
            ['rotation', 'Góc xoay'],
            ['maxWeight', 'Tải trọng tối đa'],
            ['maxVolume', 'Thể tích tối đa'],
          ]
        : [
            ['name', 'Tên'],
            ['code', 'Mã'],
            ['coordinateX', 'Tọa độ X'],
            ['coordinateY', 'Tọa độ Y'],
            ['width', 'Rộng'],
            ['length', 'Dài'],
            ['height', 'Cao'],
            ['shelfLevel', 'Tầng'],
            ['maxWeight', 'Tải trọng tối đa'],
            ['maxVolume', 'Thể tích tối đa'],
          ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-slate-900/30 md:hidden"
          onClick={() => dispatch(closeMobileSidebar())}
        />
      )}
      <div className="flex pt-14">
        <Sidebar currentRole={currentRole} />
        <div
          className={`min-w-0 flex-1 transition-all duration-150 ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-425 space-y-4 p-3 sm:p-5 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  {stockOnly ? (
                    <Package2 className="h-7 w-7 text-blue-600" />
                  ) : (
                    <Warehouse className="h-7 w-7 text-blue-600" />
                  )}
                  {stockOnly ? 'Hàng hóa trong Bin' : 'Layout kho'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {stockOnly
                    ? 'Chọn kho và Bin để xem mặt hàng, đơn vị và số lượng tồn kho. Màn hình này chỉ cho phép xem.'
                    : isOwner
                    ? 'Tạo Rack, Bin và hình dạng kho. Dữ liệu được lưu theo đúng cấu trúc BE, không có Zone.'
                    : 'Di chuyển Rack và Bin trên layout riêng của Tenant.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadLayout}
                  disabled={!selectedWarehouseId || loadingLayout}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  <RotateCcw className={`mr-2 h-4 w-4 ${loadingLayout ? 'animate-spin' : ''}`} />{' '}
                  Tải lại
                </button>
                {!stockOnly && (
                  <button
                    type="button"
                    onClick={saveLayout}
                    disabled={
                      !selectedWarehouseId || saving || loadingLayout || tenantDefault || view === 'stock'
                    }
                    className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300"
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Lưu layout
                  </button>
                )}
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-xs font-bold tracking-wider text-slate-400 uppercase">
                Chọn warehouse
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(event) => setPreferredWarehouseId(event.target.value)}
                disabled={loadingOptions || !warehouses.length}
                className={inputClass}
              >
                {!warehouses.length && <option value="">Không có warehouse phù hợp</option>}
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </section>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            {message && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                {message}
              </div>
            )}
            {tenantDefault && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Đây là layout mặc định của Owner. Layout Tenant chưa được clone nên chưa thể lưu vị
                trí riêng.
              </div>
            )}

            <div className="grid min-w-0 gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
              <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-bold">Cấu trúc</h2>
                  <span className="text-xs text-slate-500">
                    {layout.racks.length} Rack · {binCount} Bin
                  </span>
                </div>
                {isOwner && (
                  <div className="mb-4 grid gap-2">
                    <button
                      type="button"
                      onClick={addRack}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      <PackagePlus className="mr-2 h-4 w-4" /> Thêm Rack
                    </button>
                    <button
                      type="button"
                      onClick={addBin}
                      className="inline-flex items-center justify-center rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700"
                    >
                      <Box className="mr-2 h-4 w-4" /> Thêm Bin
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelection({ type: 'layout', key: null })}
                  className={`mb-2 w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold ${selection.type === 'layout' ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}`}
                >
                  Layout tổng
                </button>
                <div className="max-h-130 space-y-2 overflow-auto">
                  {layout.racks.map((rack) => (
                    <div key={rack.clientKey} className="rounded-xl border border-slate-200 p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelection({ type: 'rack', key: rack.clientKey })
                          setFootprintMode(false)
                        }}
                        className={`w-full rounded-lg px-2 py-2 text-left text-sm font-semibold ${selection.key === rack.clientKey ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                      >
                        {rack.name || rack.code}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          ({rack.bins.length} Bin)
                        </span>
                      </button>
                      <div className="ml-3 space-y-1 border-l border-slate-200 pl-2">
                        {rack.bins.map((bin) => (
                          <button
                            key={bin.clientKey}
                            type="button"
                            onClick={() => {
                              setSelection({ type: 'bin', key: bin.clientKey })
                              setFootprintMode(false)
                            }}
                            className={`block w-full rounded px-2 py-1.5 text-left text-xs ${selection.key === bin.clientKey ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {bin.name || bin.code}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex rounded-lg bg-slate-100 p-1">
                    {stockOnly ? (
                      <span className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm">
                        <Package2 className="mr-1.5 h-4 w-4 text-blue-600" />
                        Tồn kho trong Bin
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setView('2d')}
                          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === '2d' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                        >
                          2D
                        </button>
                        <button
                          type="button"
                          onClick={() => setView('3d')}
                          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === '3d' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                        >
                          3D
                        </button>
                      </>
                    )}
                  </div>
                  {isOwner && view === '2d' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setFootprintMode(false)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!footprintMode ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}
                      >
                        Chỉnh Rack / Bin
                      </button>
                      <button
                        type="button"
                        onClick={() => setFootprintMode(true)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${footprintMode ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}
                      >
                        <Grid3X3 className="mr-1 inline h-3.5 w-3.5" />
                        Tô hình kho
                      </button>
                      {footprintMode && (
                        <>
                          <button
                            type="button"
                            onClick={() => setFootprintTool('add')}
                            className={`rounded-lg px-2 py-1.5 text-xs ${footprintTool === 'add' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}
                          >
                            Tô ô
                          </button>
                          <button
                            type="button"
                            onClick={() => setFootprintTool('erase')}
                            className={`rounded-lg px-2 py-1.5 text-xs ${footprintTool === 'erase' ? 'bg-red-600 text-white' : 'bg-slate-100'}`}
                          >
                            Xóa ô
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {loadingLayout ? (
                  <div className="flex h-140 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : view === 'stock' ? (
                  <div className="min-h-140 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                    <div className="mb-5 max-w-md">
                      <BinStockMiniMap
                        layout={layout}
                        selection={selection}
                        onSelectBin={(binKey) => {
                          setSelection({ type: 'bin', key: binKey })
                          setFootprintMode(false)
                        }}
                      />
                    </div>
                    {selection.type !== 'bin' ? (
                      <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                          <Package2 className="h-7 w-7" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Chọn một Bin để xem tồn kho</h3>
                        <p className="mt-2 max-w-md text-sm text-slate-500">
                          Chọn Bin trong cây cấu trúc bên trái, sau đó tab này sẽ hiển thị mặt hàng và số lượng đang có trong Bin.
                        </p>
                      </div>
                    ) : !selectedBinId ? (
                      <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
                        <AlertCircle className="mb-3 h-8 w-8 text-amber-500" />
                        <h3 className="font-bold text-slate-800">Bin chưa được lưu</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          Bin cần có ID từ hệ thống trước khi có thể xem tồn kho.
                        </p>
                      </div>
                    ) : binStockState.binId !== selectedBinId || binStockState.status === 'loading' ? (
                      <div className="flex min-h-72 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    ) : binStockState.status === 'error' ? (
                      <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
                        <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
                        <h3 className="font-bold text-slate-800">Không tải được tồn kho</h3>
                        <p className="mt-2 max-w-md text-sm text-red-600">{binStockState.error}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setBinStockState((current) => ({ ...current, status: 'loading' }))
                            setStockRefreshKey((current) => current + 1)
                          }}
                          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Thử lại
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">Tồn kho chỉ đọc</p>
                            <h3 className="mt-1 text-xl font-bold text-slate-900">
                              {selectedEntity.name || selectedEntity.code}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {selectedRack?.name || selectedRack?.code} · {binStockState.totalElements} lô hàng
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
                              Tổng: {binStockState.totalQuantity.toLocaleString()}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setBinStockState((current) => ({ ...current, status: 'loading' }))
                                setStockRefreshKey((current) => current + 1)
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Tải lại
                            </button>
                          </div>
                        </div>

                        {!binStockState.content.length ? (
                          <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-4 text-center">
                            <Package2 className="mb-3 h-9 w-9 text-slate-300" />
                            <p className="font-semibold text-slate-700">Bin này đang trống</p>
                            <p className="mt-1 text-sm text-slate-500">Chưa có mặt hàng nào được lưu trong Bin.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            <table className="w-full min-w-150 text-left text-sm">
                              <thead className="bg-slate-100 text-xs tracking-wider text-slate-500 uppercase">
                                <tr>
                                  <th className="px-4 py-3">SKU</th>
                                  <th className="px-4 py-3">Mặt hàng</th>
                                  <th className="px-4 py-3">Đơn vị</th>
                                  <th className="px-4 py-3 text-right">Số lượng</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {binStockState.content.map((batch) => (
                                  <tr key={batch.id} className="text-slate-700">
                                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                                      {batch.skuCode || '—'}
                                    </td>
                                    <td className="px-4 py-3 font-semibold">{batch.skuName || 'Chưa có tên'}</td>
                                    <td className="px-4 py-3 text-slate-500">
                                      {batch.uomSymbol || batch.uomName || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-base font-bold text-slate-900">
                                      {(Number(batch.quantity) || 0).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : view === '3d' ? (
                  <div className="h-140 overflow-hidden rounded-xl border border-slate-200">
                    <WarehouseLayoutPreview3D layout={layout} />
                  </div>
                ) : (
                  <div className="overflow-auto rounded-xl bg-slate-100 p-3 sm:p-5">
                    <div
                      className="relative mx-auto aspect-square w-full max-w-205 min-w-130 overflow-hidden border-2 border-slate-300 bg-white shadow-inner"
                      onPointerDown={() => setSelection({ type: 'layout', key: null })}
                    >
                      <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
                        {Array.from({ length: FOOTPRINT_GRID_SIZE ** 2 }, (_, index) => {
                          const row = Math.floor(index / FOOTPRINT_GRID_SIZE)
                          const column = index % FOOTPRINT_GRID_SIZE
                          const active = footprintSet.has(cellKey(row, column))
                          return (
                            <button
                              key={cellKey(row, column)}
                              type="button"
                              aria-label={`Ô ${row + 1}-${column + 1}`}
                              onPointerDown={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                toggleFootprint(row, column)
                              }}
                              className={`border border-slate-200/80 ${active ? 'bg-blue-50' : 'bg-slate-300/80'} ${footprintMode ? 'cursor-crosshair' : 'pointer-events-none'}`}
                            />
                          )
                        })}
                      </div>

                      {!footprintMode &&
                        layout.racks.map((rack) => (
                          <div
                            key={rack.clientKey}
                            onPointerDown={(event) =>
                              startInteraction(
                                event,
                                'rack',
                                rack,
                                'move',
                                event.currentTarget.parentElement
                              )
                            }
                            className={`absolute touch-none overflow-hidden rounded-md border-2 bg-blue-500/80 text-white shadow-md ${selection.key === rack.clientKey ? 'z-20 border-blue-950 ring-2 ring-blue-300' : 'z-10 border-blue-700'}`}
                            style={{
                              left: `${(rack.coordinateX / layout.width) * 100}%`,
                              top: `${(rack.coordinateY / layout.length) * 100}%`,
                              width: `${(rack.width / layout.width) * 100}%`,
                              height: `${(rack.length / layout.length) * 100}%`,
                            }}
                          >
                            <div className="pointer-events-none truncate bg-blue-800/80 px-1.5 py-1 text-[10px] font-bold sm:text-xs">
                              {rack.name || rack.code}
                            </div>
                            {rack.bins.map((bin) => (
                              <div
                                key={bin.clientKey}
                                onPointerDown={(event) =>
                                  startInteraction(
                                    event,
                                    'bin',
                                    bin,
                                    'move',
                                    event.currentTarget.parentElement
                                  )
                                }
                                className={`absolute touch-none overflow-hidden rounded-sm border bg-emerald-500/90 text-white shadow ${selection.key === bin.clientKey ? 'z-20 border-white ring-2 ring-emerald-200' : 'z-10 border-emerald-800'}`}
                                style={{
                                  left: `${(bin.coordinateX / rack.width) * 100}%`,
                                  top: `${(bin.coordinateY / rack.length) * 100}%`,
                                  width: `${(bin.width / rack.width) * 100}%`,
                                  height: `${(bin.length / rack.length) * 100}%`,
                                }}
                              >
                                <span className="pointer-events-none block truncate px-1 text-[9px] font-semibold">
                                  {bin.name || bin.code}
                                </span>
                                {isOwner && (
                                  <button
                                    type="button"
                                    aria-label="Đổi kích thước Bin"
                                    onPointerDown={(event) =>
                                      startInteraction(
                                        event,
                                        'bin',
                                        bin,
                                        'resize',
                                        event.currentTarget.parentElement?.parentElement
                                      )
                                    }
                                    className="absolute right-0 bottom-0 flex h-4 w-4 cursor-se-resize touch-none items-end justify-end bg-emerald-950/80 text-[10px] leading-none text-white"
                                  >
                                    ◢
                                  </button>
                                )}
                              </div>
                            ))}
                            {isOwner && (
                              <button
                                type="button"
                                aria-label="Đổi kích thước Rack"
                                onPointerDown={(event) =>
                                  startInteraction(
                                    event,
                                    'rack',
                                    rack,
                                    'resize',
                                    event.currentTarget.parentElement?.parentElement
                                  )
                                }
                                className="absolute right-0 bottom-0 z-30 flex h-5 w-5 cursor-se-resize touch-none items-end justify-end bg-blue-950 text-xs leading-none text-white"
                              >
                                ◢
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </section>

              <aside className="min-w-0 self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-20">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-bold">Thuộc tính</h2>
                    <p className="text-xs text-slate-500">
                      {selection.type === 'layout'
                        ? 'Layout tổng'
                        : selection.type === 'rack'
                          ? 'Rack'
                          : 'Bin'}
                    </p>
                  </div>
                  {isOwner && selection.type !== 'layout' && (
                    <button
                      type="button"
                      onClick={removeSelected}
                      className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                      aria-label="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {propertyFields.map(([field, label]) => {
                    const isText = field === 'name' || field === 'code'
                    const tenantEditable =
                      !isOwner &&
                      ['coordinateX', 'coordinateY', 'positionZ', 'rotation'].includes(field)
                    const disabled = view === 'stock' || (!isOwner && !tenantEditable)
                    return (
                      <label key={field} className="block text-xs font-semibold text-slate-600">
                        <span className="mb-1 block">{label}</span>
                        <input
                          type={isText ? 'text' : 'number'}
                          min={isText ? undefined : 0}
                          value={selectedEntity?.[field] ?? ''}
                          disabled={disabled}
                          onChange={(event) => changeProperty(field, event.target.value)}
                          className={inputClass}
                        />
                      </label>
                    )
                  })}
                </div>
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  Kéo thân Rack hoặc Bin để di chuyển.{' '}
                  {isOwner && 'Kéo ◢ ngay góc dưới phải để đổi kích thước. Bin tối đa 80% Rack.'}
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default LayoutWarehouse
