import { Suspense, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Billboard,
  ContactShadows,
  Environment,
  OrbitControls,
  Outlines,
  PivotControls,
  RoundedBox,
  Text,
} from '@react-three/drei'
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  LinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'

const WORLD_SIZE = 18

const colorByType = {
  rack: '#d97706',
  bin: '#d28b46',
}

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

const getRackLevels = (rack) => clamp(Math.round(numberOf(rack?.height, 12) / 6), 2, 6)

const getLevelFromCoordinate = (rack, bin) => {
  const levels = getRackLevels(rack)
  const maxCoordinate = Math.max(numberOf(rack?.height) - numberOf(bin?.height), 0)
  if (levels <= 1 || maxCoordinate <= 0) return 1
  const ratio = 1 - clamp(numberOf(bin?.coordinateY) / maxCoordinate, 0, 1)
  return clamp(Math.round(ratio * (levels - 1)) + 1, 1, levels)
}

const getShelfY = (levelIndex, levels, rackHeight) => {
  const usableHeight = Math.max(rackHeight - 1.2, 0.8)
  if (levels <= 1) return 0.7 + usableHeight / 2
  return 0.7 + (levelIndex / (levels - 1)) * usableHeight
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

  // A layout Bin has a configured maxWeight, but no real stock weight. Only
  // show the fill level when the capacity endpoint supplied currentWeightKg.
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

const makeCanvasTexture = (draw, repeatX, repeatY, colorSpace) => {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) return null

  draw(context, canvas.width, canvas.height)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  if (colorSpace) texture.colorSpace = colorSpace
  texture.needsUpdate = true
  return texture
}

const createTexturePack = () => {
  const binColor = makeCanvasTexture(
    (context, width, height) => {
      context.fillStyle = '#a97a4d'
      context.fillRect(0, 0, width, height)
      context.strokeStyle = 'rgba(247, 222, 184, 0.15)'
      context.lineWidth = 2
      for (let x = 18; x < width; x += 44) {
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x + 6, height)
        context.stroke()
      }
      context.strokeStyle = 'rgba(75, 45, 25, 0.18)'
      context.lineWidth = 1
      for (let y = 22; y < height; y += 38) {
        context.beginPath()
        context.moveTo(0, y)
        context.lineTo(width, y + 4)
        context.stroke()
      }
      context.fillStyle = 'rgba(255, 236, 204, 0.18)'
      for (let index = 0; index < 130; index += 1) {
        const x = (index * 47) % width
        const y = (index * 83) % height
        context.fillRect(x, y, 1 + (index % 3), 1 + (index % 2))
      }
    },
    1,
    1,
    SRGBColorSpace
  )

  const binBump = makeCanvasTexture(
    (context, width, height) => {
      context.fillStyle = '#e0cfa8'
      context.fillRect(0, 0, width, height)
      context.strokeStyle = '#e0cfa8'
      context.lineWidth = 4
      for (let x = 0; x < width; x += 32) {
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x, height)
        context.stroke()
      }
      context.strokeStyle = '#686868'
      context.lineWidth = 2
      context.strokeRect(10, 10, width - 20, height - 20)
    },
    1,
    1
  )

  const binRoughness = makeCanvasTexture(
    (context, width, height) => {
      context.fillStyle = '#c5c5c5'
      context.fillRect(0, 0, width, height)
      context.fillStyle = '#e0cfa8'
      for (let index = 0; index < 100; index += 1) {
        const x = (index * 29) % width
        const y = (index * 61) % height
        context.fillRect(x, y, 3, 3)
      }
    },
    1,
    1
  )

  const concreteColor = makeCanvasTexture(
    (context, width, height) => {
      context.fillStyle = '#8e9aa2'
      context.fillRect(0, 0, width, height)
      for (let index = 0; index < 180; index += 1) {
        const value = 118 + ((index * 17) % 38)
        context.fillStyle = `rgb(${value}, ${value + 7}, ${value + 12})`
        context.fillRect((index * 43) % width, (index * 71) % height, 2 + (index % 4), 2)
      }
      context.strokeStyle = 'rgba(215, 225, 230, 0.18)'
      context.lineWidth = 1
      for (let x = 0; x < width; x += 64) {
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x + 18, height)
        context.stroke()
      }
    },
    3,
    3,
    SRGBColorSpace
  )

  const concreteRoughness = makeCanvasTexture(
    (context, width, height) => {
      context.fillStyle = '#6e6e6e'
      context.fillRect(0, 0, width, height)
      context.fillStyle = '#969696'
      for (let index = 0; index < 160; index += 1) {
        context.fillRect((index * 37) % width, (index * 67) % height, 3, 2)
      }
    },
    3,
    3
  )

  return { binColor, binBump, binRoughness, concreteColor, concreteRoughness }
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
    gl.toneMappingExposure = 0.96

    return () => {
      gl.toneMapping = previousToneMapping
      gl.toneMappingExposure = previousExposure
      composer.dispose()
    }
  }, [composer, gl])

  useFrame(() => composer.render(), 1)
  return null
}

function WarehouseFloor({ width, depth, textures }) {
  return (
    <>
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width + 4, depth + 4]} />
        <meshPhysicalMaterial
          map={textures.concreteColor}
          roughnessMap={textures.concreteRoughness}
          color="#aab5bb"
          roughness={0.82}
          metalness={0}
          clearcoat={0}
        />
      </mesh>
      <mesh position={[0, -0.095, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width + 4.2, depth + 4.2]} />
        <meshStandardMaterial color="#64727b" roughness={0.88} metalness={0.02} />
      </mesh>
    </>
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
  textures,
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
  const binHeight = clamp(mappedBinHeight, 0.24, Math.max(shelfGap - 0.16, 0.24))
  const shelfY = getShelfY(level - 1, levels, rackHeight)
  const y = shelfY + 0.1 + binHeight / 2
  const quantity = getBinQuantity(bin)
  const weightCapacity = getBinWeightCapacity(bin, capacityMetric)
  const binCode = getDisplayCode(bin, 'BIN')
  const tapeWidth = Math.max(width * 0.16, 0.06)
  const labelWidth = Math.max(width * 0.38, 0.12)
  const labelHeight = Math.max(binHeight * 0.34, 0.09)
  const barcodeBars = [0.018, 0.035, 0.012, 0.028, 0.016, 0.042, 0.014, 0.024]
  const fillInset = clamp(Math.min(width, depth) * 0.06, 0.025, 0.08)
  const fillWidth = Math.max(width - fillInset * 2, 0.04)
  const fillDepth = Math.max(depth - fillInset * 2, 0.04)
  const fillHeight = Math.max((binHeight - fillInset * 2) * (weightCapacity?.ratio || 0), 0)
  const fillY = -binHeight / 2 + fillInset + fillHeight / 2
  const fillColor = weightCapacity?.isOverCapacity ? '#991b1b' : '#5b3825'
  const capacityLabel = weightCapacity ? `${Math.round(weightCapacity.ratio * 100)}% loaded` : null

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
        const levelRatio = clamp((draggedCenterY - 0.7) / usableHeight, 0, 1)
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
      <group
        position={[x, y, z]}
        onClick={(event) => {
          event.stopPropagation()
          onSelect({
            type: 'bin',
            clientKey: bin.clientKey,
            multi: event.ctrlKey || event.metaKey,
          })
        }}
      >
        <RoundedBox
          args={[width, binHeight, depth]}
          radius={Math.min(width, depth, binHeight) * 0.035}
          smoothness={4}
          bevelSegments={2}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            map={textures.binColor}
            bumpMap={textures.binBump}
            bumpScale={0.018}
            roughnessMap={textures.binRoughness}
            color={isSelected ? '#b8d8fa' : colorByType.bin}
            roughness={0.84}
            metalness={0}
            clearcoat={0}
            emissive={isSelected ? '#75b8ff' : '#000000'}
            emissiveIntensity={isSelected ? 0.08 : 0}
          />
          {isSelected && <Outlines color="#ffffff" thickness={0.085} screenspace />}
        </RoundedBox>

        {weightCapacity && fillHeight > 0.01 && (
          <group position={[0, fillY, 0]}>
            {/* The dark layer is placed on visible faces so the load level
                remains readable through the cardboard model. */}
            <mesh position={[0, 0, depth / 2 + 0.014]} renderOrder={2}>
              <planeGeometry args={[fillWidth, fillHeight]} />
              <meshStandardMaterial
                color={fillColor}
                transparent
                opacity={0.64}
                depthWrite={false}
                roughness={0.88}
              />
            </mesh>
            <mesh
              position={[width / 2 + 0.014, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
              renderOrder={2}
            >
              <planeGeometry args={[fillDepth, fillHeight]} />
              <meshStandardMaterial
                color={fillColor}
                transparent
                opacity={0.52}
                depthWrite={false}
                roughness={0.88}
              />
            </mesh>
            <mesh
              position={[-width / 2 - 0.014, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
              renderOrder={2}
            >
              <planeGeometry args={[fillDepth, fillHeight]} />
              <meshStandardMaterial
                color={fillColor}
                transparent
                opacity={0.52}
                depthWrite={false}
                roughness={0.88}
              />
            </mesh>
          </group>
        )}

        <mesh position={[0, binHeight / 2 + 0.006, 0]} castShadow>
          <boxGeometry args={[tapeWidth, 0.012, depth * 0.92]} />
          <meshStandardMaterial color="#d3bd9b" roughness={0.92} />
        </mesh>

        <mesh position={[0, 0, depth / 2 + 0.008]} castShadow>
          <planeGeometry args={[labelWidth, labelHeight]} />
          <meshStandardMaterial color="#d8c29e" roughness={0.9} />
        </mesh>

        <group position={[0, -labelHeight * 0.12, depth / 2 + 0.014]}>
          {barcodeBars.map((barWidth, index) => (
            <mesh
              key={`barcode-${index}`}
              position={[
                -labelWidth * 0.3 +
                  barcodeBars.slice(0, index).reduce((total, value) => total + value, 0),
                -labelHeight * 0.16,
                0,
              ]}
            >
              <planeGeometry args={[barWidth, labelHeight * 0.46]} />
              <meshBasicMaterial color="#463a2d" />
            </mesh>
          ))}
        </group>

        <Billboard position={[0, labelHeight * 0.24, depth / 2 + 0.018]} follow>
          <group>
            <Text
              fontSize={clamp(width * 0.11, 0.045, 0.095)}
              maxWidth={Math.max(labelWidth * 0.9, 0.15)}
              lineHeight={1}
              color="#4b2e1e"
              anchorX="center"
              anchorY="middle"
              textAlign="center"
              outlineWidth={0.003}
              outlineColor="#d8c29e"
            >
              {binCode}
            </Text>
            {quantity !== null && (
              <Text
                position={[0, -labelHeight * 0.28, 0]}
                fontSize={clamp(width * 0.07, 0.035, 0.06)}
                color="#5b4635"
                anchorX="center"
                anchorY="middle"
              >
                {`${quantity} units`}
              </Text>
            )}
            {capacityLabel && (
              <Text
                position={[0, -labelHeight * 0.55, 0]}
                fontSize={clamp(width * 0.06, 0.03, 0.052)}
                color={weightCapacity.isOverCapacity ? '#991b1b' : '#5b3825'}
                anchorX="center"
                anchorY="middle"
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

function PerforatedPost({ position, height, size, isSelected }) {
  const holeCount = clamp(Math.floor(height / 0.3), 5, 22)
  const holeSpacing = height / (holeCount + 1)
  const metalColor = isSelected ? '#9bb7cf' : '#77828a'

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size, height, size]} />
        <meshPhysicalMaterial color={metalColor} roughness={0.62} metalness={0.58} />
      </mesh>
      {Array.from({ length: holeCount }).map((_, index) => (
        <group key={`post-hole-${index}`}>
          <mesh position={[0, -height / 2 + holeSpacing * (index + 1), size / 2 + 0.003]}>
            <planeGeometry args={[size * 0.42, Math.min(size * 0.34, 0.055)]} />
            <meshBasicMaterial color="#34414a" />
          </mesh>
          <mesh
            position={[size / 2 + 0.003, -height / 2 + holeSpacing * (index + 1), 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <planeGeometry args={[size * 0.42, Math.min(size * 0.34, 0.055)]} />
            <meshBasicMaterial color="#34414a" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function PerforatedRail({ position, length, thickness, depth, rotation = [0, 0, 0], isSelected }) {
  const holeCount = clamp(Math.floor(length / 0.35), 4, 28)
  const holeSpacing = length / (holeCount + 1)
  const metalColor = isSelected ? '#9bb7cf' : '#69757d'

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, thickness, depth]} />
        <meshPhysicalMaterial color={metalColor} roughness={0.6} metalness={0.62} />
      </mesh>
      {Array.from({ length: holeCount }).map((_, index) => (
        <mesh
          key={`rail-hole-${index}`}
          position={[-length / 2 + holeSpacing * (index + 1), 0, depth / 2 + 0.003]}
        >
          <planeGeometry
            args={[Math.min(thickness * 0.62, 0.095), Math.min(thickness * 0.45, 0.055)]}
          />
          <meshBasicMaterial color="#34414a" />
        </mesh>
      ))}
    </group>
  )
}

function RackFrame({ width, depth, rackHeight, levels, isSelected }) {
  const postSize = clamp(Math.min(width, depth) * 0.075, 0.1, 0.19)
  const shelfThickness = clamp(rackHeight * 0.035, 0.07, 0.12)
  const beamThickness = clamp(Math.min(width, depth) * 0.052, 0.07, 0.13)
  const shelfColor = isSelected ? '#dbeafe' : '#aeb8bf'
  const postX = Math.max(width / 2 - postSize / 2, 0)
  const postZ = Math.max(depth / 2 - postSize / 2, 0)
  const shelfWidth = Math.max(width - postSize * 1.25, postSize)
  const shelfDepth = Math.max(depth - postSize * 1.25, postSize)
  const shelfY = (levelIndex) => getShelfY(levelIndex, levels, rackHeight)

  const postPositions = [
    [-postX, rackHeight / 2, -postZ],
    [postX, rackHeight / 2, -postZ],
    [-postX, rackHeight / 2, postZ],
    [postX, rackHeight / 2, postZ],
  ]

  return (
    <>
      {postPositions.map((position, index) => (
        <PerforatedPost
          key={`post-${index}`}
          position={position}
          height={rackHeight}
          size={postSize}
          isSelected={isSelected}
        />
      ))}

      {Array.from({ length: levels }).map((_, levelIndex) => {
        const y = shelfY(levelIndex)
        return (
          <group key={`shelf-${levelIndex}`}>
            <mesh position={[0, y, 0]} castShadow receiveShadow>
              <boxGeometry args={[shelfWidth, shelfThickness, shelfDepth]} />
              <meshPhysicalMaterial
                color={shelfColor}
                roughness={0.68}
                metalness={0.12}
                clearcoat={0}
              />
            </mesh>
            <PerforatedRail
              position={[0, y + shelfThickness / 2, postZ]}
              length={shelfWidth}
              thickness={beamThickness}
              depth={beamThickness}
              isSelected={isSelected}
            />
            <PerforatedRail
              position={[0, y + shelfThickness / 2, -postZ]}
              length={shelfWidth}
              thickness={beamThickness}
              depth={beamThickness}
              isSelected={isSelected}
            />
            <PerforatedRail
              position={[postX, y + shelfThickness / 2, 0]}
              length={shelfDepth}
              thickness={beamThickness}
              depth={beamThickness}
              rotation={[0, Math.PI / 2, 0]}
              isSelected={isSelected}
            />
            <PerforatedRail
              position={[-postX, y + shelfThickness / 2, 0]}
              length={shelfDepth}
              thickness={beamThickness}
              depth={beamThickness}
              rotation={[0, Math.PI / 2, 0]}
              isSelected={isSelected}
            />
          </group>
        )
      })}

      <PerforatedRail
        position={[0, rackHeight - beamThickness / 2, postZ]}
        length={shelfWidth}
        thickness={beamThickness}
        depth={beamThickness}
        isSelected={isSelected}
      />
      <PerforatedRail
        position={[0, rackHeight - beamThickness / 2, -postZ]}
        length={shelfWidth}
        thickness={beamThickness}
        depth={beamThickness}
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
  onMoveEntity,
  textures,
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
  const rackHeight = 1.9 + levels * 0.7
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
        >
          <boxGeometry args={[localWidth, rackHeight, localDepth]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          {isSelected && <Outlines color="#ffffff" thickness={0.075} screenspace />}
        </mesh>

        <RackFrame
          width={localWidth}
          depth={localDepth}
          rackHeight={rackHeight}
          levels={levels}
          isSelected={isSelected}
        />

        <Billboard position={[0, rackHeight + 0.32, 0]} follow>
          <Text
            fontSize={clamp(Math.min(width, depth) * 0.16, 0.1, 0.28)}
            color={isSelected ? '#ffffff' : '#26343d'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.018}
            outlineColor={isSelected ? '#1d4ed8' : '#f8fafc'}
          >
            {rackCode}
          </Text>
        </Billboard>

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
            textures={textures}
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
}) {
  const racks = Array.isArray(layout?.racks)
    ? layout.racks
    : (layout?.zones || []).flatMap((zone) =>
        (zone.racks || []).map((rack) => ({
          ...rack,
          coordinateX: numberOf(zone.coordinateX) + numberOf(rack.coordinateX),
          coordinateY: numberOf(zone.coordinateY) + numberOf(rack.coordinateY),
        }))
      )
  const { width: worldWidth, depth: worldDepth } = getWorldDimensions(layout)
  const textures = useMemo(() => createTexturePack(), [])

  useEffect(() => {
    return () => {
      Object.values(textures).forEach((texture) => texture?.dispose())
    }
  }, [textures])

  return (
    <Canvas
      shadows
      camera={{ position: [12, 10, 12], fov: 42 }}
      className="h-full w-full"
      onPointerMissed={() => onSelect({ type: 'layout' })}
    >
      <color attach="background" args={['#d8e1e6']} />
      <fog attach="fog" args={['#d8e1e6', 22, 42]} />

      <Suspense fallback={null}>
        <Environment preset="warehouse" environmentIntensity={0.08} />
      </Suspense>

      <ambientLight intensity={0.28} />
      <hemisphereLight skyColor="#f7fbff" groundColor="#69747c" intensity={0.32} />
      <spotLight
        position={[4, 16, 5]}
        intensity={0.72}
        angle={0.48}
        penumbra={0.88}
        decay={1.35}
        distance={36}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00015}
      />
      <spotLight
        position={[-8, 13, -7]}
        intensity={0.46}
        angle={0.62}
        penumbra={0.92}
        decay={1.5}
        distance={34}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        color="#fff0d1"
      />
      <directionalLight position={[8, 14, -10]} intensity={0.28} castShadow />

      <WarehouseFloor width={worldWidth} depth={worldDepth} textures={textures} />
      <ContactShadows
        position={[0, -0.04, 0]}
        scale={Math.max(worldWidth, worldDepth) + 4}
        opacity={0.34}
        blur={2.4}
        far={Math.max(worldWidth, worldDepth) + 6}
        resolution={512}
        color="#1f2937"
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
          onMoveEntity={onMoveEntity}
          textures={textures}
          capacityByBinId={capacityByBinId}
        />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        target={[0, 1.2, 0]}
        maxPolarAngle={Math.PI / 2.08}
        minDistance={7}
        maxDistance={30}
      />
      <WarehousePostProcessing />
    </Canvas>
  )
}
