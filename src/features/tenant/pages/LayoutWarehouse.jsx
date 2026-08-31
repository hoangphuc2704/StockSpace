import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  AlertCircle,
  Grid3X3,
  Loader2,
  Package2,
  RotateCcw,
  RotateCw,
  Save,
  Trash2,
  Warehouse,
} from 'lucide-react'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import WarehouseLayoutPreview3D from '@/components/WarehouseLayoutPreview3D'
import { closeMobileSidebar } from '@/store/uiSlide'
import layoutApi from '@/services/layoutApi'
import contractApi from '@/services/contractApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import stockApi from '@/services/wms/stockApi'
import { getEnglishApiMessage } from '@/utils/englishMessages'

const DEFAULT_LAYOUT_SIZE = 100
// Racks can be smaller than the old 4m hard limit. Keep a small positive
// minimum so the 2D/3D renderers still have a usable footprint.
const MIN_ENTITY_SIZE = 1
const MIN_BIN_SIZE = 0.1
const MIN_LAYOUT_SIZE = 0.000001
const DEFAULT_RACK_GAP = 1
const FOOTPRINT_GRID_SIZE = 10
const BIN_MAX_RATIO = 0.8
const RACK_PRESETS = [
  {
    id: 'small',
    name: 'Rack nhỏ',
    code: 'SMALL',
    width: 6,
    length: 3,
    height: 6,
  },
  {
    id: 'standard',
    name: 'Rack tiêu chuẩn',
    code: 'STANDARD',
    width: 10,
    length: 4,
    height: 8,
  },
  {
    id: 'large',
    name: 'Rack lớn',
    code: 'LARGE',
    width: 14,
    length: 6,
    height: 10,
  },
]
const layoutDimensionsKey = (warehouseId) => `stockspace:warehouse-layout-dimensions:${warehouseId}`
const pendingOwnerLayoutKey = 'stockspace:pending-owner-layout'

const keyOf = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const numberOf = (value, fallback = 0) => {
  const valueAsNumber = Number(value)
  return Number.isFinite(valueAsNumber) ? valueAsNumber : fallback
}
const formatMeters = (value) => `${numberOf(value).toFixed(2)}m`
const integerOf = (value, fallback = 0) => Math.round(numberOf(value, fallback))
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const normalizeRotation = (value) => {
  const normalized = ((integerOf(value, 0) % 360) + 360) % 360
  return [0, 90, 180, 270].includes(normalized)
    ? normalized
    : (Math.round(normalized / 90) * 90) % 360
}
const isQuarterTurn = (rotation) => {
  const normalized = normalizeRotation(rotation)
  return normalized === 90 || normalized === 270
}
const getRackFootprint = (rack = {}) => {
  const width = Math.max(numberOf(rack.width, MIN_ENTITY_SIZE), MIN_ENTITY_SIZE)
  const length = Math.max(numberOf(rack.length, MIN_ENTITY_SIZE), MIN_ENTITY_SIZE)
  return isQuarterTurn(rack.rotation) ? { width: length, length: width } : { width, length }
}
const getRectangleDimensions = (rectangle = {}) =>
  rectangle?.rotation == null
    ? {
        width: Math.max(numberOf(rectangle.width), 0),
        length: Math.max(numberOf(rectangle.length), 0),
      }
    : getRackFootprint(rectangle)
const createEmptyRackConfiguration = () =>
  RACK_PRESETS.reduce(
    (result, preset) => ({
      ...result,
      [preset.id]: { rackCount: 0 },
    }),
    {}
  )
const inferRackPreset = (rack) => {
  const width = numberOf(rack?.width)
  const length = numberOf(rack?.length)
  return RACK_PRESETS.reduce((closest, preset) => {
    const distance = Math.abs(width - preset.width) + Math.abs(length - preset.length)
    return !closest || distance < closest.distance ? { id: preset.id, distance } : closest
  }, null)?.id
}
const getRackConfigurationFromLayout = (layout) => {
  const configuration = createEmptyRackConfiguration()
  ;(layout?.racks || []).forEach((rack) => {
    const presetId = rack.rackPresetId || inferRackPreset(rack)
    if (!configuration[presetId]) return
    configuration[presetId].rackCount += 1
  })
  return configuration
}
const getPresetMaxRackCount = (layout, preset) => {
  if (
    numberOf(layout?.width) < preset.width ||
    numberOf(layout?.length) < preset.length ||
    numberOf(layout?.height) < preset.height
  ) {
    return 0
  }
  const columns = Math.floor(
    (numberOf(layout.width) + DEFAULT_RACK_GAP) / (preset.width + DEFAULT_RACK_GAP)
  )
  const rows = Math.floor(
    (numberOf(layout.length) + DEFAULT_RACK_GAP) / (preset.length + DEFAULT_RACK_GAP)
  )
  return Math.max(columns * rows, 0)
}
const totalBinWeightLimit = (rack) =>
  (rack?.bins || []).reduce((total, bin) => total + Math.max(numberOf(bin.maxWeight), 0), 0)
const totalBinVolumeLimit = (rack) =>
  (rack?.bins || []).reduce((total, bin) => total + Math.max(numberOf(bin.maxVolume), 0), 0)
const apiData = (response) => response?.data?.data ?? response?.data ?? null
const isCurrentActiveContract = (contract) => {
  if (contract?.status !== 'ACTIVE') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = contract.startDate ? new Date(`${contract.startDate}T00:00:00`) : null
  const endDate = contract.endDate ? new Date(`${contract.endDate}T23:59:59`) : null
  return Boolean(
    startDate &&
      endDate &&
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      startDate <= today &&
      endDate >= today
  )
}
const normalizeCreatedDimensions = (dimensions) => {
  const width = numberOf(dimensions?.width)
  const length = numberOf(dimensions?.length)
  const height = numberOf(dimensions?.height)
  return width > 0 && length > 0 && height > 0 ? { width, length, height } : null
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
  const { width, length } = getRectangleDimensions(rectangle)
  const right = rectangle.coordinateX + width
  const bottom = rectangle.coordinateY + length

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

const rectanglesTooClose = (first, second, minimumGap = 0) => {
  const gap = Math.max(numberOf(minimumGap), 0)
  const firstDimensions = getRectangleDimensions(first)
  const secondDimensions = getRectangleDimensions(second)
  return (
    first.coordinateX < second.coordinateX + secondDimensions.width + gap &&
    first.coordinateX + firstDimensions.width + gap > second.coordinateX &&
    first.coordinateY < second.coordinateY + secondDimensions.length + gap &&
    first.coordinateY + firstDimensions.length + gap > second.coordinateY
  )
}

const findAvailableRackPosition = (layout, width, length, minimumRackGap = 0) => {
  const maxX = Math.max(Math.floor(layout.width - width), 0)
  const maxY = Math.max(Math.floor(layout.length - length), 0)
  for (let y = 0; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const candidate = { coordinateX: x, coordinateY: y, width, length }
      const tooCloseToRack = layout.racks.some((rack) =>
        rectanglesTooClose(candidate, rack, minimumRackGap)
      )
      if (!tooCloseToRack && !rectangleOverlapsBlockedCell(candidate, layout)) return { x, y }
    }
  }
  return null
}

const normalizeBin = (bin = {}) => {
  const source = bin || {}
  return {
  clientKey: keyOf('bin'),
  id: nullableId(source.id),
  name: source.name == null ? 'New Bin' : String(source.name),
  code: source.code == null ? '' : String(source.code),
  shelfLevel: Math.max(integerOf(source.shelfLevel, 1), 1),
  maxWeight: numberOf(source.maxWeight, 0),
  maxVolume: numberOf(source.maxVolume, 0),
  coordinateX: numberOf(source.coordinateX, 0),
  coordinateY: numberOf(source.coordinateY, 0),
  positionZ: numberOf(source.positionZ, 0),
  width: Math.max(numberOf(source.width, 8), MIN_BIN_SIZE),
  length: Math.max(numberOf(source.length, 8), MIN_BIN_SIZE),
  height: Math.max(numberOf(source.height, 8), MIN_BIN_SIZE),
  }
}

const getRackLevelCount = (rack) => clamp(Math.round(numberOf(rack?.height, 12) / 6), 2, 6)

const getBinHeightForRack = (rack) => {
  const rackHeight = Math.max(numberOf(rack?.height, MIN_ENTITY_SIZE), MIN_ENTITY_SIZE)
  const levelHeight = rackHeight / getRackLevelCount(rack)
  return Number(clamp(levelHeight * 0.9, MIN_BIN_SIZE, rackHeight).toFixed(6))
}

const roundedCapacity = (value) =>
  Math.floor(Math.max(numberOf(value), 0) * 1_000_000) / 1_000_000

const distributeRackCapacities = (rack) => {
  const levels = getRackLevelCount(rack)
  const bins = Array.isArray(rack.bins) ? rack.bins : []
  const binsPerLevel = bins.reduce((counts, bin) => {
    const level = clamp(integerOf(bin.shelfLevel, 1), 1, levels)
    counts[level] = (counts[level] || 0) + 1
    return counts
  }, {})
  const rackWeight = Math.max(numberOf(rack.maxWeight), 0)
  const rackVolume = Math.max(numberOf(rack.maxVolume), 0)
  const binHeight = getBinHeightForRack(rack)

  return {
    ...rack,
    bins: bins.map((bin) => {
      const shelfLevel = clamp(integerOf(bin.shelfLevel, 1), 1, levels)
      const binCount = binsPerLevel[shelfLevel] || 1
      const levelWeight = rackWeight > 0 ? rackWeight / levels : null
      const levelVolume = rackVolume > 0 ? rackVolume / levels : null

      return {
        ...bin,
        shelfLevel,
        height: binHeight,
        positionZ: clamp(
          numberOf(bin.positionZ),
          0,
          Math.max(numberOf(rack.height, MIN_ENTITY_SIZE) - binHeight, 0)
        ),
        ...(levelWeight === null
          ? {}
          : { maxWeight: roundedCapacity(levelWeight / binCount) }),
        ...(levelVolume === null
          ? {}
          : { maxVolume: roundedCapacity(levelVolume / binCount) }),
      }
    }),
  }
}

const normalizeRack = (rack = {}) => {
  const source = rack || {}
  return fitBinsToRack(
    {
      clientKey: keyOf('rack'),
      id: nullableId(source.id),
      rackPresetId: source.rackPresetId || inferRackPreset(source),
      name: source.name == null ? 'New rack' : String(source.name),
      code: source.code == null ? '' : String(source.code),
      maxWeight: numberOf(source.maxWeight, 0),
      maxVolume: numberOf(source.maxVolume, 0),
      coordinateX: numberOf(source.coordinateX, 0),
      coordinateY: numberOf(source.coordinateY, 0),
      positionZ: numberOf(source.positionZ, 0),
      rotation: normalizeRotation(source.rotation),
      width: Math.max(numberOf(source.width, 18), MIN_ENTITY_SIZE),
      length: Math.max(numberOf(source.length, 18), MIN_ENTITY_SIZE),
      height: Math.max(numberOf(source.height, 18), MIN_ENTITY_SIZE),
      bins: Array.isArray(source.bins) ? source.bins.map(normalizeBin) : [],
    },
    { arrange: true }
  )
}

const normalizeLayout = (payload = {}) => ({
  width: Math.max(numberOf(payload.width, DEFAULT_LAYOUT_SIZE), MIN_LAYOUT_SIZE),
  length: Math.max(numberOf(payload.length, DEFAULT_LAYOUT_SIZE), MIN_LAYOUT_SIZE),
  height: Math.max(numberOf(payload.height, DEFAULT_LAYOUT_SIZE), MIN_LAYOUT_SIZE),
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
  const height = getBinHeightForRack({ height: rackHeight })
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
  const width = clamp(
    numberOf(rack.width, 18),
    MIN_ENTITY_SIZE,
    Math.max(layoutWidth, layoutLength)
  )
  const length = clamp(
    numberOf(rack.length, 18),
    MIN_ENTITY_SIZE,
    Math.max(layoutWidth, layoutLength)
  )
  const height = clamp(numberOf(rack.height, 18), MIN_ENTITY_SIZE, layoutHeight)
  const rotation = normalizeRotation(rack.rotation)
  const { width: footprintWidth, length: footprintLength } = getRackFootprint({
    width,
    length,
    rotation,
  })
  return {
    id: nullableId(rack.id),
    name: rack.name?.trim() || 'Rack',
    code: rack.code?.trim() || `RACK-${rackIndex + 1}`,
    maxWeight: numberOf(rack.maxWeight),
    maxVolume: numberOf(rack.maxVolume),
    coordinateX: clamp(numberOf(rack.coordinateX), 0, Math.max(layoutWidth - footprintWidth, 0)),
    coordinateY: clamp(numberOf(rack.coordinateY), 0, Math.max(layoutLength - footprintLength, 0)),
    positionZ: clamp(numberOf(rack.positionZ), 0, Math.max(layoutHeight - height, 0)),
    rotation,
    width,
    length,
    height,
    bins: (Array.isArray(rack.bins) ? rack.bins : []).map((bin, binIndex) =>
      serializeBin(bin, rackIndex, binIndex, footprintWidth, footprintLength, height)
    ),
  }
}

const getAutomaticBinGeometry = (rack, binCount) => {
  const { width: rackWidth, length: rackLength } = getRackFootprint(rack)
  const count = Math.max(integerOf(binCount, 1), 1)
  const columns = Math.max(
    1,
    Math.min(count, Math.ceil(Math.sqrt((count * rackWidth) / Math.max(rackLength, MIN_ENTITY_SIZE))))
  )
  const rows = Math.ceil(count / columns)
  const slotWidth = rackWidth / columns
  const slotLength = rackLength / rows
  const width = Math.max(slotWidth * BIN_MAX_RATIO, MIN_BIN_SIZE)
  const length = Math.max(slotLength * BIN_MAX_RATIO, MIN_BIN_SIZE)

  return { columns, rows, slotWidth, slotLength, width, length }
}

const fitBinsToRack = (rack, { arrange = false, arrangePositions = false } = {}) => {
  const rawRackWidth = Math.max(numberOf(rack.width, MIN_ENTITY_SIZE), MIN_ENTITY_SIZE)
  const rawRackLength = Math.max(numberOf(rack.length, MIN_ENTITY_SIZE), MIN_ENTITY_SIZE)
  const { width: rackWidth, length: rackLength } = getRackFootprint(rack)
  const rackHeight = Math.max(numberOf(rack.height, MIN_ENTITY_SIZE), MIN_ENTITY_SIZE)
  const levels = getRackLevelCount(rack)
  const bins = Array.isArray(rack.bins) ? rack.bins : []
  const binsWithLevels = bins.map((bin, index) => ({
    ...bin,
    shelfLevel: arrange
      ? (index % levels) + 1
      : clamp(integerOf(bin.shelfLevel, 1), 1, levels),
  }))
  const binsByLevel = binsWithLevels.reduce((groups, bin) => {
    const shelfLevel = bin.shelfLevel
    groups[shelfLevel] = groups[shelfLevel] || []
    groups[shelfLevel].push(bin)
    return groups
  }, {})
  const nextIndexByLevel = {}
  const fittedRack = {
    ...rack,
    width: rawRackWidth,
    length: rawRackLength,
    height: rackHeight,
    bins: binsWithLevels.map((bin) => {
      const shelfLevel = bin.shelfLevel
      const binsOnLevel = binsByLevel[shelfLevel] || [bin]
      const binIndex = nextIndexByLevel[shelfLevel] || 0
      nextIndexByLevel[shelfLevel] = binIndex + 1
      const geometry = getAutomaticBinGeometry(rack, binsOnLevel.length)
      const column = binIndex % geometry.columns
      const row = Math.floor(binIndex / geometry.columns)
      const automaticCoordinateX =
        column * geometry.slotWidth + (geometry.slotWidth - geometry.width) / 2
      const automaticCoordinateY =
        row * geometry.slotLength + (geometry.slotLength - geometry.length) / 2
      const height = getBinHeightForRack({ height: rackHeight })
      return {
        ...bin,
        shelfLevel,
        width: geometry.width,
        length: geometry.length,
        height,
        coordinateX: clamp(
          arrange || arrangePositions ? automaticCoordinateX : numberOf(bin.coordinateX),
          0,
          Math.max(rackWidth - geometry.width, 0)
        ),
        coordinateY: clamp(
          arrange || arrangePositions ? automaticCoordinateY : numberOf(bin.coordinateY),
          0,
          Math.max(rackLength - geometry.length, 0)
        ),
        positionZ: clamp(numberOf(bin.positionZ), 0, Math.max(rackHeight - height, 0)),
      }
    }),
  }
  return distributeRackCapacities(fittedRack)
}

const toPayload = (layout) => {
  const minimumWidth = MIN_LAYOUT_SIZE
  const minimumLength = MIN_LAYOUT_SIZE
  const width = Math.max(numberOf(layout.width, DEFAULT_LAYOUT_SIZE), minimumWidth)
  const length = Math.max(numberOf(layout.length, DEFAULT_LAYOUT_SIZE), minimumLength)
  return {
    width,
    length,
    height: Math.max(numberOf(layout.height, DEFAULT_LAYOUT_SIZE), MIN_LAYOUT_SIZE),
    positions: normalizeBlockedCells(layout.blockedCells),
    racks: layout.racks.map((rack, rackIndex) =>
      serializeRack(
        fitBinsToRack(rack, { arrange: false }),
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
    bins: (Array.isArray(rack.bins) ? rack.bins : []).map((bin) =>
      bin.clientKey === binKey ? updater(bin, rack) : bin
    ),
  })),
})

const getSelected = (layout, selection = {}) => {
  const racks = Array.isArray(layout?.racks) ? layout.racks : []
  if (selection.type === 'layout') return layout
  if (selection.type === 'rack')
    return racks.find((rack) => rack.clientKey === selection.key)
  return racks
    .flatMap((rack) => (Array.isArray(rack?.bins) ? rack.bins : []))
    .find((bin) => bin?.clientKey === selection.key)
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

          {(Array.isArray(layout?.racks) ? layout.racks : []).map((rack) => (
            <div
              key={rack.clientKey}
              className="pointer-events-none absolute z-10 overflow-hidden rounded border border-blue-700 bg-blue-500/75 shadow-sm"
              style={{
                left: `${(rack.coordinateX / layout.width) * 100}%`,
                top: `${(rack.coordinateY / layout.length) * 100}%`,
                width: `${(getRackFootprint(rack).width / layout.width) * 100}%`,
                height: `${(getRackFootprint(rack).length / layout.length) * 100}%`,
              }}
            >
              <span className="block truncate bg-blue-800/80 px-1 py-0.5 text-[8px] font-bold text-white">
                {rack.name || rack.code}
              </span>
              {(Array.isArray(rack?.bins) ? rack.bins : []).map((bin) => (
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
                    left: `${(bin.coordinateX / getRackFootprint(rack).width) * 100}%`,
                    top: `${(bin.coordinateY / getRackFootprint(rack).length) * 100}%`,
                    width: `${(bin.width / getRackFootprint(rack).width) * 100}%`,
                    height: `${(bin.length / getRackFootprint(rack).length) * 100}%`,
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

function RackElevationView({
  rack,
  canEdit,
  selectedBinKey,
  newBinShelfLevel,
  onShelfLevelChange,
  onAddBin,
  onSelectBin,
  onMoveBin,
}) {
  const dragRef = useRef(null)
  const levels = getRackLevelCount(rack)
  const rackWidth = Math.max(getRackFootprint(rack).width, MIN_ENTITY_SIZE)
  const bins = Array.isArray(rack?.bins) ? rack.bins : []

  useEffect(() => {
    const onMove = (event) => {
      const drag = dragRef.current
      if (!drag) return

      const rect = drag.element.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const relativeX = clamp((event.clientX - rect.left) / rect.width, 0, 1)
      const coordinateX = clamp(
        relativeX * drag.rackWidth - drag.grabOffset,
        0,
        Math.max(drag.rackWidth - drag.binWidth, 0)
      )
      const relativeY = clamp((event.clientY - rect.top) / rect.height, 0, 0.999999)
      const shelfLevel = clamp(drag.levels - Math.floor(relativeY * drag.levels), 1, drag.levels)

      onMoveBin('bin', drag.binKey, Number(coordinateX.toFixed(2)), drag.coordinateY, shelfLevel)
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
  }, [onMoveBin])

  const startBinDrag = (event, bin, element) => {
    event.preventDefault()
    event.stopPropagation()
    onSelectBin(bin.clientKey)
    if (!canEdit) return

    const surface = element.closest('[data-rack-elevation-surface]')
    const rect = surface?.getBoundingClientRect()
    if (!rect?.width || !rect.height) return
    const pointerCoordinateX = ((event.clientX - rect.left) / rect.width) * rackWidth
    dragRef.current = {
      element: surface,
      binKey: bin.clientKey,
      coordinateY: bin.coordinateY,
      rackWidth,
      binWidth: bin.width,
      grabOffset: pointerCoordinateX - bin.coordinateX,
      levels,
    }
    // eslint-disable-next-line react-hooks/immutability
    document.body.style.userSelect = 'none'
  }

  return (
    <section className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-blue-700 uppercase">Mặt cắt Rack</p>
          <h3 className="mt-1 font-bold text-slate-900">{rack.name || rack.code || 'Rack'}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Kéo Bin theo chiều ngang để đổi vị trí, kéo lên/xuống để đổi tầng.
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] font-semibold text-slate-600">
              Tầng thêm
              <select
                value={clamp(integerOf(newBinShelfLevel, 1), 1, levels)}
                onChange={(event) => onShelfLevelChange(integerOf(event.target.value, 1))}
                className="mt-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              >
                {Array.from({ length: levels }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    Tầng {index + 1}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onAddBin}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Thêm Bin
            </button>
          </div>
        )}
      </div>

      <div className="relative h-72 overflow-hidden rounded-xl border border-slate-300 bg-slate-100">
        <div
          data-rack-elevation-surface
          className="absolute inset-y-3 left-8 right-3 rounded-sm border-x-4 border-slate-500 bg-white/70 sm:left-12"
        >
          {Array.from({ length: levels + 1 }, (_, index) => {
            const top = `${(index / levels) * 100}%`
            return (
              <div
                key={`beam-${index}`}
                className="absolute right-0 left-0 border-t-2 border-slate-500/80"
                style={{ top }}
              />
            )
          })}

          {Array.from({ length: levels }, (_, index) => {
            const shelfLevel = levels - index
            const rowHeight = 100 / levels
            const top = index * rowHeight + rowHeight * 0.14
            const binsOnLevel = bins.filter(
              (bin) => clamp(integerOf(bin.shelfLevel, 1), 1, levels) === shelfLevel
            )
            return (
              <div key={`level-${shelfLevel}`}>
                <span
                  className="absolute -left-8 z-10 -translate-y-1/2 text-[10px] font-bold text-slate-500 sm:-left-12"
                  style={{ top: `${index * rowHeight + rowHeight / 2}%` }}
                >
                  T{shelfLevel}
                </span>
                {binsOnLevel.map((bin) => (
                  <button
                    key={bin.clientKey}
                    type="button"
                    onPointerDown={(event) => startBinDrag(event, bin, event.currentTarget)}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectBin(bin.clientKey)
                    }}
                    className={`absolute z-10 overflow-hidden rounded-md border-2 px-1 text-left text-[10px] font-bold text-white shadow-sm transition ${selectedBinKey === bin.clientKey ? 'border-blue-700 bg-emerald-600 ring-2 ring-blue-300' : 'border-emerald-800 bg-emerald-500 hover:bg-emerald-600'}`}
                    style={{
                      left: `${(numberOf(bin.coordinateX) / rackWidth) * 100}%`,
                      top: `${top}%`,
                      width: `${clamp((numberOf(bin.width) / rackWidth) * 100, 4, 98)}%`,
                      height: `${Math.max(rowHeight * 0.7, 7)}%`,
                    }}
                  >
                    <span className="block truncate">{bin.name || bin.code || 'Bin'}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const formatTableNumber = (value) =>
  numberOf(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 })

const formatTableLimit = (value, unit) => {
  if (value == null || numberOf(value) <= 0) return 'Không giới hạn'
  return `${formatTableNumber(value)} ${unit}`
}

function RackStatisticsTable({ layout, capacityMetrics }) {
  const racks = Array.isArray(layout?.racks) ? layout.racks : []
  const totalBins = racks.reduce((total, rack) => total + (rack.bins?.length || 0), 0)
  const capacityByRackId = new Map(
    (Array.isArray(capacityMetrics?.racks) ? capacityMetrics.racks : [])
      .filter((metric) => metric?.rackId)
      .map((metric) => [String(metric.rackId), metric])
  )

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-4 py-3 sm:px-5">
        <div>
          <h2 className="font-bold text-slate-900">Tổng quan Rack / Bin</h2>
          <p className="mt-1 text-xs text-slate-500">
            {racks.length} rack · {totalBins} bin
          </p>
        </div>
      </div>

      {racks.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">Chưa có rack nào trong layout.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-300 bg-slate-200 text-xs font-bold tracking-wide text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Rack</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Kích thước</th>
                <th className="px-4 py-3">Tầng</th>
                <th className="px-4 py-3">Số bin</th>
                <th className="px-4 py-3">Khối lượng</th>
                <th className="px-4 py-3">Thể tích</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {racks.map((rack, index) => {
                const footprint = getRackFootprint(rack)
                const presetId = rack.rackPresetId || inferRackPreset(rack)
                const preset = RACK_PRESETS.find((item) => item.id === presetId)
                const metric = rack.id ? capacityByRackId.get(String(rack.id)) : null
                const currentWeight = metric?.currentWeightKg
                const currentVolume = metric?.currentVolumeM3
                const maxWeight = metric ? metric.maxWeightKg : rack.maxWeight
                const maxVolume = metric ? metric.maxVolumeM3 : rack.maxVolume

                return (
                  <tr
                    key={rack.clientKey || rack.id || `${rack.code}-${index}`}
                    className="text-slate-700 odd:bg-white even:bg-slate-50 hover:bg-blue-50/60"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{rack.name || rack.code || `Rack ${index + 1}`}</p>
                      {rack.code && <p className="mt-0.5 text-xs text-slate-400">{rack.code}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{preset?.name || 'Rack tùy chỉnh'}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {formatTableNumber(footprint.width)} × {formatTableNumber(footprint.length)} ×{' '}
                      {formatTableNumber(rack.height)} m
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{getRackLevelCount(rack)}</td>
                    <td className="px-4 py-3 text-center font-semibold">{rack.bins?.length || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold">
                        {currentWeight == null ? '—' : `${formatTableNumber(currentWeight)} kg`}
                      </span>{' '}
                      <span className="text-slate-400">/ {formatTableLimit(maxWeight, 'kg')}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold">
                        {currentVolume == null ? '—' : `${formatTableNumber(currentVolume)} m³`}
                      </span>{' '}
                      <span className="text-slate-400">/ {formatTableLimit(maxVolume, 'm³')}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t border-slate-300 bg-slate-100 text-sm font-bold text-slate-800">
              <tr>
                <td className="px-4 py-3" colSpan={5}>
                  Tổng cộng: {racks.length} Rack
                </td>
                <td className="px-4 py-3 text-center">{totalBins}</td>
                <td className="px-4 py-3" colSpan={2}>
                  {totalBins} Bin đang được cấu hình
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}

function LayoutWarehouse({ currentRole = 'TENANT', initialView = '2d', stockOnly = false }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { contractId: routeContractId } = useParams()
  const [searchParams] = useSearchParams()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const dragRef = useRef(null)
  const blockedPaintRef = useRef(false)
  const isOwner = currentRole === 'OWNER'
  const contractId = routeContractId || searchParams.get('contractId') || ''
  const isContractLayout = Boolean(contractId)
  const pendingOwnerDraft = isOwner && !isContractLayout ? location.state?.draft : null
  const pendingDraftDimensions = normalizeCreatedDimensions({
    width: searchParams.get('width') || pendingOwnerDraft?.formData?.warehouseWidth,
    length: searchParams.get('length') || pendingOwnerDraft?.formData?.warehouseLength,
    height: searchParams.get('height') || pendingOwnerDraft?.formData?.warehouseHeight,
  })

  const [rentedWarehouses, setRentedWarehouses] = useState([])
  const [ownedWarehouses, setOwnedWarehouses] = useState([])
  const [ownerLockedWarehouseIds, setOwnerLockedWarehouseIds] = useState(() => new Set())
  const [tenantCapabilities, setTenantCapabilities] = useState({})
  const [preferredWarehouseId, setPreferredWarehouseId] = useState('')
  const [layout, setLayout] = useState(() => normalizeLayout(pendingDraftDimensions || {}))
  const [rackConfiguration, setRackConfiguration] = useState(createEmptyRackConfiguration)
  const [newBinShelfLevel, setNewBinShelfLevel] = useState(1)
  const [draftWarehouseId, setDraftWarehouseId] = useState('')
  const draftWarehouseIdRef = useRef('')
  const [selection, setSelection] = useState({ type: 'layout', key: null })
  const [selectedItems, setSelectedItems] = useState([])
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const selectedItemsRef = useRef([])
  const [minimumRackGap] = useState(DEFAULT_RACK_GAP)
  const [view, setView] = useState(stockOnly ? 'stock' : initialView)
  const [blockedMode, setBlockedMode] = useState(false)
  const [blockedTool, setBlockedTool] = useState('lock')
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingLayout, setLoadingLayout] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [contractCanEdit, setContractCanEdit] = useState(false)
  const [layoutSetupComplete, setLayoutSetupComplete] = useState(false)
  const [tenantDefault, setTenantDefault] = useState(false)
  const [stockRefreshKey, setStockRefreshKey] = useState(0)
  const [rentalRefreshKey, setRentalRefreshKey] = useState(0)
  const [capacityMetrics, setCapacityMetrics] = useState(null)
  const [capacityWarehouseId, setCapacityWarehouseId] = useState('')
  const [binStockState, setBinStockState] = useState({
    binId: null,
    status: 'idle',
    content: [],
    totalElements: 0,
    totalQuantity: 0,
    error: '',
  })

  useEffect(() => {
    selectedItemsRef.current = selectedItems
  }, [selectedItems])

  const updateSelection = useCallback(
    (nextSelection, additive = false, forceSingle = false) => {
      const normalized = {
        type: nextSelection?.type || 'layout',
        key: nextSelection?.key ?? nextSelection?.clientKey ?? null,
      }
      const currentItems = selectedItemsRef.current
      const shouldSelectMany =
        normalized.type !== 'layout' && normalized.key !== null && !forceSingle && additive

      if (!shouldSelectMany) {
        const nextItems =
          normalized.type === 'layout' || normalized.key === null ? [] : [normalized]
        selectedItemsRef.current = nextItems
        setSelection(normalized)
        setSelectedItems(nextItems)
        return
      }

      const existingIndex = currentItems.findIndex(
        (item) => item.type === normalized.type && String(item.key) === String(normalized.key)
      )
      const nextItems =
        existingIndex >= 0
          ? currentItems.filter((_, index) => index !== existingIndex)
          : [...currentItems, normalized]
      selectedItemsRef.current = nextItems
      setSelectedItems(nextItems)
      setSelection(nextItems[nextItems.length - 1] || { type: 'layout', key: null })
    },
    []
  )

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
    if (pendingOwnerDraft && !draftWarehouseId) return ''
    if (draftWarehouseId) return draftWarehouseId
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
  }, [draftWarehouseId, pendingOwnerDraft, pendingOwnerLayout, preferredWarehouseId, searchParams, warehouses])

  const isUnsavedOwnerDraft = Boolean(
    isOwner && !isContractLayout && pendingOwnerDraft && !draftWarehouseId
  )

  const tenantCanManageLayout = Boolean(
    !isOwner &&
      currentRole === 'TENANT' &&
      !isContractLayout &&
      selectedWarehouseId &&
      tenantCapabilities[selectedWarehouseId]?.canManageWms
  )
  const ownerWarehouseLayoutLocked = Boolean(
    isOwner &&
      !isContractLayout &&
      selectedWarehouseId &&
      ownerLockedWarehouseIds.has(String(selectedWarehouseId))
  )
  const canEditLayout =
    (isOwner && (!isContractLayout || contractCanEdit) && !ownerWarehouseLayoutLocked) ||
    tenantCanManageLayout
  const isReadOnly =
    currentRole === 'STAFF' ||
    stockOnly ||
    (isContractLayout && (!isOwner || !contractCanEdit)) ||
    ownerWarehouseLayoutLocked ||
    (currentRole === 'TENANT' && !tenantCanManageLayout)

  const isMandatorySetup = useMemo(() => {
    if (!isOwner || layoutSetupComplete) return false
    return (
      searchParams.get('setupRequired') === 'true' ||
      Boolean(pendingOwnerLayout) ||
      Boolean(pendingOwnerDraft)
    )
  }, [isOwner, layoutSetupComplete, pendingOwnerDraft, pendingOwnerLayout, searchParams])

  const hasLayoutTarget = Boolean(selectedWarehouseId || isContractLayout || pendingOwnerDraft)

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
    const requestedWarehouseId = searchParams.get('warehouseId')
    if (!requestedWarehouseId || requestedWarehouseId === selectedWarehouseId) {
      const fromQuery = normalizeCreatedDimensions({
        width: searchParams.get('width'),
        length: searchParams.get('length'),
        height: searchParams.get('height'),
      })
      if (fromQuery) return fromQuery
    }
    if (pendingOwnerDraft) {
      const fromDraft = normalizeCreatedDimensions({
        width: pendingOwnerDraft.formData?.warehouseWidth,
        length: pendingOwnerDraft.formData?.warehouseLength,
        height: pendingOwnerDraft.formData?.warehouseHeight,
      })
      if (fromDraft) return fromDraft
    }
    if (!selectedWarehouseId) return null
    try {
      return normalizeCreatedDimensions(
        JSON.parse(localStorage.getItem(layoutDimensionsKey(selectedWarehouseId)) || 'null')
      )
    } catch {
      return null
    }
  }, [pendingOwnerDraft, searchParams, selectedWarehouseId])

  const selectedEntity = useMemo(() => getSelected(layout, selection), [layout, selection])
  const selectedItemSet = useMemo(
    () => new Set(selectedItems.map((item) => `${item.type}:${item.key}`)),
    [selectedItems]
  )
  const selectedRack = useMemo(() => {
    if (selection.type === 'rack') return selectedEntity
    if (selection.type === 'bin') {
      return layout.racks.find(
        (rack) =>
          Array.isArray(rack?.bins) &&
          rack.bins.some((bin) => bin?.clientKey === selection.key)
      )
    }
    return null
  }, [layout.racks, selectedEntity, selection])
  const footprintSet = useMemo(() => new Set(layout.footprintCells), [layout.footprintCells])
  const blockedSet = useMemo(() => new Set(layout.blockedCells), [layout.blockedCells])
  const binCount = useMemo(
    () =>
      layout.racks.reduce(
        (total, rack) => total + (Array.isArray(rack?.bins) ? rack.bins.length : 0),
        0
      ),
    [layout.racks]
  )
  const selectedBinId =
    !isOwner && selection.type === 'bin' && selectedEntity?.id ? String(selectedEntity.id) : null
  const capacityByBinId = useMemo(() => {
    if (
      isOwner ||
      isContractLayout ||
      String(capacityWarehouseId) !== String(selectedWarehouseId)
    ) {
      return {}
    }

    const binsById = {}
    const capacityRacks = Array.isArray(capacityMetrics?.racks) ? capacityMetrics.racks : []

    capacityRacks.forEach((rack) => {
      const bins = Array.isArray(rack?.bins) ? rack.bins : []
      bins.forEach((bin) => {
        if (bin?.binId) binsById[String(bin.binId)] = bin
      })
    })

    return binsById
  }, [capacityMetrics, capacityWarehouseId, isContractLayout, isOwner, selectedWarehouseId])

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (isContractLayout) {
        setLoadingOptions(false)
        return
      }
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
          try {
            const contractsResponse = await contractApi.getMyContracts({ page: 0, size: 100 })
            const contractsPayload = apiData(contractsResponse)
            const contractList = Array.isArray(contractsPayload)
              ? contractsPayload
              : contractsPayload?.content ?? []
            const lockedIds = contractList
              .filter(isCurrentActiveContract)
              .map((contract) => String(contract.warehouseId))
            if (alive) setOwnerLockedWarehouseIds(new Set(lockedIds))
          } catch {
            if (alive) setOwnerLockedWarehouseIds(new Set())
          }
        } else {
          const response = await warehouseApi.getMyWarehouses()
          const payload = apiData(response)
          if (alive) {
            setRentedWarehouses(Array.isArray(payload) ? payload : (payload?.content ?? []))
          }

          try {
            const contractsResponse = await contractApi.getMyContracts({ page: 0, size: 100 })
            const contractsPayload = apiData(contractsResponse)
            const contractList = Array.isArray(contractsPayload)
              ? contractsPayload
              : contractsPayload?.content ?? []
            const capabilities = contractList.reduce((result, contract) => {
              const warehouseId = contract?.warehouseId
              if (!warehouseId) return result
              const key = String(warehouseId)
              result[key] = {
                canViewLayout: Boolean(result[key]?.canViewLayout || contract.canViewLayout),
                canManageWms: Boolean(result[key]?.canManageWms || contract.canManageWms),
              }
              return result
            }, {})
            if (alive) setTenantCapabilities(capabilities)
          } catch {
            // The warehouse list remains usable in read-only mode if contract flags fail to load.
            if (alive) setTenantCapabilities({})
          }
        }
      } catch (requestError) {
        if (alive) {
          setError(
            !isOwner && requestError.response?.status === 403
              ? 'This rental contract has expired or your access to the warehouse list was revoked.'
              : getEnglishApiMessage(requestError, 'Unable to load inventory list.')
          )
        }
      } finally {
        if (alive) setLoadingOptions(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [isContractLayout, isOwner, rentalRefreshKey])

  // Contract expiry/cancellation can remove the selected rented warehouse and
  // revoke its layout/stock access. Reload the warehouse options immediately
  // when the realtime RENTAL notification is received.
  useEffect(() => {
    const handleRentalNotification = (event) => {
      const notificationType = String(event.detail?.type || '').toUpperCase()
      if (!isOwner && notificationType === 'RENTAL') {
        setRentalRefreshKey((current) => current + 1)
      }
      if (
        !isOwner &&
        /(INBOUND|OUTBOUND|STOCK|INVENTORY|RECEIPT|PUTAWAY|TRANSFER)/.test(notificationType)
      ) {
        setStockRefreshKey((current) => current + 1)
      }
    }

    window.addEventListener('new_notification', handleRentalNotification)
    return () => window.removeEventListener('new_notification', handleRentalNotification)
  }, [isOwner])

  const loadLayout = useCallback(async () => {
    // Keep the local draft visible while the first create + layout save request is in flight.
    if (pendingOwnerDraft && draftWarehouseId && isMandatorySetup) return
    if (!selectedWarehouseId && !isContractLayout) {
      if (isUnsavedOwnerDraft) {
        setLayout((current) =>
          normalizeLayout({
            ...current,
            ...(createdDimensions || {}),
            racks: current.racks,
          })
        )
        setTenantDefault(false)
        updateSelection({ type: 'layout', key: null }, false, true)
        setMessage('Draft layout ready. Save the layout to create and submit this warehouse.')
      }
      return
    }
    const warehouse = warehouses.find((item) => item.id === selectedWarehouseId)
    try {
      setLoadingLayout(true)
      setError('')
      setMessage('')
      let response
      if (isContractLayout) {
        if (isOwner) {
          const contractResponse = await contractApi.getById(contractId)
          const contract = apiData(contractResponse) || {}
          const editableStatuses = ['DRAFT', 'CHANGES_REQUESTED']
          setContractCanEdit(
            Boolean(contract.canEdit ?? editableStatuses.includes(contract.status))
          )
        }
        response = isOwner
          ? await contractApi.getOwnerLayout(contractId)
          : await contractApi.getTenantLayout(contractId)
      } else {
        response = isOwner
          ? await warehouseApi.getOwnerWarehouseLayout(selectedWarehouseId)
          : currentRole === 'STAFF'
            ? await warehouseApi.getPublicWarehouseLayout(selectedWarehouseId)
            : await layoutApi.getTenantWarehouseLayout(selectedWarehouseId)
      }
      const payload = apiData(response) || {}
      const payloadWithDimensions = isContractLayout
        ? payload
        : {
            ...payload,
            width: createdDimensions?.width ?? warehouse?.width ?? payload.width,
            length: createdDimensions?.length ?? warehouse?.length ?? payload.length,
            height: createdDimensions?.height ?? warehouse?.height ?? payload.height,
          }
      const nextLayout = normalizeLayout(payloadWithDimensions)
      setLayout(nextLayout)
      setRackConfiguration(getRackConfigurationFromLayout(nextLayout))
      setTenantDefault(!isOwner && !isContractLayout && Boolean(payload.isDefault ?? payload.default))
      updateSelection({ type: 'layout', key: null }, false, true)
    } catch (requestError) {
      const notFound = requestError.response?.status === 404
      if (isOwner && notFound && !isContractLayout) {
        const nextLayout = normalizeLayout({
          width: createdDimensions?.width ?? warehouse?.width,
          length: createdDimensions?.length ?? warehouse?.length,
          height: createdDimensions?.height ?? warehouse?.height,
          racks: [],
        })
        setLayout(nextLayout)
        setRackConfiguration(getRackConfigurationFromLayout(nextLayout))
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
            'This rental contract has expired or your access to this warehouse was revoked.'
          )
        } else {
          setError(getEnglishApiMessage(requestError, 'Unable to load warehouse layout.'))
        }
      }
    } finally {
      setLoadingLayout(false)
    }
  }, [contractId, createdDimensions, currentRole, draftWarehouseId, isContractLayout, isMandatorySetup, isOwner, isUnsavedOwnerDraft, pendingOwnerDraft, selectedWarehouseId, updateSelection, warehouses])

  useEffect(() => {
    // Loading the selected warehouse is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLayout()
  }, [loadLayout])

  useEffect(() => {
    if (isOwner || isContractLayout || !selectedWarehouseId) {
      return undefined
    }

    let alive = true
    layoutApi
      .getCapacity(selectedWarehouseId)
      .then((response) => {
        if (alive) {
          setCapacityMetrics(apiData(response))
          setCapacityWarehouseId(String(selectedWarehouseId))
        }
      })
      .catch(() => {
        // Capacity is an optional visual metric. Keep the layout usable when
        // the rental permission or capacity endpoint is temporarily unavailable.
        if (alive) {
          setCapacityMetrics(null)
          setCapacityWarehouseId('')
        }
      })

    return () => {
      alive = false
    }
  }, [isContractLayout, isOwner, selectedWarehouseId, stockRefreshKey])

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
            requestError.response?.status === 403
              ? 'This rental contract has expired or your access to this warehouse was revoked.'
              : getEnglishApiMessage(requestError, 'Unable to load inventory in Bin.'),
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

      if (drag.type === 'bin') return
      const minSize = MIN_ENTITY_SIZE
      const maxRatio = 1
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
      setLayout((current) => {
        const nextDimensions = isQuarterTurn(drag.rotation)
          ? { width: length, length: width }
          : { width, length }
        return updateRack(current, drag.key, (rack) =>
          fitBinsToRack({ ...rack, ...nextDimensions }, { arrange: true })
        )
      })
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
    if (type === 'bin' && mode === 'resize') {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (isReadOnly) {
      event.preventDefault()
      event.stopPropagation()
      updateSelection({ type, key: entity.clientKey }, event.ctrlKey || event.metaKey)
      if (currentRole === 'STAFF' && type === 'bin') setView('stock')
      return
    }
    if (blockedMode || (mode === 'resize' && !canEditLayout) || !parentElement) return
    const additiveSelection = isMultiSelectMode || event.ctrlKey || event.metaKey
    if (additiveSelection) {
      event.preventDefault()
      event.stopPropagation()
      updateSelection({ type, key: entity.clientKey }, true)
      setBlockedMode(false)
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const rect = parentElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const parentRack =
      type === 'bin'
        ? layout.racks.find(
            (rack) =>
              Array.isArray(rack?.bins) &&
              rack.bins.some((bin) => bin?.clientKey === entity.clientKey)
          )
        : null
    const entityDimensions =
      type === 'rack' ? getRackFootprint(entity) : { width: entity.width, length: entity.length }
    const parentRackDimensions = parentRack
      ? getRackFootprint(parentRack)
      : { width: 1, length: 1 }
    const parent =
      type === 'rack'
        ? { width: layout.width, length: layout.length }
        : parentRackDimensions
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
      width: entityDimensions.width,
      length: entityDimensions.length,
      rotation: normalizeRotation(entity.rotation),
      blockedCells: layout.blockedCells,
      layoutWidth: layout.width,
      layoutLength: layout.length,
    }
    // eslint-disable-next-line react-hooks/immutability
    document.body.style.userSelect = 'none'
    updateSelection({ type, key: entity.clientKey })
  }

  // Selecting a Bin in the top-down view should not start the Rack drag
  // calculation. Bin movement is handled in the Rack elevation view (and in
  // the 3D preview), so keep this interaction as a simple, safe selection.
  const selectBinFromLayout = useCallback(
    (event, binKey) => {
      event.preventDefault()
      event.stopPropagation()
      updateSelection(
        { type: 'bin', key: binKey },
        isMultiSelectMode || event.ctrlKey || event.metaKey
      )
      setBlockedMode(false)
      if (currentRole === 'STAFF') setView('stock')
    },
    [currentRole, isMultiSelectMode, updateSelection]
  )

  const applyRackConfiguration = useCallback(() => {
    if (!canEditLayout) return

    const nextRacks = []
    const reusableRacks = [...layout.racks]
    let reusableRackIndex = 0
    const workingLayout = { ...layout, racks: nextRacks }

    for (const preset of RACK_PRESETS) {
      const requestedRackCount = Math.max(
        integerOf(rackConfiguration[preset.id]?.rackCount, 0),
        0
      )
      const maximumRackCount = getPresetMaxRackCount(layout, preset)

      if (requestedRackCount > maximumRackCount) {
        setError(
          `${preset.name} chỉ có thể đặt tối đa ${maximumRackCount} Rack trong kích thước kho hiện tại.`
        )
        return
      }

      for (let rackIndex = 0; rackIndex < requestedRackCount; rackIndex += 1) {
        const position = findAvailableRackPosition(
          workingLayout,
          preset.width,
          preset.length,
          minimumRackGap
        )
        if (!position || numberOf(layout.height) < preset.height) {
          setError(
            `Không đủ diện tích trống để đặt ${requestedRackCount} ${preset.name}. Giảm số lượng Rack hoặc chọn loại nhỏ hơn.`
          )
          return
        }

        const existingRack = reusableRacks[reusableRackIndex]
        reusableRackIndex += 1
        const existingBins = Array.isArray(existingRack?.bins) ? existingRack.bins : []
        const rack = fitBinsToRack(
          normalizeRack({
            id: existingRack?.id ?? null,
            rackPresetId: preset.id,
            name: `${preset.name} ${rackIndex + 1}`,
            code: `RACK-${preset.code}-${rackIndex + 1}`,
            maxWeight: existingRack?.maxWeight,
            maxVolume: existingRack?.maxVolume,
            coordinateX: position.x,
            coordinateY: position.y,
            positionZ: 0,
            rotation: 0,
            width: preset.width,
            length: preset.length,
            height: preset.height,
            bins: existingBins,
          }),
          { arrange: true }
        )
        nextRacks.push(rack)
      }
    }

    setLayout({ ...layout, racks: nextRacks })
    setRackConfiguration(createEmptyRackConfiguration())
    updateSelection({ type: 'layout', key: null }, false, true)
    setBlockedMode(false)
    setError('')
    setMessage('Rack đã được cập nhật theo cấu hình. Các ô nhập đã được làm trống.')
  }, [canEditLayout, layout, minimumRackGap, rackConfiguration, updateSelection])

  const addBinToSelectedRack = useCallback(() => {
    if (!canEditLayout || !selectedRack) return

    const levels = getRackLevelCount(selectedRack)
    const shelfLevel = clamp(integerOf(newBinShelfLevel, 1), 1, levels)
    const binNumber = (selectedRack.bins?.length || 0) + 1
    const nextBin = normalizeBin({
      name: `${selectedRack.name || selectedRack.code || 'Rack'} - Bin ${binNumber}`,
      code: `${selectedRack.code || 'RACK'}-BIN-${binNumber}`,
      shelfLevel,
    })

    setLayout((current) =>
      updateRack(current, selectedRack.clientKey, (rack) =>
        fitBinsToRack(
          { ...rack, bins: [...(rack.bins || []), nextBin] },
          { arrangePositions: true }
        )
      )
    )
    updateSelection({ type: 'bin', key: nextBin.clientKey }, false, true)
    setBlockedMode(false)
    setError('')
    setMessage(`Đã thêm ${nextBin.name} ở tầng ${shelfLevel}. Có thể kéo Bin theo chiều dọc trong chế độ 3D để đổi tầng.`)
  }, [canEditLayout, newBinShelfLevel, selectedRack, updateSelection])

  const rotateSelectedRack = useCallback(() => {
    if (!canEditLayout || selection.type !== 'rack' || !selectedEntity) return

    const rotations = [0, 90, 180, 270]
    const currentRotation = normalizeRotation(selectedEntity.rotation)
    const nextRotation = rotations[(rotations.indexOf(currentRotation) + 1) % rotations.length]
    const rotatedRack = fitBinsToRack(
      { ...selectedEntity, rotation: nextRotation },
      { arrange: true }
    )
    const footprint = getRackFootprint(rotatedRack)
    const candidate = {
      ...rotatedRack,
      coordinateX: clamp(
        numberOf(rotatedRack.coordinateX),
        0,
        Math.max(layout.width - footprint.width, 0)
      ),
      coordinateY: clamp(
        numberOf(rotatedRack.coordinateY),
        0,
        Math.max(layout.length - footprint.length, 0)
      ),
    }
    const overlapsLockedCell = rectangleOverlapsBlockedCell(candidate, layout)
    const overlapsRack = layout.racks.some(
      (rack) =>
        rack.clientKey !== selectedEntity.clientKey &&
        rectanglesTooClose(candidate, rack, minimumRackGap)
    )

    if (overlapsLockedCell || overlapsRack) {
      setError('The Rack cannot rotate here because it would overlap a locked area or another Rack.')
      return
    }

    setLayout((current) =>
      updateRack(current, selectedEntity.clientKey, (rack) =>
        fitBinsToRack(
          {
            ...rack,
            rotation: nextRotation,
            coordinateX: candidate.coordinateX,
            coordinateY: candidate.coordinateY,
          },
          { arrange: true }
        )
      )
    )
    setError('')
  }, [canEditLayout, layout, minimumRackGap, selectedEntity, selection.type])

  const moveEntityFromPreview = useCallback(
    (type, key, coordinateX, coordinateY, nextShelfLevel) => {
      if (!canEditLayout) return

      setLayout((current) => {
        if (type === 'rack') {
          return updateRack(current, key, (rack) => ({
            ...rack,
            coordinateX,
            coordinateY,
          }))
        }

        const rack = current.racks.find(
          (item) =>
            Array.isArray(item?.bins) && item.bins.some((bin) => bin?.clientKey === key)
        )
        if (!rack) return current

        const bins = Array.isArray(rack.bins) ? rack.bins : []
        const currentBin = bins.find((bin) => bin?.clientKey === key)
        if (!currentBin) return current
        const levels = getRackLevelCount(rack)
        const shelfLevel =
          nextShelfLevel == null
            ? currentBin.shelfLevel
            : clamp(integerOf(nextShelfLevel, currentBin.shelfLevel), 1, levels)
        const levelChanged = shelfLevel !== currentBin.shelfLevel
        const updatedRack = {
          ...rack,
          bins: bins.map((bin) =>
            bin.clientKey === key
              ? { ...bin, coordinateX, coordinateY, shelfLevel }
              : bin
          ),
        }

        return levelChanged
          ? fitBinsToRack(updatedRack, { arrangePositions: true })
          : distributeRackCapacities(updatedRack)
      })
    },
    [canEditLayout]
  )

  const removeSelected = useCallback(() => {
    if (!canEditLayout) return
    const targets = selectedItems.length
      ? selectedItems
      : selection.type === 'layout'
        ? []
        : [{ type: selection.type, key: selection.key }]
    if (!targets.length) return

    const rackKeys = new Set(
      targets.filter((item) => item.type === 'rack').map((item) => String(item.key))
    )
    const binKeys = new Set(
      targets.filter((item) => item.type === 'bin').map((item) => String(item.key))
    )
    const rackToKeep = layout.racks.find((rack) =>
      Array.isArray(rack?.bins) &&
      rack.bins.some((bin) => binKeys.has(String(bin?.clientKey)))
    )
    setLayout((current) => {
      return {
        ...current,
        racks: current.racks
          .filter((rack) => !rackKeys.has(String(rack.clientKey)))
          .map((rack) => ({
            ...rack,
            bins: (Array.isArray(rack.bins) ? rack.bins : []).filter(
              (bin) => !binKeys.has(String(bin?.clientKey))
            ),
          })),
      }
    })
    if (rackToKeep && !rackKeys.has(String(rackToKeep.clientKey))) {
      updateSelection({ type: 'rack', key: rackToKeep.clientKey }, false, true)
      setView('rack-section')
    } else {
      updateSelection({ type: 'layout', key: null }, false, true)
      if (view === 'rack-section') setView('2d')
    }
    setIsMultiSelectMode(false)
    setError('')
  }, [canEditLayout, layout.racks, selectedItems, selection.key, selection.type, updateSelection, view])

  useEffect(() => {
    const handleKeyboardShortcut = (event) => {
      if (isReadOnly) return
      const tagName = event.target?.tagName
      if (
        event.target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)
      ) {
        return
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (!selectedItems.length && selection.type === 'layout') return

      event.preventDefault()
      removeSelected()
    }

    window.addEventListener('keydown', handleKeyboardShortcut)
    return () => window.removeEventListener('keydown', handleKeyboardShortcut)
  }, [isReadOnly, removeSelected, selectedItems.length, selection.type])

  const createWarehouseFromDraft = useCallback(async () => {
    if (draftWarehouseIdRef.current) return draftWarehouseIdRef.current
    if (!pendingOwnerDraft) throw new Error('No warehouse draft found.')

    const draftFormData = pendingOwnerDraft.formData || {}
    const width = numberOf(draftFormData.warehouseWidth)
    const length = numberOf(draftFormData.warehouseLength)
    const height = numberOf(draftFormData.warehouseHeight)
    const rentalPrice = numberOf(draftFormData.rentalPrice)
    const formPayload = new FormData()
    const warehouseInfo = {
      typeId: draftFormData.typeId,
      name: String(draftFormData.name || '').trim(),
      address: pendingOwnerDraft.fullAddress,
      description: String(draftFormData.description || '').trim(),
      capacity: width * length,
      rentalPrice: draftFormData.rentalPricingType === 'NEGOTIATED' ? null : rentalPrice,
      rentalPricingType: draftFormData.rentalPricingType,
      imageUrls: [],
    }

    formPayload.append(
      'request',
      new Blob([JSON.stringify(warehouseInfo)], { type: 'application/json' })
    )
    if (pendingOwnerDraft.coverFile) formPayload.append('files', pendingOwnerDraft.coverFile)
    const relatedImages = pendingOwnerDraft.relatedImages || []
    relatedImages.forEach((image) => {
      if (image.file) formPayload.append('files', image.file)
    })

    const response = await warehouseApi.createWarehouse(formPayload)
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || 'Could not create warehouse.')
    }

    const createdId = response?.data?.data?.id ?? response?.data?.data?.warehouseId
    if (!createdId) throw new Error('Warehouse created without an ID.')

    const normalizedId = String(createdId)
    draftWarehouseIdRef.current = normalizedId
    setDraftWarehouseId(normalizedId)
    setOwnedWarehouses((current) => [
      {
        id: normalizedId,
        name: warehouseInfo.name || 'Warehouse',
        width,
        length,
        height,
      },
      ...current.filter((warehouse) => String(warehouse.id) !== normalizedId),
    ])
    try {
      localStorage.setItem(
        layoutDimensionsKey(normalizedId),
        JSON.stringify({ width, length, height })
      )
    } catch {
      // The layout payload still contains the dimensions if local storage is unavailable.
    }
    return normalizedId
  }, [pendingOwnerDraft])

  const saveLayout = async () => {
    const hasPendingOwnerDraft = Boolean(isOwner && !isContractLayout && pendingOwnerDraft)
    if (isReadOnly || (!selectedWarehouseId && !isContractLayout && !hasPendingOwnerDraft)) return
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
    if (canEditLayout && overloadedRack) {
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
      const payload = toPayload(layout)
      const targetWarehouseId =
        selectedWarehouseId ||
        (hasPendingOwnerDraft ? await createWarehouseFromDraft() : '')
      const response = isContractLayout
        ? await contractApi.saveOwnerLayout(contractId, payload)
        : isOwner
          ? await warehouseApi.saveOwnerWarehouseLayout(targetWarehouseId, payload)
          : await layoutApi.saveTenantWarehouseLayout(targetWarehouseId, payload)
      const saved = apiData(response)
      if (saved) setLayout(normalizeLayout(saved))
      updateSelection({ type: 'layout', key: null }, false, true)
      setMessage(isContractLayout ? 'Contract layout saved successfully.' : 'Warehouse layout saved successfully.')
      if (isMandatorySetup) {
        try {
          sessionStorage.removeItem(pendingOwnerLayoutKey)
        } catch {
          // Ignore storage cleanup errors; the saved layout is still valid.
        }
        setLayoutSetupComplete(true)
        setMessage(
          'Warehouse created and submitted for Admin approval. Listing packages will be available after approval.'
        )
        const nextParams = new URLSearchParams(searchParams)
        nextParams.delete('setupRequired')
        if (targetWarehouseId) nextParams.set('warehouseId', targetWarehouseId)
        navigate(
          {
            pathname: location.pathname,
            search: nextParams.toString() ? `?${nextParams.toString()}` : '',
          },
          { replace: true, state: null }
        )
      }
    } catch (requestError) {
      setError(getEnglishApiMessage(requestError, 'Saving layout failed.'))
    } finally {
      setSaving(false)
    }
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
                  {stockOnly ? (isContractLayout ? 'Contract Layout' : 'Goods in Bin') : isContractLayout ? 'Contract Layout' : 'Warehouse Layout'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {stockOnly
                    ? 'Select warehouse and Bin to view items, units and inventory quantity. This screen is for viewing only.'
                    : isContractLayout
                      ? isOwner && canEditLayout
                        ? 'Configure the leased area layout before submitting this contract. Contract dimensions are fixed.'
                        : 'Review the layout proposed for this rental contract. Editing is disabled.'
                      : ownerWarehouseLayoutLocked
                        ? 'This warehouse layout is locked while a tenant rental contract is active.'
                      : isOwner
                      ? 'Create Rack, Bin and warehouse shapes. Data is stored in the correct BE structure, without Zone.'
                      : isReadOnly
                        ? 'View the warehouse layout. Editing is disabled until WMS access is available.'
                        : "Customize Rack and Bin on Tenant's own layout."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isContractLayout && (
                  <button
                    type="button"
                    onClick={() => navigate(isOwner ? '/owner/contracts' : '/tenant/contracts')}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                  >
                    Back to contracts
                  </button>
                )}
                <button
                  type="button"
                  onClick={loadLayout}
                  disabled={!hasLayoutTarget || loadingLayout}
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
                      !hasLayoutTarget ||
                      saving ||
                      loadingLayout ||
                      (tenantDefault && !canEditLayout) ||
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

            {!isContractLayout && (
              isUnsavedOwnerDraft ? (
                <section className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 shadow-sm">
                  <p className="text-xs font-bold tracking-wider text-orange-700 uppercase">
                    New warehouse draft
                  </p>
                  <p className="mt-1 text-base font-bold text-orange-950">
                    {pendingOwnerDraft.formData?.name || 'Untitled warehouse'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-orange-900/80">
                    Configure the layout below. The warehouse will be created and submitted only
                    when you click Save layout.
                  </p>
                </section>
              ) : (
                <section className="w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:w-fit">
                  <label className="mb-1.5 block text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Select warehouse
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(event) => setPreferredWarehouseId(event.target.value)}
                    disabled={isMandatorySetup || loadingOptions || !warehouses.length}
                    className={`${inputClass} w-full py-2 sm:w-[300px]`}
                  >
                    {!warehouses.length && <option value="">There is no suitable warehouse</option>}
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </section>
              )
            )}

            {isContractLayout && (
              <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">
                      Contract layout snapshot
                    </p>
                    <p className="mt-1 text-sm text-blue-950">
                      The overall dimensions below are read-only and must match the rental contract.
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-900 shadow-sm">
                    {formatMeters(layout.width)} × {formatMeters(layout.length)} × {formatMeters(layout.height)}
                  </div>
                </div>
              </section>
            )}

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
            {tenantDefault && !canEditLayout && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                This is the Owner's default layout. Layout Tenant has not been cloned yet so it
                can be viewed only. An active WMS subscription is required to customize it.
                <button
                  type="button"
                  onClick={() => navigate('/tenant/subscription')}
                  className="ml-2 font-bold underline underline-offset-2"
                >
                  Open subscription
                </button>
              </div>
            )}
            {currentRole === 'TENANT' &&
              !isContractLayout &&
              !stockOnly &&
              !tenantDefault &&
              isReadOnly && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  You can view this layout, but an active WMS subscription is required to customize
                  Rack and Bin.
                  <button
                    type="button"
                    onClick={() => navigate('/tenant/subscription')}
                    className="ml-2 font-bold underline underline-offset-2"
                  >
                    Open subscription
                  </button>
                </div>
              )}

            {view !== 'stock' && (
              <RackStatisticsTable layout={layout} capacityMetrics={capacityMetrics} />
            )}

            <div className="grid min-w-0 gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-bold">Structure</h2>
                  <span className="text-xs text-slate-500">
                    {layout.racks.length} Rack · {binCount} Bin
                  </span>
                </div>
                {canEditLayout && (
                  <div className="mb-4 space-y-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                      <p className="text-xs font-bold tracking-wide text-blue-900 uppercase">
                        Rack configuration
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-blue-800/80">
                        Chọn loại Rack và số lượng Rack cần thêm vào kho.
                      </p>
                    </div>
                    {RACK_PRESETS.map((preset) => {
                      const maximumRackCount = getPresetMaxRackCount(layout, preset)
                      const configuration = rackConfiguration[preset.id] || {
                        rackCount: 0,
                      }
                      return (
                        <div
                          key={preset.id}
                          className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{preset.name}</p>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                {preset.width}m × {preset.length}m × {preset.height}m
                              </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                              Max {maximumRackCount}
                            </span>
                          </div>
                          <div className="mt-3">
                            <label className="text-[11px] font-semibold text-slate-600">
                              Rack quantity
                              <input
                                type="number"
                                min="0"
                                max={maximumRackCount}
                                step="1"
                                value={configuration.rackCount}
                                disabled={maximumRackCount === 0}
                                onChange={(event) =>
                                  setRackConfiguration((current) => ({
                                    ...current,
                                    [preset.id]: {
                                      ...current[preset.id],
                                      rackCount: clamp(
                                        integerOf(event.target.value, 0),
                                        0,
                                        maximumRackCount
                                      ),
                                    },
                                  }))
                                }
                                className={`${inputClass} mt-1`}
                              />
                            </label>
                          </div>
                        </div>
                      )
                    })}
                    <button
                      type="button"
                      onClick={applyRackConfiguration}
                      className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Apply configuration
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsMultiSelectMode((current) => !current)}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold ${isMultiSelectMode ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {isMultiSelectMode ? 'Multi-select: On' : 'Multi-select'}
                      </button>
                      <button
                        type="button"
                        onClick={removeSelected}
                        disabled={!selectedItems.length}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-2 py-2 text-xs font-semibold text-red-600 enabled:hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete {selectedItems.length ? `(${selectedItems.length})` : ''}
                      </button>
                    </div>
                    <p className="text-[11px] leading-4 text-slate-500">
                      Ctrl/Cmd + click để chọn nhiều. Phím Delete để xóa lựa chọn.
                    </p>
                  </div>
                )}
                <div className="max-h-130 space-y-2 overflow-auto">
                  {(Array.isArray(layout?.racks) ? layout.racks : []).map((rack) => {
                    const rackBins = Array.isArray(rack?.bins) ? rack.bins : []
                    return (
                    <div key={rack.clientKey} className="rounded-xl border border-slate-200 p-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          updateSelection(
                            { type: 'rack', key: rack.clientKey },
                            isMultiSelectMode || event.ctrlKey || event.metaKey
                          )
                          setBlockedMode(false)
                          if (!isMultiSelectMode && !event.ctrlKey && !event.metaKey) {
                            setView('rack-section')
                          }
                        }}
                        className={`w-full rounded-lg px-2 py-2 text-left text-sm font-semibold ${selectedItemSet.has(`rack:${rack.clientKey}`) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate">{rack.name || rack.code}</span>
                          <span className="shrink-0 text-xs font-normal text-slate-400">
                            {rackBins.length} Bin
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
                        {rackBins.map((bin) => (
                          <button
                            key={bin.clientKey}
                            type="button"
                            onClick={(event) => {
                              updateSelection(
                                { type: 'bin', key: bin.clientKey },
                                isMultiSelectMode || event.ctrlKey || event.metaKey
                              )
                              setBlockedMode(false)
                            }}
                            className={`block w-full rounded px-2 py-1.5 text-left text-xs ${selectedItemSet.has(`bin:${bin.clientKey}`) ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
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
                    )
                  })}
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
                    ) : view === 'rack-section' ? (
                      <button
                        type="button"
                        onClick={() => setView('2d')}
                        className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 shadow-sm"
                      >
                        ← Sơ đồ 2D
                      </button>
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
                  {canEditLayout && view === '2d' && (
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
                      {selection.type === 'rack' && selectedEntity && (
                        <button
                          type="button"
                          onClick={rotateSelectedRack}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                          Xoay Rack 90°
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {canEditLayout && view === '2d' && blockedMode && (
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
                          updateSelection({ type: 'bin', key: binKey }, false, true)
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
                              {selectedEntity?.name || selectedEntity?.code || 'Bin'}
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
                ) : view === 'rack-section' && selectedRack ? (
                  <RackElevationView
                    rack={selectedRack}
                    canEdit={canEditLayout}
                    selectedBinKey={selection.type === 'bin' ? selection.key : null}
                    newBinShelfLevel={newBinShelfLevel}
                    onShelfLevelChange={setNewBinShelfLevel}
                    onAddBin={addBinToSelectedRack}
                    onSelectBin={(binKey) => {
                      updateSelection({ type: 'bin', key: binKey }, false, true)
                      setBlockedMode(false)
                    }}
                    onMoveBin={moveEntityFromPreview}
                  />
                ) : view === '3d' ? (
                  <>
                    <div className="h-140 overflow-hidden rounded-xl border border-slate-200">
                      <WarehouseLayoutPreview3D
                        layout={layout}
                        capacityByBinId={capacityByBinId}
                        selection={{ ...selection, clientKey: selection.key }}
                        selectedItems={selectedItems}
                        editable={!isReadOnly && !isMultiSelectMode && selectedItems.length <= 1}
                        onMoveEntity={moveEntityFromPreview}
                        onSelect={(nextSelection) => {
                          updateSelection(
                            {
                              type: nextSelection.type,
                              key: nextSelection.clientKey ?? nextSelection.key ?? null,
                            },
                            isMultiSelectMode || Boolean(nextSelection.multi)
                          )
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
                      className="relative mx-auto w-full max-w-205 min-w-130 overflow-hidden border-2 border-slate-300 bg-white shadow-inner"
                      style={{
                        aspectRatio: `${Math.max(numberOf(layout.width, 1), 1)} / ${Math.max(numberOf(layout.length, 1), 1)}`,
                      }}
                      onPointerDown={() => updateSelection({ type: 'layout', key: null }, false, true)}
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
                        layout.racks.map((rack) => {
                          const rackBins = Array.isArray(rack?.bins) ? rack.bins : []
                          return (
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
                            onClick={(event) => {
                              if (!blockedMode && !isMultiSelectMode && !event.ctrlKey && !event.metaKey) {
                                setView('rack-section')
                              }
                            }}
                            className={`absolute touch-none overflow-hidden rounded-md border-2 bg-blue-500/80 text-white shadow-md ${selectedItemSet.has(`rack:${rack.clientKey}`) ? 'z-20 border-blue-950 ring-2 ring-blue-300' : 'z-10 border-blue-700'}`}
                            style={{
                              left: `${(rack.coordinateX / layout.width) * 100}%`,
                              top: `${(rack.coordinateY / layout.length) * 100}%`,
                              width: `${(getRackFootprint(rack).width / layout.width) * 100}%`,
                              height: `${(getRackFootprint(rack).length / layout.length) * 100}%`,
                            }}
                          >
                            <div className="pointer-events-none truncate bg-blue-800/80 px-1.5 py-1 text-[10px] font-bold sm:text-xs">
                              {rack.name || rack.code}
                            </div>
                            {rackBins.map((bin) => (
                              <div
                                key={bin.clientKey}
                                onPointerDown={(event) => selectBinFromLayout(event, bin.clientKey)}
                                onClick={(event) => event.stopPropagation()}
                                className={`absolute touch-none overflow-hidden rounded-sm border bg-emerald-500/90 text-white shadow ${selectedItemSet.has(`bin:${bin.clientKey}`) ? 'z-20 border-white ring-2 ring-emerald-200' : 'z-10 border-emerald-800'}`}
                                style={{
                                  left: `${(bin.coordinateX / getRackFootprint(rack).width) * 100}%`,
                                  top: `${(bin.coordinateY / getRackFootprint(rack).length) * 100}%`,
                                  width: `${(bin.width / getRackFootprint(rack).width) * 100}%`,
                                  height: `${(bin.length / getRackFootprint(rack).length) * 100}%`,
                                }}
                              >
                                <span className="pointer-events-none block truncate px-1 text-[9px] font-semibold">
                                  {bin.name || bin.code}
                                </span>
                                {canEditLayout && (
                                  <span className="pointer-events-none absolute right-1 bottom-0.5 text-[9px] font-bold text-emerald-950/70">
                                    FIT
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </section>

            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default LayoutWarehouse
