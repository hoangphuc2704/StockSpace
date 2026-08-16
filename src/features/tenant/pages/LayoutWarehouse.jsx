import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
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
import layoutApi from '@/services/layoutApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import stockApi from '@/services/wms/stockApi'

const DEFAULT_LAYOUT_SIZE = 100
// Racks can be smaller than the old 4m hard limit. Keep a small positive
// minimum so the 2D/3D renderers still have a usable footprint.
const MIN_ENTITY_SIZE = 1
const MIN_BIN_SIZE = 0.1
const FOOTPRINT_GRID_SIZE = 10
const BIN_MAX_RATIO = 0.8
const layoutDimensionsKey = (warehouseId) => `stockspace:warehouse-layout-dimensions:${warehouseId}`
const pendingOwnerLayoutKey = 'stockspace:pending-owner-layout'

const keyOf = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const numberOf = (value, fallback = 0) => {
  const valueAsNumber = Number(value)
  return Number.isFinite(valueAsNumber) ? valueAsNumber : fallback
}
const integerOf = (value, fallback = 0) => Math.round(numberOf(value, fallback))
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const totalBinWeightLimit = (rack) =>
  (rack?.bins || []).reduce((total, bin) => total + Math.max(numberOf(bin.maxWeight), 0), 0)
const totalBinVolumeLimit = (rack) =>
  (rack?.bins || []).reduce((total, bin) => total + Math.max(numberOf(bin.maxVolume), 0), 0)
const apiData = (response) => response?.data?.data ?? response?.data ?? null
const normalizeCreatedDimensions = (dimensions) => {
  const width = numberOf(dimensions?.width)
  const length = numberOf(dimensions?.length)
  const height = numberOf(dimensions?.height)
  return width >= 20 && length >= 20 && height >= MIN_ENTITY_SIZE ? { width, length, height } : null
}
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

const normalizeBlockedCells = (cells) => {
  if (!Array.isArray(cells)) return []
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

const rectangleOverlapsBlockedCell = (rectangle, layout, blockedCells = layout.blockedCells) => {
  if (!blockedCells?.length) return false
  const cellWidth = layout.width / FOOTPRINT_GRID_SIZE
  const cellLength = layout.length / FOOTPRINT_GRID_SIZE
  const right = rectangle.coordinateX + rectangle.width
  const bottom = rectangle.coordinateY + rectangle.length

  return blockedCells.some((cell) => {
    const [row, column] = cell.split(':').map(Number)
    const cellLeft = column * cellWidth
    const cellRight = cellLeft + cellWidth
    const cellTop = row * cellLength
    const cellBottom = cellTop + cellLength
    return (
      rectangle.coordinateX < cellRight &&
      right > cellLeft &&
      rectangle.coordinateY < cellBottom &&
      bottom > cellTop
    )
  })
}

const findAvailableRackPosition = (layout, width, length) => {
  const maxX = Math.max(Math.floor(layout.width - width), 0)
  const maxY = Math.max(Math.floor(layout.length - length), 0)
  for (let y = 0; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const candidate = { coordinateX: x, coordinateY: y, width, length }
      if (!rectangleOverlapsBlockedCell(candidate, layout)) return { x, y }
    }
  }
  return null
}

const normalizeBin = (bin = {}) => ({
  clientKey: keyOf('bin'),
  id: nullableId(bin.id),
  name: bin.name == null ? 'New Bin' : String(bin.name),
  code: bin.code == null ? '' : String(bin.code),
  shelfLevel: Math.max(integerOf(bin.shelfLevel, 1), 1),
  maxWeight: numberOf(bin.maxWeight, 0),
  maxVolume: numberOf(bin.maxVolume, 0),
  coordinateX: numberOf(bin.coordinateX, 0),
  coordinateY: numberOf(bin.coordinateY, 0),
  positionZ: numberOf(bin.positionZ, 0),
  width: Math.max(numberOf(bin.width, 8), MIN_BIN_SIZE),
  length: Math.max(numberOf(bin.length, 8), MIN_BIN_SIZE),
  height: Math.max(numberOf(bin.height, 8), MIN_BIN_SIZE),
})

const normalizeRack = (rack = {}) => ({
  clientKey: keyOf('rack'),
  id: nullableId(rack.id),
  name: rack.name == null ? 'New rack' : String(rack.name),
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
  height: Math.max(numberOf(payload.height, DEFAULT_LAYOUT_SIZE), MIN_ENTITY_SIZE),
  footprintCells: normalizeFootprint(payload.footprintCells),
  // `positions` is the BE field that stores the painted/locked grid cells.
  // Keep the legacy fallback so layouts returned by an older deployment still render correctly.
  blockedCells: normalizeBlockedCells(payload.positions ?? payload.blockedCells),
  racks: Array.isArray(payload.racks) ? payload.racks.map(normalizeRack) : [],
})

const serializeBin = (bin, rackIndex, binIndex, rackWidth, rackLength, rackHeight) => {
  const width = clamp(
    numberOf(bin.width, 8),
    MIN_BIN_SIZE,
    Math.max(MIN_BIN_SIZE, rackWidth * BIN_MAX_RATIO)
  )
  const length = clamp(
    numberOf(bin.length, 8),
    MIN_BIN_SIZE,
    Math.max(MIN_BIN_SIZE, rackLength * BIN_MAX_RATIO)
  )
  const height = clamp(numberOf(bin.height, 8), MIN_BIN_SIZE, rackHeight)
  return {
    id: nullableId(bin.id),
    shelfLevel: Math.max(integerOf(bin.shelfLevel, 1), 1),
    name: bin.name?.trim() || 'Bin',
    code: bin.code?.trim() || `BIN-${rackIndex + 1}-${binIndex + 1}`,
    maxWeight: numberOf(bin.maxWeight),
    maxVolume: numberOf(bin.maxVolume),
    coordinateX: clamp(numberOf(bin.coordinateX), 0, Math.max(rackWidth - width, 0)),
    coordinateY: clamp(numberOf(bin.coordinateY), 0, Math.max(rackLength - length, 0)),
    positionZ: clamp(numberOf(bin.positionZ), 0, Math.max(rackHeight - height, 0)),
    width,
    length,
    height,
  }
}

const serializeRack = (rack, rackIndex, layoutWidth, layoutLength, layoutHeight) => {
  const width = clamp(numberOf(rack.width, 18), MIN_ENTITY_SIZE, layoutWidth)
  const length = clamp(numberOf(rack.length, 18), MIN_ENTITY_SIZE, layoutLength)
  const height = clamp(numberOf(rack.height, 18), MIN_ENTITY_SIZE, layoutHeight)
  return {
    id: nullableId(rack.id),
    name: rack.name?.trim() || 'Rack',
    code: rack.code?.trim() || `RACK-${rackIndex + 1}`,
    maxWeight: numberOf(rack.maxWeight),
    maxVolume: numberOf(rack.maxVolume),
    coordinateX: clamp(numberOf(rack.coordinateX), 0, Math.max(layoutWidth - width, 0)),
    coordinateY: clamp(numberOf(rack.coordinateY), 0, Math.max(layoutLength - length, 0)),
    positionZ: clamp(numberOf(rack.positionZ), 0, Math.max(layoutHeight - height, 0)),
    rotation: integerOf(rack.rotation),
    width,
    length,
    height,
    bins: rack.bins.map((bin, binIndex) =>
      serializeBin(bin, rackIndex, binIndex, width, length, height)
    ),
  }
}

const fitBinsToRack = (rack) => {
  const rackWidth = Math.max(numberOf(rack.width, MIN_ENTITY_SIZE), MIN_ENTITY_SIZE)
  const rackLength = Math.max(numberOf(rack.length, MIN_ENTITY_SIZE), MIN_ENTITY_SIZE)
  const rackHeight = Math.max(numberOf(rack.height, MIN_ENTITY_SIZE), MIN_ENTITY_SIZE)
  return {
    ...rack,
    width: rackWidth,
    length: rackLength,
    height: rackHeight,
    bins: (rack.bins || []).map((bin) => {
      const width = clamp(
        numberOf(bin.width, 8),
        MIN_BIN_SIZE,
        Math.max(MIN_BIN_SIZE, rackWidth * BIN_MAX_RATIO)
      )
      const length = clamp(
        numberOf(bin.length, 8),
        MIN_BIN_SIZE,
        Math.max(MIN_BIN_SIZE, rackLength * BIN_MAX_RATIO)
      )
      const height = clamp(numberOf(bin.height, 8), MIN_BIN_SIZE, rackHeight)
      return {
        ...bin,
        width,
        length,
        height,
        coordinateX: clamp(numberOf(bin.coordinateX), 0, Math.max(rackWidth - width, 0)),
        coordinateY: clamp(numberOf(bin.coordinateY), 0, Math.max(rackLength - length, 0)),
        positionZ: clamp(numberOf(bin.positionZ), 0, Math.max(rackHeight - height, 0)),
      }
    }),
  }
}

const toPayload = (layout) => {
  const width = Math.max(numberOf(layout.width, DEFAULT_LAYOUT_SIZE), 20)
  const length = Math.max(numberOf(layout.length, DEFAULT_LAYOUT_SIZE), 20)
  return {
    width,
    length,
    height: Math.max(numberOf(layout.height, DEFAULT_LAYOUT_SIZE), MIN_ENTITY_SIZE),
    positions: normalizeBlockedCells(layout.blockedCells),
    racks: layout.racks.map((rack, rackIndex) =>
      serializeRack(
        rack,
        rackIndex,
        width,
        length,
        Math.max(numberOf(layout.height), MIN_ENTITY_SIZE)
      )
    ),
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
  const blockedCells = new Set(layout.blockedCells)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-800">Select Bin on the 2D layout</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          The diagram only allows viewing and selecting Bin.
        </p>
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
                    blockedCells.has(cellKey(row, column))
                      ? 'bg-slate-900'
                      : activeCells.has(cellKey(row, column))
                        ? 'bg-blue-50'
                        : 'bg-slate-300/80'
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
                  title={`See goods inside ${bin.name || bin.code}`}
                  aria-label={`See goods inside ${bin.name || bin.code}`}
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
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-900" /> Locked area
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Rack
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Bin can choose
        </span>
      </div>
    </div>
  )
}

function LayoutWarehouse({ currentRole = 'TENANT', initialView = '2d', stockOnly = false }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const dragRef = useRef(null)
  const blockedPaintRef = useRef(false)
  const isOwner = currentRole === 'OWNER'
  const isReadOnly = currentRole === 'STAFF' || stockOnly

  const [rentedWarehouses, setRentedWarehouses] = useState([])
  const [ownedWarehouses, setOwnedWarehouses] = useState([])
  const [preferredWarehouseId, setPreferredWarehouseId] = useState('')
  const [layout, setLayout] = useState(() => normalizeLayout())
  const [selection, setSelection] = useState({ type: 'layout', key: null })
  const [view, setView] = useState(stockOnly ? 'stock' : initialView)
  const [blockedMode, setBlockedMode] = useState(false)
  const [blockedTool, setBlockedTool] = useState('lock')
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingLayout, setLoadingLayout] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [layoutSetupComplete, setLayoutSetupComplete] = useState(false)
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
          name: warehouse.name || 'Warehouse',
          width: warehouse.width ?? warehouse.warehouseWidth,
          length: warehouse.length ?? warehouse.warehouseLength ?? warehouse.height,
          height: warehouse.height ?? warehouse.warehouseHeight,
        }))
    }
    return rentedWarehouses
      .filter((warehouse) => warehouse?.id)
      .map((warehouse) => ({
        id: String(warehouse.id),
        name: warehouse.name || 'Warehouse',
        width: warehouse.width ?? warehouse.warehouseWidth,
        length: warehouse.length ?? warehouse.warehouseLength ?? warehouse.height,
        height: warehouse.height ?? warehouse.warehouseHeight,
      }))
  }, [isOwner, ownedWarehouses, rentedWarehouses])

  const pendingOwnerLayout = useMemo(() => {
    if (!isOwner || layoutSetupComplete) return null
    try {
      return JSON.parse(sessionStorage.getItem(pendingOwnerLayoutKey) || 'null')
    } catch {
      return null
    }
  }, [isOwner, layoutSetupComplete])

  const selectedWarehouseId = useMemo(() => {
    if (!warehouses.length) return ''
    if (
      pendingOwnerLayout?.warehouseId &&
      warehouses.some((warehouse) => warehouse.id === String(pendingOwnerLayout.warehouseId))
    ) {
      return String(pendingOwnerLayout.warehouseId)
    }
    const requested = searchParams.get('warehouseId')
    if (requested && warehouses.some((warehouse) => warehouse.id === requested)) return requested
    if (warehouses.some((warehouse) => warehouse.id === preferredWarehouseId)) {
      return preferredWarehouseId
    }
    return warehouses[0].id
  }, [pendingOwnerLayout, preferredWarehouseId, searchParams, warehouses])

  const isMandatorySetup = useMemo(() => {
    if (!isOwner || layoutSetupComplete) return false
    return searchParams.get('setupRequired') === 'true' || Boolean(pendingOwnerLayout)
  }, [isOwner, layoutSetupComplete, pendingOwnerLayout, searchParams])

  useEffect(() => {
    if (!isMandatorySetup) return undefined
    const warnBeforeLeaving = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [isMandatorySetup])

  const createdDimensions = useMemo(() => {
    if (!selectedWarehouseId) return null
    const requestedWarehouseId = searchParams.get('warehouseId')
    if (requestedWarehouseId === selectedWarehouseId) {
      const fromQuery = normalizeCreatedDimensions({
        width: searchParams.get('width'),
        length: searchParams.get('length'),
        height: searchParams.get('height'),
      })
      if (fromQuery) return fromQuery
    }
    try {
      return normalizeCreatedDimensions(
        JSON.parse(localStorage.getItem(layoutDimensionsKey(selectedWarehouseId)) || 'null')
      )
    } catch {
      return null
    }
  }, [searchParams, selectedWarehouseId])

  const selectedEntity = useMemo(() => getSelected(layout, selection), [layout, selection])
  const selectedRack = useMemo(() => {
    if (selection.type === 'rack') return selectedEntity
    if (selection.type === 'bin') {
      return layout.racks.find((rack) => rack.bins.some((bin) => bin.clientKey === selection.key))
    }
    return null
  }, [layout.racks, selectedEntity, selection])
  const footprintSet = useMemo(() => new Set(layout.footprintCells), [layout.footprintCells])
  const blockedSet = useMemo(() => new Set(layout.blockedCells), [layout.blockedCells])
  const binCount = useMemo(
    () => layout.racks.reduce((total, rack) => total + rack.bins.length, 0),
    [layout.racks]
  )
  const selectedBinId =
    !isOwner && selection.type === 'bin' && selectedEntity?.id ? String(selectedEntity.id) : null

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
          const response = await warehouseApi.getMyWarehouses()
          const payload = apiData(response)
          if (alive) {
            setRentedWarehouses(Array.isArray(payload) ? payload : (payload?.content ?? []))
          }
        }
      } catch (requestError) {
        if (alive)
          setError(requestError.response?.data?.message || 'Unable to load inventory list.')
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
        : currentRole === 'STAFF'
          ? await warehouseApi.getPublicWarehouseLayout(selectedWarehouseId)
          : await layoutApi.getTenantWarehouseLayout(selectedWarehouseId)
      const payload = apiData(response) || {}
      setLayout(
        normalizeLayout({
          ...payload,
          width: createdDimensions?.width ?? warehouse?.width ?? payload.width,
          length: createdDimensions?.length ?? warehouse?.length ?? payload.length,
          height: createdDimensions?.height ?? warehouse?.height ?? payload.height,
        })
      )
      setTenantDefault(!isOwner && Boolean(payload.isDefault ?? payload.default))
      setSelection({ type: 'layout', key: null })
    } catch (requestError) {
      const notFound = requestError.response?.status === 404
      if (isOwner && notFound) {
        setLayout(
          normalizeLayout({
            width: createdDimensions?.width ?? warehouse?.width,
            length: createdDimensions?.length ?? warehouse?.length,
            height: createdDimensions?.height ?? warehouse?.height,
            racks: [],
          })
        )
        setMessage(
          'The warehouse does not have a layout yet. You can create a new layout and save it.'
        )
      } else {
        const status = requestError.response?.status
        if (!isOwner && status === 404) {
          setError(
            'This rented warehouse does not have an owner layout yet. Ask the owner to configure and save the layout.'
          )
        } else if (!isOwner && status === 403) {
          setError(
            'You do not have permission to view this warehouse layout. Please sign in again or contact support.'
          )
        } else {
          setError(requestError.response?.data?.message || 'Unable to load warehouse layout.')
        }
      }
    } finally {
      setLoadingLayout(false)
    }
  }, [createdDimensions, currentRole, isOwner, selectedWarehouseId, warehouses])

  useEffect(() => {
    // Loading the selected warehouse is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLayout()
  }, [loadLayout])

  useEffect(() => {
    const shouldLoadBinStock = view === 'stock' || currentRole === 'STAFF'
    if (isOwner || !shouldLoadBinStock || !selectedWarehouseId || !selectedBinId) return undefined

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
            'Unable to load inventory in Bin.',
        })
      })

    return () => {
      alive = false
    }
  }, [currentRole, isOwner, selectedBinId, selectedWarehouseId, stockRefreshKey, view])

  useEffect(() => {
    const onMove = (event) => {
      const drag = dragRef.current
      if (!drag) return
      const deltaX = ((event.clientX - drag.startX) / drag.parentPixelWidth) * drag.parentWidth
      const deltaY = ((event.clientY - drag.startY) / drag.parentPixelHeight) * drag.parentLength

      if (drag.mode === 'move') {
        const x = clamp(drag.x + deltaX, 0, Math.max(drag.parentWidth - drag.width, 0))
        const y = clamp(drag.y + deltaY, 0, Math.max(drag.parentLength - drag.length, 0))
        if (
          drag.type === 'rack' &&
          rectangleOverlapsBlockedCell(
            { coordinateX: x, coordinateY: y, width: drag.width, length: drag.length },
            { width: drag.layoutWidth, length: drag.layoutLength },
            drag.blockedCells
          )
        ) {
          return
        }
        setLayout((current) =>
          drag.type === 'rack'
            ? updateRack(current, drag.key, (rack) => ({ ...rack, coordinateX: x, coordinateY: y }))
            : updateBin(current, drag.key, (bin) => ({ ...bin, coordinateX: x, coordinateY: y }))
        )
        return
      }

      const maxRatio = drag.type === 'bin' ? BIN_MAX_RATIO : 1
      const minSize = drag.type === 'bin' ? MIN_BIN_SIZE : MIN_ENTITY_SIZE
      const maxWidth = Math.max(
        minSize,
        Math.min(drag.parentWidth - drag.x, drag.parentWidth * maxRatio)
      )
      const maxLength = Math.max(
        minSize,
        Math.min(drag.parentLength - drag.y, drag.parentLength * maxRatio)
      )
      const width = clamp(drag.width + deltaX, minSize, maxWidth)
      const length = clamp(drag.length + deltaY, minSize, maxLength)
      if (
        drag.type === 'rack' &&
        rectangleOverlapsBlockedCell(
          { coordinateX: drag.x, coordinateY: drag.y, width, length },
          { width: drag.layoutWidth, length: drag.layoutLength },
          drag.blockedCells
        )
      ) {
        return
      }
      setLayout((current) =>
        drag.type === 'rack'
          ? updateRack(current, drag.key, (rack) => fitBinsToRack({ ...rack, width, length }))
          : updateBin(current, drag.key, (bin) => ({ ...bin, width, length }))
      )
    }
    const onUp = () => {
      dragRef.current = null
      blockedPaintRef.current = false
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
    if (isReadOnly) {
      event.preventDefault()
      event.stopPropagation()
      setSelection({ type, key: entity.clientKey })
      if (currentRole === 'STAFF' && type === 'bin') setView('stock')
      return
    }
    if (blockedMode || (mode === 'resize' && !isOwner) || !parentElement) return
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
      blockedCells: layout.blockedCells,
      layoutWidth: layout.width,
      layoutLength: layout.length,
    }
    // eslint-disable-next-line react-hooks/immutability
    document.body.style.userSelect = 'none'
    setSelection({ type, key: entity.clientKey })
  }

  const addRack = () => {
    if (!isOwner) return
    const width = Math.min(18, layout.width)
    const length = Math.min(18, layout.length)
    const position = findAvailableRackPosition(layout, width, length)
    if (!position) {
      setError('There is no unlocked area large enough for a new rack.')
      return
    }
    const rack = normalizeRack({
      name: `Rack ${layout.racks.length + 1}`,
      code: `RACK-${Date.now().toString().slice(-6)}`,
      coordinateX: position.x,
      coordinateY: position.y,
      width,
      length,
      height: Math.min(18, layout.height),
      bins: [],
    })
    setLayout((current) => ({ ...current, racks: [...current.racks, rack] }))
    setSelection({ type: 'rack', key: rack.clientKey })
    setBlockedMode(false)
    setError('')
  }

  const addBin = () => {
    if (!isOwner || !selectedRack) {
      setError('Please select a Rack before adding a Bin.')
      return
    }
    const bin = normalizeBin({
      name: `Bin ${selectedRack.bins.length + 1}`,
      code: `BIN-${Date.now().toString().slice(-6)}`,
      coordinateX: 0,
      coordinateY: 0,
      width: Math.min(8, Math.max(MIN_BIN_SIZE, selectedRack.width * BIN_MAX_RATIO)),
      length: Math.min(8, Math.max(MIN_BIN_SIZE, selectedRack.length * BIN_MAX_RATIO)),
      height: Math.min(8, selectedRack.height),
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
    if (isReadOnly || !selectedWarehouseId || tenantDefault) return
    if (layout.racks.some((rack) => rectangleOverlapsBlockedCell(rack, layout))) {
      setError('A rack overlaps a locked cell. Move it before saving the layout.')
      return
    }
    const overloadedRack = layout.racks.find((rack) => {
      const maxWeight = Math.max(numberOf(rack.maxWeight), 0)
      const maxVolume = Math.max(numberOf(rack.maxVolume), 0)
      return (
        (maxWeight > 0 && totalBinWeightLimit(rack) > maxWeight) ||
        (maxVolume > 0 && totalBinVolumeLimit(rack) > maxVolume)
      )
    })
    if (isOwner && overloadedRack) {
      const weightOverloaded =
        Math.max(numberOf(overloadedRack.maxWeight), 0) > 0 &&
        totalBinWeightLimit(overloadedRack) > Math.max(numberOf(overloadedRack.maxWeight), 0)
      setError(
        `The total Bin ${weightOverloaded ? 'weight' : 'volume'} limit in ${overloadedRack.name || overloadedRack.code || 'Rack'} cannot exceed the Rack limit.`
      )
      return
    }
    try {
      setSaving(true)
      setError('')
      const response = isOwner
        ? await warehouseApi.saveOwnerWarehouseLayout(selectedWarehouseId, toPayload(layout))
        : await layoutApi.saveTenantWarehouseLayout(selectedWarehouseId, toPayload(layout))
      const saved = apiData(response)
      if (saved) setLayout(normalizeLayout(saved))
      setSelection({ type: 'layout', key: null })
      setMessage('Warehouse layout saved successfully.')
      if (isMandatorySetup) {
        try {
          sessionStorage.removeItem(pendingOwnerLayoutKey)
        } catch {
          // Ignore storage cleanup errors; the saved layout is still valid.
        }
        setLayoutSetupComplete(true)
        setMessage('Warehouse layout saved successfully. You can now leave this page.')
        const nextParams = new URLSearchParams(searchParams)
        nextParams.delete('setupRequired')
        navigate(
          {
            pathname: location.pathname,
            search: nextParams.toString() ? `?${nextParams.toString()}` : '',
          },
          { replace: true }
        )
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Saving layout failed.')
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
    const parsedValue = numericFields.has(field) ? numberOf(value) : value
    const isDimensionField = ['width', 'length', 'height'].includes(field)
    const dimensionMinimum = selection.type === 'bin' ? MIN_BIN_SIZE : MIN_ENTITY_SIZE
    const nextValue = isDimensionField
      ? Math.max(parsedValue, dimensionMinimum)
      : ['maxWeight', 'maxVolume'].includes(field)
        ? Math.max(parsedValue, 0)
        : parsedValue
    if (
      selection.type === 'rack' &&
      field === 'maxWeight' &&
      nextValue > 0 &&
      totalBinWeightLimit(selectedEntity) > nextValue
    ) {
      setError('The Rack limit cannot be lower than the total weight limit of its Bins.')
      return
    }
    if (
      selection.type === 'rack' &&
      field === 'maxVolume' &&
      nextValue > 0 &&
      totalBinVolumeLimit(selectedEntity) > nextValue
    ) {
      setError('The Rack volume limit cannot be lower than the total volume limit of its Bins.')
      return
    }
    if (selection.type === 'bin' && ['maxWeight', 'maxVolume'].includes(field)) {
      const limitField = field === 'maxWeight' ? 'maxWeight' : 'maxVolume'
      const otherBinsWeight = selectedRack.bins.reduce(
        (total, bin) =>
          total +
          (bin.clientKey === selectedEntity.clientKey ? 0 : Math.max(numberOf(bin[limitField]), 0)),
        0
      )
      const rackLimit = Math.max(numberOf(selectedRack[limitField]), 0)
      if (rackLimit > 0 && otherBinsWeight + nextValue > rackLimit) {
        setError(`The total Bin ${field === 'maxWeight' ? 'weight' : 'volume'} limit cannot exceed the Rack limit.`)
        return
      }
    }
    if (selection.type === 'layout' && ['width', 'length'].includes(field)) {
      const candidateLayout = { ...layout, [field]: Math.max(nextValue, 20) }
      const invalidRack = candidateLayout.racks.some(
        (rack) =>
          rack.coordinateX + rack.width > candidateLayout.width ||
          rack.coordinateY + rack.length > candidateLayout.length ||
          rectangleOverlapsBlockedCell(rack, candidateLayout)
      )
      if (invalidRack) {
        setError(
          'The new layout size would place a rack outside the usable area or on a locked cell.'
        )
        return
      }
    }
    if (
      selection.type === 'rack' &&
      ['width', 'length', 'height', 'coordinateX', 'coordinateY', 'positionZ'].includes(field)
    ) {
      const candidate = { ...selectedEntity, [field]: nextValue }
      const candidateRack = isDimensionField ? fitBinsToRack(candidate) : candidate
      const outsideLayout =
        candidateRack.coordinateX < 0 ||
        candidateRack.coordinateY < 0 ||
        candidateRack.positionZ < 0 ||
        candidateRack.coordinateX + candidateRack.width > layout.width ||
        candidateRack.coordinateY + candidateRack.length > layout.length ||
        candidateRack.positionZ + candidateRack.height > layout.height
      const binOutsideRack = candidateRack.bins.some(
        (bin) =>
          bin.coordinateX + bin.width > candidateRack.width ||
          bin.coordinateY + bin.length > candidateRack.length ||
          bin.positionZ + bin.height > candidateRack.height
      )
      if (outsideLayout || binOutsideRack || rectangleOverlapsBlockedCell(candidateRack, layout)) {
        setError('The rack and its bins must remain within the warehouse boundaries.')
        return
      }
    }
    if (
      selection.type === 'bin' &&
      ['width', 'length', 'height', 'coordinateX', 'coordinateY', 'positionZ'].includes(field)
    ) {
      const candidate = { ...selectedEntity, [field]: nextValue }
      const outsideRack =
        candidate.coordinateX < 0 ||
        candidate.coordinateY < 0 ||
        candidate.positionZ < 0 ||
        candidate.coordinateX + candidate.width > selectedRack.width ||
        candidate.coordinateY + candidate.length > selectedRack.length ||
        candidate.positionZ + candidate.height > selectedRack.height
      if (outsideRack) {
        setError('The bin must remain within its rack boundaries.')
        return
      }
    }
    setLayout((current) => {
      if (selection.type === 'layout') return { ...current, [field]: nextValue }
      if (selection.type === 'rack') {
        const updatedRack = { ...selectedEntity, [field]: nextValue }
        return updateRack(current, selection.key, (rack) =>
          isDimensionField ? fitBinsToRack({ ...rack, [field]: nextValue }) : updatedRack
        )
      }
      return updateBin(current, selection.key, (bin) => ({ ...bin, [field]: nextValue }))
    })
    setError('')
  }

  const toggleBlockedCell = (row, column) => {
    if (!isOwner || !blockedMode) return
    const key = cellKey(row, column)
    if (
      blockedTool === 'lock' &&
      layout.racks.some((rack) => rectangleOverlapsBlockedCell(rack, layout, [key]))
    ) {
      setError('Move the rack out of this cell before locking it.')
      return
    }
    setLayout((current) => {
      const cells = new Set(current.blockedCells)
      if (blockedTool === 'lock') cells.add(key)
      else cells.delete(key)
      return { ...current, blockedCells: [...cells] }
    })
    setError('')
  }

  const propertyFields =
    selection.type === 'layout'
      ? [
          ['width', 'Wide', 'm'],
          ['length', 'Long', 'm'],
          ['height', 'Height', 'm'],
        ]
      : selection.type === 'rack'
        ? [
            ['name', 'Name'],
            ['code', 'Code'],
            ['width', 'Wide', 'm'],
            ['length', 'Long', 'm'],
            ['height', 'Height', 'm'],
            ['maxWeight', 'Maximum load', 'kg'],
            ['maxVolume', 'Maximum volume', 'm³'],
          ]
        : [
            ['name', 'Name'],
            ['code', 'Code'],
            ['width', 'Wide', 'm'],
            ['length', 'Long', 'm'],
            ['height', 'Height', 'm'],
            ['shelfLevel', 'Floor'],
            ['maxWeight', 'Maximum load', 'kg'],
            ['maxVolume', 'Maximum volume', 'm³'],
          ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      {isMobileOpen && !isMandatorySetup && (
        <button
          type="button"
          aria-label="Close the menu"
          className="fixed inset-0 z-40 bg-slate-900/30 md:hidden"
          onClick={() => dispatch(closeMobileSidebar())}
        />
      )}
      <div className="flex pt-14">
        {!isMandatorySetup && <Sidebar currentRole={currentRole} />}
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
                  {stockOnly ? 'Goods in Bin' : 'Warehouse Layout'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {stockOnly
                    ? 'Select warehouse and Bin to view items, units and inventory quantity. This screen is for viewing only.'
                    : isOwner
                      ? 'Create Rack, Bin and warehouse shapes. Data is stored in the correct BE structure, without Zone.'
                      : isReadOnly
                        ? 'View the warehouse layout. Editing is disabled for Staff.'
                        : "Move Rack and Bin on Tenant's own layout."}
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
                  Reload
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={saveLayout}
                    disabled={
                      !selectedWarehouseId ||
                      saving ||
                      loadingLayout ||
                      tenantDefault ||
                      view === 'stock'
                    }
                    className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300"
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save layout
                  </button>
                )}
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-xs font-bold tracking-wider text-slate-400 uppercase">
                Select warehouse
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(event) => setPreferredWarehouseId(event.target.value)}
                disabled={isMandatorySetup || loadingOptions || !warehouses.length}
                className={inputClass}
              >
                {!warehouses.length && <option value="">There is no suitable warehouse</option>}
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
            {isMandatorySetup && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                This warehouse post is not complete yet. Create and save its layout before leaving
                this page.
              </div>
            )}
            {tenantDefault && !isReadOnly && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                This is the Owner's default layout. Layout Tenant has not been cloned yet so it
                cannot be saved own mind.
              </div>
            )}

            <div className="grid min-w-0 gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
              <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-bold">Structure</h2>
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
                      <PackagePlus className="mr-2 h-4 w-4" /> Add Rack
                    </button>
                    <button
                      type="button"
                      onClick={addBin}
                      className="inline-flex items-center justify-center rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700"
                    >
                      <Box className="mr-2 h-4 w-4" /> Add Bin
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelection({ type: 'layout', key: null })}
                  className={`mb-2 w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold ${selection.type === 'layout' ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}`}
                >
                  General layout
                </button>
                <div className="max-h-130 space-y-2 overflow-auto">
                  {layout.racks.map((rack) => (
                    <div key={rack.clientKey} className="rounded-xl border border-slate-200 p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelection({ type: 'rack', key: rack.clientKey })
                          setBlockedMode(false)
                        }}
                        className={`w-full rounded-lg px-2 py-2 text-left text-sm font-semibold ${selection.key === rack.clientKey ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate">{rack.name || rack.code}</span>
                          <span className="shrink-0 text-xs font-normal text-slate-400">
                            {rack.bins.length} Bin
                          </span>
                        </span>
                        {!isOwner && (
                          <span className="mt-1 block text-[11px] font-normal text-slate-500">
                            Load: {numberOf(rack.maxWeight).toLocaleString('en-US')} kg · Volume:{' '}
                            {numberOf(rack.maxVolume).toLocaleString('en-US')} m³
                          </span>
                        )}
                      </button>
                      <div className="ml-3 space-y-1 border-l border-slate-200 pl-2">
                        {rack.bins.map((bin) => (
                          <button
                            key={bin.clientKey}
                            type="button"
                            onClick={() => {
                              setSelection({ type: 'bin', key: bin.clientKey })
                              setBlockedMode(false)
                            }}
                            className={`block w-full rounded px-2 py-1.5 text-left text-xs ${selection.key === bin.clientKey ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate">{bin.name || bin.code}</span>
                              {!isOwner && (
                                <span className="shrink-0 text-[10px] text-slate-400">
                                  {numberOf(bin.maxWeight).toLocaleString('en-US')} kg
                                </span>
                              )}
                            </span>
                            {!isOwner && (
                              <span className="mt-0.5 block text-[10px] text-slate-400">
                                Shelf {bin.shelfLevel} ·{' '}
                                {numberOf(bin.maxVolume).toLocaleString('en-US')} m³
                              </span>
                            )}
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
                        Inventory in Bin
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
                        {currentRole === 'STAFF' && (
                          <button
                            type="button"
                            onClick={() => setView('stock')}
                            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === 'stock' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                          >
                            Inventory
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {isOwner && view === '2d' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setBlockedMode(false)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!blockedMode ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}
                      >
                        Adjust Rack / Bin
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlockedMode(true)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${blockedMode ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
                      >
                        <Grid3X3 className="mr-1 inline h-3.5 w-3.5" />
                        Mark locked cells
                        {layout.blockedCells.length > 0 && (
                          <span className="ml-1 rounded-full bg-white/20 px-1.5">
                            {layout.blockedCells.length}
                          </span>
                        )}
                      </button>
                      {blockedMode && (
                        <>
                          <button
                            type="button"
                            onClick={() => setBlockedTool('lock')}
                            className={`rounded-lg px-2 py-1.5 text-xs ${blockedTool === 'lock' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
                          >
                            Lock cells
                          </button>
                          <button
                            type="button"
                            onClick={() => setBlockedTool('unlock')}
                            className={`rounded-lg px-2 py-1.5 text-xs ${blockedTool === 'unlock' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}
                          >
                            Unlock cells
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {isOwner && view === '2d' && blockedMode && (
                  <div className="mb-3 flex items-start gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-sm bg-slate-900" />
                    Click or drag across cells to paint locked areas. Racks and bins cannot be
                    placed, moved or resized onto black cells.
                  </div>
                )}

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
                          setBlockedMode(false)
                        }}
                      />
                    </div>
                    {selection.type !== 'bin' ? (
                      <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                          <Package2 className="h-7 w-7" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                          Select a Bin to view inventory
                        </h3>
                        <p className="mt-2 max-w-md text-sm text-slate-500">
                          Select Bin in the structure tree on the left, then this tab will display
                          the items and quantities currently in the Bin.
                        </p>
                      </div>
                    ) : !selectedBinId ? (
                      <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
                        <AlertCircle className="mb-3 h-8 w-8 text-amber-500" />
                        <h3 className="font-bold text-slate-800">Bin has not been saved</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          This Bin has not been synchronized yet, so its inventory cannot be viewed.
                        </p>
                      </div>
                    ) : binStockState.binId !== selectedBinId ||
                      binStockState.status === 'loading' ? (
                      <div className="flex min-h-72 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    ) : binStockState.status === 'error' ? (
                      <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
                        <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
                        <h3 className="font-bold text-slate-800">Unable to load inventory</h3>
                        <p className="mt-2 max-w-md text-sm text-red-600">{binStockState.error}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setBinStockState((current) => ({ ...current, status: 'loading' }))
                            setStockRefreshKey((current) => current + 1)
                          }}
                          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Try again
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                              Inventory is read-only
                            </p>
                            <h3 className="mt-1 text-xl font-bold text-slate-900">
                              {selectedEntity.name || selectedEntity.code}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {selectedRack?.name || selectedRack?.code} ·{' '}
                              {binStockState.totalElements} shipment
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
                              Total: {binStockState.totalQuantity.toLocaleString()}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setBinStockState((current) => ({ ...current, status: 'loading' }))
                                setStockRefreshKey((current) => current + 1)
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Reload
                            </button>
                          </div>
                        </div>

                        {!binStockState.content.length ? (
                          <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-4 text-center">
                            <Package2 className="mb-3 h-9 w-9 text-slate-300" />
                            <p className="font-semibold text-slate-700">This bin is empty</p>
                            <p className="mt-1 text-sm text-slate-500">
                              There are no items saved in Bin yet.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            <table className="w-full min-w-150 text-left text-sm">
                              <thead className="bg-slate-100 text-xs tracking-wider text-slate-500 uppercase">
                                <tr>
                                  <th className="px-4 py-3">SKU</th>
                                  <th className="px-4 py-3">Item</th>
                                  <th className="px-4 py-3">Unit</th>
                                  <th className="px-4 py-3 text-right">Quantity</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {binStockState.content.map((batch) => (
                                  <tr key={batch.id} className="text-slate-700">
                                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                                      {batch.skuCode || '—'}
                                    </td>
                                    <td className="px-4 py-3 font-semibold">
                                      {batch.skuName || 'No name yet'}
                                    </td>
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
                  <>
                    <div className="h-140 overflow-hidden rounded-xl border border-slate-200">
                      <WarehouseLayoutPreview3D
                        layout={layout}
                        selection={{ ...selection, clientKey: selection.key }}
                        editable={!isReadOnly}
                        onSelect={(nextSelection) => {
                          setSelection({
                            type: nextSelection.type,
                            key: nextSelection.clientKey ?? nextSelection.key ?? null,
                          })
                          setBlockedMode(false)
                        }}
                      />
                    </div>
                    {currentRole === 'STAFF' && selectedBinId && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                              Inventory in selected Bin
                            </p>
                            <h3 className="mt-1 font-bold text-slate-900">
                              {selectedEntity?.name || selectedEntity?.code || 'Bin'}
                            </h3>
                          </div>
                          <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-800">
                            Total: {binStockState.totalQuantity.toLocaleString()}
                          </span>
                        </div>
                        {binStockState.binId !== selectedBinId ||
                        binStockState.status === 'loading' ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                          </div>
                        ) : binStockState.status === 'error' ? (
                          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                            {binStockState.error}
                          </p>
                        ) : binStockState.content.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
                            This Bin is empty.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {binStockState.content.map((batch) => (
                              <div
                                key={batch.id}
                                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              >
                                <span>
                                  <strong className="text-blue-700">{batch.skuCode || '—'}</strong>
                                  <span className="ml-2 text-slate-700">
                                    {batch.skuName || 'No name yet'}
                                  </span>
                                </span>
                                <strong className="text-slate-900">
                                  {(Number(batch.quantity) || 0).toLocaleString()}
                                </strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
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
                          const key = cellKey(row, column)
                          const active = footprintSet.has(key)
                          const blocked = blockedSet.has(key)
                          return (
                            <button
                              key={key}
                              type="button"
                              aria-label={`${blocked ? 'Unlock' : 'Lock'} cell ${row + 1}-${column + 1}`}
                              onPointerDown={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                blockedPaintRef.current = true
                                toggleBlockedCell(row, column)
                              }}
                              onPointerEnter={() => {
                                if (blockedPaintRef.current) toggleBlockedCell(row, column)
                              }}
                              className={`border border-slate-200/80 ${blocked ? 'bg-slate-900 hover:bg-slate-800' : active ? 'bg-blue-50' : 'bg-slate-300/80'} ${blockedMode ? 'cursor-crosshair' : 'pointer-events-none'}`}
                            />
                          )
                        })}
                      </div>

                      {!blockedMode &&
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
                                    aria-label="Resize Bin"
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
                                aria-label="Resize Rack"
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
                    <h2 className="font-bold"></h2>
                    <p className="text-xs text-slate-500">
                      {selection.type === 'layout'
                        ? 'General layout'
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
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-700">
                  {selection.type === 'layout'
                    ? 'Size unit: meter (m).'
                    : selection.type === 'rack'
                      ? 'Units: size (m), load (kg), volume (m³).'
                      : 'Units: size (m), load (kg), volume (m³).'}
                </div>
                <div className="space-y-3">
                  {propertyFields.map(([field, label, unit]) => {
                    const isText = field === 'name' || field === 'code'
                    const tenantEditable =
                      !isReadOnly &&
                      !isOwner &&
                      ['coordinateX', 'coordinateY', 'positionZ', 'rotation'].includes(field)
                    const disabled =
                      isReadOnly ||
                      view === 'stock' ||
                      selection.type === 'layout' ||
                      (!isOwner && !tenantEditable)
                    return (
                      <label key={field} className="block text-xs font-semibold text-slate-600">
                        <span className="mb-1 flex items-center justify-between gap-2">
                          <span>{label}</span>
                          {unit && <span className="font-normal text-slate-400">Unit: {unit}</span>}
                        </span>
                        <input
                          type={isText ? 'text' : 'number'}
                          min={
                            isText
                              ? undefined
                              : selection.type === 'bin' && ['width', 'length', 'height'].includes(field)
                                ? MIN_BIN_SIZE
                                : selection.type === 'rack' && ['width', 'length', 'height'].includes(field)
                                  ? MIN_ENTITY_SIZE
                                  : 0
                          }
                          step={
                            isText || ['shelfLevel', 'rotation'].includes(field)
                              ? undefined
                              : '0.01'
                          }
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
                  Drag the Rack or Bin body to move.{' '}
                  {isOwner && 'Drag ◢ in the lower right corner to resize. Bin max 80% Rack.'}
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
