import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  AlertCircle,
  Layers3,
  Loader2,
  Maximize2,
  Package2,
  Plus,
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
import layoutApi from '@/services/layoutApi'
import warehouseApi from '@/services/warehouse/warehouseApi'

const DEFAULT_LAYOUT_SIZE = 100
const MIN_ENTITY_SIZE = 4
const FOOTPRINT_GRID_SIZE = 10

const createClientKey = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const toOptionalString = (value) => (value == null || value === '' ? null : String(value))
const toDisplayString = (value, fallback = '') => (value == null ? fallback : String(value))

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const ensureNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeBin = (bin = {}) => ({
  clientKey: createClientKey('bin'),
  id: toOptionalString(bin.id),
  name: toDisplayString(bin.name, 'Bin mới'),
  code: toDisplayString(bin.code, ''),
  maxWeight: ensureNumber(bin.maxWeight, 0),
  maxVolume: ensureNumber(bin.maxVolume, 0),
  coordinateX: ensureNumber(bin.coordinateX, 0),
  coordinateY: ensureNumber(bin.coordinateY, 0),
  width: Math.max(ensureNumber(bin.width, 8), 4),
  height: Math.max(ensureNumber(bin.length ?? bin.height, 8), 4),
})

const normalizeRack = (rack = {}) => ({
  clientKey: createClientKey('rack'),
  id: toOptionalString(rack.id),
  name: toDisplayString(rack.name, 'Rack mới'),
  code: toDisplayString(rack.code, ''),
  coordinateX: ensureNumber(rack.coordinateX, 0),
  coordinateY: ensureNumber(rack.coordinateY, 0),
  width: Math.max(ensureNumber(rack.width, 18), 8),
  height: Math.max(ensureNumber(rack.length ?? rack.height, 18), 8),
  bins: Array.isArray(rack.bins) ? rack.bins.map(normalizeBin) : [],
})

const normalizeZone = (zone = {}) => ({
  clientKey: createClientKey('zone'),
  id: toOptionalString(zone.id),
  name: toDisplayString(zone.name, 'Zone mới'),
  code: toDisplayString(zone.code, ''),
  coordinateX: ensureNumber(zone.coordinateX, 0),
  coordinateY: ensureNumber(zone.coordinateY, 0),
  width: Math.max(ensureNumber(zone.width, 30), 10),
  height: Math.max(ensureNumber(zone.height, 30), 10),
  racks: Array.isArray(zone.racks) ? zone.racks.map(normalizeRack) : [],
})

const buildZonesFromRacks = (payload = {}) => {
  if (Array.isArray(payload.zones)) return payload.zones
  if (!Array.isArray(payload.racks)) return []

  const groupedRacks = new Map()

  payload.racks.forEach((rack) => {
    const zoneName = rack.zoneName?.trim() || 'Zone chung'
    const zoneCode = rack.zoneCode?.trim() || zoneName
    const groupKey = `${zoneCode}::${zoneName}`
    const current = groupedRacks.get(groupKey) || { name: zoneName, code: zoneCode, racks: [] }
    current.racks.push(rack)
    groupedRacks.set(groupKey, current)
  })

  return Array.from(groupedRacks.values()).map((zone) => {
    const minX = Math.max(
      Math.min(...zone.racks.map((rack) => ensureNumber(rack.coordinateX, 0))) - 2,
      0
    )
    const minY = Math.max(
      Math.min(...zone.racks.map((rack) => ensureNumber(rack.coordinateY, 0))) - 2,
      0
    )
    const maxX = Math.max(
      ...zone.racks.map(
        (rack) => ensureNumber(rack.coordinateX, 0) + ensureNumber(rack.width, 18)
      )
    )
    const maxY = Math.max(
      ...zone.racks.map(
        (rack) =>
          ensureNumber(rack.coordinateY, 0) + ensureNumber(rack.length ?? rack.height, 18)
      )
    )

    return {
      ...zone,
      coordinateX: minX,
      coordinateY: minY,
      width: Math.max(maxX - minX + 2, 10),
      height: Math.max(maxY - minY + 2, 10),
      racks: zone.racks.map((rack) => ({
        ...rack,
        coordinateX: ensureNumber(rack.coordinateX, 0) - minX,
        coordinateY: ensureNumber(rack.coordinateY, 0) - minY,
      })),
    }
  })
}

const createFootprintCellKey = (row, col) => `${row}:${col}`

const createFullFootprint = () =>
  Array.from({ length: FOOTPRINT_GRID_SIZE * FOOTPRINT_GRID_SIZE }, (_, index) =>
    createFootprintCellKey(
      Math.floor(index / FOOTPRINT_GRID_SIZE),
      index % FOOTPRINT_GRID_SIZE
    )
  )

const normalizeFootprintCells = (cells) => {
  if (!Array.isArray(cells) || !cells.length) {
    return createFullFootprint()
  }

  const validCells = cells
    .map((cell) => String(cell))
    .filter((cell) => {
      const [row, col] = cell.split(':').map(Number)
      return (
        Number.isInteger(row) &&
        Number.isInteger(col) &&
        row >= 0 &&
        row < FOOTPRINT_GRID_SIZE &&
        col >= 0 &&
        col < FOOTPRINT_GRID_SIZE
      )
    })

  return validCells.length ? Array.from(new Set(validCells)) : createFullFootprint()
}

const normalizeLayout = (payload = {}) => ({
  width: Math.max(ensureNumber(payload.width, DEFAULT_LAYOUT_SIZE), 20),
  height: Math.max(ensureNumber(payload.height, DEFAULT_LAYOUT_SIZE), 20),
  footprintCells: normalizeFootprintCells(payload.footprintCells),
  targetRackCount: Math.max(ensureNumber(payload.targetRackCount, 0), 0),
  targetBinCount: Math.max(ensureNumber(payload.targetBinCount, 0), 0),
  zones: buildZonesFromRacks(payload).map(normalizeZone),
})

const resolveWarehouseFootprint = (warehouse = {}) => ({
  width: Math.max(
    ensureNumber(warehouse.width ?? warehouse.warehouseWidth, DEFAULT_LAYOUT_SIZE),
    20
  ),
  height: Math.max(
    ensureNumber(warehouse.height ?? warehouse.warehouseHeight, DEFAULT_LAYOUT_SIZE),
    20
  ),
})

const createDraftLayoutFromWarehouse = (warehouse = {}) =>
  normalizeLayout({
    ...resolveWarehouseFootprint(warehouse),
    zones: [],
  })

const resolveLayoutFromSources = (layoutPayload = {}, warehouse = {}) =>
  normalizeLayout({
    width:
      layoutPayload.width ??
      layoutPayload.warehouseWidth ??
      warehouse.width ??
      warehouse.warehouseWidth,
    height:
      layoutPayload.height ??
      layoutPayload.warehouseHeight ??
      warehouse.height ??
      warehouse.warehouseHeight,
    zones: buildZonesFromRacks(layoutPayload),
  })

const hasConfiguredLayout = (layoutPayload = {}) =>
  (Array.isArray(layoutPayload?.zones) && layoutPayload.zones.length > 0) ||
  (Array.isArray(layoutPayload?.racks) && layoutPayload.racks.length > 0)

const isDefaultLayoutPayload = (layoutPayload = {}) =>
  Boolean(layoutPayload.isDefault ?? layoutPayload.default)

const getApiData = (response) => response?.data?.data ?? response?.data ?? null

const sanitizeId = (id) => (id == null || id === '' ? null : String(id))

const toApiInteger = (value, fallback = 0) => Math.round(ensureNumber(value, fallback))

const serializeBin = (bin, fallbackCode) => ({
  id: sanitizeId(bin.id),
  name: bin.name?.trim() || 'Bin',
  code: bin.code?.trim() || fallbackCode,
  maxWeight: ensureNumber(bin.maxWeight, 0),
  maxVolume: ensureNumber(bin.maxVolume, 0),
  coordinateX: toApiInteger(bin.coordinateX),
  coordinateY: toApiInteger(bin.coordinateY),
  width: toApiInteger(bin.width, MIN_ENTITY_SIZE),
  length: toApiInteger(bin.height, MIN_ENTITY_SIZE),
  height: toApiInteger(bin.height, MIN_ENTITY_SIZE),
})

const serializeRack = (rack, zone, zoneIndex, rackIndex) => ({
  id: sanitizeId(rack.id),
  zoneName: zone.name?.trim() || `Zone ${zoneIndex + 1}`,
  zoneCode: zone.code?.trim() || `ZONE-${zoneIndex + 1}`,
  name: rack.name?.trim() || 'Rack',
  code: rack.code?.trim() || `RACK-${zoneIndex + 1}-${rackIndex + 1}`,
  coordinateX: toApiInteger(zone.coordinateX) + toApiInteger(rack.coordinateX),
  coordinateY: toApiInteger(zone.coordinateY) + toApiInteger(rack.coordinateY),
  width: toApiInteger(rack.width, MIN_ENTITY_SIZE),
  length: toApiInteger(rack.height, MIN_ENTITY_SIZE),
  height: toApiInteger(rack.height, MIN_ENTITY_SIZE),
  bins: rack.bins.map((bin, binIndex) =>
    serializeBin(bin, `BIN-${zoneIndex + 1}-${rackIndex + 1}-${binIndex + 1}`)
  ),
})

const toPayload = (layout) => ({
  width: toApiInteger(layout.width, DEFAULT_LAYOUT_SIZE),
  length: toApiInteger(layout.height, DEFAULT_LAYOUT_SIZE),
  height: toApiInteger(layout.height, DEFAULT_LAYOUT_SIZE),
  racks: layout.zones.flatMap((zone, zoneIndex) =>
    zone.racks.map((rack, rackIndex) => serializeRack(rack, zone, zoneIndex, rackIndex))
  ),
})

const findSelectedEntity = (layout, selection) => {
  if (!selection) return null

  if (selection.type === 'layout') {
    return layout
  }

  for (const zone of layout.zones) {
    if (selection.type === 'zone' && zone.clientKey === selection.clientKey) {
      return zone
    }

    for (const rack of zone.racks) {
      if (selection.type === 'rack' && rack.clientKey === selection.clientKey) {
        return rack
      }

      for (const bin of rack.bins) {
        if (selection.type === 'bin' && bin.clientKey === selection.clientKey) {
          return bin
        }
      }
    }
  }

  return null
}

const updateZoneByKey = (layout, zoneKey, updater) => ({
  ...layout,
  zones: layout.zones.map((zone) => (zone.clientKey === zoneKey ? updater(zone) : zone)),
})

const updateRackByKey = (layout, rackKey, updater) => ({
  ...layout,
  zones: layout.zones.map((zone) => ({
    ...zone,
    racks: zone.racks.map((rack) => (rack.clientKey === rackKey ? updater(rack, zone) : rack)),
  })),
})

const updateBinByKey = (layout, binKey, updater) => ({
  ...layout,
  zones: layout.zones.map((zone) => ({
    ...zone,
    racks: zone.racks.map((rack) => ({
      ...rack,
      bins: rack.bins.map((bin) => (bin.clientKey === binKey ? updater(bin, rack, zone) : bin)),
    })),
  })),
})

const removeSelection = (layout, selection) => {
  if (!selection || selection.type === 'layout') return layout

  if (selection.type === 'zone') {
    return {
      ...layout,
      zones: layout.zones.filter((zone) => zone.clientKey !== selection.clientKey),
    }
  }

  if (selection.type === 'rack') {
    return {
      ...layout,
      zones: layout.zones.map((zone) => ({
        ...zone,
        racks: zone.racks.filter((rack) => rack.clientKey !== selection.clientKey),
      })),
    }
  }

  return {
    ...layout,
    zones: layout.zones.map((zone) => ({
      ...zone,
      racks: zone.racks.map((rack) => ({
        ...rack,
        bins: rack.bins.filter((bin) => bin.clientKey !== selection.clientKey),
      })),
    })),
  }
}

const getSelectionLabel = (selection, entity) => {
  if (!selection) return 'Chưa chọn'
  if (selection.type === 'layout') return 'Layout tổng'
  if (!entity) return 'Không tìm thấy'
  return `${selection.type.toUpperCase()} - ${entity.name || 'Chưa đặt tên'}`
}

const renderTreeItem = (label, isActive, onClick, meta) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
      isActive
        ? 'border-blue-200 bg-blue-50 text-blue-900'
        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
    }`}
  >
    <div className="text-sm font-semibold">{label}</div>
    {meta ? <div className="mt-1 text-xs text-slate-500">{meta}</div> : null}
  </button>
)

const clampCoordinate = (value, size, total) => {
  const numericValue = ensureNumber(value, 0)
  const max = Math.max(ensureNumber(total, 0) - ensureNumber(size, 0), 0)
  return clamp(numericValue, 0, max)
}

const getRackLevels = (rack) => clamp(Math.round((ensureNumber(rack?.height, 12) || 12) / 6), 2, 6)

const getCoordinateYForLevel = (rack, bin, level) => {
  const levels = getRackLevels(rack)
  const maxCoordinate = Math.max(ensureNumber(rack?.height, 0) - ensureNumber(bin?.height, 0), 0)
  if (levels <= 1 || maxCoordinate <= 0) return 0
  const normalizedLevel = clamp(level, 1, levels)
  const ratio = (normalizedLevel - 1) / (levels - 1)
  return maxCoordinate - ratio * maxCoordinate
}

const getBinLevelFromCoordinate = (rack, bin) => {
  const levels = getRackLevels(rack)
  const maxCoordinate = Math.max(ensureNumber(rack?.height, 0) - ensureNumber(bin?.height, 0), 0)
  if (levels <= 1 || maxCoordinate <= 0) return 1
  const ratio = 1 - clamp(ensureNumber(bin?.coordinateY, 0) / maxCoordinate, 0, 1)
  return clamp(Math.round(ratio * (levels - 1)) + 1, 1, levels)
}

function LayoutWarehouse({ currentRole = 'TENANT' }) {
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [contracts, setContracts] = useState([])
  const [ownedWarehouses, setOwnedWarehouses] = useState([])
  const [preferredWarehouseId, setPreferredWarehouseId] = useState('')
  const [layout, setLayout] = useState(normalizeLayout())
  const [selection, setSelection] = useState({ type: 'layout' })
  const [loadingWarehouseOptions, setLoadingWarehouseOptions] = useState(true)
  const [loadingLayout, setLoadingLayout] = useState(false)
  const [savingLayout, setSavingLayout] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [footprintBrush, setFootprintBrush] = useState('erase')
  const [isFootprintEditMode, setIsFootprintEditMode] = useState(false)
  const [isFootprintPainting, setIsFootprintPainting] = useState(false)
  const [tenantUsesDefaultLayout, setTenantUsesDefaultLayout] = useState(false)
  const isOwnerMode = currentRole === 'OWNER'
  const requestedWarehouseId = searchParams.get('warehouseId')
  const requestedWarehouseWidth = ensureNumber(searchParams.get('width'), 0)
  const requestedWarehouseHeight = ensureNumber(searchParams.get('height'), 0)

  const tenantWarehouses = useMemo(() => {
    const activeContracts = contracts.filter((contract) => contract?.status === 'ACTIVE')
    const uniqueMap = new Map()

    activeContracts.forEach((contract) => {
      if (!contract?.warehouseId || uniqueMap.has(contract.warehouseId)) return
      const warehouseId = String(contract.warehouseId)
      uniqueMap.set(warehouseId, {
        warehouseId,
        warehouseName: contract.warehouseName || `Warehouse ${contract.warehouseId}`,
        contractId: contract.id,
      })
    })

    return Array.from(uniqueMap.values())
  }, [contracts])

  const ownerWarehouses = useMemo(
    () =>
      ownedWarehouses
        .filter((warehouse) => warehouse?.id)
        .map((warehouse) => ({
          warehouseId: String(warehouse.id),
          warehouseName: warehouse.name || `Warehouse ${warehouse.id}`,
          width: ensureNumber(warehouse.width ?? warehouse.warehouseWidth, DEFAULT_LAYOUT_SIZE),
          height: ensureNumber(
            warehouse.height ?? warehouse.warehouseHeight,
            DEFAULT_LAYOUT_SIZE
          ),
        })),
    [ownedWarehouses]
  )

  const availableWarehouses = isOwnerMode ? ownerWarehouses : tenantWarehouses

  const selectedWarehouseId = useMemo(() => {
    if (!availableWarehouses.length) return ''

    if (
      requestedWarehouseId &&
      availableWarehouses.some((item) => item.warehouseId === requestedWarehouseId)
    ) {
      return requestedWarehouseId
    }

    return availableWarehouses.some((item) => item.warehouseId === preferredWarehouseId)
      ? preferredWarehouseId
      : availableWarehouses[0].warehouseId
  }, [availableWarehouses, preferredWarehouseId, requestedWarehouseId])

  const selectedEntity = useMemo(() => findSelectedEntity(layout, selection), [layout, selection])
  const footprintCellSet = useMemo(
    () => new Set(normalizeFootprintCells(layout.footprintCells)),
    [layout.footprintCells]
  )
  const activeFootprintCount = footprintCellSet.size
  const currentRackCount = useMemo(
    () => layout.zones.reduce((total, zone) => total + zone.racks.length, 0),
    [layout.zones]
  )
  const currentBinCount = useMemo(
    () =>
      layout.zones.reduce(
        (total, zone) =>
          total + zone.racks.reduce((rackTotal, rack) => rackTotal + rack.bins.length, 0),
        0
      ),
    [layout.zones]
  )
  const selectedWarehouseOption = useMemo(() => {
    const selected =
      availableWarehouses.find((item) => item.warehouseId === selectedWarehouseId) ?? null

    if (!selected || selectedWarehouseId !== requestedWarehouseId) return selected

    return {
      ...selected,
      width: requestedWarehouseWidth > 0 ? requestedWarehouseWidth : selected.width,
      height: requestedWarehouseHeight > 0 ? requestedWarehouseHeight : selected.height,
    }
  }, [
    availableWarehouses,
    requestedWarehouseHeight,
    requestedWarehouseId,
    requestedWarehouseWidth,
    selectedWarehouseId,
  ])

  useEffect(() => {
    const stopPainting = () => {
      setIsFootprintPainting(false)
    }

    window.addEventListener('pointerup', stopPainting)
    return () => window.removeEventListener('pointerup', stopPainting)
  }, [])

  useEffect(() => {
    const fetchWarehouseOptions = async () => {
      try {
        setLoadingWarehouseOptions(true)
        setErrorMessage('')
        if (isOwnerMode) {
          const response = await warehouseApi.getOwnerWarehouses({
            page: 0,
            size: 100,
            sortBy: 'createdAt',
            sortDir: 'desc',
          })
          const payload = getApiData(response)
          const content = Array.isArray(payload?.content) ? payload.content : []
          setOwnedWarehouses(content)
          setContracts([])
        } else {
          const response = await contractApi.getMyContracts({ page: 0, size: 100 })
          const payload = getApiData(response)
          const content = Array.isArray(payload?.content) ? payload.content : []
          setContracts(content)
          setOwnedWarehouses([])
        }
      } catch (error) {
        setContracts([])
        setOwnedWarehouses([])
        setErrorMessage(
          error.response?.data?.message ||
            (isOwnerMode
              ? 'Không tải được danh sách kho của owner.'
              : 'Không tải được danh sách hợp đồng.')
        )
      } finally {
        setLoadingWarehouseOptions(false)
      }
    }

    fetchWarehouseOptions()
  }, [isOwnerMode])

  useEffect(() => {
    if (!selectedWarehouseId) {
      return
    }

    const fetchLayout = async () => {
      try {
        setLoadingLayout(true)
        setErrorMessage('')
        setStatusMessage('')
        const [response, warehouseResponse] = await Promise.all([
          isOwnerMode
            ? layoutApi.getOwnerWarehouseLayout(selectedWarehouseId)
            : layoutApi.getTenantWarehouseLayout(selectedWarehouseId),
          warehouseApi.getPublicWarehouseById(selectedWarehouseId).catch(() => null),
        ])
        const layoutPayload = getApiData(response) || {}
        const warehousePayload = getApiData(warehouseResponse) || selectedWarehouseOption || {}
        const nextLayout = resolveLayoutFromSources(layoutPayload, warehousePayload)
        const usesDefaultLayout = !isOwnerMode && isDefaultLayoutPayload(layoutPayload)
        setLayout(nextLayout)
        setTenantUsesDefaultLayout(usesDefaultLayout)
        setSelection({ type: 'layout' })
        if (isOwnerMode && !hasConfiguredLayout(layoutPayload)) {
          setStatusMessage(
            `Kho này chưa có layout lưu sẵn. Hệ thống đã khởi tạo lưới 100 ô theo kích thước ${nextLayout.width} x ${nextLayout.height} để bạn bắt đầu cấu hình hình dạng kho, rack và bin.`
          )
        } else if (usesDefaultLayout) {
          setStatusMessage(
            'Đang hiển thị layout mặc định của Owner vì bản layout riêng của Tenant chưa có dữ liệu.'
          )
        }
      } catch (error) {
        const fallbackLayout = createDraftLayoutFromWarehouse(selectedWarehouseOption || {})
        setLayout(fallbackLayout)
        setTenantUsesDefaultLayout(false)
        setSelection({ type: 'layout' })
        if (isOwnerMode) {
          setStatusMessage(
            `Chưa lấy được layout đã lưu. Bạn vẫn có thể cấu hình mới trên lưới 100 ô với kích thước ${fallbackLayout.width} x ${fallbackLayout.height}.`
          )
        } else {
          setErrorMessage(error.response?.data?.message || 'Không tải được layout kho đã chọn.')
        }
      } finally {
        setLoadingLayout(false)
      }
    }

    fetchLayout()
  }, [isOwnerMode, selectedWarehouseId, selectedWarehouseOption])

  useEffect(() => {
    const handlePointerMove = (event) => {
      const dragState = dragRef.current
      const canvas = canvasRef.current
      if (!dragState || !canvas) return

      const deltaX =
        ((event.clientX - dragState.startClientX) / dragState.canvasWidth) * dragState.parentWidth
      const deltaY =
        ((event.clientY - dragState.startClientY) / dragState.canvasHeight) * dragState.parentHeight

      if (dragState.mode === 'resize') {
        const nextWidth = clamp(
          dragState.initialWidth + deltaX,
          MIN_ENTITY_SIZE,
          Math.max(MIN_ENTITY_SIZE, dragState.parentWidth - dragState.initialX)
        )
        const nextHeight = clamp(
          dragState.initialHeight + deltaY,
          MIN_ENTITY_SIZE,
          Math.max(MIN_ENTITY_SIZE, dragState.parentHeight - dragState.initialY)
        )

        setLayout((current) => {
          if (dragState.type === 'zone') {
            return updateZoneByKey(current, dragState.clientKey, (zone) => ({
              ...zone,
              width: Number(nextWidth.toFixed(2)),
              height: Number(nextHeight.toFixed(2)),
            }))
          }

          if (dragState.type === 'rack') {
            return updateRackByKey(current, dragState.clientKey, (rack) => ({
              ...rack,
              width: Number(nextWidth.toFixed(2)),
              height: Number(nextHeight.toFixed(2)),
            }))
          }

          return updateBinByKey(current, dragState.clientKey, (bin) => ({
            ...bin,
            width: Number(nextWidth.toFixed(2)),
            height: Number(nextHeight.toFixed(2)),
          }))
        })

        return
      }

      const nextX = clamp(
        dragState.initialX + deltaX,
        0,
        Math.max(0, dragState.parentWidth - dragState.entityWidth)
      )
      const nextY = clamp(
        dragState.initialY + deltaY,
        0,
        Math.max(0, dragState.parentHeight - dragState.entityHeight)
      )

      setLayout((current) => {
        if (dragState.type === 'zone') {
          return updateZoneByKey(current, dragState.clientKey, (zone) => ({
            ...zone,
            coordinateX: Number(nextX.toFixed(2)),
            coordinateY: Number(nextY.toFixed(2)),
          }))
        }

        if (dragState.type === 'rack') {
          return updateRackByKey(current, dragState.clientKey, (rack) => ({
            ...rack,
            coordinateX: Number(nextX.toFixed(2)),
            coordinateY: Number(nextY.toFixed(2)),
          }))
        }

        return updateBinByKey(current, dragState.clientKey, (bin) => ({
          ...bin,
          coordinateX: Number(nextX.toFixed(2)),
          coordinateY: Number(nextY.toFixed(2)),
        }))
      })
    }

    const handlePointerUp = () => {
      dragRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  const handleCreateZone = () => {
    const zoneNumber = layout.zones.length + 1
    const zone = normalizeZone({
      name: `Zone ${zoneNumber}`,
      code: `ZONE-${zoneNumber}`,
      coordinateX: 5,
      coordinateY: 5,
      width: 30,
      height: 30,
      racks: [
        {
          name: 'Rack mới',
          code: `RACK-${zoneNumber}-1`,
          coordinateX: 2,
          coordinateY: 2,
          width: 18,
          height: 18,
          bins: [],
        },
      ],
    })

    setLayout((current) => ({ ...current, zones: [...current.zones, zone] }))
    setSelection({ type: 'zone', clientKey: zone.clientKey })
    setStatusMessage('Đã thêm zone mới cùng một rack mặc định để API có thể lưu zone.')
  }

  const handleCreateRack = () => {
    if (selection?.type !== 'zone') {
      setErrorMessage('Hãy chọn một zone trước khi thêm rack.')
      return
    }

    const rack = normalizeRack({
      name: 'Rack mới',
      coordinateX: 2,
      coordinateY: 2,
      width: 18,
      height: 18,
      bins: [],
    })

    setLayout((current) =>
      updateZoneByKey(current, selection.clientKey, (zone) => ({
        ...zone,
        racks: [...zone.racks, rack],
      }))
    )
    setSelection({ type: 'rack', clientKey: rack.clientKey })
    setErrorMessage('')
    setStatusMessage('Đã thêm rack trong zone đang chọn.')
  }

  const handleCreateBin = () => {
    if (selection?.type !== 'rack') {
      setErrorMessage('Hãy chọn một rack trước khi thêm bin.')
      return
    }

    setLayout((current) => {
      let nextBinClientKey = ''

      const nextLayout = updateRackByKey(current, selection.clientKey, (rack) => {
        const draftBin = normalizeBin({
          name: 'Bin mới',
          coordinateX: 1,
          width: Math.min(8, Math.max(rack.width / 2, 4)),
          height: Math.min(8, Math.max(rack.height / 4, 4)),
          maxWeight: 0,
          maxVolume: 0,
        })

        const positionedBin = {
          ...draftBin,
          coordinateY: getCoordinateYForLevel(rack, draftBin, 1),
        }

        nextBinClientKey = positionedBin.clientKey

        return {
          ...rack,
          bins: [...rack.bins, positionedBin],
        }
      })

      if (nextBinClientKey) {
        setSelection({ type: 'bin', clientKey: nextBinClientKey })
      }

      return nextLayout
    })
    setErrorMessage('')
    setStatusMessage('Đã thêm bin trong rack đang chọn ở tầng 1.')
  }

  const handleDeleteSelection = () => {
    if (!selection || selection.type === 'layout') {
      setErrorMessage('Hãy chọn zone, rack hoặc bin để xóa.')
      return
    }

    setLayout((current) => removeSelection(current, selection))
    setSelection({ type: 'layout' })
    setErrorMessage('')
    setStatusMessage('Đã xóa phần tử khỏi layout cục bộ. Nhấn Lưu để đồng bộ backend.')
  }

  const handleReloadLayout = async () => {
    if (!selectedWarehouseId) return

    try {
      setLoadingLayout(true)
      setErrorMessage('')
      setStatusMessage('')
      const [response, warehouseResponse] = await Promise.all([
        isOwnerMode
          ? layoutApi.getOwnerWarehouseLayout(selectedWarehouseId)
          : layoutApi.getTenantWarehouseLayout(selectedWarehouseId),
        warehouseApi.getPublicWarehouseById(selectedWarehouseId).catch(() => null),
      ])
      const layoutPayload = getApiData(response) || {}
      const warehousePayload = getApiData(warehouseResponse) || selectedWarehouseOption || {}
      const nextLayout = resolveLayoutFromSources(layoutPayload, warehousePayload)
      const usesDefaultLayout = !isOwnerMode && isDefaultLayoutPayload(layoutPayload)
      setLayout(nextLayout)
      setTenantUsesDefaultLayout(usesDefaultLayout)
      setSelection({ type: 'layout' })
      setStatusMessage(
        isOwnerMode && !hasConfiguredLayout(layoutPayload)
          ? `Đã khởi tạo lại lưới 100 ô theo kích thước ${nextLayout.width} x ${nextLayout.height}. Hãy tiếp tục cấu hình layout cho kho này.`
          : usesDefaultLayout
            ? 'Đang hiển thị layout mặc định của Owner vì bản layout riêng của Tenant chưa có dữ liệu.'
          : 'Đã tải lại layout từ hệ thống.'
      )
    } catch (error) {
      if (isOwnerMode) {
        const fallbackLayout = createDraftLayoutFromWarehouse(selectedWarehouseOption || {})
        setLayout(fallbackLayout)
        setSelection({ type: 'layout' })
        setStatusMessage(
          `Không tải lại được layout đã lưu. Hệ thống đã trả về lưới 100 ô với kích thước ${fallbackLayout.width} x ${fallbackLayout.height} để bạn tiếp tục cấu hình.`
        )
        return
      }

      setErrorMessage(error.response?.data?.message || 'Không tải lại được layout.')
    } finally {
      setLoadingLayout(false)
    }
  }

  const handleSaveLayout = async () => {
    if (!selectedWarehouseId) {
      setErrorMessage('Vui lòng chọn warehouse trước khi lưu.')
      return
    }

    if (tenantUsesDefaultLayout) {
      setErrorMessage(
        'Layout đang là bản mặc định chỉ để xem. Cần tạo lại bản clone Tenant trước khi lưu thay đổi.'
      )
      return
    }

    const emptyZone = layout.zones.find((zone) => zone.racks.length === 0)
    if (emptyZone) {
      setErrorMessage(
        `${emptyZone.name || 'Zone'} cần có ít nhất một rack vì API lưu thông tin zone trên rack.`
      )
      return
    }

    try {
      setSavingLayout(true)
      setErrorMessage('')
      setStatusMessage('')
      if (isOwnerMode) {
        await layoutApi.saveOwnerWarehouseLayout(selectedWarehouseId, toPayload(layout))
      } else {
        await layoutApi.saveTenantWarehouseLayout(selectedWarehouseId, toPayload(layout))
      }
      setStatusMessage('Đã lưu layout thành công.')
      const response = isOwnerMode
        ? await layoutApi.getOwnerWarehouseLayout(selectedWarehouseId)
        : await layoutApi.getTenantWarehouseLayout(selectedWarehouseId)
      setLayout(normalizeLayout(getApiData(response) || {}))
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          'Lưu layout thất bại. Nếu bạn vừa xóa bin đang có tồn kho, backend có thể đã chặn thao tác này.'
      )
    } finally {
      setSavingLayout(false)
    }
  }

  const updateSelectedEntityField = (field, value) => {
    if (!selection || selection.type === 'layout') {
      setLayout((current) => ({
        ...current,
        [field]:
          field === 'targetRackCount' || field === 'targetBinCount'
            ? Math.max(ensureNumber(value, 0), 0)
            : ensureNumber(value, DEFAULT_LAYOUT_SIZE),
      }))
      return
    }

    if (selection.type === 'zone') {
      setLayout((current) =>
        updateZoneByKey(current, selection.clientKey, (zone) => ({
          ...zone,
          [field]: ['name'].includes(field) ? value : ensureNumber(value, zone[field]),
        }))
      )
      return
    }

    if (selection.type === 'rack') {
      setLayout((current) =>
        updateRackByKey(current, selection.clientKey, (rack) => ({
          ...rack,
          [field]: ['name', 'code'].includes(field) ? value : ensureNumber(value, rack[field]),
        }))
      )
      return
    }

    setLayout((current) =>
      updateBinByKey(current, selection.clientKey, (bin) => ({
        ...bin,
        [field]: ['name', 'code'].includes(field) ? value : ensureNumber(value, bin[field]),
      }))
    )
  }

  const startDrag = (event, type, entity, parentDimensions) => {
    event.stopPropagation()
    const canvas = canvasRef.current
    if (!canvas) return

    setSelection({ type, clientKey: entity.clientKey })
    dragRef.current = {
      mode: 'move',
      type,
      clientKey: entity.clientKey,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialX: entity.coordinateX,
      initialY: entity.coordinateY,
      entityWidth: entity.width,
      entityHeight: entity.height,
      parentWidth: parentDimensions.width,
      parentHeight: parentDimensions.height,
      canvasWidth: canvas.getBoundingClientRect().width,
      canvasHeight: canvas.getBoundingClientRect().height,
    }
  }

  const paintFootprintCell = (row, col, mode = footprintBrush) => {
    const cellKey = createFootprintCellKey(row, col)

    setLayout((current) => {
      const nextCells = new Set(normalizeFootprintCells(current.footprintCells))
      if (mode === 'add') {
        nextCells.add(cellKey)
      } else {
        nextCells.delete(cellKey)
      }

      return {
        ...current,
        footprintCells: nextCells.size ? Array.from(nextCells) : [cellKey],
      }
    })
  }

  const handleFootprintPointerDown = (event, row, col) => {
    if (!isOwnerMode || !isFootprintEditMode) return
    event.stopPropagation()
    setIsFootprintPainting(true)
    paintFootprintCell(row, col)
  }

  const handleFootprintPointerEnter = (row, col) => {
    if (!isOwnerMode || !isFootprintEditMode || !isFootprintPainting) return
    paintFootprintCell(row, col)
  }

  const handleFillFootprint = () => {
    setLayout((current) => ({ ...current, footprintCells: createFullFootprint() }))
    setStatusMessage('Đã tô kín toàn bộ 100 ô của mặt bằng kho.')
    setErrorMessage('')
  }

  const handleClearFootprint = () => {
    setLayout((current) => ({
      ...current,
      footprintCells: [createFootprintCellKey(0, 0)],
    }))
    setStatusMessage('Đã xóa phần footprint hiện tại. Hãy tô lại hình dạng kho.')
    setErrorMessage('')
  }

  const startResize = (event, type, entity, parentDimensions) => {
    event.stopPropagation()
    const canvas = canvasRef.current
    if (!canvas) return

    setSelection({ type, clientKey: entity.clientKey })
    dragRef.current = {
      mode: 'resize',
      type,
      clientKey: entity.clientKey,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialX: entity.coordinateX,
      initialY: entity.coordinateY,
      initialWidth: entity.width,
      initialHeight: entity.height,
      entityWidth: entity.width,
      entityHeight: entity.height,
      parentWidth: parentDimensions.width,
      parentHeight: parentDimensions.height,
      canvasWidth: canvas.getBoundingClientRect().width,
      canvasHeight: canvas.getBoundingClientRect().height,
    }
  }

  const handleMoveEntityFrom3D = (type, clientKey, nextCoordinateX, nextCoordinateY) => {
    setSelection({ type, clientKey })

    setLayout((current) => {
      if (type === 'zone') {
        return updateZoneByKey(current, clientKey, (zone) => ({
          ...zone,
          coordinateX: Number(
            clampCoordinate(nextCoordinateX, zone.width, current.width).toFixed(2)
          ),
          coordinateY: Number(
            clampCoordinate(nextCoordinateY, zone.height, current.height).toFixed(2)
          ),
        }))
      }

      if (type === 'rack') {
        return current.zones.reduce(
          (nextLayout, zone) =>
            zone.racks.some((rack) => rack.clientKey === clientKey)
              ? updateRackByKey(nextLayout, clientKey, (rack) => ({
                  ...rack,
                  coordinateX: Number(
                    clampCoordinate(nextCoordinateX, rack.width, zone.width).toFixed(2)
                  ),
                  coordinateY: Number(
                    clampCoordinate(nextCoordinateY, rack.height, zone.height).toFixed(2)
                  ),
                }))
              : nextLayout,
          current
        )
      }

      return current.zones.reduce(
        (nextLayout, zone) =>
          zone.racks.some((rack) => rack.bins.some((bin) => bin.clientKey === clientKey))
            ? updateBinByKey(nextLayout, clientKey, (bin, rack) => ({
                ...bin,
                coordinateX: Number(
                  clampCoordinate(nextCoordinateX, bin.width, rack.width).toFixed(2)
                ),
                coordinateY: Number(
                  clampCoordinate(nextCoordinateY, bin.height, rack.height).toFixed(2)
                ),
              }))
            : nextLayout,
        current
      )
    })
  }

  const warehouseName = availableWarehouses.find(
    (item) => item.warehouseId === selectedWarehouseId
  )?.warehouseName

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
          <main className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 md:p-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                  <Warehouse className="h-7 w-7 text-blue-600" />
                  Thiết kế layout kho 2D + 3D
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-500">
                  {isOwnerMode
                    ? 'Chọn kho của bạn để quản lý sơ đồ mặc định, chỉnh zone, rack, bin trên canvas 2D và quan sát không gian kho bằng preview 3D đồng bộ theo thời gian thực.'
                    : 'Chọn kho từ danh sách hợp đồng đang hiệu lực để xem zone, rack, bin trên canvas 2D và preview 3D; vị trí chỉ có thể cập nhật trên bản layout riêng của Tenant.'}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleReloadLayout}
                  disabled={!selectedWarehouseId || loadingLayout}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingLayout ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Tải lại
                </button>
                <button
                  type="button"
                  onClick={handleSaveLayout}
                  disabled={
                    !selectedWarehouseId ||
                    savingLayout ||
                    loadingLayout ||
                    tenantUsesDefaultLayout
                  }
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {savingLayout ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Lưu sơ đồ
                </button>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                    {isOwnerMode ? 'Warehouse của owner' : 'Warehouse từ hợp đồng'}
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(event) => setPreferredWarehouseId(event.target.value)}
                    disabled={loadingWarehouseOptions || !availableWarehouses.length}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                  >
                    {!availableWarehouses.length ? (
                      <option value="">
                        {loadingWarehouseOptions
                          ? isOwnerMode
                            ? 'Đang tải danh sách kho...'
                            : 'Đang tải hợp đồng...'
                          : isOwnerMode
                            ? 'Bạn chưa có warehouse để thiết kế layout'
                            : 'Không có hợp đồng ACTIVE để mở layout'}
                      </option>
                    ) : null}
                    {availableWarehouses.map((item) => (
                      <option key={item.warehouseId} value={item.warehouseId}>
                        {item.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>

                {isOwnerMode ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={handleCreateZone}
                      className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm zone
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateRack}
                      className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      <Layers3 className="mr-2 h-4 w-4" />
                      Thêm rack
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateBin}
                      className="inline-flex items-center justify-center rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm font-semibold text-fuchsia-700 hover:bg-fuchsia-100"
                    >
                      <Package2 className="mr-2 h-4 w-4" />
                      Thêm bin
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    Tenant xem layout và chỉ được cập nhật vị trí trên bản layout riêng.
                  </div>
                )}
              </div>

              {errorMessage ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle className="mr-2 inline h-4 w-4" />
                  {errorMessage}
                </div>
              ) : null}

              {statusMessage ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {statusMessage}
                </div>
              ) : null}
            </section>

            <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
              <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-base font-bold text-slate-900">Cây layout</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chọn phần tử để sửa hoặc kéo trực tiếp trên canvas.
                </p>

                <div className="mt-4 space-y-3">
                  {renderTreeItem(
                    warehouseName ? `Layout - ${warehouseName}` : 'Layout tổng',
                    selection?.type === 'layout',
                    () => setSelection({ type: 'layout' }),
                    `${layout.width} x ${layout.height} | ${activeFootprintCount}/100 ô | ${currentRackCount} rack | ${currentBinCount} bin`
                  )}

                  {layout.zones.map((zone, zoneIndex) => (
                    <div key={zone.clientKey} className="space-y-2">
                      {renderTreeItem(
                        `Zone ${zoneIndex + 1}: ${zone.name}`,
                        selection?.type === 'zone' && selection?.clientKey === zone.clientKey,
                        () => setSelection({ type: 'zone', clientKey: zone.clientKey }),
                        `${zone.width} x ${zone.height}`
                      )}

                      {zone.racks.map((rack, rackIndex) => (
                        <div key={rack.clientKey} className="ml-3 space-y-2 border-l border-slate-200 pl-3">
                          {renderTreeItem(
                            `Rack ${rackIndex + 1}: ${rack.name}`,
                            selection?.type === 'rack' && selection?.clientKey === rack.clientKey,
                            () => setSelection({ type: 'rack', clientKey: rack.clientKey }),
                            `${rack.width} x ${rack.height}`
                          )}

                          {rack.bins.map((bin, binIndex) => (
                            <div key={bin.clientKey} className="ml-3 border-l border-slate-100 pl-3">
                              {renderTreeItem(
                                `Bin ${binIndex + 1}: ${bin.name}`,
                                selection?.type === 'bin' &&
                                  selection?.clientKey === bin.clientKey,
                                () => setSelection({ type: 'bin', clientKey: bin.clientKey }),
                                `${bin.width} x ${bin.height}`
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </aside>

              <div className="grid gap-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Canvas 2D</h2>
                      <p className="text-sm text-slate-500">
                        Owner có thể tô hoặc xóa từng ô để tạo hình kho thật, ví dụ kho chữ U thì
                        chỉ giữ các ô thuộc phần kho và chừa phần khuyết ở giữa.
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                      Tỷ lệ: {layout.width} x {layout.height} | {activeFootprintCount}/100 ô
                    </div>
                  </div>

                  {isOwnerMode ? (
                    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setIsFootprintEditMode((current) => !current)}
                          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            isFootprintEditMode
                              ? 'bg-slate-900 text-white'
                              : 'border border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {isFootprintEditMode ? 'Đang chỉnh hình kho' : 'Chỉnh hình kho'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFootprintBrush('erase')}
                          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            footprintBrush === 'erase'
                              ? 'bg-rose-600 text-white'
                              : 'border border-rose-200 bg-white text-rose-700'
                          }`}
                        >
                          Xóa ô
                        </button>
                        <button
                          type="button"
                          onClick={() => setFootprintBrush('add')}
                          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            footprintBrush === 'add'
                              ? 'bg-emerald-600 text-white'
                              : 'border border-emerald-200 bg-white text-emerald-700'
                          }`}
                        >
                          Tô ô
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleFillFootprint}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                        >
                          Tô kín 100 ô
                        </button>
                        <button
                          type="button"
                          onClick={handleClearFootprint}
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700"
                        >
                          Xóa hết để vẽ lại
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-2 sm:p-4">
                    <div
                      ref={canvasRef}
                      className="relative mx-auto aspect-square min-h-[320px] w-full max-w-[860px] rounded-[28px] border border-slate-300 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(226,232,240,0.9))] shadow-inner sm:min-h-[420px] lg:min-h-[560px]"
                      onClick={() => setSelection({ type: 'layout' })}
                    >
                      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.14)_1px,transparent_1px)] bg-[size:10%_10%]" />

                      {Array.from({ length: FOOTPRINT_GRID_SIZE }).map((_, row) =>
                        Array.from({ length: FOOTPRINT_GRID_SIZE }).map((__, col) => {
                          const cellKey = createFootprintCellKey(row, col)
                          const isActive = footprintCellSet.has(cellKey)

                          return (
                            <button
                              key={cellKey}
                              type="button"
                              aria-label={`footprint-${row}-${col}`}
                              onPointerDown={(event) => handleFootprintPointerDown(event, row, col)}
                              onPointerEnter={() => handleFootprintPointerEnter(row, col)}
                              onClick={(event) => {
                                if (isOwnerMode && isFootprintEditMode) {
                                  event.stopPropagation()
                                  paintFootprintCell(row, col)
                                }
                              }}
                              className={`absolute border border-slate-300/50 transition ${
                                isFootprintEditMode && isOwnerMode ? 'cursor-crosshair' : 'cursor-default'
                              }`}
                              style={{
                                left: `${(col / FOOTPRINT_GRID_SIZE) * 100}%`,
                                top: `${(row / FOOTPRINT_GRID_SIZE) * 100}%`,
                                width: `${100 / FOOTPRINT_GRID_SIZE}%`,
                                height: `${100 / FOOTPRINT_GRID_SIZE}%`,
                                background: isActive
                                  ? 'rgba(15,23,42,0.14)'
                                  : 'rgba(255,255,255,0.78)',
                              }}
                            />
                          )
                        })
                      )}

                      {loadingLayout ? (
                        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[28px] bg-white/70 backdrop-blur-sm">
                          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải layout...
                          </div>
                        </div>
                      ) : null}

                      {layout.zones.map((zone) => (
                        <div
                          key={zone.clientKey}
                          className={`absolute rounded-2xl border-2 shadow-sm transition ${
                            selection?.type === 'zone' && selection?.clientKey === zone.clientKey
                              ? 'z-20 border-emerald-500 ring-4 ring-emerald-100'
                              : 'border-emerald-300'
                          }`}
                          style={{
                            left: `${(zone.coordinateX / layout.width) * 100}%`,
                            top: `${(zone.coordinateY / layout.height) * 100}%`,
                            width: `${(zone.width / layout.width) * 100}%`,
                            height: `${(zone.height / layout.height) * 100}%`,
                            background:
                              'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.2))',
                          }}
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelection({ type: 'zone', clientKey: zone.clientKey })
                          }}
                          onPointerDown={(event) =>
                            startDrag(event, 'zone', zone, {
                              width: layout.width,
                              height: layout.height,
                            })
                          }
                        >
                          <div className="flex items-center justify-between border-b border-emerald-200 bg-white/70 px-3 py-2 text-xs font-bold text-emerald-700">
                            <span>{zone.name}</span>
                            <span>
                              {zone.width} x {zone.height}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="absolute right-1 bottom-1 z-30 h-3.5 w-3.5 cursor-se-resize rounded-sm border border-emerald-500 bg-white shadow sm:h-4 sm:w-4"
                            onPointerDown={(event) =>
                              startResize(event, 'zone', zone, {
                                width: layout.width,
                                height: layout.height,
                              })
                            }
                          />

                          {zone.racks.map((rack) => (
                            <div
                              key={rack.clientKey}
                              className={`absolute rounded-xl border-2 transition ${
                                selection?.type === 'rack' && selection?.clientKey === rack.clientKey
                                  ? 'z-20 border-amber-500 ring-4 ring-amber-100'
                                  : 'border-amber-300'
                              }`}
                              style={{
                                left: `${(rack.coordinateX / zone.width) * 100}%`,
                                top: `${(rack.coordinateY / zone.height) * 100}%`,
                                width: `${(rack.width / zone.width) * 100}%`,
                                height: `${(rack.height / zone.height) * 100}%`,
                                background:
                                  'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(251,191,36,0.24))',
                              }}
                              onClick={(event) => {
                                event.stopPropagation()
                                setSelection({ type: 'rack', clientKey: rack.clientKey })
                              }}
                              onPointerDown={(event) =>
                                startDrag(event, 'rack', rack, {
                                  width: zone.width,
                                  height: zone.height,
                                })
                              }
                            >
                              <div className="flex items-center justify-between border-b border-amber-200 bg-white/75 px-2 py-1 text-[11px] font-bold text-amber-700">
                                <span>{rack.name}</span>
                                <span>{rack.code || 'No code'}</span>
                              </div>
                              <button
                                type="button"
                                className="absolute right-1 bottom-1 z-30 h-3 w-3 cursor-se-resize rounded-sm border border-amber-500 bg-white shadow sm:h-3.5 sm:w-3.5"
                                onPointerDown={(event) =>
                                  startResize(event, 'rack', rack, {
                                    width: zone.width,
                                    height: zone.height,
                                  })
                                }
                              />

                              {rack.bins.map((bin) => (
                                <div
                                  key={bin.clientKey}
                                  className={`absolute rounded-lg border transition ${
                                    selection?.type === 'bin' &&
                                    selection?.clientKey === bin.clientKey
                                      ? 'z-20 border-fuchsia-500 ring-4 ring-fuchsia-100'
                                      : 'border-fuchsia-300'
                                  }`}
                                  style={{
                                    left: `${(bin.coordinateX / rack.width) * 100}%`,
                                    top: `${(bin.coordinateY / rack.height) * 100}%`,
                                    width: `${(bin.width / rack.width) * 100}%`,
                                    height: `${(bin.height / rack.height) * 100}%`,
                                    background:
                                      'linear-gradient(135deg, rgba(217,70,239,0.14), rgba(232,121,249,0.22))',
                                  }}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setSelection({ type: 'bin', clientKey: bin.clientKey })
                                  }}
                                  onPointerDown={(event) =>
                                    startDrag(event, 'bin', bin, {
                                      width: rack.width,
                                      height: rack.height,
                                    })
                                  }
                                >
                                  <div className="flex h-full flex-col justify-between rounded-lg px-2 py-1 text-[10px] font-semibold text-fuchsia-800">
                                    <span>{bin.name}</span>
                                    <span>{bin.code || 'No code'}</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="absolute right-0.5 bottom-0.5 z-30 h-2.5 w-2.5 cursor-se-resize rounded-sm border border-fuchsia-500 bg-white shadow sm:h-3 sm:w-3"
                                    onPointerDown={(event) =>
                                      startResize(event, 'bin', bin, {
                                        width: rack.width,
                                        height: rack.height,
                                      })
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Preview 3D</h2>
                      <p className="text-sm text-slate-500">
                        Xem nhanh không gian kho, xoay camera tự do và click vào phần tử để đồng bộ lựa chọn.
                      </p>
                    </div>
                    <div className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
                      Đồng bộ theo thời gian thực
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-sky-50">
                    <div className="h-[460px] w-full">
                      <WarehouseLayoutPreview3D
                        layout={layout}
                        selection={selection}
                        onSelect={setSelection}
                        onMoveEntity={handleMoveEntityFrom3D}
                      />
                    </div>
                  </div>
                </section>
              </div>

              <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Thuộc tính</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {getSelectionLabel(selection, selectedEntity)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteSelection}
                    className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Xóa
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                        Width
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={selectedEntity?.width ?? layout.width}
                        onChange={(event) => updateSelectedEntityField('width', event.target.value)}
                        disabled={selection?.type === 'layout' && isOwnerMode}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                        Height
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={selectedEntity?.height ?? layout.height}
                        onChange={(event) =>
                          updateSelectedEntityField('height', event.target.value)
                        }
                        disabled={selection?.type === 'layout' && isOwnerMode}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </label>
                  </div>

                  {selection?.type === 'layout' && isOwnerMode ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      Kích thước tổng vẫn lấy từ bài đăng. Hình dạng thật của kho được chỉnh bằng
                      cách tô hoặc xóa các ô trong Canvas 2D.
                    </div>
                  ) : null}

                  {selection?.type === 'layout' && isOwnerMode ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                            Target racks
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={layout.targetRackCount ?? 0}
                            onChange={(event) =>
                              updateSelectedEntityField('targetRackCount', event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                            Target bins
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={layout.targetBinCount ?? 0}
                            onChange={(event) =>
                              updateSelectedEntityField('targetBinCount', event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          Rack hiện có: <span className="font-bold">{currentRackCount}</span>
                          {layout.targetRackCount > 0 ? (
                            <span className="ml-1 text-amber-700">
                              / mục tiêu {layout.targetRackCount}
                            </span>
                          ) : null}
                        </div>
                        <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-800">
                          Bin hiện có: <span className="font-bold">{currentBinCount}</span>
                          {layout.targetBinCount > 0 ? (
                            <span className="ml-1 text-fuchsia-700">
                              / mục tiêu {layout.targetBinCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {selection?.type !== 'layout' ? (
                    <>
                      <label className="space-y-2">
                        <span className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                          Tên hiển thị
                        </span>
                        <input
                          type="text"
                          value={selectedEntity?.name ?? ''}
                          onChange={(event) =>
                            updateSelectedEntityField('name', event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                        />
                      </label>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                            X
                          </span>
                          <input
                            type="number"
                            value={selectedEntity?.coordinateX ?? 0}
                            onChange={(event) =>
                              updateSelectedEntityField('coordinateX', event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                            Y
                          </span>
                          <input
                            type="number"
                            value={selectedEntity?.coordinateY ?? 0}
                            onChange={(event) =>
                              updateSelectedEntityField('coordinateY', event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                          />
                        </label>
                      </div>
                    </>
                  ) : null}

                  {(selection?.type === 'zone' ||
                    selection?.type === 'rack' ||
                    selection?.type === 'bin') && (
                    <label className="space-y-2">
                      <span className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                        Code
                      </span>
                      <input
                        type="text"
                        value={selectedEntity?.code ?? ''}
                        onChange={(event) => updateSelectedEntityField('code', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </label>
                  )}

                  {selection?.type === 'bin' && (
                    <>
                      <label className="space-y-2">
                        <span className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                          Tầng trong rack
                        </span>
                        <select
                          value={
                            selectedEntity
                              ? getBinLevelFromCoordinate(
                                  layout.zones
                                    .flatMap((zone) => zone.racks)
                                    .find((rack) =>
                                      rack.bins.some((bin) => bin.clientKey === selection?.clientKey)
                                    ),
                                  selectedEntity
                                )
                              : 1
                          }
                          onChange={(event) => {
                            const activeRack = layout.zones
                              .flatMap((zone) => zone.racks)
                              .find((rack) =>
                                rack.bins.some((bin) => bin.clientKey === selection?.clientKey)
                              )
                            if (!activeRack || !selectedEntity) return
                            updateSelectedEntityField(
                              'coordinateY',
                              getCoordinateYForLevel(
                                activeRack,
                                selectedEntity,
                                Number(event.target.value)
                              )
                            )
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                        >
                          {Array.from({ length: Math.max(2, selectedEntity ? getRackLevels(
                            layout.zones
                              .flatMap((zone) => zone.racks)
                              .find((rack) =>
                                rack.bins.some((bin) => bin.clientKey === selection?.clientKey)
                              )
                          ) : 2) }).map((_, index) => (
                            <option key={index + 1} value={index + 1}>
                              Tầng {index + 1}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                            Max weight
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={selectedEntity?.maxWeight ?? 0}
                            onChange={(event) =>
                              updateSelectedEntityField('maxWeight', event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                            Max volume
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={selectedEntity?.maxVolume ?? 0}
                            onChange={(event) =>
                              updateSelectedEntityField('maxVolume', event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                          />
                        </label>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                        Bạn có thể chọn tầng tại đây hoặc kéo bin theo trục dọc trong preview 3D để đổi tầng.
                      </div>
                    </>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Maximize2 className="h-4 w-4 text-slate-400" />
                      Gợi ý thao tác
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-500">
                      <li>Chọn `zone` rồi thêm `rack`.</li>
                      <li>Chọn `rack` rồi thêm `bin`.</li>
                      <li>Bật `Chỉnh hình kho` để tô phần kho thật và chừa phần khuyết như kho chữ U.</li>
                      <li>Kéo phần tử trên canvas để đổi vị trí nhanh.</li>
                      <li>Kéo góc phải dưới của zone, rack hoặc bin để phóng to hay thu nhỏ bằng chuột.</li>
                      <li>Kéo `rack` trên sàn kho và kéo `bin` theo ngang hoặc dọc trong preview 3D để đổi vị trí và tầng.</li>
                      <li>Nhấn `Lưu sơ đồ` để backend sync create, update và delete một lần.</li>
                    </ul>
                  </div>
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
