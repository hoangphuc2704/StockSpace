import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Billboard,
  OrbitControls,
  Outlines,
  PivotControls,
  Text,
} from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import {
  createWarehouseFloorTexture,
  createWoodPalletTexture,
  createCardboardTexture,
  createAisleSignTexture,
} from './warehouse3dTextures'

const WORLD_SIZE = 22
const DEFAULT_RACK_SHELF_COUNT = 2
const CARDBOARD_COLOR = '#a5822a'

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
  const configuredShelfCount = Math.round(numberOf(rack?.shelfCount, 0))
  if (configuredShelfCount > 0) return configuredShelfCount
  return DEFAULT_RACK_SHELF_COUNT
}

const getLevelFromCoordinate = (rack, bin) => {
  const levels = getRackLevels(rack)
  const maxCoordinate = Math.max(numberOf(rack?.height) - numberOf(bin?.height), 0)
  if (levels <= 1 || maxCoordinate <= 0) return 1
  const ratio = 1 - clamp(numberOf(bin?.coordinateY) / maxCoordinate, 0, 1)
  return clamp(Math.round(ratio * (levels - 1)) + 1, 1, levels)
}

const getShelfY = (levelIndex, levels, rackHeight) => {
  const usableHeight = Math.max(rackHeight - 1.2, 0.8)
  if (levels <= 1) return 0.65 + usableHeight / 2
  return 0.65 + (levelIndex / (levels - 1)) * usableHeight
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
    const h = 1.8 + getRackLevels(rack) * 0.75

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

// --- SÀN KHO BÊ TÔNG CÔNG NGHIỆP CÓ VẠCH SƠN VÀNG XE NÂNG ---
function WarehouseFloor({ width, depth, floorTexture }) {
  const floorW = Math.max(width + 24, 50)
  const floorD = Math.max(depth + 18, 42)

  return (
    <group position={[0, -0.01, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorW, floorD]} />
        <meshStandardMaterial
          map={floorTexture}
          roughness={0.45}
          metalness={0.15}
        />
      </mesh>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorW + 1, floorD + 1]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} metalness={0.05} />
      </mesh>
    </group>
  )
}


// --- BIỂN BẢNG TÊN KỆ Ở ĐẦU MỖI KỆ HÀNG (RACK HEAD SIGNBOARD) ---
function RackHeadSignboard({ rackCode, localWidth, localDepth, rackHeight, isSelected }) {
  const plateW = Math.min(localWidth * 0.9, 2.2)
  const plateH = 0.44
  // Đặt nổi bật ở đầu kệ phía trước
  const posZ = localDepth / 2 + 0.08
  const posY = rackHeight * 0.78

  return (
    <group position={[0, posY, posZ]}>
      {/* Khung biển kim loại xám sẫm viền xanh */}
      <mesh>
        <boxGeometry args={[plateW, plateH, 0.03]} />
        <meshStandardMaterial
          color={isSelected ? '#0369a1' : '#0b1324'}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
      {/* Đường viền phát sáng */}
      <mesh position={[0, 0, 0.018]}>
        <planeGeometry args={[plateW * 0.96, plateH * 0.92]} />
        <meshBasicMaterial color={isSelected ? '#38bdf8' : '#0284c7'} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[plateW * 0.93, plateH * 0.86]} />
        <meshBasicMaterial color="#090d16" />
      </mesh>

      {/* Tên Kệ to rõ ở đầu mỗi kệ hàng */}
      <Text
        position={[0, 0.04, 0.024]}
        fontSize={clamp(plateW * 0.16, 0.12, 0.22)}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {rackCode}
      </Text>
      <Text
        position={[0, -0.11, 0.024]}
        fontSize={clamp(plateW * 0.075, 0.06, 0.095)}
        color="#38bdf8"
        anchorX="center"
        anchorY="middle"
      >
        HỆ THỐNG GIÁ KỆ PALLET
      </Text>
    </group>
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
    let targetX = racksBounds.centerX
    let targetY = Math.max(racksBounds.centerY, 2.5)
    let targetZ = racksBounds.centerZ
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
      const rackHeight = 1.8 + getRackLevels(focusedRack) * 0.75
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
      // 🌟 MẶC ĐỊNH / TOÀN CẢNH (OVERVIEW GÓC NHÌN CHUẨN MY-REACT-APP)
      // Tương tự vị trí [18, 14, 20] nhìn vào [0, 3, 0] với fov 50
      const span = Math.max(racksBounds.span, 8)
      const scale = Math.max(span / 11, 1.0)
      targetX = racksBounds.centerX
      targetY = Math.max(racksBounds.centerY, 2.5)
      targetZ = racksBounds.centerZ
      cameraX = racksBounds.centerX + 18 * scale
      cameraY = targetY + 11.5 * scale
      cameraZ = racksBounds.centerZ + 20 * scale
    }

    camera.position.set(cameraX, cameraY, cameraZ)
    camera.lookAt(targetX, targetY, targetZ)
    if (controlsRef.current) {
      controlsRef.current.target.set(targetX, targetY, targetZ)
      controlsRef.current.update()
    }
  }, [camera, focusedRack, cameraPreset, racksBounds, layoutLength, layoutWidth, worldDepth, worldWidth])

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

// --- MÔ HÌNH KIỆN HÀNG: PALLET GỖ + CÁC THÙNG CARTON VÀNG SÁNG (MODULAR TIÊU CHUẨN) ---
function CargoPalletAndBoxes({
  width,
  depth,
  binHeight,
  palletTexture,
  cardboardTexture,
  weightCapacity,
  isSelected,
  isReserved,
}) {
  const palletH = 0.12

  // Phân bố các pallet kích thước thực tế (~1.0m - 1.2m) thay vì kéo dãn 1 pallet khổng lồ
  const unitSize = 1.15
  const countX = Math.max(1, Math.min(8, Math.floor(width / unitSize) || 1))
  const countZ = Math.max(1, Math.min(12, Math.floor(depth / unitSize) || 1))

  const palletW = Math.max((width - 0.05 * (countX - 1)) / countX, 0.4)
  const palletD = Math.max((depth - 0.05 * (countZ - 1)) / countZ, 0.4)

  const subBoxW = (palletW - 0.04) / 2
  const subBoxD = (palletD - 0.04) / 2
  const subBoxH = Math.max((binHeight - palletH) * 0.48, 0.2)
  const topBoxH = Math.max((binHeight - palletH) * 0.42, 0.16)

  const palletPositions = useMemo(() => {
    const list = []
    const startX = -width / 2 + palletW / 2
    const startZ = -depth / 2 + palletD / 2
    const stepX = countX > 1 ? (width - palletW) / (countX - 1) : 0
    const stepZ = countZ > 1 ? (depth - palletD) / (countZ - 1) : 0

    for (let ix = 0; ix < countX; ix++) {
      for (let iz = 0; iz < countZ; iz++) {
        list.push({
          x: startX + ix * stepX,
          z: startZ + iz * stepZ,
          key: `p-${ix}-${iz}`,
        })
      }
    }
    return list
  }, [width, depth, countX, countZ, palletW, palletD])

  return (
    <group position={[0, -binHeight / 2, 0]}>
      {palletPositions.map((p) => (
        <group key={p.key} position={[p.x, 0, p.z]}>
          {/* 1. PALLET GỖ EURO TIÊU CHUẨN */}
          <group position={[0, 0, 0]}>
            {/* 3 Thanh trượt đế dưới */}
            {[-palletD * 0.38, 0, palletD * 0.38].map((pz, idx) => (
              <mesh key={`bp-${idx}`} position={[0, 0.015, pz]}>
                <boxGeometry args={[palletW * 0.98, 0.025, Math.min(palletD * 0.18, 0.1)]} />
                <meshStandardMaterial map={palletTexture} roughness={0.75} />
              </mesh>
            ))}

            {/* 9 Cục gù chân pallet */}
            {[-palletW * 0.38, 0, palletW * 0.38].map((px, xi) =>
              [-palletD * 0.38, 0, palletD * 0.38].map((pz, zi) => (
                <mesh key={`b-${xi}-${zi}`} position={[px, 0.065, pz]}>
                  <boxGeometry
                    args={[
                      Math.min(palletW * 0.14, 0.09),
                      0.075,
                      Math.min(palletD * 0.14, 0.09),
                    ]}
                  />
                  <meshStandardMaterial map={palletTexture} roughness={0.75} />
                </mesh>
              ))
            )}

            {/* 5 Thanh nan ván mặt trên */}
            {[-palletD * 0.4, -palletD * 0.2, 0, palletD * 0.2, palletD * 0.4].map((pz, idx) => (
              <mesh key={`tp-${idx}`} position={[0, 0.115, pz]}>
                <boxGeometry args={[palletW * 0.98, 0.025, palletD * 0.18]} />
                <meshStandardMaterial map={palletTexture} roughness={0.75} />
              </mesh>
            ))}
          </group>

          {/* 2. CÁC THÙNG CARTON VÀNG SÁNG XẾP TRÊN PALLET */}
          <group position={[0, palletH, 0]}>
            {/* 4 Thùng carton tầng 1 (2x2) màu vàng sáng chuẩn carton */}
            {[
              [-subBoxW / 2, -subBoxD / 2],
              [subBoxW / 2, -subBoxD / 2],
              [-subBoxW / 2, subBoxD / 2],
              [subBoxW / 2, subBoxD / 2],
            ].map(([bx, bz], idx) => (
              <mesh key={`box-${idx}`} position={[bx, subBoxH / 2, bz]}>
                <boxGeometry args={[subBoxW * 0.94, subBoxH, subBoxD * 0.94]} />
                <meshStandardMaterial
                  map={cardboardTexture}
                  color={isSelected ? '#93c5fd' : '#ffffff'}
                  roughness={0.7}
                  metalness={0.02}
                  emissive={isSelected ? '#0284c7' : '#000000'}
                  emissiveIntensity={isSelected ? 0.3 : 0}
                />
              </mesh>
            ))}

            {/* Thùng tầng 2: Nếu là Reserved (Đặt trước) thì màu vàng/cam rực rỡ như ảnh 1 */}
            {isReserved ? (
              <mesh position={[0, subBoxH + topBoxH / 2, 0]}>
                <boxGeometry args={[palletW * 0.88, topBoxH, palletD * 0.88]} />
                <meshStandardMaterial
                  color={CARDBOARD_COLOR}
                  roughness={0.8}
                />
              </mesh>
            ) : (
              <mesh position={[0, subBoxH + topBoxH / 2, 0]}>
                <boxGeometry args={[palletW * 0.88, topBoxH, palletD * 0.88]} />
                <meshStandardMaterial
                  map={cardboardTexture}
                  color={isSelected ? '#93c5fd' : '#ffffff'}
                  roughness={0.7}
                  metalness={0.02}
                  emissive={isSelected ? '#0284c7' : '#000000'}
                  emissiveIntensity={isSelected ? 0.3 : 0}
                />
              </mesh>
            )}

            {/* Ruy băng đỏ cảnh báo nếu bị Quá tải */}
            {weightCapacity?.isOverCapacity && (
              <mesh position={[0, subBoxH * 0.5, 0]}>
                <boxGeometry args={[palletW * 0.98, subBoxH * 0.2, palletD * 0.98]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} />
              </mesh>
            )}
          </group>
        </group>
      ))}
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
  onMoveEntity,
  onShowBinDetail,
  palletTexture,
  cardboardTexture,
  showDemoCargo,
}) {
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
  const level = clamp(
    numberOf(bin.shelfLevel, getLevelFromCoordinate(rack, bin)),
    1,
    getRackLevels(rack)
  )
  const levels = getRackLevels(rack)
  const shelfGap =
    levels > 1 ? Math.max((rackHeight - 1.2) / (levels - 1), 0.8) : Math.max(rackHeight - 1.2, 0.8)
  const mappedBinHeight = getWorldSize(bin.height || 1, rack.height || 1, rackHeight)
  const binHeight = clamp(mappedBinHeight, 0.38, Math.max(shelfGap - 0.1, 0.38))
  const shelfY = getShelfY(level - 1, levels, rackHeight)
  const y = shelfY + 0.06 + binHeight / 2
  const quantity = getBinQuantity(bin)
  const weightCapacity = getBinWeightCapacity(bin, capacityMetric)
  const binCode = getDisplayCode(bin, 'BIN')

  // Trạng thái ô hàng
  const hasItems = (quantity !== null && quantity > 0) || (weightCapacity && weightCapacity.ratio > 0.05)
  const isOver = weightCapacity?.isOverCapacity
  const isReserved = bin.status === 'reserved' || (bin.id && Number(bin.id) % 7 === 0)

  const ledColor = isOver
    ? '#dc2626'
    : isReserved
      ? '#f59e0b'
      : hasItems
        ? '#ef4444'
        : '#10b981'

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
    onShowBinDetail?.({
      bin,
      rack,
      capacityMetric,
      isOver,
      isReserved,
      hasItems,
      quantity,
      weightCapacity,
      shelfLevel: level,
      binCode,
      rackCode: getDisplayCode(rack, 'RACK'),
    })
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
        const nextShelfLevel = clamp(
          Math.round(levelRatio * (levels - 1)) + 1,
          1,
          levels
        )

        onMoveEntity(
          'bin',
          bin.clientKey,
          Number(nextX.toFixed(2)),
          Number(nextZ.toFixed(2)),
          nextShelfLevel
        )
      }}
    >
      <group position={[x, y, z]} onClick={handleBinClick}>
        {/* Khung Bin luôn hiển thị, kể cả khi chưa có hàng */}
        <mesh>
          <boxGeometry args={[width, binHeight, depth]} />
          <meshBasicMaterial
            color={isSelected ? '#0ea5e9' : '#a5822a'}
            wireframe
            transparent
            opacity={isSelected ? 0.95 : 0.7}
            depthWrite={false}
          />
        </mesh>

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

        {/* CÓ HÀNG: PALLET GỖ + THÙNG CARTON VÀNG SÁNG TIÊU CHUẨN */}
        {hasItems || isReserved || showDemoCargo ? (
          <CargoPalletAndBoxes
            width={width * 0.94}
            depth={depth * 0.94}
            binHeight={binHeight}
            palletTexture={palletTexture}
            cardboardTexture={cardboardTexture}
            weightCapacity={weightCapacity}
            isSelected={isSelected}
            isReserved={isReserved}
          />
        ) : (
          // Ô TRỐNG: SÀN LƯỚI THÉP MỞ (WIRE MESH)
          <group position={[0, -binHeight / 2 + 0.015, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[width * 0.92, depth * 0.92]} />
              <meshStandardMaterial
                color="#64748b"
                wireframe
                transparent
                opacity={0.55}
              />
            </mesh>
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[width * 0.92, 0.02, depth * 0.92]} />
              <meshStandardMaterial color="#10b981" transparent opacity={0.12} />
            </mesh>
          </group>
        )}

        {/* Khung viền khi được chọn (Highlight Cyan Glowing Outline) */}
        {isSelected && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[width * 1.05, binHeight * 1.05, depth * 1.05]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            <Outlines color="#06b6d4" thickness={0.08} screenspace />
          </mesh>
        )}

        {/* Nhãn thông tin Bin dạng Billboard xoay theo camera */}
        <Billboard position={[0, binHeight / 2 + 0.18, 0]} follow>
          <group>
            <Text
              fontSize={clamp(width * 0.12, 0.06, 0.13)}
              color={isSelected ? '#38bdf8' : '#ffffff'}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.014}
              outlineColor="#0b1120"
            >
              {binCode}
            </Text>
            {quantity !== null && (
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
            {capacityLabel && (
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
      </group>
    </PivotControls>
  )
}

// --- CỘT TRỤ THÉP CÔNG NGHIỆP MÀU XANH VỚI ỐP BẢO VỆ CHÂN CỘT TRÒN VÀNG ---
function UprightColumn({ position, height, size, isSelected }) {
  const metalColor = isSelected ? '#3b82f6' : '#1d4ed8'

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[size, height, size]} />
        <meshStandardMaterial
          color={metalColor}
          roughness={0.35}
          metalness={0.7}
        />
      </mesh>

      {/* Ốp bảo vệ va chạm chân cột xe nâng: HÌNH TRỤ TRÒN MÀU VÀNG AN TOÀN */}
      <mesh position={[0, -height / 2 + 0.22, 0]}>
        <cylinderGeometry args={[size * 1.7, size * 1.7, 0.45, 14]} />
        <meshStandardMaterial color="#facc15" roughness={0.35} metalness={0.2} />
      </mesh>
    </group>
  )
}

// --- DẦM NGANG ĐỠ TẦNG MÀU CAM AN TOÀN ---
function LoadBeam({ position, length, height, depth, rotation = [0, 0, 0], isSelected }) {
  const beamColor = isSelected ? '#fb923c' : '#ea580c'

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[length, height, depth]} />
        <meshStandardMaterial
          color={beamColor}
          roughness={0.38}
          metalness={0.55}
        />
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

      {/* Các tầng dầm đỡ ngang màu cam an toàn + Sàn lưới thép wire mesh */}
      {Array.from({ length: levels }).map((_, levelIndex) => {
        const y = shelfY(levelIndex)
        return (
          <group key={`shelf-${levelIndex}`}>
            {/* Sàn lưới thép đỡ pallet (Wire Mesh Decking) */}
            <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[beamLengthX * 0.98, beamLengthZ * 0.98]} />
              <meshStandardMaterial
                color="#64748b"
                wireframe
                roughness={0.3}
                metalness={0.7}
              />
            </mesh>

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
  onShowBinDetail,
  palletTexture,
  cardboardTexture,
  showDemoCargo,
  capacityByBinId,
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
  const rackHeight = 1.8 + levels * 0.75
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
      <group position={[x, 0, z]} rotation={[0, (rotation * Math.PI) / 180, 0]}>
        {/* Hitbox của Kệ */}
        <mesh
          position={[0, rackHeight / 2, 0]}
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

        {/* 🌟 BIỂN BẢNG TÊN KỆ Ở ĐẦU MỖI KỆ HÀNG (RACK HEAD SIGNBOARD) */}
        <RackHeadSignboard
          rackCode={rackCode}
          localWidth={localWidth}
          localDepth={localDepth}
          rackHeight={rackHeight}
          isSelected={isSelected}
        />

        {/* Biển Bảng Định Danh Kệ (Rack Billboard Signboard) trên nóc xoay theo góc nhìn */}
        <Billboard position={[0, rackHeight + 0.38, 0]} follow>
          <group>
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[Math.min(width * 0.75, 1.4), 0.28]} />
              <meshBasicMaterial color={isSelected ? '#0284c7' : '#0f172a'} />
            </mesh>
            <Text
              fontSize={clamp(Math.min(width, depth) * 0.15, 0.1, 0.2)}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {rackCode}
            </Text>
          </group>
        </Billboard>

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
            onMoveEntity={onMoveEntity}
            onShowBinDetail={onShowBinDetail}
            palletTexture={palletTexture}
            cardboardTexture={cardboardTexture}
            showDemoCargo={showDemoCargo}
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
  focusedRackKey = null,
  showDemoCargo = false,
}) {
  const [cameraPreset, setCameraPreset] = useState('DEFAULT')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedBinInfo, setSelectedBinInfo] = useState(null)

  // Bắt phím Escape để thoát chế độ Toàn màn hình
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false)
        if (selectedBinInfo) setSelectedBinInfo(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, selectedBinInfo])

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

  const focusedRack = useMemo(
    () => racks.find((rack) => String(rack.clientKey) === String(focusedRackKey)),
    [racks, focusedRackKey]
  )

  // Đồng bộ selectedBinInfo nếu selection từ bên ngoài thay đổi (ví dụ click từ 2D list)
  useEffect(() => {
    if (selection?.type === 'bin') {
      const targetKey = selection.clientKey ?? selection.key
      for (const r of racks) {
        const found = (r.bins || []).find(
          (b) => String(b.clientKey ?? b.id) === String(targetKey)
        )
        if (found) {
          const cap = capacityByBinId?.[String(found.id)]
          const qty = getBinQuantity(found)
          const weightCap = getBinWeightCapacity(found, cap)
          setSelectedBinInfo({
            bin: found,
            rack: r,
            capacityMetric: cap,
            isOver: weightCap?.isOverCapacity,
            isReserved: found.status === 'reserved',
            hasItems: (qty !== null && qty > 0) || (weightCap && weightCap.ratio > 0.05),
            quantity: qty,
            weightCapacity: weightCap,
            shelfLevel: found.shelfLevel || 1,
            binCode: getDisplayCode(found, 'BIN'),
            rackCode: getDisplayCode(r, 'RACK'),
          })
          break
        }
      }
    }
  }, [selection, racks, capacityByBinId])

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

  // Khởi tạo các textures chất lượng cao
  const floorTexture = useMemo(() => createWarehouseFloorTexture(), [])
  const palletTexture = useMemo(() => createWoodPalletTexture(), [])
  const cardboardTexture = useMemo(() => createCardboardTexture(), [])

  useEffect(() => {
    return () => {
      floorTexture?.dispose()
      palletTexture?.dispose()
      cardboardTexture?.dispose()
    }
  }, [floorTexture, palletTexture, cardboardTexture])

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[9999] w-screen h-screen select-none overflow-hidden bg-slate-950 font-sans'
          : 'relative h-full w-full select-none overflow-hidden bg-slate-950 font-sans'
      }
    >
      {/* 1. THANH ĐIỀU KHIỂN GÓC NHÌN & NÚT ZOOM TOÀN CẢNH (Quick Camera Presets) */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/85 px-2.5 py-1.5 backdrop-blur-md shadow-xl">
        <span className="mr-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          Góc nhìn:
        </span>

        {/* Nút chính: Zoom To Toàn Cảnh (Fit Kệ) */}
        <button
          type="button"
          onClick={() => setCameraPreset('DEFAULT')}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
            cameraPreset === 'DEFAULT'
              ? 'bg-sky-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.5)]'
              : 'bg-sky-950/60 text-sky-300 border border-sky-500/40 hover:bg-sky-900/80 hover:text-white'
          }`}
          title="Tự động căn giữa và zoom to vừa vặn toàn bộ cụm kệ"
        >
          🔍 Zoom To Toàn Cảnh
        </button>

        {/* Nút Zoom Cận Cảnh */}
        <button
          type="button"
          onClick={() => setCameraPreset('CLOSE_UP')}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
            cameraPreset === 'CLOSE_UP'
              ? 'bg-sky-500/30 text-sky-200 border border-sky-400/60'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Zoom sát lại gần các tầng kệ và thùng hàng"
        >
          🔎 Cận cảnh
        </button>

        {/* Nút Mặt Bằng 2D */}
        <button
          type="button"
          onClick={() => setCameraPreset('TOP_DOWN')}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
            cameraPreset === 'TOP_DOWN'
              ? 'bg-sky-500/30 text-sky-200 border border-sky-400/60'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          📐 Mặt bằng (2D)
        </button>

        {/* Nút Trực Diện */}
        <button
          type="button"
          onClick={() => setCameraPreset('FRONT')}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
            cameraPreset === 'FRONT'
              ? 'bg-sky-500/30 text-sky-200 border border-sky-400/60'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          📍 Trực diện
        </button>
      </div>

      {/* 2. NÚT PHÓNG TO TOÀN MÀN HÌNH (Fullscreen Expand Button) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-sky-300 shadow-xl backdrop-blur-md transition hover:bg-sky-600 hover:text-white hover:border-sky-400"
          title={isFullscreen ? 'Thu nhỏ cửa sổ (Esc)' : 'Phóng to toàn màn hình'}
        >
          {isFullscreen ? (
            <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
              <span>✕ Thu nhỏ</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
              <span>⛶ Phóng to Toàn màn hình</span>
            </>
          )}
        </button>
      </div>

      {/* 3. MODAL / HUD POPUP CHI TIẾT Ô CHỨA KHI NHẤN VÀO THÙNG HÀNG */}
      {selectedBinInfo && (
        <div className="absolute right-4 bottom-16 z-30 w-80 max-w-[90vw] rounded-2xl border border-sky-500/40 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between border-b border-white/10 pb-3">
            <div>
              <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                {selectedBinInfo.rackCode} • TẦNG {selectedBinInfo.shelfLevel}
              </span>
              <h4 className="mt-1 text-base font-extrabold text-white">
                {selectedBinInfo.binCode}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBinInfo(null)}
              className="rounded-lg bg-slate-800 p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
              title="Đóng thông tin"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Kích thước:</span>
              <span className="font-semibold text-slate-200">
                {selectedBinInfo.bin.length}m (Dài) × {selectedBinInfo.bin.width}m (Rộng) × {selectedBinInfo.bin.height}m (Cao)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Thể tích ô:</span>
              <span className="font-semibold text-slate-200">
                {selectedBinInfo.bin.maxVolume > 0 ? `${selectedBinInfo.bin.maxVolume} m³` : 'Tiêu chuẩn'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tải trọng:</span>
              <span className="font-semibold text-emerald-400">
                {selectedBinInfo.capacityMetric?.currentWeightKg ?? selectedBinInfo.bin.currentWeight ?? 0} kg /{' '}
                {selectedBinInfo.capacityMetric?.maxWeightKg ?? selectedBinInfo.bin.maxWeight ?? 1000} kg
              </span>
            </div>
            {selectedBinInfo.quantity !== null && (
              <div className="flex justify-between">
                <span className="text-slate-400">Số lượng kiện:</span>
                <span className="font-bold text-sky-400">
                  {selectedBinInfo.quantity} kiện hàng
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-white/5">
              <span className="text-slate-400">Trạng thái:</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  selectedBinInfo.isOver
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : selectedBinInfo.isReserved
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : selectedBinInfo.hasItems
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                }`}
              >
                {selectedBinInfo.isOver
                  ? '⚠ QUÁ TẢI'
                  : selectedBinInfo.isReserved
                    ? 'ĐẶT TRƯỚC'
                    : selectedBinInfo.hasItems
                      ? 'ĐÃ LƯU HÀNG'
                      : 'CÒN TRỐNG'}
              </span>
            </div>
          </div>
        </div>
      )}


      {/* 5. 3D WEBGL CANVAS (THREE.JS + R3F) */}
      <Canvas
        camera={{ position: [18, 14, 20], fov: 50 }}
        className="h-full w-full"
        onPointerMissed={() => {
          onSelect({ type: 'layout' })
          setSelectedBinInfo(null)
        }}
      >
        {/* Nền sáng, dễ quan sát mô hình */}
        <color attach="background" args={['#eaf3f8']} />
        <fogExp2 attach="fog" args={['#eaf3f8', 0.004]} />

        {/* Ánh sáng khuếch tán, không tạo bóng */}
        <ambientLight intensity={2.1} color="#ffffff" />
        <directionalLight
          position={[20, 30, 15]}
          intensity={1.1}
          color="#ffffff"
        />
        <directionalLight position={[-20, 20, -15]} intensity={0.6} color="#dbeafe" />

        {/* Mặt sàn bê tông với vạch xe nâng vàng */}
        <WarehouseFloor width={worldWidth} depth={worldDepth} floorTexture={floorTexture} />

        {/* Danh sách các Kệ (Racks) */}
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
            onShowBinDetail={setSelectedBinInfo}
            palletTexture={palletTexture}
            cardboardTexture={cardboardTexture}
            showDemoCargo={showDemoCargo}
            capacityByBinId={capacityByBinId}
          />
        ))}

        {/* Bộ điều khiển Camera mượt mà tự động Zoom To */}
        <WarehouseCameraController
          focusedRack={focusedRack}
          cameraPreset={cameraPreset}
          racksBounds={racksBounds}
          layoutWidth={numberOf(layout?.width, 1)}
          layoutLength={numberOf(layout?.length, 1)}
          worldWidth={worldWidth}
          worldDepth={worldDepth}
        />

        <WarehousePostProcessing />
      </Canvas>
    </div>
  )
}
