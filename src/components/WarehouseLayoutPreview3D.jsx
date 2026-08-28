import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls, PivotControls } from '@react-three/drei'

const WORLD_SIZE = 18
const FOOTPRINT_GRID_SIZE = 10

const getWorldDimensions = (layout) => {
  const layoutWidth = Math.max(Number(layout?.width) || 1, 1)
  const layoutLength = Math.max(Number(layout?.length) || 1, 1)
  const scale = WORLD_SIZE / Math.max(layoutWidth, layoutLength)

  return {
    width: layoutWidth * scale,
    depth: layoutLength * scale,
  }
}

const colorByType = {
  zone: '#10b981',
  rack: '#c2410c',
  bin: '#f97316',
}

const isItemSelected = (selectedItems, type, key) =>
  selectedItems.some(
    (item) => item.type === type && String(item.key ?? item.clientKey) === String(key)
  )

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const getWorldSize = (value, total, parentWorldSize) =>
  Math.max((value / Math.max(total, 1)) * parentWorldSize, 0.2)

const getWorldCenter = (coordinate, size, total, parentWorldSize) =>
  -parentWorldSize / 2 + (coordinate / Math.max(total, 1)) * parentWorldSize + size / 2

const toCoordinateFromCenter = (center, size, total, parentWorldSize) => {
  const raw = ((center + parentWorldSize / 2 - size / 2) / Math.max(parentWorldSize, 1)) * total
  const max = Math.max(total - (size / Math.max(parentWorldSize, 1)) * total, 0)
  return clamp(raw, 0, max)
}

const getRackLevels = (rack) => clamp(Math.round((Number(rack?.height) || 12) / 6), 2, 6)

const getCoordinateYForLevel = (rack, bin, level) => {
  const levels = getRackLevels(rack)
  const maxCoordinate = Math.max((Number(rack?.height) || 0) - (Number(bin?.height) || 0), 0)
  if (levels <= 1 || maxCoordinate <= 0) return 0
  const normalizedLevel = clamp(level, 1, levels)
  const ratio = (normalizedLevel - 1) / (levels - 1)
  return maxCoordinate - ratio * maxCoordinate
}

const getLevelFromCoordinate = (rack, bin) => {
  const levels = getRackLevels(rack)
  const maxCoordinate = Math.max((Number(rack?.height) || 0) - (Number(bin?.height) || 0), 0)
  if (levels <= 1 || maxCoordinate <= 0) return 1
  const ratio = 1 - clamp((Number(bin?.coordinateY) || 0) / maxCoordinate, 0, 1)
  return clamp(Math.round(ratio * (levels - 1)) + 1, 1, levels)
}

const getShelfY = (levelIndex, levels, rackHeight) => {
  const usableHeight = Math.max(rackHeight - 1.2, 0.8)
  if (levels <= 1) return 0.7 + usableHeight / 2
  return 0.7 + (levelIndex / (levels - 1)) * usableHeight
}

function BinMesh({
  bin,
  rack,
  rackWorldWidth,
  rackWorldDepth,
  rackHeight,
  isSelected,
  editable,
  onSelect,
  onMoveEntity,
}) {
  const width = getWorldSize(bin.width, rack.width, rackWorldWidth)
  const depth = getWorldSize(bin.length, rack.length, rackWorldDepth)
  const x = getWorldCenter(bin.coordinateX, width, rack.width, rackWorldWidth)
  const z = getWorldCenter(bin.coordinateY, depth, rack.length, rackWorldDepth)
  const level = clamp(
    Number(bin.shelfLevel) || getLevelFromCoordinate(rack, bin),
    1,
    getRackLevels(rack)
  )
  const levels = getRackLevels(rack)
  const y = getShelfY(level - 1, levels, rackHeight) + 0.25
  const isBinSelected = isSelected
  const binFrontColor = isBinSelected ? '#bfdbfe' : '#ffedd5'

  return (
    <PivotControls
      visible={editable && isSelected}
      enabled={editable && isSelected}
      activeAxes={[true, true, false]}
      disableRotations
      disableScaling
      scale={0.5}
      depthTest={false}
      anchor={[0, 0, 0]}
      onDrag={(matrix) => {
        const nextX = toCoordinateFromCenter(matrix.elements[12], width, rack.width, rackWorldWidth)
        const normalizedY = clamp(
          (matrix.elements[13] - 0.95) / Math.max(rackHeight - 1.2, 0.8),
          0,
          1
        )
        const nextLevel = clamp(Math.round(normalizedY * (levels - 1)) + 1, 1, levels)
        const nextY = getCoordinateYForLevel(rack, bin, nextLevel)

        onMoveEntity('bin', bin.clientKey, Number(nextX.toFixed(2)), Number(nextY.toFixed(2)))
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
        castShadow
        receiveShadow
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, 0.5, depth]} />
          <meshStandardMaterial
            color={isBinSelected ? '#2563eb' : colorByType.bin}
            emissive={isBinSelected ? '#60a5fa' : '#000000'}
            emissiveIntensity={isBinSelected ? 0.35 : 0}
            roughness={0.45}
          />
        </mesh>
        <mesh position={[0, 0, depth / 2 + 0.006]} castShadow>
          <boxGeometry args={[Math.max(width * 0.68, 0.08), 0.16, 0.012]} />
          <meshStandardMaterial color={binFrontColor} roughness={0.55} />
        </mesh>
      </group>
    </PivotControls>
  )
}

function RackFrame({ width, depth, rackHeight, levels, isSelected }) {
  const postSize = clamp(Math.min(width, depth) * 0.07, 0.06, 0.16)
  const shelfThickness = clamp(rackHeight * 0.035, 0.06, 0.11)
  const railThickness = clamp(Math.min(width, depth) * 0.045, 0.05, 0.1)
  const frameColor = isSelected ? '#1d4ed8' : colorByType.rack
  const shelfColor = isSelected ? '#dbeafe' : '#fed7aa'
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
        <mesh key={`post-${index}`} position={position} castShadow receiveShadow>
          <boxGeometry args={[postSize, rackHeight, postSize]} />
          <meshStandardMaterial color={frameColor} roughness={0.34} metalness={0.2} />
        </mesh>
      ))}

      {Array.from({ length: levels }).map((_, levelIndex) => {
        const y = shelfY(levelIndex)
        return (
          <group key={`shelf-${levelIndex}`}>
            <mesh position={[0, y, 0]} castShadow receiveShadow>
              <boxGeometry args={[shelfWidth, shelfThickness, shelfDepth]} />
              <meshStandardMaterial color={shelfColor} roughness={0.48} metalness={0.08} />
            </mesh>
            <mesh position={[0, y + shelfThickness / 2, postZ]} castShadow>
              <boxGeometry args={[shelfWidth, railThickness, railThickness]} />
              <meshStandardMaterial color={frameColor} roughness={0.38} metalness={0.18} />
            </mesh>
            <mesh position={[0, y + shelfThickness / 2, -postZ]} castShadow>
              <boxGeometry args={[shelfWidth, railThickness, railThickness]} />
              <meshStandardMaterial color={frameColor} roughness={0.38} metalness={0.18} />
            </mesh>
          </group>
        )
      })}

      <mesh position={[0, rackHeight - railThickness / 2, -postZ]} castShadow>
        <boxGeometry args={[shelfWidth, railThickness, railThickness]} />
        <meshStandardMaterial color={frameColor} roughness={0.38} metalness={0.18} />
      </mesh>
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
}) {
  const width = getWorldSize(rack.width, layout.width, worldWidth)
  const depth = getWorldSize(rack.length, layout.length, worldDepth)
  const x = getWorldCenter(rack.coordinateX, width, layout.width, worldWidth)
  const z = getWorldCenter(rack.coordinateY, depth, layout.length, worldDepth)
  const levels = getRackLevels(rack)
  const rackHeight = 1.9 + levels * 0.7
  const isSelected =
    isItemSelected(selectedItems, 'rack', rack.clientKey) ||
    (selectedItems.length === 0 &&
      selection?.type === 'rack' &&
      String(selection.clientKey ?? selection.key) === String(rack.clientKey))

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
      <group position={[x, 0, z]}>
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
          <boxGeometry args={[width, rackHeight, depth]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <RackFrame
          width={width}
          depth={depth}
          rackHeight={rackHeight}
          levels={levels}
          isSelected={isSelected}
        />

        {rack.bins.map((bin) => (
          <BinMesh
            key={bin.clientKey}
            bin={bin}
            rack={rack}
            rackWorldWidth={width}
            rackWorldDepth={depth}
            rackHeight={rackHeight}
            isSelected={
              isItemSelected(selectedItems, 'bin', bin.clientKey) ||
              (selectedItems.length === 0 &&
                selection?.type === 'bin' &&
                String(selection.clientKey ?? selection.key) === String(bin.clientKey))
            }
            editable={editable}
            onSelect={onSelect}
            onMoveEntity={onMoveEntity}
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
  onSelect = () => {},
  onMoveEntity = () => {},
  editable = true,
}) {
  const racks = Array.isArray(layout?.racks)
    ? layout.racks
    : (layout?.zones || []).flatMap((zone) =>
        (zone.racks || []).map((rack) => ({
          ...rack,
          coordinateX: Number(zone.coordinateX || 0) + Number(rack.coordinateX || 0),
          coordinateY: Number(zone.coordinateY || 0) + Number(rack.coordinateY || 0),
        }))
      )
  const { width: worldWidth, depth: worldDepth } = getWorldDimensions(layout)
  const gridCellSize = Math.max(Math.min(worldWidth, worldDepth) / FOOTPRINT_GRID_SIZE, 0.25)

  return (
    <Canvas
      shadows
      camera={{ position: [12, 10, 12], fov: 42 }}
      className="h-full w-full"
      onPointerMissed={() => onSelect({ type: 'layout' })}
    >
      <color attach="background" args={['#dbeafe']} />
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={1.25}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-8, 8, -6]} intensity={0.35} />

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
        />
      ))}

      <Grid
        position={[0, 0, 0]}
        args={[worldWidth + 2, worldDepth + 2]}
        cellSize={gridCellSize}
        cellThickness={0.7}
        sectionSize={gridCellSize * 3}
        sectionThickness={1.2}
        cellColor="#94a3b8"
        sectionColor="#64748b"
        fadeDistance={30}
        infiniteGrid={false}
      />

      <OrbitControls
        makeDefault
        enableDamping
        maxPolarAngle={Math.PI / 2.08}
        minDistance={8}
        maxDistance={28}
      />
    </Canvas>
  )
}
