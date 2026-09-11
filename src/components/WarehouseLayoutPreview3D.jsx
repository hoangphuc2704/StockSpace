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
import { ACESFilmicToneMapping, DoubleSide, MeshStandardMaterial, Shape } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import {
  createCardboardTexture,
  createWarehouseFloorTexture,
  createWallPanelTexture,
  createRoofCorrugatedTexture,
  createRollUpDoorTexture,
  createBuildingSignTexture,
  createSafetySignTexture,
} from './warehouse3dTextures'

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

// --- SÀN KHO BÊ TÔNG CÔNG NGHIỆP RỘNG LỚN ---
function WarehouseFloor({
  width,
  depth,
  buildingWidth: propBuildingWidth,
  buildingLength: propBuildingLength,
  floorTexture,
}) {
  const floorW = propBuildingWidth || Math.max(width + 22, 38)
  const floorD = propBuildingLength || Math.max(depth + 24, 46)

  // Tọa độ ranh giới vùng đặt kệ hàng (Active Storage Bay Footprint)
  const storageW = Math.max(width, 1)
  const storageD = Math.max(depth, 1)

  return (
    <group position={[0, -0.01, 0]}>
      {/* 1. Mặt sàn bê tông toàn bộ tòa nhà kho rộng lớn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[floorW, floorD]} />
        <meshStandardMaterial map={floorTexture} roughness={0.4} metalness={0.15} />
      </mesh>

      {/* 2. Đường viền ranh giới Khu Vực Lưu Trữ Kệ Hàng (Active Rack Storage Bay) */}
      <group position={[0, 0.015, 0]} raycast={() => null}>
        <Line
          points={[
            [-storageW / 2, 0, -storageD / 2],
            [storageW / 2, 0, -storageD / 2],
            [storageW / 2, 0, storageD / 2],
            [-storageW / 2, 0, storageD / 2],
            [-storageW / 2, 0, -storageD / 2],
          ]}
          color="#38bdf8"
          transparent
          opacity={0.65}
          lineWidth={1.6}
          raycast={() => null}
        />
      </group>
    </group>
  )
}

// =========================================================================
// KIẾN TRÚC TÒA NHÀ KHO THỰC TẾ (REALISTIC WAREHOUSE ARCHITECTURE - NGÔI NHÀ)
// Mô phỏng phong cách nhà kho công nghiệp hiện đại chuẩn như my-react-app:
// - 4 Bức tường panel kim loại công nghiệp xám nhạt với rãnh ghép & đinh tán
// - Tường trước với 2 cửa cuốn xe nâng Inbound / Outbound, đệm dock & cửa thoát hiểm
// - Biển thương hiệu StockSpace lớn mặt tiền tòa nhà
// - Cột thép chữ I chịu lực dọc 2 bên tường
// - Mái dốc tôn sóng công nghiệp kèm tấm lấy sáng Polycarbonate
// - Hệ vì kèo không gian (Space Trusses), ống gió HVAC & ống PCCC đỏ
// - Chế độ hiển thị: Mờ X-Ray (nhìn thấu kệ bên trong), Đầy đủ (Solid), hoặc Ẩn (Hidden)
// =========================================================================
function WarehouseBuildingArchitecture({
  width,
  depth,
  buildingWidth: propBuildingWidth,
  buildingLength: propBuildingLength,
  wallHeight: propWallHeight,
  racksBounds,
  roofMode = 'xray',
  cameraPreset = 'DEFAULT',
}) {
  const buildingWidth = propBuildingWidth || Math.max(width + 22, 38)
  const buildingLength = propBuildingLength || Math.max(depth + 24, 46)
  const wallHeight = propWallHeight || Math.max(racksBounds?.maxH ? racksBounds.maxH + 4.5 : 11.0, 11.0)
  const roofApex = wallHeight + 2.5
  const wallThickness = 0.32

  // Thông số hình học mái dốc công nghiệp
  const roofPitch = Math.atan2(roofApex - wallHeight, buildingWidth / 2)
  const trussRafterLen = Math.hypot(buildingWidth / 2, roofApex - wallHeight)

  // Độ vươn mái che công nghiệp (Overhangs)
  const eaveOverhang = 0.5 // Mái hiên vươn qua mép tường bên 0.5m
  const gableOverhang = 0.6 // Mái đua qua tường đầu hồi trước & sau 0.6m
  const roofLength = buildingLength + 2 * gableOverhang

  // Chiều dài thực tế của mặt nghiêng dốc mái từ đỉnh nóc ra đến mép hiên
  const halfSpanWithOverhang = buildingWidth / 2 + eaveOverhang
  const roofSlopeLen = halfSpanWithOverhang / Math.cos(roofPitch)

  // Tọa độ tâm 2 cánh mái để giáp mí tuyệt đối chuẩn xác tại đỉnh nóc X = 0, Y = roofApex
  const leftRoofCenterX = -halfSpanWithOverhang / 2
  const rightRoofCenterX = halfSpanWithOverhang / 2
  const roofCenterY = roofApex - (halfSpanWithOverhang / 2) * Math.tan(roofPitch)

  // Khởi tạo các texture kiến trúc công nghiệp
  const wallTexture = useMemo(() => createWallPanelTexture(), [])
  const roofTexture = useMemo(() => createRoofCorrugatedTexture(), [])
  const door1Texture = useMemo(() => createRollUpDoorTexture('BAY 01 • INBOUND DOCK'), [])
  const door2Texture = useMemo(() => createRollUpDoorTexture('BAY 02 • OUTBOUND DOCK'), [])
  const buildingSignTexture = useMemo(() => createBuildingSignTexture(), [])
  const exitSignTexture = useMemo(() => createSafetySignTexture('EXIT'), [])
  const fireSignTexture = useMemo(() => createSafetySignTexture('FIRE'), [])
  const ppeSignTexture = useMemo(() => createSafetySignTexture('PPE'), [])

  useEffect(() => {
    return () => {
      wallTexture?.dispose()
      roofTexture?.dispose()
      door1Texture?.dispose()
      door2Texture?.dispose()
      buildingSignTexture?.dispose()
      exitSignTexture?.dispose()
      fireSignTexture?.dispose()
      ppeSignTexture?.dispose()
    }
  }, [
    wallTexture,
    roofTexture,
    door1Texture,
    door2Texture,
    buildingSignTexture,
    exitSignTexture,
    fireSignTexture,
    ppeSignTexture,
  ])

  // Cấu hình vật liệu tường panel
  const wallMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: wallTexture,
        roughness: 0.55,
        metalness: 0.25,
      }),
    [wallTexture]
  )

  // Tường đầu hồi tam giác
  const gableShape = useMemo(() => {
    const shape = new Shape()
    shape.moveTo(-buildingWidth / 2, 0)
    shape.lineTo(buildingWidth / 2, 0)
    shape.lineTo(0, roofApex - wallHeight)
    shape.closePath()
    return shape
  }, [buildingWidth, roofApex, wallHeight])

  // Cột thép chữ I dọc tường (khoảng cách 6.5m chuẩn công nghiệp)
  const steelColumns = useMemo(() => {
    const items = []
    const spacing = 6.5
    const halfLen = buildingLength / 2
    for (let z = -halfLen + 3; z <= halfLen - 3; z += spacing) {
      items.push(z)
    }
    return items
  }, [buildingLength])

  // Hệ vì kèo thép
  const trussZList = useMemo(() => {
    const items = []
    const spacing = 6.5
    const halfLen = buildingLength / 2
    for (let z = -halfLen + 3; z <= halfLen - 3; z += spacing) {
      items.push(z)
    }
    return items
  }, [buildingLength])

  // Cửa cuốn trước chuẩn công nghiệp
  const doorH = 5.0
  const doorW = 5.2
  const door1X = -8
  const door2X = 8
  const centerPillarW = (door2X - doorW / 2) - (door1X + doorW / 2) // 10.8m
  const leftOuterPillarW = Math.max(buildingWidth / 2 - (Math.abs(door1X) + doorW / 2), 1) // ~11m
  const leftOuterPillarX = -buildingWidth / 2 + leftOuterPillarW / 2
  const rightOuterPillarX = buildingWidth / 2 - leftOuterPillarW / 2

  // Chế độ mái: khi cameraPreset là TOP_DOWN thì tự động ẩn mái để dễ quan sát mặt bằng
  const effectiveRoofMode = cameraPreset === 'TOP_DOWN' ? 'hidden' : roofMode
  const isRoofVisible = effectiveRoofMode !== 'hidden'
  const isRoofXray = effectiveRoofMode === 'xray'

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Mặt đất bao quanh bên ngoài nhà kho (Ground surround không còn bị hụt khoảng tối) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, 0]}
        receiveShadow
        raycast={() => null}
      >
        <planeGeometry args={[buildingWidth + 90, buildingLength + 90]} />
        <meshStandardMaterial color="#090d16" roughness={0.92} metalness={0.08} />
      </mesh>

      {/* 2. Cột thép chịu lực dọc theo 2 tường bên (Structural I-Columns) */}
      <group raycast={() => null}>
        {steelColumns.map((z, idx) => (
          <group key={`col-${idx}`}>
            {/* Cột tường trái */}
            <mesh position={[-buildingWidth / 2 + 0.2, wallHeight / 2, z]} castShadow>
              <boxGeometry args={[0.4, wallHeight, 0.4]} />
              <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.7} />
            </mesh>
            {/* Cột tường phải */}
            <mesh position={[buildingWidth / 2 - 0.2, wallHeight / 2, z]} castShadow>
              <boxGeometry args={[0.4, wallHeight, 0.4]} />
              <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.7} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 3. Bốn Bức Tường Nhà Kho (Walls) */}
      <group raycast={() => null}>
        {/* TƯỜNG SAU (Back Wall) */}
        <mesh
          position={[0, wallHeight / 2, -buildingLength / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[buildingWidth, wallHeight, wallThickness]} />
          <primitive object={wallMaterial} attach="material" />
        </mesh>

        {/* TƯỜNG TRÁI (Left Wall) */}
        <mesh
          position={[-buildingWidth / 2, wallHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[wallThickness, wallHeight, buildingLength]} />
          <primitive object={wallMaterial} attach="material" />
        </mesh>

        {/* TƯỜNG PHẢI (Right Wall) */}
        <mesh
          position={[buildingWidth / 2, wallHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[wallThickness, wallHeight, buildingLength]} />
          <primitive object={wallMaterial} attach="material" />
        </mesh>

        {/* TƯỜNG TRƯỚC (Front Wall) CÓ 2 CỬA CUỐN & MẶT TIỀN */}
        <group position={[0, 0, buildingLength / 2]}>
          {/* Mảng tường trên cửa (Upper front banner wall) */}
          <mesh
            position={[0, doorH + (wallHeight - doorH) / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[buildingWidth, wallHeight - doorH, wallThickness]} />
            <primitive object={wallMaterial} attach="material" />
          </mesh>

          {/* Trụ tường bên ngoài bên trái */}
          <mesh
            position={[leftOuterPillarX, doorH / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[leftOuterPillarW, doorH, wallThickness]} />
            <primitive object={wallMaterial} attach="material" />
          </mesh>

          {/* Trụ tường bên ngoài bên phải */}
          <mesh
            position={[rightOuterPillarX, doorH / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[leftOuterPillarW, doorH, wallThickness]} />
            <primitive object={wallMaterial} attach="material" />
          </mesh>

          {/* Trụ giữa giữa 2 cửa cuốn */}
          <mesh position={[0, doorH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[centerPillarW, doorH, wallThickness]} />
            <primitive object={wallMaterial} attach="material" />
          </mesh>

          {/* Cửa cuốn Inbound (Door 1) */}
          <mesh position={[door1X, doorH / 2, 0.05]} castShadow>
            <boxGeometry args={[doorW, doorH, 0.1]} />
            <meshStandardMaterial map={door1Texture} roughness={0.5} metalness={0.4} />
          </mesh>

          {/* Cửa cuốn Outbound (Door 2) */}
          <mesh position={[door2X, doorH / 2, 0.05]} castShadow>
            <boxGeometry args={[doorW, doorH, 0.1]} />
            <meshStandardMaterial map={door2Texture} roughness={0.5} metalness={0.4} />
          </mesh>

          {/* Đệm cao su dock xe tải chân cửa (Dock Bumpers) */}
          {[
            door1X - doorW / 2 - 0.2,
            door1X + doorW / 2 + 0.2,
            door2X - doorW / 2 - 0.2,
            door2X + doorW / 2 + 0.2,
          ].map((bx, bIdx) => (
            <mesh key={`dock-bumper-${bIdx}`} position={[bx, 0.6, 0.2]}>
              <boxGeometry args={[0.35, 1.2, 0.4]} />
              <meshStandardMaterial color="#1e293b" roughness={0.9} />
            </mesh>
          ))}

          {/* Cửa thoát hiểm nhân viên ở giữa (Personnel Emergency Door) */}
          <mesh position={[0, 1.3, 0.06]} castShadow>
            <boxGeometry args={[1.8, 2.6, 0.12]} />
            <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.5} />
          </mesh>

          {/* Biển EXIT phát quang trên cửa thoát hiểm */}
          <mesh position={[0, 2.9, 0.18]}>
            <planeGeometry args={[1.2, 0.5]} />
            <meshBasicMaterial map={exitSignTexture} side={DoubleSide} />
          </mesh>

          {/* Biển hiệu thương hiệu StockSpace lớn mặt tiền tòa nhà (Building Facade Sign) */}
          <mesh position={[0, wallHeight - 2.2, 0.18]}>
            <planeGeometry args={[12, 2.8]} />
            <meshBasicMaterial map={buildingSignTexture} side={DoubleSide} />
          </mesh>
        </group>
      </group>

      {/* 4. Trạm PCCC & Biển an toàn gắn tường trong kho */}
      <group raycast={() => null}>
        {[-buildingWidth / 2 + 0.35, buildingWidth / 2 - 0.35].map((wx, idx) => (
          <group key={`safety-station-${idx}`}>
            <mesh position={[wx, 1.2, 4]}>
              <boxGeometry args={[0.25, 1.6, 0.9]} />
              <meshStandardMaterial color="#b91c1c" roughness={0.3} metalness={0.4} />
            </mesh>
            <mesh
              position={[wx + (idx === 0 ? 0.15 : -0.15), 2.3, 4]}
              rotation={[0, idx === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
            >
              <planeGeometry args={[0.9, 0.45]} />
              <meshBasicMaterial map={fireSignTexture} side={DoubleSide} />
            </mesh>
            <mesh
              position={[wx + (idx === 0 ? 0.15 : -0.15), 2.3, 10]}
              rotation={[0, idx === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
            >
              <planeGeometry args={[0.9, 0.45]} />
              <meshBasicMaterial map={ppeSignTexture} side={DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 5. Mái Nhà Công Nghiệp & Vì Kèo Thép (Roof & Trusses) */}
      {isRoofVisible && (
        <group raycast={() => null}>
          {/* 2 Tường đầu hồi hình tam giác ở trước & sau */}
          <mesh position={[0, wallHeight, buildingLength / 2]}>
            <shapeGeometry args={[gableShape]} />
            <meshStandardMaterial
              map={wallTexture}
              transparent={isRoofXray}
              opacity={isRoofXray ? 0.3 : 1.0}
              depthWrite={!isRoofXray}
              side={DoubleSide}
            />
          </mesh>
          <mesh position={[0, wallHeight, -buildingLength / 2]} rotation={[0, Math.PI, 0]}>
            <shapeGeometry args={[gableShape]} />
            <meshStandardMaterial
              map={wallTexture}
              transparent={isRoofXray}
              opacity={isRoofXray ? 0.3 : 1.0}
              depthWrite={!isRoofXray}
              side={DoubleSide}
            />
          </mesh>

          {/* Mái dốc trái (Left Roof Slope) - khớp mí đỉnh nóc X=0 và phủ tường trái */}
          <mesh
            position={[leftRoofCenterX, roofCenterY, 0]}
            rotation={[-Math.PI / 2, -roofPitch, 0]}
            castShadow
            receiveShadow
          >
            <planeGeometry args={[roofSlopeLen, roofLength]} />
            <meshStandardMaterial
              map={roofTexture}
              roughness={0.55}
              metalness={0.35}
              side={DoubleSide}
              transparent={isRoofXray}
              opacity={isRoofXray ? 0.22 : 1.0}
              depthWrite={!isRoofXray}
            />
          </mesh>

          {/* Mái dốc phải (Right Roof Slope) - khớp mí đỉnh nóc X=0 và phủ tường phải */}
          <mesh
            position={[rightRoofCenterX, roofCenterY, 0]}
            rotation={[-Math.PI / 2, roofPitch, 0]}
            castShadow
            receiveShadow
          >
            <planeGeometry args={[roofSlopeLen, roofLength]} />
            <meshStandardMaterial
              map={roofTexture}
              roughness={0.55}
              metalness={0.35}
              side={DoubleSide}
              transparent={isRoofXray}
              opacity={isRoofXray ? 0.22 : 1.0}
              depthWrite={!isRoofXray}
            />
          </mesh>

          {/* Thanh tôn úp nóc đỉnh mái (Ridge Cap) - che khít hoàn hảo mối ghép đỉnh */}
          <mesh position={[0, roofApex + 0.04, 0]}>
            <boxGeometry args={[0.55, 0.08, roofLength + 0.05]} />
            <meshStandardMaterial
              color="#334155"
              roughness={0.5}
              metalness={0.6}
              transparent={isRoofXray}
              opacity={isRoofXray ? 0.25 : 1.0}
              depthWrite={!isRoofXray}
            />
          </mesh>

          {/* Tấm lấy sáng Polycarbonate tự nhiên (Skylights) - ốp sát chuẩn mặt nghiêng mái */}
          {[-12, 0, 12].map((sz, sIdx) => {
            const skylightDistX = buildingWidth / 4
            const skylightY = roofApex - skylightDistX * Math.tan(roofPitch) + 0.03
            return (
              <group key={`skylight-${sIdx}`}>
                {/* Tấm lấy sáng mái trái */}
                <mesh
                  position={[-skylightDistX, skylightY, sz]}
                  rotation={[-Math.PI / 2, -roofPitch, 0]}
                >
                  <planeGeometry args={[2.8, 4.8]} />
                  <meshStandardMaterial
                    color="#bae6fd"
                    roughness={0.15}
                    metalness={0.1}
                    transparent
                    opacity={isRoofXray ? 0.25 : 0.65}
                    depthWrite={false}
                    side={DoubleSide}
                  />
                </mesh>
                {/* Tấm lấy sáng mái phải */}
                <mesh
                  position={[skylightDistX, skylightY, sz]}
                  rotation={[-Math.PI / 2, roofPitch, 0]}
                >
                  <planeGeometry args={[2.8, 4.8]} />
                  <meshStandardMaterial
                    color="#bae6fd"
                    roughness={0.15}
                    metalness={0.1}
                    transparent
                    opacity={isRoofXray ? 0.25 : 0.65}
                    depthWrite={false}
                    side={DoubleSide}
                  />
                </mesh>
              </group>
            )
          })}

          {/* Hệ vì kèo thép chịu lực (Space Trusses) */}
          {trussZList.map((tz, tIdx) => (
            <group key={`truss-${tIdx}`} position={[0, wallHeight, tz]}>
              {/* Thanh đáy giằng ngang */}
              <mesh position={[0, -0.1, 0]}>
                <boxGeometry args={[buildingWidth - 0.4, 0.2, 0.2]} />
                <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.8} />
              </mesh>
              {/* Thanh dốc sườn trái */}
              <mesh
                position={[-(buildingWidth / 4), (roofApex - wallHeight) / 2, 0]}
                rotation={[0, 0, roofPitch]}
              >
                <boxGeometry args={[trussRafterLen, 0.2, 0.2]} />
                <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.8} />
              </mesh>
              {/* Thanh dốc sườn phải */}
              <mesh
                position={[buildingWidth / 4, (roofApex - wallHeight) / 2, 0]}
                rotation={[0, 0, -roofPitch]}
              >
                <boxGeometry args={[trussRafterLen, 0.2, 0.2]} />
                <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.8} />
              </mesh>
              {/* Các thanh chống đứng giàn kèo */}
              {[-14, -10, -6, -2, 2, 6, 10, 14].map((wx, wIdx) => {
                const hAtX = (1 - Math.abs(wx) / (buildingWidth / 2)) * (roofApex - wallHeight)
                if (hAtX < 0.4) return null
                return (
                  <mesh key={`strut-${wIdx}`} position={[wx, hAtX / 2, 0]}>
                    <boxGeometry args={[0.12, hAtX, 0.12]} />
                    <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.8} />
                  </mesh>
                )
              })}
            </group>
          ))}

          {/* Ống thông gió HVAC xoắn tròn mạ kẽm chạy dọc trần */}
          <mesh
            position={[-11, wallHeight - 0.6, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.35, 0.35, buildingLength - 4, 16]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.25} metalness={0.75} />
          </mesh>
          <mesh
            position={[11, wallHeight - 0.6, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.35, 0.35, buildingLength - 4, 16]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.25} metalness={0.75} />
          </mesh>

          {/* Đường ống PCCC màu đỏ chạy dọc trần */}
          {[-5, 0, 5].map((px, pIdx) => (
            <mesh
              key={`pipe-${pIdx}`}
              position={[px, wallHeight - 0.4, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.08, 0.08, buildingLength - 2, 12]} />
              <meshStandardMaterial color="#dc2626" roughness={0.35} metalness={0.5} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

/**
 * Điều khiển Camera thông minh: Góc nhìn rộng rãi, thoáng đạt chuẩn nhà kho công nghiệp
 */
function WarehouseCameraController({
  focusedRack,
  cameraPreset,
  racksBounds,
  layoutWidth,
  layoutLength,
  worldWidth,
  worldDepth,
  buildingWidth = 38,
  buildingLength = 46,
  wallHeight = 11,
}) {
  const { camera } = useThree()
  const controlsRef = useRef(null)

  useEffect(() => {
    let targetX = 0
    let targetY = 4.5
    let targetZ = 0
    let cameraX = 28
    let cameraY = 20
    let cameraZ = 36

    if (cameraPreset === 'TOP_DOWN') {
      targetX = 0
      targetY = 0
      targetZ = 0
      cameraX = 0.001
      cameraY = Math.max(buildingLength * 0.92, 42)
      cameraZ = 0
    } else if (cameraPreset === 'FRONT') {
      targetX = 0
      targetY = wallHeight * 0.45
      targetZ = 0
      cameraX = 0
      cameraY = wallHeight * 0.58
      cameraZ = buildingLength / 2 + 20
    } else if (cameraPreset === 'INSIDE') {
      // Góc nhìn người thực tế đứng bên trong nhà kho (Human Eye-Level Walkthrough ~1.75m)
      const eyeHeight = 1.75
      const standZ = Math.min(
        Math.max(racksBounds.centerZ + racksBounds.sizeZ / 2 + 3.6, 6.0),
        buildingLength / 2 - 2.5
      )
      const standX = racksBounds.centerX

      targetX = racksBounds.centerX
      targetY = 2.0
      targetZ = racksBounds.centerZ

      cameraX = standX
      cameraY = eyeHeight
      cameraZ = standZ
    } else if (cameraPreset === 'CLOSE_UP') {
      targetX = racksBounds.centerX
      targetY = Math.max(racksBounds.centerY, 2.5)
      targetZ = racksBounds.centerZ
      cameraX = racksBounds.centerX + 7.5
      cameraY = Math.max(racksBounds.maxH * 0.65, 3.2)
      cameraZ = racksBounds.centerZ + 9.5
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
      // DEFAULT: Toàn cảnh bên ngoài nhà kho góc nghiêng ~24° chuẩn my-react-app
      targetX = 0
      targetY = Math.max(wallHeight * 0.38, 4.2)
      targetZ = 2
      const camScale = Math.max(buildingWidth / 38, buildingLength / 46, 1)
      cameraX = 28 * camScale
      cameraY = 20 * camScale
      cameraZ = 36 * camScale
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
    buildingWidth,
    buildingLength,
    wallHeight,
  ])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      target={[0, 4.5, 0]}
      maxPolarAngle={Math.PI / 2 - 0.02}
      minDistance={1.5}
      maxDistance={115}
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [roofMode, setRoofMode] = useState('xray')

  useEffect(() => {
    if (selection?.type === 'rack' || selection?.type === 'bin') {
      setIsSidebarOpen(true)
    }
  }, [selection])

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

  const buildingWidth = useMemo(
    () => Math.max(worldWidth + 22, 38),
    [worldWidth]
  )
  const buildingLength = useMemo(
    () => Math.max(worldDepth + 24, 46),
    [worldDepth]
  )
  const buildingWallHeight = useMemo(
    () => Math.max(racksBounds?.maxH ? racksBounds.maxH + 4.5 : 11.0, 11.0),
    [racksBounds?.maxH]
  )

  const sceneBounds = useMemo(
    () => ({
      centerX: 0,
      centerY: Math.max(racksBounds.centerY, 4.0),
      centerZ: 0,
      sizeX: buildingWidth,
      sizeZ: buildingLength,
      maxH: buildingWallHeight,
      span: Math.max(buildingWidth, buildingLength),
    }),
    [buildingLength, buildingWallHeight, buildingWidth, racksBounds.centerY]
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
          ? 'fixed inset-0 z-9999 h-screen w-screen overflow-hidden rounded-none bg-[#0f172a] font-sans select-none'
          : 'relative h-full w-full overflow-hidden rounded-2xl bg-[#0f172a] font-sans select-none'
      }
    >
      <div className={`absolute inset-0 transition-all duration-300 ${isFullscreen && isSidebarOpen ? 'lg:right-92' : ''}`}>
        <Canvas
          shadows
          camera={{ position: [28, 20, 36], fov: 46 }}
          className="h-full w-full"
          onPointerMissed={() => {
            onSelect({ type: 'layout' })
          }}
        >
          <color attach="background" args={['#0f172a']} />
          <fogExp2 attach="fog" args={['#0f172a', 0.005]} />

          <ambientLight intensity={0.85} color="#94a3b8" />
          <directionalLight
            castShadow
            position={[25, 38, 20]}
            intensity={1.4}
            color="#fffbeb"
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0003}
          />
          <directionalLight position={[-25, 25, -25]} intensity={0.4} color="#60a5fa" />

          <WarehouseFloor
            width={worldWidth}
            depth={worldDepth}
            buildingWidth={buildingWidth}
            buildingLength={buildingLength}
            floorTexture={floorTexture}
          />
          <WarehouseBuildingArchitecture
            width={worldWidth}
            depth={worldDepth}
            buildingWidth={buildingWidth}
            buildingLength={buildingLength}
            wallHeight={buildingWallHeight}
            racksBounds={racksBounds}
            roofMode={roofMode}
            cameraPreset={cameraPreset}
          />
          <ContactShadows
            position={[0, 0.02, 0]}
            scale={[Math.max(worldWidth * 1.1, 14), Math.max(worldDepth * 1.1, 14)]}
            opacity={0.32}
            blur={2.4}
            far={4.0}
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
            racksBounds={racksBounds}
            buildingWidth={buildingWidth}
            buildingLength={buildingLength}
            wallHeight={buildingWallHeight}
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
          ['INSIDE', '🚶 Nhìn bên trong'],
          ['CLOSE_UP', 'Cận cảnh'],
          ['TOP_DOWN', 'Mặt bằng'],
          ['FRONT', 'Trực diện'],
        ].map(([preset, label]) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setCameraPreset(preset)
              if (preset === 'DEFAULT' || preset === 'INSIDE') onClearFocus()
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

        <div className="mx-0.5 h-4 w-px bg-slate-300" />

        {/* Nút bật tắt chế độ Mái kho (House Roof Modes) */}
        <button
          type="button"
          onClick={() => {
            setRoofMode((prev) => (prev === 'xray' ? 'solid' : prev === 'solid' ? 'hidden' : 'xray'))
          }}
          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
            roofMode === 'solid'
              ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.35)]'
              : roofMode === 'xray'
                ? 'bg-sky-500/20 text-sky-700 border border-sky-400/40'
                : 'text-slate-500 hover:bg-slate-100'
          }`}
          title="Chuyển đổi góc nhìn Mái kho: Mờ X-Ray / Đóng kín / Mở mái"
        >
          {roofMode === 'solid'
            ? '🏠 Mái: Đóng kín'
            : roofMode === 'xray'
              ? '🔍 Mái: Mờ (X-Ray)'
              : '🚫 Mái: Mở'}
        </button>
      </div>

      <div
        className={`absolute top-3 z-20 flex items-center gap-2 transition-all duration-300 ${
          isFullscreen && isSidebarOpen ? 'right-3 lg:right-[24.5rem]' : 'right-3'
        }`}
      >
        {isFullscreen && !isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/85 px-3 py-2 text-[11px] font-bold text-slate-700 shadow-lg backdrop-blur-md transition hover:bg-sky-600 hover:text-white"
            title="Mở bảng thông tin chi tiết"
          >
            📊 Thông tin kho
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsFullscreen((previous) => !previous)}
          className="rounded-xl border border-white/60 bg-white/85 px-3 py-2 text-[11px] font-bold text-slate-700 shadow-lg backdrop-blur-md transition hover:bg-sky-600 hover:text-white"
          title={isFullscreen ? 'Thu nhỏ (Esc)' : 'Mở toàn màn hình'}
        >
          {isFullscreen ? '✕ Thu nhỏ' : '⛶ Toàn màn hình'}
        </button>
      </div>

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

      {isFullscreen && isSidebarOpen && (
        <aside className="absolute top-0 right-0 bottom-0 z-30 flex w-92 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-l-2xl border-l border-white/10 bg-[#071629]/96 text-white shadow-2xl backdrop-blur-xl transition-all duration-300">
          <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
            <div className="min-w-0 pr-2">
              <p className="text-[9px] font-black tracking-[0.2em] text-sky-300 uppercase">
                Warehouse intelligence
              </p>
              <h3 className="mt-1 truncate text-base font-extrabold text-white">
                {layout?.name || 'Sơ đồ kho'}
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {selectedBinInfo
                  ? 'Thông tin Bin được chọn'
                  : selectedRackInfo
                    ? 'Thông tin Rack được chọn'
                    : 'Thông tin chi tiết'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="Đóng bảng thông tin"
              aria-label="Đóng bảng thông tin"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <section className="border-b border-white/10 px-5 py-3.5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {warehouseAreaLabel}
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-300">
                  {formatMetric(warehouseAreaM2, 2)} m²
                </p>
              </div>
              <div className="min-w-0 shrink-0 text-right text-[10px] text-slate-400">
                <p>Kích thước mặt bằng</p>
                <p className="mt-1 font-bold text-slate-200">
                  {formatMetric(layout?.width, 2)} × {formatMetric(layout?.length, 2)} m
                </p>
              </div>
            </div>
          </section>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {selectedBinInfo ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-wider text-cyan-300 uppercase">
                        Selected Bin
                      </p>
                      <h4 className="mt-1 truncate text-2xl font-black text-white">
                        {selectedBinInfo.binCode}
                      </h4>
                      <p className="mt-1 truncate text-xs text-slate-300">
                        {selectedBinInfo.rackCode} · Tầng {selectedBinInfo.shelfLevel}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${selectedStatus.className}`}
                    >
                      {selectedStatus.label}
                    </span>
                  </div>
                </div>

                <section className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                  <div className="mb-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Tải trọng</span>
                    <span className="shrink-0 font-bold text-emerald-300">
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
                  <div className="mt-3 mb-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Thể tích</span>
                    <span className="shrink-0 font-bold text-sky-300">
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

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] text-slate-400">Số lượng</p>
                    <p className="mt-1 text-lg font-black text-white">
                      {formatMetric(selectedQuantity, 0)}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] text-slate-400">Kích thước</p>
                    <p className="mt-1 truncate text-sm font-black text-white">
                      {formatMetric(selectedBinInfo.bin?.width, 2)} ×{' '}
                      {formatMetric(selectedBinInfo.bin?.length, 2)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">W × L m</p>
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
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5"
                        >
                          <span className="truncate pr-2 text-xs font-bold text-slate-200">
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
                <div className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-3.5">
                  <p className="text-[10px] font-bold tracking-wider text-sky-300 uppercase">
                    Selected Rack
                  </p>
                  <h4 className="mt-1 truncate text-2xl font-black text-white">
                    {selectedRackInfo.rackCode}
                  </h4>
                  <p className="mt-1 truncate text-xs text-slate-300">
                    {selectedRackInfo.rack.name || 'Rack đang chọn'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] text-slate-400">Kích thước</p>
                    <p className="mt-1 truncate text-sm font-black text-white">
                      {formatMetric(selectedRackInfo.rack.width, 2)} ×{' '}
                      {formatMetric(selectedRackInfo.rack.length, 2)} ×{' '}
                      {formatMetric(selectedRackInfo.rack.height, 2)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">W × L × H m</p>
                  </div>
                  <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] text-slate-400">Tầng / Bin</p>
                    <p className="mt-1 text-lg font-black text-white">
                      {selectedRackInfo.shelfCount} / {selectedRackInfo.binCount}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">đang cấu hình</p>
                  </div>
                </div>

                <section className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5 text-[11px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Tải trọng tối đa</span>
                    <span className="shrink-0 font-bold text-emerald-300">
                      {selectedRackInfo.maxWeight > 0
                        ? `${formatMetric(selectedRackInfo.maxWeight, 2)} kg`
                        : 'Không giới hạn'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-slate-400">Thể tích tối đa</span>
                    <span className="shrink-0 font-bold text-sky-300">
                      {selectedRackInfo.maxVolume > 0
                        ? `${formatMetric(selectedRackInfo.maxVolume, 3)} m³`
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
          <div className="border-t border-white/10 px-5 py-3 text-[10px] text-slate-500">
            StockSpace WMS · Đang đồng bộ
          </div>
        </aside>
      )}
    </div>
  )
}
