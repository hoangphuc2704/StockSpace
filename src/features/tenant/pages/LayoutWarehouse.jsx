import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  AlertCircle,
  Grid3X3,
  Loader2,
  Plus,
  Package2,
  RotateCcw,
  RotateCw,
  Save,
  Trash2,
  Warehouse,
  X,
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
import useActiveWarehouseContext from '@/hooks/useActiveWarehouseContext'

const DEFAULT_LAYOUT_SIZE = 100
// Racks can be smaller than the old 4m hard limit. Keep a small positive
// minimum so the 2D/3D renderers still have a usable footprint.
const MIN_ENTITY_SIZE = 1
const MIN_BIN_SIZE = 0.1
const MIN_LAYOUT_SIZE = 0.000001
const DEFAULT_RACK_GAP = 1
const FOOTPRINT_GRID_SIZE = 10
const BIN_MAX_RATIO = 0.8
const DEFAULT_RACK_SHELF_COUNT = 2
const RACK_PRESETS = [
  {
    id: 'small',
    name: 'Rack nhỏ',
    code: 'SMALL',
    width: 6,
    length: 3,
    height: 6,
    shelfCount: DEFAULT_RACK_SHELF_COUNT,
    binsPerShelf: 2,
  },
  {
    id: 'standard',
    name: 'Rack tiêu chuẩn',
    code: 'STANDARD',
    width: 10,
    length: 4,
    height: 8,
    shelfCount: DEFAULT_RACK_SHELF_COUNT,
    binsPerShelf: 3,
  },
  {
    id: 'large',
    name: 'Rack lớn',
    code: 'LARGE',
    width: 14,
    length: 6,
    height: 10,
    shelfCount: DEFAULT_RACK_SHELF_COUNT,
    binsPerShelf: 5,
  },
]
const createEmptyRackPresetCapacities = () =>
  RACK_PRESETS.reduce(
    (result, preset) => ({
      ...result,
      [preset.id]: { maxWeight: '', maxVolume: '' },
    }),
    {}
  )
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
const inferRackPreset = (rack) => {
  const width = numberOf(rack?.width)
  const length = numberOf(rack?.length)
  return RACK_PRESETS.reduce((closest, preset) => {
    const distance = Math.abs(width - preset.width) + Math.abs(length - preset.length)
    return !closest || distance < closest.distance ? { id: preset.id, distance } : closest
  }, null)?.id
}
const getRackBinLimit = (rack) => {
  const presetId = rack?.rackPresetId || inferRackPreset(rack)
  return RACK_PRESETS.find((preset) => preset.id === presetId)?.binsPerShelf || 5
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
  const apiWidth = Math.max(numberOf(source.width, 8), MIN_BIN_SIZE)
  const apiLength = Math.max(numberOf(source.length, 8), MIN_BIN_SIZE)
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
    // Keep the Bin geometry aligned with the BE contract.
    width: apiWidth,
    length: apiLength,
    height: Math.max(numberOf(source.height, 8), MIN_BIN_SIZE),
  }
}

const getRackLevelCount = (rack) => {
  const configuredShelfCount = integerOf(rack?.shelfCount, 0)
  if (configuredShelfCount > 0) return configuredShelfCount

  // Do not derive shelf count from height. New layouts use the explicit
  // configuration field and this fixed fallback only supports old records.
  return DEFAULT_RACK_SHELF_COUNT
}

const getBinHeightForRack = (rack) => {
  const rackHeight = Math.max(numberOf(rack?.height, MIN_ENTITY_SIZE), MIN_ENTITY_SIZE)
  const levelHeight = rackHeight / getRackLevelCount(rack)
  return Number(clamp(levelHeight * 0.9, MIN_BIN_SIZE, rackHeight).toFixed(6))
}

const roundedCapacity = (value) => Math.floor(Math.max(numberOf(value), 0) * 1_000_000) / 1_000_000

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
        ...(levelWeight === null ? {} : { maxWeight: roundedCapacity(levelWeight / binCount) }),
        ...(levelVolume === null ? {} : { maxVolume: roundedCapacity(levelVolume / binCount) }),
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
      shelfCount: Math.max(integerOf(source.shelfCount, DEFAULT_RACK_SHELF_COUNT), 1),
      bins: Array.isArray(source.bins) ? source.bins.map(normalizeBin) : [],
    },
    // Preserve shelfLevel and coordinates returned by BE. New racks are arranged
    // explicitly when they are created or when the owner changes the rack preset.
    { arrange: false }
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
    shelfCount: getRackLevelCount(rack),
    bins: (Array.isArray(rack.bins) ? rack.bins : []).map((bin, binIndex) =>
      serializeBin(bin, rackIndex, binIndex, footprintWidth, footprintLength, height)
    ),
  }
}

const getAutomaticBinGeometry = (rack, binCount) => {
  const { width: rackWidth, length: rackLength } = getRackFootprint(rack)
  const count = Math.max(integerOf(binCount, 1), 1)
  // Reserve the complete capacity of one shelf from the first Bin. This keeps
  // empty slots visible instead of stretching the first Bin across the rack.
  // `count` is still included so old layouts with more Bins than the preset
  // limit remain renderable without overlapping each other.
  const slotCount = Math.max(getRackBinLimit(rack), count, 1)
  const columns = slotCount
  const rows = 1
  const rotated = isQuarterTurn(rack.rotation)
  // Bins always sit next to each other across the Rack's physical front.
  // After a 90/270-degree Rack rotation, that front is the effective Y axis.
  const frontSpan = rotated ? rackLength : rackWidth
  const depthSpan = rotated ? rackWidth : rackLength
  const frontSlot = frontSpan / columns
  const frontBin = Math.max(frontSlot * BIN_MAX_RATIO, MIN_BIN_SIZE)
  const depth = Math.max(depthSpan * BIN_MAX_RATIO, MIN_BIN_SIZE)
  const width = rotated ? depth : frontBin
  const length = rotated ? frontBin : depth

  return { columns, rows, frontSlot, frontBin, width, length, rotated }
}

const rotateBinsWithRack = (rack, nextRotation) => {
  const currentRotation = normalizeRotation(rack.rotation)
  const rotationDelta = (normalizeRotation(nextRotation) - currentRotation + 360) % 360
  const { width: currentRackWidth, length: currentRackLength } = getRackFootprint(rack)
  const nextRack = { ...rack, rotation: nextRotation }
  const { width: nextRackWidth, length: nextRackLength } = getRackFootprint(nextRack)

  return (Array.isArray(rack.bins) ? rack.bins : []).map((bin) => {
    const currentBinWidth = Math.max(numberOf(bin.width, MIN_BIN_SIZE), MIN_BIN_SIZE)
    const currentBinDepth = Math.max(numberOf(bin.length, MIN_BIN_SIZE), MIN_BIN_SIZE)
    const currentCenterX = numberOf(bin.coordinateX) + currentBinWidth / 2
    const currentCenterY = numberOf(bin.coordinateY) + currentBinDepth / 2
    let nextCenterX = currentCenterX
    let nextCenterY = currentCenterY
    let nextBinWidth = currentBinWidth
    let nextBinDepth = currentBinDepth

    if (rotationDelta === 90) {
      nextCenterX = currentRackLength - currentCenterY
      nextCenterY = currentCenterX
      nextBinWidth = currentBinDepth
      nextBinDepth = currentBinWidth
    } else if (rotationDelta === 180) {
      nextCenterX = currentRackWidth - currentCenterX
      nextCenterY = currentRackLength - currentCenterY
    } else if (rotationDelta === 270) {
      nextCenterX = currentCenterY
      nextCenterY = currentRackWidth - currentCenterX
      nextBinWidth = currentBinDepth
      nextBinDepth = currentBinWidth
    }

    return {
      ...bin,
      width: nextBinWidth,
      length: nextBinDepth,
      coordinateX: clamp(
        nextCenterX - nextBinWidth / 2,
        0,
        Math.max(nextRackWidth - nextBinWidth, 0)
      ),
      coordinateY: clamp(
        nextCenterY - nextBinDepth / 2,
        0,
        Math.max(nextRackLength - nextBinDepth, 0)
      ),
    }
  })
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
    shelfLevel: arrange ? (index % levels) + 1 : clamp(integerOf(bin.shelfLevel, 1), 1, levels),
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
      const automaticCoordinateX = geometry.rotated
        ? (rackWidth - geometry.width) / 2
        : column * geometry.frontSlot + (geometry.frontSlot - geometry.width) / 2
      const automaticCoordinateY = geometry.rotated
        ? column * geometry.frontSlot + (geometry.frontSlot - geometry.length) / 2
        : row * rackLength + (rackLength - geometry.length) / 2
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

const getRackSectionBin = (rack, bin) => {
  const rackWidth = Math.max(numberOf(rack?.width, MIN_ENTITY_SIZE), MIN_ENTITY_SIZE)
  const binWidth = Math.max(numberOf(bin?.width, MIN_BIN_SIZE), MIN_BIN_SIZE)
  const binLength = Math.max(numberOf(bin?.length, MIN_BIN_SIZE), MIN_BIN_SIZE)
  const usesRackLengthAsSectionWidth = isQuarterTurn(rack?.rotation)
  const sectionWidth = usesRackLengthAsSectionWidth ? binLength : binWidth
  const sectionCoordinateX = usesRackLengthAsSectionWidth
    ? numberOf(bin?.coordinateY)
    : numberOf(bin?.coordinateX)

  return {
    coordinateX: clamp(sectionCoordinateX, 0, Math.max(rackWidth - sectionWidth, 0)),
    width: sectionWidth,
    usesRackLengthAsSectionWidth,
  }
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
  if (selection.type === 'rack') return racks.find((rack) => rack.clientKey === selection.key)
  return racks
    .flatMap((rack) => (Array.isArray(rack?.bins) ? rack.bins : []))
    .find((bin) => bin?.clientKey === selection.key)
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-all duration-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100 disabled:text-slate-500'
const softCardClass =
  'rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]'
const primaryButtonClass =
  'rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-orange-600 hover:to-orange-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300'
const secondaryButtonClass =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'

function BinStockMiniMap({ layout, selection, onSelectBin }) {
  const activeCells = new Set(layout.footprintCells)
  const blockedCells = new Set(layout.blockedCells)

  return (
    <div className={`${softCardClass} p-3 transition-shadow duration-200 hover:shadow-md`}>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-800">Select Bin on the 2D layout</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          The diagram only allows viewing and selecting Bin.
        </p>
      </div>
      <div className="overflow-auto rounded-2xl bg-slate-50 p-2">
        <div
          className="relative mx-auto aspect-square w-full max-w-90 min-w-65 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(148, 163, 184, 0.3) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        >
          <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
            {Array.from({ length: FOOTPRINT_GRID_SIZE ** 2 }, (_, index) => {
              const row = Math.floor(index / FOOTPRINT_GRID_SIZE)
              const column = index % FOOTPRINT_GRID_SIZE
              return (
                <div
                  key={cellKey(row, column)}
                  className={`border border-transparent ${
                    blockedCells.has(cellKey(row, column))
                      ? 'bg-slate-900'
                      : activeCells.has(cellKey(row, column))
                        ? 'bg-orange-50/70'
                        : 'bg-slate-300/80'
                  }`}
                />
              )
            })}
          </div>

          {(Array.isArray(layout?.racks) ? layout.racks : []).map((rack) => (
            <div
              key={rack.clientKey}
              className="pointer-events-none absolute z-10 overflow-hidden rounded-lg border border-orange-300 bg-slate-500/80 shadow-sm"
              style={{
                left: `${(rack.coordinateX / layout.width) * 100}%`,
                top: `${(rack.coordinateY / layout.length) * 100}%`,
                width: `${(getRackFootprint(rack).width / layout.width) * 100}%`,
                height: `${(getRackFootprint(rack).length / layout.length) * 100}%`,
              }}
            >
              <span className="block truncate bg-slate-700/90 px-1 py-0.5 text-[8px] font-bold text-white">
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
                  className={`pointer-events-auto absolute min-h-3.5 min-w-3.5 cursor-pointer rounded-md border bg-[#d8b17a] shadow-sm transition-all duration-200 hover:z-30 hover:scale-110 hover:bg-[#e5c894] ${
                    selection.type === 'bin' && selection.key === bin.clientKey
                      ? 'z-20 border-orange-500 bg-orange-400 ring-4 ring-orange-100'
                      : 'z-10 border-[#b8874d]'
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
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-500" /> Rack
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#d8b17a]" /> Bin can choose
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
  // The elevation always shows one fixed front face. Rack rotation in the
  // top-view layout must not change this section's width or orientation.
  const rackWidth = Math.max(numberOf(rack?.width, MIN_ENTITY_SIZE), MIN_ENTITY_SIZE)
  const bins = Array.isArray(rack?.bins) ? rack.bins : []

  useEffect(() => {
    const onMove = (event) => {
      const drag = dragRef.current
      if (!drag) return

      const rect = drag.element.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const relativeX = clamp((event.clientX - rect.left) / rect.width, 0, 1)
      const sectionCoordinateX = clamp(
        relativeX * drag.rackWidth - drag.grabOffset,
        0,
        Math.max(drag.rackWidth - drag.binWidth, 0)
      )
      const relativeY = clamp((event.clientY - rect.top) / rect.height, 0, 0.999999)
      const shelfLevel = clamp(drag.levels - Math.floor(relativeY * drag.levels), 1, drag.levels)
      const coordinateX = drag.usesRackLengthAsSectionWidth ? drag.coordinateX : sectionCoordinateX
      const coordinateY = drag.usesRackLengthAsSectionWidth ? sectionCoordinateX : drag.coordinateY

      onMoveBin(
        'bin',
        drag.binKey,
        Number(coordinateX.toFixed(2)),
        Number(coordinateY.toFixed(2)),
        shelfLevel
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
    const sectionBin = getRackSectionBin(rack, bin)
    dragRef.current = {
      element: surface,
      binKey: bin.clientKey,
      coordinateY: bin.coordinateY,
      coordinateX: bin.coordinateX,
      rackWidth,
      binWidth: sectionBin.width,
      grabOffset: pointerCoordinateX - sectionBin.coordinateX,
      usesRackLengthAsSectionWidth: sectionBin.usesRackLengthAsSectionWidth,
      levels,
    }
    // eslint-disable-next-line react-hooks/immutability
    document.body.style.userSelect = 'none'
  }

  return (
    <section className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/40 p-3 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] transition-all duration-300 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-orange-600 uppercase">
            Mặt cắt Rack
          </p>
          <h3 className="mt-1 font-bold text-slate-900">{rack.name || rack.code || 'Rack'}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Kéo Bin theo chiều ngang để đổi vị trí, kéo lên/xuống để đổi tầng. Tối đa{' '}
            <strong className="text-slate-700">{getRackBinLimit(rack)} Bin / tầng</strong>.
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] font-semibold text-slate-600">
              Tầng thêm
              <select
                value={clamp(integerOf(newBinShelfLevel, 1), 1, levels)}
                onChange={(event) => onShelfLevelChange(integerOf(event.target.value, 1))}
                className="mt-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition-all duration-200 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
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
              className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-700 shadow-sm transition-all duration-200 hover:bg-orange-100 active:scale-[0.98]"
            >
              Thêm Bin
            </button>
          </div>
        )}
      </div>

      <div
        className="relative h-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(148, 163, 184, 0.28) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      >
        <div
          data-rack-elevation-surface
          className="absolute inset-y-3 right-3 left-8 rounded-xl border-x-4 border-slate-500 bg-white/85 shadow-sm sm:left-12"
        >
          {Array.from({ length: levels + 1 }, (_, index) => {
            const top = `${(index / levels) * 100}%`
            return (
              <div
                key={`beam-${index}`}
                className="absolute right-0 left-0 border-t-2 border-slate-400/80"
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
                  className="absolute -left-8 z-10 -translate-y-1/2 text-[10px] font-bold text-orange-600 sm:-left-12"
                  style={{ top: `${index * rowHeight + rowHeight / 2}%` }}
                >
                  T{shelfLevel}
                </span>
                {binsOnLevel.map((bin) => {
                  const sectionBin = getRackSectionBin(rack, bin)
                  return (
                    <button
                      key={bin.clientKey}
                      type="button"
                      onPointerDown={(event) => startBinDrag(event, bin, event.currentTarget)}
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectBin(bin.clientKey)
                      }}
                      className={`absolute z-10 overflow-hidden rounded-lg border-2 px-1 text-left text-[10px] font-bold shadow-sm transition-all duration-200 ${selectedBinKey === bin.clientKey ? 'border-orange-500 bg-orange-400 text-white ring-4 ring-orange-100' : 'border-[#b8874d] bg-[#d8b17a] text-[#5b3b20] hover:bg-[#e5c894]'}`}
                      style={{
                        left: `${(sectionBin.coordinateX / rackWidth) * 100}%`,
                        top: `${top}%`,
                        width: `${clamp((sectionBin.width / rackWidth) * 100, 4, 98)}%`,
                        height: `${Math.max(rowHeight * 0.7, 7)}%`,
                      }}
                    >
                      <span className="block truncate">{bin.name || bin.code || 'Bin'}</span>
                    </button>
                  )
                })}
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

function RackStatisticsTable({
  layout,
  capacityMetrics,
  canEdit = false,
  onUpdateRackCapacity = () => {},
}) {
  const [draftValues, setDraftValues] = useState({})
  const racks = Array.isArray(layout?.racks) ? layout.racks : []
  const totalBins = racks.reduce((total, rack) => total + (rack.bins?.length || 0), 0)
  const capacityByRackId = new Map(
    (Array.isArray(capacityMetrics?.racks) ? capacityMetrics.racks : [])
      .filter((metric) => metric?.rackId)
      .map((metric) => [String(metric.rackId), metric])
  )
  const getRackKey = (rack) => String(rack.clientKey || rack.id || '')
  const getDraftValue = (rack, field) => {
    const rackDraft = draftValues[getRackKey(rack)]
    if (rackDraft && Object.prototype.hasOwnProperty.call(rackDraft, field)) {
      return rackDraft[field]
    }
    return rack[field] ?? ''
  }
  const setDraftValue = (rack, field, value) => {
    const rackKey = getRackKey(rack)
    setDraftValues((current) => ({
      ...current,
      [rackKey]: { ...(current[rackKey] || {}), [field]: value },
    }))
  }
  const commitDraftValue = (rack, field) => {
    const rawValue = getDraftValue(rack, field)
    const nextValue = rawValue === '' ? 0 : Math.max(numberOf(rawValue), 0)
    onUpdateRackCapacity(rack.clientKey || rack.id, field, nextValue)
    const rackKey = getRackKey(rack)
    setDraftValues((current) => {
      const next = { ...current }
      const nextRackDraft = { ...(next[rackKey] || {}) }
      delete nextRackDraft[field]
      if (Object.keys(nextRackDraft).length === 0) delete next[rackKey]
      else next[rackKey] = nextRackDraft
      return next
    })
  }

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
        <div>
          <h2 className="font-bold text-slate-900">Tổng quan Rack / Bin</h2>
          <p className="mt-1 text-xs text-slate-500">
            {racks.length} rack · {totalBins} bin
          </p>
          {canEdit && (
            <p className="mt-1 text-[11px] text-orange-700">
              Có thể bổ sung giới hạn khối lượng/thể tích tại đây, sau đó bấm Save layout.
            </p>
          )}
        </div>
      </div>

      {racks.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">
          Chưa có rack nào trong layout.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
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
                    className="text-slate-700 transition-colors duration-200 odd:bg-white even:bg-slate-50/70 hover:bg-orange-50/70"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {rack.name || rack.code || `Rack ${index + 1}`}
                      </p>
                      {rack.code && <p className="mt-0.5 text-xs text-slate-400">{rack.code}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {preset?.name || 'Rack tùy chỉnh'}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {formatTableNumber(footprint.width)} × {formatTableNumber(footprint.length)} ×{' '}
                      {formatTableNumber(rack.height)} m
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {getRackLevelCount(rack)}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {rack.bins?.length || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {canEdit ? (
                        <div className="min-w-36">
                          <p className="text-xs text-slate-500">
                            Hiện tại:{' '}
                            {currentWeight == null ? '—' : `${formatTableNumber(currentWeight)} kg`}
                          </p>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={getDraftValue(rack, 'maxWeight')}
                            placeholder="0 = không giới hạn"
                            aria-label={`Khối lượng tối đa của ${rack.name || rack.code || 'Rack'}`}
                            onChange={(event) =>
                              setDraftValue(rack, 'maxWeight', event.target.value)
                            }
                            onBlur={() => commitDraftValue(rack, 'maxWeight')}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                          />
                          <span className="text-[10px] text-slate-400">Tối đa (kg)</span>
                        </div>
                      ) : (
                        <>
                          <span className="font-semibold">
                            {currentWeight == null ? '—' : `${formatTableNumber(currentWeight)} kg`}
                          </span>{' '}
                          <span className="text-slate-400">
                            / {formatTableLimit(maxWeight, 'kg')}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {canEdit ? (
                        <div className="min-w-36">
                          <p className="text-xs text-slate-500">
                            Hiện tại:{' '}
                            {currentVolume == null ? '—' : `${formatTableNumber(currentVolume)} m³`}
                          </p>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={getDraftValue(rack, 'maxVolume')}
                            placeholder="0 = không giới hạn"
                            aria-label={`Thể tích tối đa của ${rack.name || rack.code || 'Rack'}`}
                            onChange={(event) =>
                              setDraftValue(rack, 'maxVolume', event.target.value)
                            }
                            onBlur={() => commitDraftValue(rack, 'maxVolume')}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                          />
                          <span className="text-[10px] text-slate-400">Tối đa (m³)</span>
                        </div>
                      ) : (
                        <>
                          <span className="font-semibold">
                            {currentVolume == null ? '—' : `${formatTableNumber(currentVolume)} m³`}
                          </span>{' '}
                          <span className="text-slate-400">
                            / {formatTableLimit(maxVolume, 'm³')}
                          </span>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t border-slate-100 bg-orange-50/60 text-sm font-bold text-slate-800">
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
  const didDragRef = useRef(false)
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
  const [selectedRackPresetId, setSelectedRackPresetId] = useState(
    RACK_PRESETS[1]?.id || 'standard'
  )
  const [newRackShelfCount, setNewRackShelfCount] = useState(DEFAULT_RACK_SHELF_COUNT)
  const [rackPresetCapacities, setRackPresetCapacities] = useState(createEmptyRackPresetCapacities)
  const [isRackConfigOpen, setIsRackConfigOpen] = useState(false)
  const [addMultipleRacks, setAddMultipleRacks] = useState(false)
  const [newRackQuantity, setNewRackQuantity] = useState(1)
  const [newBinShelfLevel, setNewBinShelfLevel] = useState(1)
  const [draftWarehouseId, setDraftWarehouseId] = useState('')
  const draftWarehouseIdRef = useRef('')
  const [selection, setSelection] = useState({ type: 'layout', key: null })
  const [selectedItems, setSelectedItems] = useState([])
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const selectedItemsRef = useRef([])
  const [minimumRackGap] = useState(DEFAULT_RACK_GAP)
  const [view, setView] = useState(
    stockOnly ? 'stock' : initialView === 'rack-section' ? 'rack-section' : '2d'
  )
  const [focusedRackKey, setFocusedRackKey] = useState(null)
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

  const updateSelection = useCallback((nextSelection, additive = false, forceSingle = false) => {
    const normalized = {
      type: nextSelection?.type || 'layout',
      key: nextSelection?.key ?? nextSelection?.clientKey ?? null,
    }
    const currentItems = selectedItemsRef.current
    const shouldSelectMany =
      normalized.type !== 'layout' && normalized.key !== null && !forceSingle && additive

    if (!shouldSelectMany) {
      const nextItems = normalized.type === 'layout' || normalized.key === null ? [] : [normalized]
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
  }, [])

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
  }, [
    draftWarehouseId,
    pendingOwnerDraft,
    pendingOwnerLayout,
    preferredWarehouseId,
    searchParams,
    warehouses,
  ])

  useActiveWarehouseContext(selectedWarehouseId)

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

  const updateRackCapacity = useCallback(
    (rackKey, field, value) => {
      if (!canEditLayout || !['maxWeight', 'maxVolume'].includes(field)) return
      const nextValue = Math.max(numberOf(value), 0)
      setLayout((current) =>
        updateRack(current, rackKey, (rack) =>
          distributeRackCapacities({ ...rack, [field]: nextValue })
        )
      )
      setError('')
    },
    [canEditLayout]
  )

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
          Array.isArray(rack?.bins) && rack.bins.some((bin) => bin?.clientKey === selection.key)
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
              : (contractsPayload?.content ?? [])
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
              : (contractsPayload?.content ?? [])
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
      setTenantDefault(
        !isOwner && !isContractLayout && Boolean(payload.isDefault ?? payload.default)
      )
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
          setError('This rental contract has expired or your access to this warehouse was revoked.')
        } else {
          setError(getEnglishApiMessage(requestError, 'Unable to load warehouse layout.'))
        }
      }
    } finally {
      setLoadingLayout(false)
    }
  }, [
    contractId,
    createdDimensions,
    currentRole,
    draftWarehouseId,
    isContractLayout,
    isMandatorySetup,
    isOwner,
    isUnsavedOwnerDraft,
    pendingOwnerDraft,
    selectedWarehouseId,
    updateSelection,
    warehouses,
  ])

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
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) {
        drag.moved = true
      }

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
      didDragRef.current = Boolean(dragRef.current?.moved)
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
    // 2D interactions must not change the 3D camera focus.
    setFocusedRackKey(null)
    if (type === 'rack' && mode === 'move') didDragRef.current = false
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
    const parentRackDimensions = parentRack ? getRackFootprint(parentRack) : { width: 1, length: 1 }
    const parent =
      type === 'rack' ? { width: layout.width, length: layout.length } : parentRackDimensions
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
      moved: false,
    }
    // eslint-disable-next-line react-hooks/immutability
    document.body.style.userSelect = 'none'
    updateSelection({ type, key: entity.clientKey })
  }

  const addRackFromConfiguration = useCallback(() => {
    if (!canEditLayout) return

    const preset = RACK_PRESETS.find((item) => item.id === selectedRackPresetId)
    if (!preset) return

    if (numberOf(layout.height) < preset.height) {
      setError(`Kho không đủ chiều cao để thêm ${preset.name}.`)
      return
    }

    const presetCapacity = rackPresetCapacities[preset.id] || {}
    const existingPresetRack = layout.racks.find(
      (rack) => (rack.rackPresetId || inferRackPreset(rack)) === preset.id
    )
    const maxWeight =
      presetCapacity.maxWeight === '' || presetCapacity.maxWeight == null
        ? numberOf(existingPresetRack?.maxWeight, 0)
        : Math.max(numberOf(presetCapacity.maxWeight), 0)
    const maxVolume =
      presetCapacity.maxVolume === '' || presetCapacity.maxVolume == null
        ? numberOf(existingPresetRack?.maxVolume, 0)
        : Math.max(numberOf(presetCapacity.maxVolume), 0)
    const requestedCount = addMultipleRacks ? Math.max(integerOf(newRackQuantity, 2), 2) : 1
    const workingLayout = { ...layout, racks: [...layout.racks] }
    const existingCodes = new Set(
      workingLayout.racks.map((rack) => String(rack.code || '').toUpperCase())
    )
    const createdRacks = []

    for (let index = 0; index < requestedCount; index += 1) {
      const position = findAvailableRackPosition(
        workingLayout,
        preset.width,
        preset.length,
        minimumRackGap
      )
      if (!position) {
        setError(
          requestedCount === 1
            ? `Không còn diện tích trống để thêm ${preset.name} vào kho.`
            : `Không đủ diện tích trống để thêm ${requestedCount} ${preset.name}.`
        )
        return
      }

      const samePresetCount = workingLayout.racks.filter(
        (rack) => (rack.rackPresetId || inferRackPreset(rack)) === preset.id
      ).length
      let rackNumber = samePresetCount + 1
      let code = `RACK-${preset.code}-${rackNumber}`
      while (existingCodes.has(code.toUpperCase())) {
        rackNumber += 1
        code = `RACK-${preset.code}-${rackNumber}`
      }

      const rack = fitBinsToRack(
        normalizeRack({
          rackPresetId: preset.id,
          name: `${preset.name} ${rackNumber}`,
          code,
          coordinateX: position.x,
          coordinateY: position.y,
          positionZ: 0,
          rotation: 0,
          width: preset.width,
          length: preset.length,
          height: preset.height,
          shelfCount: Math.max(integerOf(newRackShelfCount, preset.shelfCount), 1),
          maxWeight,
          maxVolume,
          bins: [],
        }),
        { arrange: true }
      )
      workingLayout.racks.push(rack)
      createdRacks.push(rack)
      existingCodes.add(code.toUpperCase())
    }

    const lastRack = createdRacks[createdRacks.length - 1]
    setLayout(workingLayout)
    updateSelection({ type: 'rack', key: lastRack.clientKey }, false, true)
    setIsRackConfigOpen(false)
    setAddMultipleRacks(false)
    setNewRackQuantity(1)
    setBlockedMode(false)
    setError('')
    setMessage(
      requestedCount === 1
        ? `${lastRack.name} đã được thêm vào layout.`
        : `Đã thêm ${requestedCount} ${preset.name} vào layout.`
    )
  }, [
    addMultipleRacks,
    canEditLayout,
    layout,
    minimumRackGap,
    newRackQuantity,
    newRackShelfCount,
    rackPresetCapacities,
    selectedRackPresetId,
    updateSelection,
  ])

  const addBinToSelectedRack = useCallback(() => {
    if (!canEditLayout || !selectedRack) return

    const levels = getRackLevelCount(selectedRack)
    const shelfLevel = clamp(integerOf(newBinShelfLevel, 1), 1, levels)
    const binsOnShelf = (Array.isArray(selectedRack.bins) ? selectedRack.bins : []).filter(
      (bin) => clamp(integerOf(bin.shelfLevel, 1), 1, levels) === shelfLevel
    )
    const binLimit = getRackBinLimit(selectedRack)
    if (binsOnShelf.length >= binLimit) {
      setError(
        `${selectedRack.name || selectedRack.code || 'Rack'} đã đủ ${binLimit} Bin ở tầng ${shelfLevel}.`
      )
      return
    }
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
    setMessage(
      `Đã thêm ${nextBin.name} ở tầng ${shelfLevel}. Có thể kéo Bin theo chiều dọc trong chế độ 3D để đổi tầng.`
    )
  }, [canEditLayout, newBinShelfLevel, selectedRack, updateSelection])

  const rotateSelectedRack = useCallback(
    (rackToRotate = null) => {
      const targetRack =
        rackToRotate || (selection.type === 'rack' && selectedEntity ? selectedEntity : null)
      if (!canEditLayout || !targetRack) return

      const rotations = [0, 90, 180, 270]
      const currentRotation = normalizeRotation(targetRack.rotation)
      const nextRotation = rotations[(rotations.indexOf(currentRotation) + 1) % rotations.length]
      const currentFootprint = getRackFootprint(targetRack)
      const rotatedRack = {
        ...targetRack,
        rotation: nextRotation,
        bins: rotateBinsWithRack(targetRack, nextRotation),
      }
      const footprint = getRackFootprint(rotatedRack)
      const rackCenterX = numberOf(targetRack.coordinateX) + currentFootprint.width / 2
      const rackCenterY = numberOf(targetRack.coordinateY) + currentFootprint.length / 2
      const candidate = {
        ...rotatedRack,
        coordinateX: clamp(
          rackCenterX - footprint.width / 2,
          0,
          Math.max(layout.width - footprint.width, 0)
        ),
        coordinateY: clamp(
          rackCenterY - footprint.length / 2,
          0,
          Math.max(layout.length - footprint.length, 0)
        ),
      }
      const overlapsLockedCell = rectangleOverlapsBlockedCell(candidate, layout)
      const overlapsRack = layout.racks.some(
        (rack) =>
          rack.clientKey !== targetRack.clientKey &&
          rectanglesTooClose(candidate, rack, minimumRackGap)
      )

      if (overlapsLockedCell || overlapsRack) {
        setError(
          'The Rack cannot rotate here because it would overlap a locked area or another Rack.'
        )
        return
      }

      setLayout((current) =>
        updateRack(current, targetRack.clientKey, (rack) =>
          distributeRackCapacities({
            ...rack,
            rotation: nextRotation,
            coordinateX: candidate.coordinateX,
            coordinateY: candidate.coordinateY,
            bins: rotateBinsWithRack(rack, nextRotation),
          })
        )
      )
      updateSelection({ type: 'rack', key: targetRack.clientKey }, false, true)
      setError('')
    },
    [canEditLayout, layout, minimumRackGap, selectedEntity, selection.type, updateSelection]
  )

  const moveEntityFromPreview = useCallback(
    (type, key, coordinateX, coordinateY, nextShelfLevel) => {
      if (!canEditLayout) return

      if (type === 'bin' && nextShelfLevel != null) {
        const sourceRack = layout.racks.find(
          (item) => Array.isArray(item?.bins) && item.bins.some((bin) => bin?.clientKey === key)
        )
        const sourceBin = sourceRack?.bins?.find((bin) => bin?.clientKey === key)
        if (sourceRack && sourceBin) {
          const levels = getRackLevelCount(sourceRack)
          const targetShelfLevel = clamp(integerOf(nextShelfLevel, sourceBin.shelfLevel), 1, levels)
          const binLimit = getRackBinLimit(sourceRack)
          const binsOnTargetShelf = sourceRack.bins.filter(
            (bin) =>
              bin?.clientKey !== key &&
              clamp(integerOf(bin.shelfLevel, 1), 1, levels) === targetShelfLevel
          )
          if (
            targetShelfLevel !== clamp(integerOf(sourceBin.shelfLevel, 1), 1, levels) &&
            binsOnTargetShelf.length >= binLimit
          ) {
            setError(
              `${sourceRack.name || sourceRack.code || 'Rack'} đã đủ ${binLimit} Bin ở tầng ${targetShelfLevel}.`
            )
            return
          }
        }
      }

      setLayout((current) => {
        if (type === 'rack') {
          return updateRack(current, key, (rack) => ({
            ...rack,
            coordinateX,
            coordinateY,
          }))
        }

        const rack = current.racks.find(
          (item) => Array.isArray(item?.bins) && item.bins.some((bin) => bin?.clientKey === key)
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
        const updatedRack = {
          ...rack,
          bins: bins.map((bin) =>
            bin.clientKey === key ? { ...bin, coordinateX, coordinateY, shelfLevel } : bin
          ),
        }

        return updateRack(current, rack.clientKey, () => distributeRackCapacities(updatedRack))
      })
    },
    [canEditLayout, layout]
  )

  const focusRackIn3D = useCallback(
    (nextSelection) => {
      const rackKey = nextSelection?.clientKey ?? nextSelection?.key
      if (!rackKey) return
      updateSelection({ type: 'rack', key: rackKey }, false, true)
      setBlockedMode(false)
      setFocusedRackKey(rackKey)
    },
    [updateSelection]
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
    const rackToKeep = layout.racks.find(
      (rack) =>
        Array.isArray(rack?.bins) && rack.bins.some((bin) => binKeys.has(String(bin?.clientKey)))
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
  }, [
    canEditLayout,
    layout.racks,
    selectedItems,
    selection.key,
    selection.type,
    updateSelection,
    view,
  ])

  useEffect(() => {
    const handleKeyboardShortcut = (event) => {
      if (isReadOnly) return
      const tagName = event.target?.tagName
      if (event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) {
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

    console.log('[StockSpace] create warehouse payload:', warehouseInfo)
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
        selectedWarehouseId || (hasPendingOwnerDraft ? await createWarehouseFromDraft() : '')
      const endpoint = isContractLayout
        ? `/owner/contracts/${contractId}/layout`
        : isOwner
          ? `/owner/warehouses/${targetWarehouseId}/layout`
          : `/tenant/warehouses/${targetWarehouseId}/layout`
      console.groupCollapsed('[StockSpace] layout save payload')
      console.log('API base URL:', import.meta.env.VITE_API_URL)
      console.log('Endpoint:', endpoint)
      console.log('Role:', currentRole)
      console.log('Warehouse ID:', targetWarehouseId)
      console.log('Payload:', payload)
      console.groupEnd()

      const response = isContractLayout
        ? await contractApi.saveOwnerLayout(contractId, payload)
        : isOwner
          ? await warehouseApi.saveOwnerWarehouseLayout(targetWarehouseId, payload)
          : await layoutApi.saveTenantWarehouseLayout(targetWarehouseId, payload)
      const saved = apiData(response)
      if (saved) setLayout(normalizeLayout(saved))
      updateSelection({ type: 'layout', key: null }, false, true)
      setMessage(
        isContractLayout
          ? 'Contract layout saved successfully.'
          : 'Warehouse layout saved successfully.'
      )
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
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
            {isRackConfigOpen && canEditLayout && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <button
                  type="button"
                  aria-label="Đóng cấu hình Rack"
                  className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
                  onClick={() => setIsRackConfigOpen(false)}
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="rack-config-title"
                  className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-orange-50/70 px-5 py-4 sm:px-6">
                    <div>
                      <p className="text-xs font-bold tracking-wider text-orange-600 uppercase">
                        Rack configuration
                      </p>
                      <h2 id="rack-config-title" className="mt-1 text-lg font-bold text-slate-900">
                        Chọn kích thước và sức chứa
                      </h2>
                      <p className="mt-1 text-xs text-slate-600">
                        Mặc định thêm 1 Rack. Bật thêm nhiều nếu muốn tạo nhiều Rack cùng loại.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Đóng"
                      onClick={() => setIsRackConfigOpen(false)}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="overflow-y-auto p-5 sm:p-6">
                    <div className="grid gap-3 md:grid-cols-3">
                      {RACK_PRESETS.map((preset) => {
                        const selected = selectedRackPresetId === preset.id
                        const existingRack = layout.racks.find(
                          (rack) => (rack.rackPresetId || inferRackPreset(rack)) === preset.id
                        )
                        const capacity = rackPresetCapacities[preset.id] || {}
                        const maxWeight =
                          capacity.maxWeight !== '' && capacity.maxWeight != null
                            ? capacity.maxWeight
                            : (existingRack?.maxWeight ?? '')
                        const maxVolume =
                          capacity.maxVolume !== '' && capacity.maxVolume != null
                            ? capacity.maxVolume
                            : (existingRack?.maxVolume ?? '')
                        const geometricVolume = preset.width * preset.length * preset.height

                        return (
                          <div
                            key={preset.id}
                            className={`rounded-2xl border p-3 transition-all duration-200 ${selected ? 'border-orange-400 bg-orange-50/60 shadow-sm ring-2 ring-orange-100' : 'border-slate-200 bg-white hover:border-orange-200'}`}
                          >
                            <button
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setSelectedRackPresetId(preset.id)}
                              className="w-full text-left"
                            >
                              <span className="flex items-start justify-between gap-3">
                                <span>
                                  <span className="block text-sm font-bold text-slate-900">
                                    {preset.name}
                                  </span>
                                  <span className="mt-1 block text-xs text-slate-500">
                                    {preset.width}m × {preset.length}m × {preset.height}m
                                  </span>
                                  <span className="mt-1 block text-xs font-semibold text-orange-700">
                                    Tối đa {preset.binsPerShelf} Bin / tầng
                                  </span>
                                </span>
                                <span
                                  className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${selected ? 'border-orange-500 bg-orange-500 ring-2 ring-orange-100' : 'border-slate-300 bg-white'}`}
                                />
                              </span>
                            </button>

                            <div className="mt-3 space-y-2 border-t border-slate-200/80 pt-3">
                              <label className="block text-[11px] font-semibold text-slate-600">
                                Khối lượng tối đa (kg)
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={maxWeight}
                                  placeholder="0 = không giới hạn"
                                  onChange={(event) =>
                                    setRackPresetCapacities((current) => ({
                                      ...current,
                                      [preset.id]: {
                                        ...(current[preset.id] || {}),
                                        maxWeight: event.target.value,
                                      },
                                    }))
                                  }
                                  className={`${inputClass} mt-1`}
                                />
                              </label>
                              <label className="block text-[11px] font-semibold text-slate-600">
                                Thể tích tối đa (m³)
                                <input
                                  type="number"
                                  min="0"
                                  max={geometricVolume}
                                  step="0.01"
                                  value={maxVolume}
                                  placeholder="0 = không giới hạn"
                                  onChange={(event) =>
                                    setRackPresetCapacities((current) => ({
                                      ...current,
                                      [preset.id]: {
                                        ...(current[preset.id] || {}),
                                        maxVolume: event.target.value,
                                      },
                                    }))
                                  }
                                  className={`${inputClass} mt-1`}
                                />
                              </label>
                              <p className="text-[11px] text-slate-500">
                                Thể tích hình học: {geometricVolume.toLocaleString('vi-VN')} m³
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                          Số tầng Rack
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={newRackShelfCount}
                            onChange={(event) =>
                              setNewRackShelfCount(Math.max(integerOf(event.target.value, 1), 1))
                            }
                            className={`${inputClass} w-24 py-2`}
                          />
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={addMultipleRacks}
                            onChange={(event) => {
                              const checked = event.target.checked
                              setAddMultipleRacks(checked)
                              if (checked) setNewRackQuantity(2)
                              else setNewRackQuantity(1)
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-orange-500 accent-orange-500 focus:ring-orange-200"
                          />
                          Thêm nhiều Rack
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                          Số lượng
                          <input
                            type="number"
                            min="2"
                            step="1"
                            value={newRackQuantity}
                            disabled={!addMultipleRacks}
                            onChange={(event) =>
                              setNewRackQuantity(Math.max(integerOf(event.target.value, 2), 2))
                            }
                            className={`${inputClass} w-24 py-2`}
                          />
                        </label>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                        <span>
                          Đang chọn:{' '}
                          <strong className="text-orange-700">
                            {
                              RACK_PRESETS.find((preset) => preset.id === selectedRackPresetId)
                                ?.name
                            }
                          </strong>
                        </span>
                        <span>
                          Số tầng: <strong>{newRackShelfCount}</strong>
                        </span>
                        <span>
                          Sẽ thêm: <strong>{addMultipleRacks ? newRackQuantity : 1} Rack</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:px-6">
                    <button
                      type="button"
                      onClick={() => setIsRackConfigOpen(false)}
                      className={secondaryButtonClass}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={addRackFromConfiguration}
                      className={`${primaryButtonClass} inline-flex items-center justify-center`}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      OK - Thêm Rack
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  {stockOnly ? (
                    <Package2 className="h-7 w-7 text-orange-500" />
                  ) : (
                    <Warehouse className="h-7 w-7 text-orange-500" />
                  )}
                  {stockOnly
                    ? isContractLayout
                      ? 'Contract Layout'
                      : 'Goods in Bin'
                    : isContractLayout
                      ? 'Contract Layout'
                      : 'Warehouse Layout'}
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
                    className={secondaryButtonClass}
                  >
                    Back to contracts
                  </button>
                )}
                <button
                  type="button"
                  onClick={loadLayout}
                  disabled={!hasLayoutTarget || loadingLayout}
                  className={secondaryButtonClass}
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
                    className={`${primaryButtonClass} inline-flex items-center px-4 py-2.5`}
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

            {!isContractLayout &&
              (isUnsavedOwnerDraft ? (
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
                <section className={`${softCardClass} w-full p-3 sm:w-fit`}>
                  <label className="mb-1.5 block text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Select warehouse
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(event) => {
                      const nextWarehouseId = event.target.value
                      setPreferredWarehouseId(nextWarehouseId)

                      const nextParams = new URLSearchParams(searchParams)
                      nextParams.set('warehouseId', nextWarehouseId)
                      navigate(
                        { pathname: location.pathname, search: `?${nextParams.toString()}` },
                        { replace: true }
                      )
                    }}
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
              ))}

            {isContractLayout && (
              <section className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-wider text-orange-600 uppercase">
                      Contract layout snapshot
                    </p>
                    <p className="mt-1 text-sm text-orange-950">
                      The overall dimensions below are read-only and must match the rental contract.
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-orange-700 shadow-sm">
                    {formatMeters(layout.width)} × {formatMeters(layout.length)} ×{' '}
                    {formatMeters(layout.height)}
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
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 text-sm text-orange-800">
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
                This is the Owner's default layout. Layout Tenant has not been cloned yet so it can
                be viewed only. An active WMS subscription is required to customize it.
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
              <RackStatisticsTable
                layout={layout}
                capacityMetrics={capacityMetrics}
                canEdit={canEditLayout}
                onUpdateRackCapacity={updateRackCapacity}
              />
            )}

            <div className="grid min-w-0 gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
              <aside
                className={`${softCardClass} min-w-0 p-3 transition-shadow duration-200 hover:shadow-md`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-bold">Structure</h2>
                  <span className="text-xs text-slate-500">
                    {layout.racks.length} Rack · {binCount} Bin
                  </span>
                </div>
                {canEditLayout && (
                  <div className="mb-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => setIsRackConfigOpen(true)}
                      className={`${primaryButtonClass} inline-flex w-full items-center justify-center`}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Cấu hình / Thêm Rack
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsMultiSelectMode((current) => !current)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-200 ${isMultiSelectMode ? 'border-orange-500 bg-orange-500 text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700'}`}
                      >
                        {isMultiSelectMode ? 'Multi-select: On' : 'Multi-select'}
                      </button>
                      <button
                        type="button"
                        onClick={removeSelected}
                        disabled={!selectedItems.length}
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-all duration-200 enabled:hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                            setFocusedRackKey(null)
                            updateSelection(
                              { type: 'rack', key: rack.clientKey },
                              isMultiSelectMode || event.ctrlKey || event.metaKey
                            )
                            setBlockedMode(false)
                            if (!isMultiSelectMode && !event.ctrlKey && !event.metaKey) {
                              setView('rack-section')
                            }
                          }}
                          className={`w-full rounded-xl px-2 py-2 text-left text-sm font-semibold transition-colors duration-200 ${selectedItemSet.has(`rack:${rack.clientKey}`) ? 'bg-orange-50 text-orange-700' : 'hover:bg-slate-50'}`}
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
                                setFocusedRackKey(null)
                                updateSelection(
                                  { type: 'bin', key: bin.clientKey },
                                  isMultiSelectMode || event.ctrlKey || event.metaKey
                                )
                                setBlockedMode(false)
                              }}
                              className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors duration-200 ${selectedItemSet.has(`bin:${bin.clientKey}`) ? 'bg-[#f7ead7] font-semibold text-[#8a5a2b]' : 'text-slate-600 hover:bg-slate-50'}`}
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

              <section className={`${softCardClass} min-w-0 p-3 sm:p-4`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex rounded-full bg-slate-100 p-1">
                    {stockOnly ? (
                      <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm">
                        <Package2 className="mr-1.5 h-4 w-4 text-orange-500" />
                        Inventory in Bin
                      </span>
                    ) : view === 'rack-section' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFocusedRackKey(null)
                          setView('2d')
                        }}
                        className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-orange-700 shadow-sm"
                      >
                        ← Sơ đồ 2D
                      </button>
                    ) : (
                      <>
                        <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-orange-700 shadow-sm">
                          2D + 3D
                        </span>
                        {currentRole === 'STAFF' && (
                          <button
                            type="button"
                            onClick={() => setView('stock')}
                            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${view === 'stock' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${!blockedMode ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-700'}`}
                      >
                        Adjust Rack / Bin
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlockedMode(true)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${blockedMode ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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
                            className={`rounded-full px-2.5 py-1.5 text-xs transition-all duration-200 ${blockedTool === 'lock' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            Lock cells
                          </button>
                          <button
                            type="button"
                            onClick={() => setBlockedTool('unlock')}
                            className={`rounded-full px-2.5 py-1.5 text-xs transition-all duration-200 ${blockedTool === 'unlock' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-700'}`}
                          >
                            Unlock cells
                          </button>
                        </>
                      )}
                      {selection.type === 'rack' && selectedEntity && (
                        <button
                          type="button"
                          onClick={rotateSelectedRack}
                          className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 transition-all duration-200 hover:bg-orange-50 active:scale-[0.98]"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                          Xoay Rack 90°
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {canEditLayout && view === '2d' && blockedMode && (
                  <div className="mb-3 flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 shadow-sm">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-sm bg-slate-900" />
                    Click or drag across cells to paint locked areas. Racks and bins cannot be
                    placed, moved or resized onto black cells.
                  </div>
                )}

                {loadingLayout ? (
                  <div className="flex h-140 flex-col items-center justify-center gap-4 rounded-2xl bg-slate-50">
                    <div className="h-10 w-10 animate-pulse rounded-2xl bg-orange-100" />
                    <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200" />
                  </div>
                ) : view === 'stock' ? (
                  <div className="min-h-140 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 shadow-inner sm:p-6">
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
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
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
                      <div className="flex min-h-72 flex-col items-center justify-center gap-3">
                        <div className="h-9 w-9 animate-pulse rounded-xl bg-orange-100" />
                        <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
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
                          className={primaryButtonClass}
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
                            <div className="rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-800">
                              Total: {binStockState.totalQuantity.toLocaleString()}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setBinStockState((current) => ({ ...current, status: 'loading' }))
                                setStockRefreshKey((current) => current + 1)
                              }}
                              className={secondaryButtonClass}
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
                              <thead className="bg-slate-50 text-xs tracking-wider text-slate-500 uppercase">
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
                                    <td className="px-4 py-3 font-mono text-xs font-semibold text-orange-700">
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
                  <div className="grid gap-4 xl:grid-cols-2">
                    <RackElevationView
                      rack={selectedRack}
                      canEdit={canEditLayout}
                      selectedBinKey={selection.type === 'bin' ? selection.key : null}
                      newBinShelfLevel={newBinShelfLevel}
                      onShelfLevelChange={setNewBinShelfLevel}
                      onAddBin={() => {
                        setFocusedRackKey(null)
                        addBinToSelectedRack()
                      }}
                      onSelectBin={(binKey) => {
                        setFocusedRackKey(null)
                        updateSelection({ type: 'bin', key: binKey }, false, true)
                        setBlockedMode(false)
                      }}
                      onMoveBin={(...args) => {
                        setFocusedRackKey(null)
                        moveEntityFromPreview(...args)
                      }}
                    />
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 shadow-inner sm:p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-bold tracking-wider text-orange-600 uppercase">
                            3D Preview
                          </p>
                          <h3 className="mt-1 text-sm font-bold text-slate-900">
                            Không gian Rack / Bin
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {focusedRackKey && (
                            <button
                              type="button"
                              onClick={() => setFocusedRackKey(null)}
                              className="rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-orange-700 transition hover:bg-orange-50"
                            >
                              Toàn cảnh 3D
                            </button>
                          )}
                          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                            Double-click Rack để zoom
                          </span>
                        </div>
                      </div>
                      <div className="h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <WarehouseLayoutPreview3D
                          layout={layout}
                          capacityByBinId={capacityByBinId}
                          selection={{ ...selection, clientKey: selection.key }}
                          selectedItems={selectedItems}
                          editable={!isReadOnly && !isMultiSelectMode && selectedItems.length <= 1}
                          focusedRackKey={focusedRackKey}
                          onDoubleClick={focusRackIn3D}
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
                    </div>
                  </div>
                ) : view === '3d' ? (
                  <>
                    <div className="h-140 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 shadow-inner">
                      <WarehouseLayoutPreview3D
                        layout={layout}
                        capacityByBinId={capacityByBinId}
                        selection={{ ...selection, clientKey: selection.key }}
                        selectedItems={selectedItems}
                        editable={!isReadOnly && !isMultiSelectMode && selectedItems.length <= 1}
                        focusedRackKey={focusedRackKey}
                        onDoubleClick={focusRackIn3D}
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
                      <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                              Inventory in selected Bin
                            </p>
                            <h3 className="mt-1 font-bold text-slate-900">
                              {selectedEntity?.name || selectedEntity?.code || 'Bin'}
                            </h3>
                          </div>
                          <span className="rounded-full bg-orange-100 px-3 py-1.5 text-sm font-bold text-orange-800">
                            Total: {binStockState.totalQuantity.toLocaleString()}
                          </span>
                        </div>
                        {binStockState.binId !== selectedBinId ||
                        binStockState.status === 'loading' ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
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
                                  <strong className="text-orange-700">
                                    {batch.skuCode || '—'}
                                  </strong>
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
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="overflow-auto rounded-2xl bg-slate-50 p-3 sm:p-5">
                      <div
                        className="relative mx-auto w-full max-w-205 min-w-130 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner"
                        style={{
                          aspectRatio: `${Math.max(numberOf(layout.width, 1), 1)} / ${Math.max(numberOf(layout.length, 1), 1)}`,
                          backgroundImage:
                            'radial-gradient(circle, rgba(148, 163, 184, 0.3) 1px, transparent 1px)',
                          backgroundSize: '16px 16px',
                        }}
                        onPointerDown={() => {
                          setFocusedRackKey(null)
                          updateSelection({ type: 'layout', key: null }, false, true)
                        }}
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
                                  setFocusedRackKey(null)
                                  blockedPaintRef.current = true
                                  toggleBlockedCell(row, column)
                                }}
                                onPointerEnter={() => {
                                  if (blockedPaintRef.current) toggleBlockedCell(row, column)
                                }}
                                className={`border border-transparent ${blocked ? 'bg-slate-900 hover:bg-slate-800' : active ? 'bg-orange-50/50' : 'bg-transparent'} ${blockedMode ? 'cursor-crosshair' : 'pointer-events-none'}`}
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
                                onDoubleClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  setFocusedRackKey(null)
                                  if (
                                    !blockedMode &&
                                    !isMultiSelectMode &&
                                    !event.ctrlKey &&
                                    !event.metaKey
                                  ) {
                                    updateSelection(
                                      { type: 'rack', key: rack.clientKey },
                                      false,
                                      true
                                    )
                                    setView('rack-section')
                                  }
                                }}
                                className={`group absolute touch-none overflow-hidden rounded-lg border-2 text-white shadow-md transition-all duration-200 ${selectedItemSet.has(`rack:${rack.clientKey}`) ? 'z-20 border-orange-500 bg-orange-500/90 ring-4 ring-orange-100' : 'z-10 border-slate-500 bg-slate-500/85 hover:border-orange-300'}`}
                                style={{
                                  left: `${(rack.coordinateX / layout.width) * 100}%`,
                                  top: `${(rack.coordinateY / layout.length) * 100}%`,
                                  width: `${(getRackFootprint(rack).width / layout.width) * 100}%`,
                                  height: `${(getRackFootprint(rack).length / layout.length) * 100}%`,
                                }}
                              >
                                <div className="pointer-events-none truncate bg-slate-700/90 px-1.5 py-1 text-[10px] font-bold sm:text-xs">
                                  {rack.name || rack.code}
                                </div>
                                {canEditLayout && (
                                  <button
                                    type="button"
                                    title="Xoay Rack 90°"
                                    aria-label={`Xoay ${rack.name || rack.code || 'Rack'} 90°`}
                                    onPointerDown={(event) => {
                                      event.preventDefault()
                                      event.stopPropagation()
                                    }}
                                    onClick={(event) => {
                                      event.preventDefault()
                                      event.stopPropagation()
                                      rotateSelectedRack(rack)
                                    }}
                                    className={`absolute top-1 right-1 z-30 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/80 bg-white/95 text-orange-700 shadow-sm transition hover:bg-orange-50 active:scale-95 ${selectedItemSet.has(`rack:${rack.clientKey}`) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                  >
                                    <RotateCw className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {rackBins.map((bin) => (
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
                                    onClick={(event) => event.stopPropagation()}
                                    className={`absolute touch-none overflow-hidden rounded-md border text-slate-800 shadow-sm transition-all duration-200 ${selectedItemSet.has(`bin:${bin.clientKey}`) ? 'z-20 border-orange-500 bg-orange-400 text-white ring-4 ring-orange-100' : 'z-10 border-[#b8874d] bg-[#d8b17a] hover:bg-[#e5c894]'}`}
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
                                      <span className="pointer-events-none absolute right-1 bottom-0.5 text-[9px] font-bold text-[#6e461f]/70">
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
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 shadow-inner sm:p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-bold tracking-wider text-orange-600 uppercase">
                            3D Preview
                          </p>
                          <h3 className="mt-1 text-sm font-bold text-slate-900">
                            Không gian Rack / Bin
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {focusedRackKey && (
                            <button
                              type="button"
                              onClick={() => setFocusedRackKey(null)}
                              className="rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-orange-700 transition hover:bg-orange-50"
                            >
                              Toàn cảnh 3D
                            </button>
                          )}
                          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                            Double-click Rack để zoom
                          </span>
                        </div>
                      </div>
                      <div className="h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <WarehouseLayoutPreview3D
                          layout={layout}
                          capacityByBinId={capacityByBinId}
                          selection={{ ...selection, clientKey: selection.key }}
                          selectedItems={selectedItems}
                          editable={!isReadOnly && !isMultiSelectMode && selectedItems.length <= 1}
                          focusedRackKey={focusedRackKey}
                          onDoubleClick={focusRackIn3D}
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
