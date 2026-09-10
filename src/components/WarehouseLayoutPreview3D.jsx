import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Billboard,
  ContactShadows,
  Line,
  OrbitControls,
  Outlines,
  PivotControls,
  Text,
} from '@react-three/drei'
import { ACESFilmicToneMapping, DoubleSide } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { createCardboardTexture, createWarehouseFloorTexture } from './warehouse3dTextures'

const WORLD_SIZE = 22
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const numberOf = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeRotation = (value) => {
  const normalized = ((Math.round(numberOf(value)) % 360) + 360) % 360
  return [0, 90, 180, 270].includes(normalized)
    ? normalized
    : (Math.round(normalized / 90) * 90) % 360
}

const isQuarterTurn = (rotation) => {
  const normalized = normalizeRotation(rotation)
  return normalized === 90 || normalized === 270
}
const getWorldDimensions = (layout) => {
  const layoutWidth = Math.max(numberOf(layout?.width, 1), 1)
  const layoutLength = Math.max(numberOf(layout?.length, 1), 1)
  const scale = WORLD_SIZE / Math.max(layoutWidth, layoutLength)

  return {
    width: layoutWidth * scale,
    depth: layoutLength * scale,
  }
}

const isItemSelected = (selectedItems, type, key) =>
  selectedItems.some(
    (item) => item.type === type && String(item.key ?? item.clientKey) === String(key)
  )

const getWorldSize = (value, total, parentWorldSize) =>
  Math.max((numberOf(value) / Math.max(numberOf(total), 1)) * parentWorldSize, 0.2)

const getWorldCenter = (coordinate, size, total, parentWorldSize) =>
  -parentWorldSize / 2 +
  (numberOf(coordinate) / Math.max(numberOf(total), 1)) * parentWorldSize +
  size / 2

const toCoordinateFromCenter = (center, size, total, parentWorldSize) => {
  const raw =
    ((center + parentWorldSize / 2 - size / 2) / Math.max(parentWorldSize, 1)) * numberOf(total, 1)
  const max = Math.max(
    numberOf(total, 1) - (size / Math.max(parentWorldSize, 1)) * numberOf(total, 1),
    0
  )
  return clamp(raw, 0, max)
}

const getRackLevels = (rack) => {
  return Math.max(Math.round(numberOf(rack?.shelfCount, 0)), 0)
}

const getLevelFromCoordinate = (rack, bin) => {
  const levels = getRackLevels(rack)
  if (levels <= 0) return 0
  return clamp(Math.round(numberOf(bin?.shelfLevel, 0)), 1, levels)
}

const getRackUsableHeight = (rackHeight) => Math.max(rackHeight - 1.2, 0.8)

const getShelfGap = (levels, rackHeight) => {
  if (levels <= 0) return 0
  const usableHeight = getRackUsableHeight(rackHeight)
  return levels > 1 ? usableHeight / (levels - 1) : usableHeight
}

const getShelfY = (levelIndex, levels, rackHeight) => {
  if (levels <= 0) return 0
  const usableHeight = getRackUsableHeight(rackHeight)
  if (levels <= 1) return 0.65 + usableHeight / 2
  return 0.65 + (levelIndex / (levels - 1)) * usableHeight
}

const getWorldHeight = (height, layoutWidth, layoutLength) => {
  const horizontalReference = Math.max(numberOf(layoutWidth), numberOf(layoutLength), 1)
  return Math.max((numberOf(height) / horizontalReference) * WORLD_SIZE, 0.2)
}

const getDisplayCode = (entity, fallback) => entity?.code || entity?.name || fallback

const getBinQuantity = (bin) => {
  const quantity =
    bin?.quantity ?? bin?.currentQuantity ?? bin?.stockQuantity ?? bin?.totalQuantity ?? null
  return quantity === null || quantity === undefined ? null : numberOf(quantity)
}

const getBinWeightCapacity = (bin, capacityMetric) => {
  const source = capacityMetric || bin
  const currentWeightValue = source?.currentWeightKg ?? source?.currentWeight
  const maxWeightValue = source?.maxWeightKg ?? source?.maxWeight
  const maxWeight = numberOf(maxWeightValue)

  if (currentWeightValue === null || currentWeightValue === undefined || maxWeight <= 0) {
    return null
  }

  const reportedPercent = numberOf(source?.weightUtilizationPercent, NaN)
  const ratio = Number.isFinite(reportedPercent)
    ? reportedPercent / 100
    : numberOf(currentWeightValue) / maxWeight

  return {
    ratio: clamp(ratio, 0, 1),
    isOverCapacity: ratio > 1 || source?.capacityStatus === 'OVER_CAPACITY',
  }
}

const getBinVolumeCapacity = (bin, capacityMetric) => {
  const source = capacityMetric || bin
  const currentVolumeValue = source?.currentVolumeM3 ?? source?.currentVolume
  const maxVolumeValue = source?.maxVolumeM3 ?? source?.maxVolume
  const maxVolume = numberOf(maxVolumeValue)

  if (currentVolumeValue === null || currentVolumeValue === undefined || maxVolume <= 0) {
    return null
  }

  const reportedPercent = numberOf(source?.volumeUtilizationPercent, NaN)
  const ratio = Number.isFinite(reportedPercent)
    ? reportedPercent / 100
    : numberOf(currentVolumeValue) / maxVolume

  return {
    ratio: clamp(ratio, 0, 1),
    isOverCapacity: ratio > 1 || source?.capacityStatus === 'OVER_CAPACITY',
  }
}

const getStoredSkuQuantity = (capacityMetric) =>
  Array.isArray(capacityMetric?.storedSkus)
    ? capacityMetric.storedSkus.reduce((total, sku) => total + numberOf(sku?.quantity), 0)
    : 0

const getMetricRatio = (current, maximum) => {
  const currentValue = numberOf(current)
  const maximumValue = numberOf(maximum)
  return maximumValue > 0 ? clamp(currentValue / maximumValue, 0, 1) : null
}

const formatMetric = (value, maximumFractionDigits = 2) =>
  numberOf(value).toLocaleString('vi-VN', { maximumFractionDigits })

/**
 * Tính toán Bounding Box của tất cả các Kệ trong kho để tự động Zoom To vừa vặn màn hình
 */
function getRacksBounds(racks, layoutWidth, layoutLength, worldWidth, worldDepth) {
  if (!racks || racks.length === 0) {
    return {
      centerX: 0,
      centerY: 1.5,
      centerZ: 0,
      sizeX: 4,
      sizeZ: 4,
      maxH: 3.5,
      span: 5,
    }
  }

  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let maxH = 2.5

  racks.forEach((rack) => {
    const rotation = normalizeRotation(rack.rotation)
    const quarterTurn = isQuarterTurn(rotation)
    const localWidth = getWorldSize(rack.width, layoutWidth, worldWidth)
    const localDepth = getWorldSize(rack.length, layoutLength, worldDepth)
    const w = quarterTurn ? localDepth : localWidth
    const d = quarterTurn ? localWidth : localDepth
    const x = getWorldCenter(rack.coordinateX, w, layoutWidth, worldWidth)
    const z = getWorldCenter(rack.coordinateY, d, layoutLength, worldDepth)
    const h = getWorldHeight(rack.height, layoutWidth, layoutLength)

    minX = Math.min(minX, x - w / 2)
    maxX = Math.max(maxX, x + w / 2)
    minZ = Math.min(minZ, z - d / 2)
    maxZ = Math.max(maxZ, z + d / 2)
    maxH = Math.max(maxH, h)
  })

  const centerX = (minX + maxX) / 2
  const centerZ = (minZ + maxZ) / 2
  const sizeX = Math.max(maxX - minX, 2)
  const sizeZ = Math.max(maxZ - minZ, 2)
  const span = Math.max(sizeX, sizeZ, 3)

  return { centerX, centerY: maxH * 0.45, centerZ, sizeX, sizeZ, maxH, span }
}

function WarehousePostProcessing() {
  const { camera, gl, scene, size } = useThree()
  const composer = useMemo(() => {
    const instance = new EffectComposer(gl)
    instance.addPass(new RenderPass(scene, camera))
    return instance
  }, [camera, gl, scene])

  useEffect(() => {
    composer.setSize(size.width, size.height)
    composer.setPixelRatio(Math.min(gl.getPixelRatio(), 1.75))
  }, [composer, gl, size.height, size.width])

  useEffect(() => {
    const previousToneMapping = gl.toneMapping
    const previousExposure = gl.toneMappingExposure
    // eslint-disable-next-line react-hooks/immutability
    gl.toneMapping = ACESFilmicToneMapping
    gl.toneMappingExposure = 1.15

    return () => {
      gl.toneMapping = previousToneMapping
      gl.toneMappingExposure = previousExposure
      composer.dispose()
    }
  }, [composer, gl])

  useFrame(() => composer.render(), 1)
  return null
}

// --- SÀN KHO BÊ TÔNG ---
function WarehouseFloor({ width, depth, floorTexture }) {
  // The 3D floor must represent exactly the same footprint as the 2D layout.
  const floorW = Math.max(width, 0.1)
  const floorD = Math.max(depth, 0.1)
  const aisleCount = 5
  const aislePositions = Array.from(
    { length: aisleCount },
    (_, index) => -floorW / 2 + ((index + 1) / (aisleCount + 1)) * floorW
  )

  return (
    <group position={[0, -0.01, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorW, floorD]} />
        <meshStandardMaterial map={floorTexture} roughness={0.45} metalness={0.15} />
      </mesh>

      {/* Các đường thẳng song song làm mốc nhận biết lối đi giữa các Rack. */}
      <group position={[0, 0.018, 0]} raycast={() => null}>
        {aislePositions.map((x, index) => (
          <Line
            key={`aisle-line-${index}`}
            points={[
              [x, 0, -floorD / 2],
              [x, 0, floorD / 2],
            ]}
            color={index === Math.floor(aisleCount / 2) ? '#6fa9c4' : '#31556b'}
            transparent
            opacity={index === Math.floor(aisleCount / 2) ? 0.82 : 0.58}
            lineWidth={index === Math.floor(aisleCount / 2) ? 1.3 : 0.9}
            raycast={() => null}
          />
        ))}
      </group>
    </group>
  )
}

function WarehouseWalls({ width, depth, height }) {
  const wallWidth = Math.max(width, 0.1)
  const wallDepth = Math.max(depth, 0.1)
  const wallHeight = Math.max(height, 0.8)
  const wallThickness = clamp(Math.min(wallWidth, wallDepth) * 0.012, 0.12, 0.28)

  return (
    <group position={[0, wallHeight / 2 - 0.01, 0]}>
      <mesh position={[-wallWidth / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, wallDepth + wallThickness * 2]} />
        <WarehouseWallMaterial />
      </mesh>
      <mesh position={[wallWidth / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, wallDepth + wallThickness * 2]} />
        <WarehouseWallMaterial />
      </mesh>
      <mesh position={[0, 0, -wallDepth / 2]} castShadow receiveShadow>
        <boxGeometry args={[wallWidth, wallHeight, wallThickness]} />
        <WarehouseWallMaterial />
      </mesh>
      <mesh position={[0, 0, wallDepth / 2]} castShadow receiveShadow>
        <boxGeometry args={[wallWidth, wallHeight, wallThickness]} />
        <WarehouseWallMaterial />
      </mesh>
    </group>
  )
}

function WarehouseWallMaterial() {
  return (
    <meshStandardMaterial
      color="#71808a"
      transparent
      opacity={0.42}
      depthWrite={false}
      roughness={0.82}
      metalness={0.05}
      side={DoubleSide}
    />
  )
}

/**
 * Điều khiển Camera thông minh: Tự động Zoom To bao quát toàn bộ cụm Kệ thực tế
 */
function WarehouseCameraController({
  focusedRack,
  cameraPreset,
  racksBounds,
  layoutWidth,
  layoutLength,
  worldWidth,
  worldDepth,
}) {
  const { camera } = useThree()
  const controlsRef = useRef(null)

  useEffect(() => {
    let targetX
    let targetY
    let targetZ
    let cameraX
    let cameraY
    let cameraZ

    if (cameraPreset === 'TOP_DOWN') {
      targetX = racksBounds.centerX
      targetY = 0
      targetZ = racksBounds.centerZ
      cameraX = racksBounds.centerX + 0.001
      cameraY = Math.max(racksBounds.span * 1.6, 22)
      cameraZ = racksBounds.centerZ
    } else if (cameraPreset === 'FRONT') {
      targetX = racksBounds.centerX
      targetY = racksBounds.centerY
      targetZ = racksBounds.centerZ
      cameraX = racksBounds.centerX
      cameraY = Math.max(racksBounds.maxH * 0.55, 2.2)
      cameraZ = racksBounds.centerZ + Math.max(racksBounds.span * 1.3, 16)
    } else if (cameraPreset === 'CLOSE_UP') {
      const dist = Math.max(racksBounds.span * 0.55, 3.2)
      targetX = racksBounds.centerX
      targetY = racksBounds.centerY
      targetZ = racksBounds.centerZ
      cameraX = racksBounds.centerX + 8 * (dist / 6)
      cameraY = Math.max(racksBounds.maxH * 0.65, 2.2) + 1.2
      cameraZ = racksBounds.centerZ + 9 * (dist / 6)
    } else if (focusedRack) {
      const rotation = normalizeRotation(focusedRack.rotation)
      const quarterTurn = isQuarterTurn(rotation)
      const localWidth = getWorldSize(focusedRack.width, layoutWidth, worldWidth)
      const localDepth = getWorldSize(focusedRack.length, layoutLength, worldDepth)
      const rackWidth = quarterTurn ? localDepth : localWidth
      const rackDepth = quarterTurn ? localWidth : localDepth
      const rackHeight = getWorldHeight(focusedRack.height, layoutWidth, layoutLength)
      const rackCenterX = getWorldCenter(
        focusedRack.coordinateX,
        rackWidth,
        layoutWidth,
        worldWidth
      )
      const rackCenterZ = getWorldCenter(
        focusedRack.coordinateY,
        rackDepth,
        layoutLength,
        worldDepth
      )
      const frontDirectionX = Math.sin((rotation * Math.PI) / 180)
      const frontDirectionZ = Math.cos((rotation * Math.PI) / 180)
      const distance = Math.max(rackWidth * 1.35, rackHeight * 0.9, 4.2)

      targetX = rackCenterX
      targetY = rackHeight * 0.52
      targetZ = rackCenterZ
      cameraX = rackCenterX + frontDirectionX * distance
      cameraY = Math.max(rackHeight * 0.65, 2.6) + distance * 0.15
      cameraZ = rackCenterZ + frontDirectionZ * distance
    } else {
      // Isometric overview: frame the complete warehouse footprint, including
      // the complete warehouse footprint, not only the rack cluster.
      const span = Math.max(racksBounds.span, 6)
      const distance = Math.max(span * 0.95, 14)
      targetX = racksBounds.centerX
      targetY = Math.max(racksBounds.centerY, 1.8)
      targetZ = racksBounds.centerZ
      cameraX = racksBounds.centerX + distance
      cameraY = targetY + distance * 1.35
      cameraZ = racksBounds.centerZ + distance
    }

    camera.position.set(cameraX, cameraY, cameraZ)
    camera.lookAt(targetX, targetY, targetZ)
    if (controlsRef.current) {
      controlsRef.current.target.set(targetX, targetY, targetZ)
      controlsRef.current.update()
    }
  }, [
    camera,
    focusedRack,
    cameraPreset,
    racksBounds,
    layoutLength,
    layoutWidth,
    worldDepth,
    worldWidth,
  ])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      target={[racksBounds.centerX, 2.5, racksBounds.centerZ]}
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={2}
      maxDistance={75}
    />
  )
}

function CardboardBin({
  width,
  depth,
  height,
  cardboardTexture,
  isHighlighted,
  isOver,
  isEmpty,
  statusColor,
}) {
  const tapeWidth = clamp(width * 0.16, 0.06, 0.2)
  const tapeColor = isOver ? '#ef4444' : isHighlighted ? '#67e8f9' : isEmpty ? '#d7c6a3' : '#e7d4ad'

  return (
    <group>
      {/* Thùng carton kín, mô phỏng kiện hàng trong ảnh tham chiếu. */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          map={cardboardTexture}
          color="#ffffff"
          roughness={0.82}
          metalness={0.02}
          emissive={isHighlighted ? '#06b6d4' : '#000000'}
          emissiveIntensity={isHighlighted ? 0.35 : 0}
        />
      </mesh>

      {/* Lớp màu mờ thể hiện nhanh tình trạng tồn kho của Bin. */}
      <mesh scale={[1.006, 1.006, 1.006]} renderOrder={2}>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={isHighlighted ? 0.3 : isEmpty ? 0.14 : 0.22}
          depthWrite={false}
        />
      </mesh>

      {/* Viền màu nổi bật để nhận biết trạng thái Bin từ xa. */}
      <mesh scale={[1.012, 1.012, 1.012]} renderOrder={3}>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Outlines
          color={statusColor}
          thickness={isHighlighted ? 0.11 : 0.075}
          screenspace
        />
      </mesh>

      {/* Dải băng keo chạy dọc trên nắp thùng. */}
      <mesh position={[0, height / 2 + 0.008, 0]} castShadow>
        <boxGeometry args={[tapeWidth, 0.014, depth * 0.94]} />
        <meshStandardMaterial
          color={tapeColor}
          roughness={0.72}
          metalness={0.02}
          transparent
          opacity={0.9}
          emissive={isHighlighted ? '#06b6d4' : '#000000'}
          emissiveIntensity={isHighlighted ? 0.4 : 0}
        />
      </mesh>
      <mesh position={[0, height / 2 + 0.016, 0]}>
        <boxGeometry args={[0.018, 0.006, depth * 0.9]} />
        <meshStandardMaterial color={isHighlighted ? '#cffafe' : '#fff1cf'} roughness={0.65} />
      </mesh>
    </group>
  )
}

function BinMesh({
  bin,
  rack,
  rackEffectiveWorldWidth,
  rackEffectiveWorldDepth,
  rackHeight,
  capacityMetric,
  isSelected,
  editable,
  onSelect,
  onDoubleClick,
  onMoveEntity,
  showDemoCargo,
  showBinLabels,
  cardboardTexture,
}) {
  const [isHovered, setIsHovered] = useState(false)
  const rotation = normalizeRotation(rack.rotation)
  const quarterTurn = isQuarterTurn(rotation)
  const rackStorageWidth = quarterTurn ? rack.length : rack.width
  const rackStorageLength = quarterTurn ? rack.width : rack.length
  const binStorageWidth = getWorldSize(bin.width, rackStorageWidth, rackEffectiveWorldWidth)
  const binStorageDepth = getWorldSize(bin.length, rackStorageLength, rackEffectiveWorldDepth)
  const storageCenterX = getWorldCenter(
    bin.coordinateX,
    binStorageWidth,
    rackStorageWidth,
    rackEffectiveWorldWidth
  )
  const storageCenterZ = getWorldCenter(
    bin.coordinateY,
    binStorageDepth,
    rackStorageLength,
    rackEffectiveWorldDepth
  )
  const [x, z] =
    rotation === 90
      ? [-storageCenterZ, storageCenterX]
      : rotation === 180
        ? [-storageCenterX, -storageCenterZ]
        : rotation === 270
          ? [storageCenterZ, -storageCenterX]
          : [storageCenterX, storageCenterZ]
  const width = quarterTurn ? binStorageDepth : binStorageWidth
  const depth = quarterTurn ? binStorageWidth : binStorageDepth
  const levels = getRackLevels(rack)
  const level =
    levels > 0 ? clamp(numberOf(bin.shelfLevel, getLevelFromCoordinate(rack, bin)), 1, levels) : 0
  const shelfGap = getShelfGap(levels, rackHeight)
  // Khoảng đệm co giãn theo khoảng cách tầng, tránh Bin vượt qua tầng kế tiếp
  // khi Rack có nhiều tầng hoặc tầng có chiều cao nhỏ.
  const shelfInset = shelfGap > 0 ? clamp(shelfGap * 0.2, 0.02, 0.06) : 0.06
  const binMaxHeight = Math.max(shelfGap - shelfInset * 2, 0.04)
  const binMinHeight = Math.min(0.38, binMaxHeight)
  const mappedBinHeight = getWorldSize(bin.height, rack.height, rackHeight)
  const binHeight = clamp(mappedBinHeight, binMinHeight, binMaxHeight)
  const shelfY = getShelfY(level - 1, levels, rackHeight)
  const y = shelfY + shelfInset + binHeight / 2
  const quantity = getBinQuantity(bin)
  const weightCapacity = getBinWeightCapacity(bin, capacityMetric)
  const volumeCapacity = getBinVolumeCapacity(bin, capacityMetric)
  const storedQuantity = getStoredSkuQuantity(capacityMetric)
  const binCode = getDisplayCode(bin, 'BIN')

  // Trạng thái ô hàng
  const hasItems =
    (quantity !== null && quantity > 0) ||
    storedQuantity > 0 ||
    (weightCapacity && weightCapacity.ratio > 0.05) ||
    (volumeCapacity && volumeCapacity.ratio > 0.05)
  const isOver = weightCapacity?.isOverCapacity || volumeCapacity?.isOverCapacity
  const hasCargo = hasItems || showDemoCargo
  const isHighlighted = isSelected || isHovered
  const capacityRatios = [weightCapacity?.ratio, volumeCapacity?.ratio].filter(Number.isFinite)
  const capacityRatio = capacityRatios.length ? Math.max(...capacityRatios) : null
  const isFull = isOver || (Number.isFinite(capacityRatio) && capacityRatio >= 0.9)
  const statusColor = isFull ? '#ef4444' : hasCargo ? '#facc15' : '#22c55e'
  const ledColor = statusColor

  const capacityLabel = weightCapacity
    ? isOver
      ? `⚠ QUÁ TẢI (${Math.round(weightCapacity.ratio * 100)}%)`
      : `${Math.round(weightCapacity.ratio * 100)}% Tải`
    : null

  const handleBinClick = (event) => {
    event.stopPropagation()
    onSelect({
      type: 'bin',
      clientKey: bin.clientKey,
      multi: event.ctrlKey || event.metaKey,
    })
  }

  const handleBinDoubleClick = (event) => {
    event.stopPropagation()
    onDoubleClick({ type: 'bin', clientKey: bin.clientKey })
  }

  return (
    <PivotControls
      visible={editable && isSelected}
      enabled={editable && isSelected}
      activeAxes={[true, true, true]}
      disableRotations
      disableScaling
      scale={0.5}
      depthTest={false}
      anchor={[0, 0, 0]}
      onDrag={(matrix) => {
        const localCenterX = matrix.elements[12]
        const localCenterY = matrix.elements[13]
        const localCenterZ = matrix.elements[14]
        const [nextStorageCenterX, nextStorageCenterZ] =
          rotation === 90
            ? [localCenterZ, -localCenterX]
            : rotation === 180
              ? [-localCenterX, -localCenterZ]
              : rotation === 270
                ? [-localCenterZ, localCenterX]
                : [localCenterX, localCenterZ]
        const nextX = toCoordinateFromCenter(
          nextStorageCenterX,
          binStorageWidth,
          rackStorageWidth,
          rackEffectiveWorldWidth
        )

        const nextZ = toCoordinateFromCenter(
          nextStorageCenterZ,
          binStorageDepth,
          rackStorageLength,
          rackEffectiveWorldDepth
        )
        const draggedCenterY = y + localCenterY
        const usableHeight = Math.max(rackHeight - 1.2, 0.8)
        const levelRatio = clamp((draggedCenterY - 0.65) / usableHeight, 0, 1)
        const nextShelfLevel =
          levels > 0 ? clamp(Math.round(levelRatio * (levels - 1)) + 1, 1, levels) : 0

        onMoveEntity(
          'bin',
          bin.clientKey,
          Number(nextX.toFixed(2)),
          Number(nextZ.toFixed(2)),
          nextShelfLevel
        )
      }}
    >
      <group
        position={[x, y, z]}
        onClick={handleBinClick}
        onDoubleClick={handleBinDoubleClick}
        onPointerOver={(event) => {
          event.stopPropagation()
          setIsHovered(true)
        }}
        onPointerOut={(event) => {
          event.stopPropagation()
          setIsHovered(false)
        }}
      >
        <CardboardBin
          width={width}
          depth={depth}
          height={binHeight}
          cardboardTexture={cardboardTexture}
          isHighlighted={isHighlighted}
          isOver={isOver}
          isEmpty={!hasCargo}
          statusColor={statusColor}
        />

        {/* ĐÈN LED CHỈ THỊ TRẠNG THÁI GẮN TRÊN DẦM TRƯỚC */}
        <mesh position={[0, -binHeight / 2 - 0.04, depth / 2 + 0.025]}>
          <boxGeometry args={[Math.min(width * 0.45, 0.26), 0.045, 0.015]} />
          <meshStandardMaterial
            color={ledColor}
            emissive={ledColor}
            emissiveIntensity={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Khung viền khi được chọn (Highlight Cyan Glowing Outline) */}
        {isHighlighted && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[width * 1.05, binHeight * 1.05, depth * 1.05]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            <Outlines color="#22d3ee" thickness={isSelected ? 0.1 : 0.07} screenspace />
          </mesh>
        )}

        {/* Hiển thị nhãn ngắn trên từng Bin, giống bản đồ vận hành thực tế. */}
        {(isSelected || showBinLabels) && (
          <Billboard position={[0, binHeight / 2 + 0.18, 0]} follow>
            <group>
              {showBinLabels && !isSelected && (
                <mesh position={[0, 0.015, -0.01]}>
                  <planeGeometry args={[Math.min(width * 0.9, 0.78), 0.14]} />
                  <meshBasicMaterial color="#0f2942" transparent opacity={0.82} />
                </mesh>
              )}
              <Text
                fontSize={clamp(width * (isSelected ? 0.12 : 0.1), 0.045, 0.13)}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.014}
                outlineColor="#0b1120"
              >
                {binCode}
              </Text>
              {isSelected && quantity !== null && (
                <Text
                  position={[0, -0.09, 0]}
                  fontSize={clamp(width * 0.08, 0.045, 0.085)}
                  color="#4ade80"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.01}
                  outlineColor="#0b1120"
                >
                  {`${quantity} kiện`}
                </Text>
              )}
              {isSelected && capacityLabel && (
                <Text
                  position={[0, -0.17, 0]}
                  fontSize={clamp(width * 0.07, 0.04, 0.075)}
                  color={isOver ? '#f87171' : '#f59e0b'}
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.01}
                  outlineColor="#0b1120"
                >
                  {capacityLabel}
                </Text>
              )}
            </group>
          </Billboard>
        )}
      </group>
    </PivotControls>
  )
}

// --- CỘT ĐỨNG PALLET RACK MÀU XANH CÓ CÁC LỖ NGÀM ---
function UprightColumn({ position, height, size, isSelected }) {
  const metalColor = isSelected ? '#38bdf8' : '#1467d8'
  const perforationCount = clamp(Math.floor(height / 0.28), 4, 18)
  const perforationYs = Array.from({ length: perforationCount }, (_, index) => {
    const ratio = (index + 0.5) / perforationCount
    return -height / 2 + ratio * height
  })

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size, height, size]} />
        <meshStandardMaterial color={metalColor} roughness={0.35} metalness={0.7} />
      </mesh>

      {/* Bản đế vuông màu xanh giống chân Rack thực tế. */}
      <mesh position={[0, -height / 2 + 0.035, 0]} castShadow receiveShadow>
        <boxGeometry args={[size * 1.8, 0.07, size * 1.8]} />
        <meshStandardMaterial color="#0b4aa3" roughness={0.38} metalness={0.72} />
      </mesh>

      {/* Các lỗ tối nhỏ tạo cảm giác cột thép đột lỗ. */}
      {perforationYs.map((holeY, index) => (
        <group key={`upright-hole-${index}`}>
          <mesh position={[0, holeY, size / 2 + 0.006]}>
            <boxGeometry args={[size * 0.3, Math.min(size * 0.16, 0.05), 0.012]} />
            <meshBasicMaterial color="#062d70" />
          </mesh>
          <mesh position={[size / 2 + 0.006, holeY, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[size * 0.3, Math.min(size * 0.16, 0.05), 0.012]} />
            <meshBasicMaterial color="#062d70" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// --- DẦM NGANG ĐỠ TẦNG MÀU CAM AN TOÀN ---
function LoadBeam({ position, length, height, depth, rotation = [0, 0, 0], isSelected }) {
  const beamColor = isSelected ? '#67e8f9' : '#f97316'

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[length, height, depth]} />
        <meshStandardMaterial color={beamColor} roughness={0.38} metalness={0.55} />
      </mesh>
      {/* Khóa ngàm an toàn ở 2 đầu dầm */}
      {[-length / 2 + 0.03, length / 2 - 0.03].map((cx, idx) => (
        <mesh key={`pin-${idx}`} position={[cx, 0, depth / 2 + 0.005]}>
          <boxGeometry args={[0.04, height * 0.8, 0.015]} />
          <meshStandardMaterial color="#facc15" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

function RackDeck({ width, depth, y }) {
  const slatCount = 6
  const slatDepth = Math.max((depth * 0.92) / slatCount, 0.06)

  return (
    <group position={[0, y + 0.035, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 0.94, depth * 0.92]} />
        <meshStandardMaterial color="#756248" roughness={0.78} metalness={0.16} />
      </mesh>
      {Array.from({ length: slatCount }).map((_, index) => {
        const z = -depth * 0.46 + slatDepth / 2 + index * slatDepth
        return (
          <mesh key={`deck-slat-${index}`} position={[0, 0.018, z]} receiveShadow>
            <boxGeometry args={[width * 0.92, 0.025, slatDepth * 0.78]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? '#8b7555' : '#68563f'}
              roughness={0.82}
              metalness={0.12}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// --- KHUNG GIÁ KỆ HOÀN CHỈNH (SELECTIVE PALLET RACK FRAME) ---
function RackFrame({ width, depth, rackHeight, levels, isSelected }) {
  const postSize = clamp(Math.min(width, depth) * 0.065, 0.08, 0.14)
  const beamHeight = 0.1
  const beamDepth = 0.05
  const postX = Math.max(width / 2 - postSize / 2, 0)
  const postZ = Math.max(depth / 2 - postSize / 2, 0)
  const beamLengthX = Math.max(width - postSize, 0.5)
  const beamLengthZ = Math.max(depth - postSize, 0.5)
  const shelfY = (levelIndex) => getShelfY(levelIndex, levels, rackHeight)

  const postPositions = [
    [-postX, rackHeight / 2, -postZ],
    [postX, rackHeight / 2, -postZ],
    [-postX, rackHeight / 2, postZ],
    [postX, rackHeight / 2, postZ],
  ]

  return (
    <>
      {/* 4 Cột trụ thẳng đứng màu xanh công nghiệp có ốp chân tròn màu vàng */}
      {postPositions.map((position, index) => (
        <UprightColumn
          key={`post-${index}`}
          position={position}
          height={rackHeight}
          size={postSize}
          isSelected={isSelected}
        />
      ))}

      {/* Các tầng dầm đỡ ngang màu cam + mặt sàn dạng ván/mesh công nghiệp */}
      {Array.from({ length: levels }).map((_, levelIndex) => {
        const y = shelfY(levelIndex)
        return (
          <group key={`shelf-${levelIndex}`}>
            <RackDeck width={beamLengthX} depth={beamLengthZ} y={y} />

            {/* Dầm ngang trước & sau đỡ sàn (Front & Rear Beams - Safety Orange) */}
            <LoadBeam
              position={[0, y, postZ]}
              length={beamLengthX}
              height={beamHeight}
              depth={beamDepth}
              isSelected={isSelected}
            />
            <LoadBeam
              position={[0, y, -postZ]}
              length={beamLengthX}
              height={beamHeight}
              depth={beamDepth}
              isSelected={isSelected}
            />

            {/* Dầm giằng cạnh bên */}
            <LoadBeam
              position={[postX, y, 0]}
              length={beamLengthZ}
              height={beamHeight * 0.8}
              depth={beamDepth}
              rotation={[0, Math.PI / 2, 0]}
              isSelected={isSelected}
            />
            <LoadBeam
              position={[-postX, y, 0]}
              length={beamLengthZ}
              height={beamHeight * 0.8}
              depth={beamDepth}
              rotation={[0, Math.PI / 2, 0]}
              isSelected={isSelected}
            />
          </group>
        )
      })}

      {/* Dầm nóc liên kết trên đỉnh cột */}
      <LoadBeam
        position={[0, rackHeight - beamHeight / 2, postZ]}
        length={beamLengthX}
        height={beamHeight * 0.8}
        depth={beamDepth}
        isSelected={isSelected}
      />
      <LoadBeam
        position={[0, rackHeight - beamHeight / 2, -postZ]}
        length={beamLengthX}
        height={beamHeight * 0.8}
        depth={beamDepth}
        isSelected={isSelected}
      />
      <LoadBeam
        position={[postX, rackHeight - beamHeight / 2, 0]}
        length={beamLengthZ}
        height={beamHeight * 0.8}
        depth={beamDepth}
        rotation={[0, Math.PI / 2, 0]}
        isSelected={isSelected}
      />
      <LoadBeam
        position={[-postX, rackHeight - beamHeight / 2, 0]}
        length={beamLengthZ}
        height={beamHeight * 0.8}
        depth={beamDepth}
        rotation={[0, Math.PI / 2, 0]}
        isSelected={isSelected}
      />

    </>
  )
}

function RackMesh({
  rack,
  layout,
  worldWidth,
  worldDepth,
  selection,
  selectedItems,
  editable,
  onSelect,
  onDoubleClick,
  onMoveEntity,
  showDemoCargo,
  showBinLabels,
  capacityByBinId,
  cardboardTexture,
}) {
  const rotation = normalizeRotation(rack.rotation)
  const quarterTurn = isQuarterTurn(rotation)
  const localWidth = getWorldSize(rack.width, layout.width, worldWidth)
  const localDepth = getWorldSize(rack.length, layout.length, worldDepth)
  const width = quarterTurn ? localDepth : localWidth
  const depth = quarterTurn ? localWidth : localDepth
  const x = getWorldCenter(rack.coordinateX, width, layout.width, worldWidth)
  const z = getWorldCenter(rack.coordinateY, depth, layout.length, worldDepth)
  const levels = getRackLevels(rack)
  const rackHeight = getWorldHeight(rack.height, layout.width, layout.length)
  const isSelected =
    isItemSelected(selectedItems, 'rack', rack.clientKey) ||
    (selectedItems.length === 0 &&
      selection?.type === 'rack' &&
      String(selection.clientKey ?? selection.key) === String(rack.clientKey))
  const rackCode = getDisplayCode(rack, 'RACK')

  return (
    <PivotControls
      visible={editable && isSelected}
      enabled={editable && isSelected}
      activeAxes={[true, false, true]}
      disableRotations
      disableScaling
      scale={0.72}
      depthTest={false}
      anchor={[0, 0, 0]}
      onDrag={(matrix) => {
        const nextX = toCoordinateFromCenter(matrix.elements[12], width, layout.width, worldWidth)
        const nextY = toCoordinateFromCenter(matrix.elements[14], depth, layout.length, worldDepth)

        onMoveEntity('rack', rack.clientKey, Number(nextX.toFixed(2)), Number(nextY.toFixed(2)))
      }}
    >
      <group
        position={[x, 0, z]}
        rotation={[0, (rotation * Math.PI) / 180, 0]}
        onClick={(event) => {
          event.stopPropagation()
          onSelect({
            type: 'rack',
            clientKey: rack.clientKey,
            multi: event.ctrlKey || event.metaKey,
          })
        }}
        onDoubleClick={(event) => {
          event.stopPropagation()
          onDoubleClick({ type: 'rack', clientKey: rack.clientKey })
        }}
      >
        {/* Hitbox của Kệ */}
        <mesh position={[0, rackHeight / 2, 0]} raycast={() => null}>
          <boxGeometry args={[localWidth, rackHeight, localDepth]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          {isSelected && <Outlines color="#38bdf8" thickness={0.08} screenspace />}
        </mesh>

        {/* Khung Kệ Chịu Lực (Selective Rack Frame) */}
        <RackFrame
          width={localWidth}
          depth={localDepth}
          rackHeight={rackHeight}
          levels={levels}
          isSelected={isSelected}
        />

        {/* Chỉ hiện mã Rack đang chọn, tránh lặp bảng tên trên toàn cảnh. */}
        {isSelected && (
          <Billboard position={[0, rackHeight + 0.34, 0]} follow>
            <group>
              <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[Math.min(width * 0.62, 1.1), 0.22]} />
                <meshBasicMaterial color="#0f172a" />
              </mesh>
              <Text
                fontSize={clamp(Math.min(width, depth) * 0.12, 0.08, 0.16)}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
              >
                {rackCode}
              </Text>
            </group>
          </Billboard>
        )}

        {/* Danh sách các Vị trí để hàng (Bins) bên trong Kệ */}
        {(rack.bins || []).map((bin) => (
          <BinMesh
            key={bin.clientKey}
            bin={bin}
            rack={rack}
            rackEffectiveWorldWidth={width}
            rackEffectiveWorldDepth={depth}
            rackHeight={rackHeight}
            capacityMetric={capacityByBinId?.[String(bin.id)]}
            isSelected={
              isItemSelected(selectedItems, 'bin', bin.clientKey) ||
              (selectedItems.length === 0 &&
                selection?.type === 'bin' &&
                String(selection.clientKey ?? selection.key) === String(bin.clientKey))
            }
            editable={editable}
            onSelect={onSelect}
            onDoubleClick={onDoubleClick}
            onMoveEntity={onMoveEntity}
            showDemoCargo={showDemoCargo}
            showBinLabels={showBinLabels}
            cardboardTexture={cardboardTexture}
          />
        ))}
      </group>
    </PivotControls>
  )
}

export default function WarehouseLayoutPreview3D({
  layout,
  selection,
  selectedItems = [],
  capacityByBinId = {},
  onSelect = () => {},
  onMoveEntity = () => {},
  editable = true,
  onDoubleClick = () => {},
  onClearFocus = () => {},
  focusedRackKey = null,
  showDemoCargo = false,
  showBinLabels = true,
  warehouseAreaM2: providedWarehouseAreaM2 = null,
  warehouseAreaLabel = 'Diện tích kho',
}) {
  const [cameraPreset, setCameraPreset] = useState('DEFAULT')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const racks = useMemo(() => {
    return Array.isArray(layout?.racks)
      ? layout.racks
      : (layout?.zones || []).flatMap((zone) =>
          (zone.racks || []).map((rack) => ({
            ...rack,
            coordinateX: numberOf(zone.coordinateX) + numberOf(rack.coordinateX),
            coordinateY: numberOf(zone.coordinateY) + numberOf(rack.coordinateY),
          }))
        )
  }, [layout])

  const { width: worldWidth, depth: worldDepth } = useMemo(
    () => getWorldDimensions(layout),
    [layout]
  )
  const layoutAreaM2 = numberOf(layout?.width) * numberOf(layout?.length)
  const warehouseAreaM2 = numberOf(providedWarehouseAreaM2, 0) || layoutAreaM2

  const focusedRack = useMemo(
    () => racks.find((rack) => String(rack.clientKey) === String(focusedRackKey)),
    [racks, focusedRackKey]
  )

  const selectedBinInfo = (() => {
    if (selection?.type !== 'bin') return null

    const targetKey = selection.clientKey ?? selection.key
    for (const rack of racks) {
      const found = (rack.bins || []).find(
        (bin) => String(bin.clientKey ?? bin.id) === String(targetKey)
      )
      if (!found) continue

      const capacityMetric = capacityByBinId?.[String(found.id)]
      const quantity = getBinQuantity(found)
      const weightCapacity = getBinWeightCapacity(found, capacityMetric)
      const volumeCapacity = getBinVolumeCapacity(found, capacityMetric)
      const storedQuantity = getStoredSkuQuantity(capacityMetric)
      return {
        bin: found,
        rack,
        capacityMetric,
        isOver: weightCapacity?.isOverCapacity || volumeCapacity?.isOverCapacity,
        hasItems:
          (quantity !== null && quantity > 0) ||
          storedQuantity > 0 ||
          (weightCapacity && weightCapacity.ratio > 0.05) ||
          (volumeCapacity && volumeCapacity.ratio > 0.05),
        quantity,
        shelfLevel: found.shelfLevel ?? '—',
        binCode: getDisplayCode(found, 'BIN'),
        rackCode: getDisplayCode(rack, 'RACK'),
      }
    }

    return null
  })()

  const selectedRackInfo = (() => {
    if (selection?.type !== 'rack') return null

    const targetKey = selection.clientKey ?? selection.key
    const rack = racks.find(
      (item) => String(item.clientKey ?? item.id) === String(targetKey)
    )
    if (!rack) return null

    const bins = Array.isArray(rack.bins) ? rack.bins : []
    return {
      rack,
      rackCode: getDisplayCode(rack, 'RACK'),
      binCount: bins.length,
      shelfCount: getRackLevels(rack),
      maxWeight: numberOf(rack.maxWeight, 0),
      maxVolume: numberOf(rack.maxVolume, 0),
    }
  })()

  const selectedMetric = selectedBinInfo?.capacityMetric
  const selectedStoredSkus = Array.isArray(selectedMetric?.storedSkus)
    ? selectedMetric.storedSkus
    : []
  const selectedQuantity = selectedBinInfo?.quantity ?? getStoredSkuQuantity(selectedMetric)
  const selectedCurrentWeight = numberOf(
    selectedMetric?.currentWeightKg ?? selectedBinInfo?.bin?.currentWeight
  )
  const selectedMaxWeight = numberOf(selectedMetric?.maxWeightKg ?? selectedBinInfo?.bin?.maxWeight)
  const selectedCurrentVolume = numberOf(selectedMetric?.currentVolumeM3)
  const selectedMaxVolume = numberOf(selectedMetric?.maxVolumeM3 ?? selectedBinInfo?.bin?.maxVolume)
  const selectedWeightRatio = getMetricRatio(selectedCurrentWeight, selectedMaxWeight)
  const selectedVolumeRatio = getMetricRatio(selectedCurrentVolume, selectedMaxVolume)
  const selectedStatus = selectedBinInfo?.isOver
    ? { label: 'QUÁ TẢI', className: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30' }
    : selectedBinInfo?.hasItems
      ? {
          label: 'ĐANG LƯU HÀNG',
          className: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30',
        }
      : { label: 'CÒN TRỐNG', className: 'bg-slate-700/70 text-slate-300 ring-1 ring-white/10' }

  // Bounding box thông minh của cụm Kệ thực tế
  const racksBounds = useMemo(() => {
    return getRacksBounds(
      racks,
      numberOf(layout?.width, 1),
      numberOf(layout?.length, 1),
      worldWidth,
      worldDepth
    )
  }, [racks, layout?.width, layout?.length, worldWidth, worldDepth])

  const warehouseWallHeight = useMemo(() => {
    const layoutReferenceHeight = getWorldHeight(layout?.height, layout?.width, layout?.length)
    const referenceHeight = Math.max(layoutReferenceHeight, racksBounds.maxH, 2.4)

    // Tường chỉ là mốc trực quan, không cần cao ngang hoặc cao hơn Rack.
    return clamp(referenceHeight * 0.38, 1.2, 2.4)
  }, [layout?.height, layout?.length, layout?.width, racksBounds.maxH])

  const sceneBounds = useMemo(
    () => ({
      centerX: 0,
      centerY: Math.max(racksBounds.centerY, warehouseWallHeight * 0.45),
      centerZ: 0,
      sizeX: Math.max(racksBounds.sizeX, worldWidth * 0.86),
      sizeZ: Math.max(racksBounds.sizeZ, worldDepth * 0.86),
      maxH: Math.max(racksBounds.maxH, warehouseWallHeight),
      span: Math.max(racksBounds.span, worldWidth, worldDepth),
    }),
    [racksBounds, warehouseWallHeight, worldDepth, worldWidth]
  )

  // Khởi tạo các textures chất lượng cao
  const floorTexture = useMemo(() => createWarehouseFloorTexture(), [])
  const cardboardTexture = useMemo(() => createCardboardTexture(), [])

  useEffect(() => {
    return () => {
      floorTexture?.dispose()
      cardboardTexture?.dispose()
    }
  }, [cardboardTexture, floorTexture])

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-9999 h-screen w-screen overflow-hidden rounded-none bg-[#0b1f3a] font-sans select-none'
          : 'relative h-full w-full overflow-hidden rounded-2xl bg-[#0b1f3a] font-sans select-none'
      }
    >
      <div className={`absolute inset-0 ${isFullscreen ? 'lg:right-80' : ''}`}>
        <Canvas
          shadows
          camera={{ position: [18, 18, 18], fov: 44 }}
          className="h-full w-full"
          onPointerMissed={() => {
            onSelect({ type: 'layout' })
          }}
        >
          <color attach="background" args={['#0b1f3a']} />
          <fogExp2 attach="fog" args={['#0b1f3a', 0.0035]} />

          <ambientLight intensity={1.05} color="#dbe7ee" />
          <directionalLight
            castShadow
            position={[18, 28, 16]}
            intensity={2.1}
            color="#fff8e7"
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0002}
          />
          <directionalLight position={[-18, 16, -12]} intensity={0.7} color="#9edcff" />

          <WarehouseFloor width={worldWidth} depth={worldDepth} floorTexture={floorTexture} />
          <WarehouseWalls width={worldWidth} depth={worldDepth} height={warehouseWallHeight} />
          <ContactShadows
            position={[0, 0.02, 0]}
            scale={[Math.max(worldWidth * 0.96, 1), Math.max(worldDepth * 0.96, 1)]}
            opacity={0.28}
            blur={2.4}
            far={3.5}
            resolution={512}
          />
          {racks.map((rack) => (
            <RackMesh
              key={rack.clientKey}
              rack={rack}
              layout={layout}
              worldWidth={worldWidth}
              worldDepth={worldDepth}
              selection={selection}
              selectedItems={selectedItems}
              editable={editable}
              onSelect={onSelect}
              onDoubleClick={onDoubleClick}
              onMoveEntity={onMoveEntity}
              showDemoCargo={showDemoCargo}
              showBinLabels={showBinLabels}
              capacityByBinId={capacityByBinId}
              cardboardTexture={cardboardTexture}
            />
          ))}

          <WarehouseCameraController
            focusedRack={focusedRack}
            cameraPreset={cameraPreset}
            racksBounds={sceneBounds}
            layoutWidth={numberOf(layout?.width, 1)}
            layoutLength={numberOf(layout?.length, 1)}
            worldWidth={worldWidth}
            worldDepth={worldDepth}
          />

          <WarehousePostProcessing />
        </Canvas>
      </div>

      <div className="absolute top-3 left-3 z-20 flex items-center gap-1 rounded-xl border border-white/60 bg-white/85 p-1 shadow-lg backdrop-blur-md">
        {[
          ['DEFAULT', 'Toàn cảnh'],
          ['CLOSE_UP', 'Cận cảnh'],
          ['TOP_DOWN', 'Mặt bằng'],
          ['FRONT', 'Trực diện'],
        ].map(([preset, label]) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setCameraPreset(preset)
              if (preset === 'DEFAULT') onClearFocus()
            }}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
              cameraPreset === preset
                ? 'bg-sky-600 text-white shadow-[0_0_12px_rgba(14,165,233,0.4)]'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsFullscreen((previous) => !previous)}
        className={`absolute top-3 right-3 z-20 rounded-xl border border-white/60 bg-white/85 px-3 py-2 text-[11px] font-bold text-slate-700 shadow-lg backdrop-blur-md transition hover:bg-sky-600 hover:text-white ${isFullscreen ? 'lg:right-[21rem]' : ''}`}
        title={isFullscreen ? 'Thu nhỏ (Esc)' : 'Mở toàn màn hình'}
      >
        {isFullscreen ? '✕ Thu nhỏ' : '⛶ Toàn màn hình'}
      </button>

      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 rounded-xl border border-white/60 bg-white/85 px-3 py-2 text-[10px] font-semibold text-slate-600 shadow-lg backdrop-blur-md">
        <span className="font-black tracking-wider text-slate-400 uppercase">Trạng thái</span>
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-emerald-400" />
          Còn trống
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-yellow-400" />
          Đang chứa
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-red-500" />
          Đầy
        </span>
      </div>

      {isFullscreen && (
        <aside className="absolute top-0 right-0 bottom-0 z-30 flex w-80 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-l-2xl border-l border-white/10 bg-[#071629]/96 text-white shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/10 px-4 py-4">
            <p className="text-[9px] font-black tracking-[0.2em] text-sky-300 uppercase">
              Warehouse intelligence
            </p>
            <h3 className="mt-1 text-base font-extrabold">{layout?.name || 'Sơ đồ kho'}</h3>
            <p className="mt-1 text-[11px] text-slate-400">Thông tin Bin được chọn</p>
          </div>
          <section className="border-b border-white/10 px-4 py-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {warehouseAreaLabel}
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-300">
                  {formatMetric(warehouseAreaM2, 2)} m²
                </p>
              </div>
              <div className="text-right text-[10px] text-slate-400">
                <p>Kích thước mặt bằng</p>
                <p className="mt-1 font-bold text-slate-200">
                  {formatMetric(layout?.width, 2)} × {formatMetric(layout?.length, 2)} m
                </p>
              </div>
            </div>
          </section>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {selectedBinInfo ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-cyan-300 uppercase">
                        Selected Bin
                      </p>
                      <h4 className="mt-1 text-2xl font-black">{selectedBinInfo.binCode}</h4>
                      <p className="mt-1 text-xs text-slate-300">
                        {selectedBinInfo.rackCode} · Tầng {selectedBinInfo.shelfLevel}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-black ${selectedStatus.className}`}
                    >
                      {selectedStatus.label}
                    </span>
                  </div>
                </div>

                <section className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="mb-2 flex justify-between text-[11px]">
                    <span className="text-slate-400">Tải trọng</span>
                    <span className="font-bold text-emerald-300">
                      {formatMetric(selectedCurrentWeight, 2)} /{' '}
                      {selectedMaxWeight > 0 ? `${formatMetric(selectedMaxWeight, 2)} kg` : '—'}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className={`h-full rounded-full ${selectedBinInfo.isOver ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-400 via-yellow-400 to-orange-500'}`}
                      style={{ width: `${Math.round((selectedWeightRatio || 0) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-3 mb-2 flex justify-between text-[11px]">
                    <span className="text-slate-400">Thể tích</span>
                    <span className="font-bold text-sky-300">
                      {formatMetric(selectedCurrentVolume, 3)} /{' '}
                      {selectedMaxVolume > 0 ? `${formatMetric(selectedMaxVolume, 3)} m³` : '—'}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
                      style={{ width: `${Math.round((selectedVolumeRatio || 0) * 100)}%` }}
                    />
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] text-slate-500">Số lượng</p>
                    <p className="mt-1 text-lg font-black">{formatMetric(selectedQuantity, 0)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] text-slate-500">Kích thước</p>
                    <p className="mt-1 text-sm font-black">
                      {formatMetric(selectedBinInfo.bin?.width, 2)} ×{' '}
                      {formatMetric(selectedBinInfo.bin?.length, 2)}
                    </p>
                    <p className="text-[10px] text-slate-400">W × L m</p>
                  </div>
                </div>

                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-200">SKU trong Bin</h5>
                    <span className="text-[10px] text-slate-500">
                      {selectedStoredSkus.length} SKU
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selectedStoredSkus.length > 0 ? (
                      selectedStoredSkus.map((sku, index) => (
                        <div
                          key={sku.skuId || sku.skuCode || index}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
                        >
                          <span className="truncate pr-2 text-xs font-bold">
                            {sku.skuCode || sku.skuName || 'SKU'}
                          </span>
                          <span className="shrink-0 rounded-lg bg-sky-500/15 px-2 py-1 text-xs font-black text-sky-300">
                            {formatMetric(sku.quantity, 0)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-[11px] text-slate-500">
                        Chưa có dữ liệu SKU.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            ) : selectedRackInfo ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-3">
                  <p className="text-[10px] font-bold tracking-wider text-sky-300 uppercase">
                    Selected Rack
                  </p>
                  <h4 className="mt-1 text-2xl font-black">{selectedRackInfo.rackCode}</h4>
                  <p className="mt-1 text-xs text-slate-300">
                    {selectedRackInfo.rack.name || 'Rack đang chọn'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] text-slate-500">Kích thước</p>
                    <p className="mt-1 text-sm font-black">
                      {formatMetric(selectedRackInfo.rack.width, 2)} ×{' '}
                      {formatMetric(selectedRackInfo.rack.length, 2)} ×{' '}
                      {formatMetric(selectedRackInfo.rack.height, 2)}
                    </p>
                    <p className="text-[10px] text-slate-400">W × L × H m</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] text-slate-500">Tầng / Bin</p>
                    <p className="mt-1 text-lg font-black">
                      {selectedRackInfo.shelfCount} / {selectedRackInfo.binCount}
                    </p>
                    <p className="text-[10px] text-slate-400">đang cấu hình</p>
                  </div>
                </div>

                <section className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-[11px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Tải trọng tối đa</span>
                    <span className="font-bold text-emerald-300">
                      {selectedRackInfo.maxWeight > 0
                        ? `${formatMetric(selectedRackInfo.maxWeight, 2)} kg`
                        : 'Không giới hạn'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-slate-400">Thể tích tối đa</span>
                    <span className="font-bold text-sky-300">
                      {selectedRackInfo.maxVolume > 0
                        ? `${formatMetric(selectedRackInfo.maxVolume, 2)} m³`
                        : 'Không giới hạn'}
                    </span>
                  </div>
                </section>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                <p className="text-sm font-bold text-slate-200">Chưa chọn Rack hoặc Bin</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Nhấn vào Rack hoặc Bin trên mô hình để xem thông tin chi tiết.
                </p>
              </div>
            )}
          </div>
          <div className="border-t border-white/10 px-4 py-3 text-[10px] text-slate-500">
            StockSpace WMS · Đang đồng bộ
          </div>
        </aside>
      )}
    </div>
  )
}
