import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls, PivotControls } from '@react-three/drei'

const WORLD_SIZE = 18
const FOOTPRINT_GRID_SIZE = 10

const colorByType = {
  zone: '#10b981',
  rack: '#f59e0b',
  bin: '#d946ef',
}

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

function WarehouseShell() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[WORLD_SIZE + 6, WORLD_SIZE + 6]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>

      <mesh position={[-(WORLD_SIZE + 4) / 2, 4.8, 0]} receiveShadow>
        <boxGeometry args={[0.35, 9.6, WORLD_SIZE + 6]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.18} />
      </mesh>

      <mesh position={[(WORLD_SIZE + 4) / 2, 4.8, 0]} receiveShadow>
        <boxGeometry args={[0.35, 9.6, WORLD_SIZE + 6]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.18} />
      </mesh>

      {/* Front wall split into segments so the entrance stays open */}
      <mesh position={[-6.2, 4.8, (WORLD_SIZE + 4) / 2]} receiveShadow>
        <boxGeometry args={[6.8, 9.6, 0.35]} />
        <meshStandardMaterial color="#e5e7eb" transparent opacity={0.14} />
      </mesh>

      <mesh position={[6.2, 4.8, (WORLD_SIZE + 4) / 2]} receiveShadow>
        <boxGeometry args={[6.8, 9.6, 0.35]} />
        <meshStandardMaterial color="#e5e7eb" transparent opacity={0.14} />
      </mesh>

      <mesh position={[0, 8.2, (WORLD_SIZE + 4) / 2]} receiveShadow>
        <boxGeometry args={[6.2, 2.8, 0.35]} />
        <meshStandardMaterial color="#dbe4ee" transparent opacity={0.18} />
      </mesh>

      {/* Entrance frame */}
      <mesh position={[-3.15, 3.2, (WORLD_SIZE + 4) / 2 + 0.03]} castShadow receiveShadow>
        <boxGeometry args={[0.22, 6.4, 0.24]} />
        <meshStandardMaterial color="#475569" metalness={0.15} roughness={0.5} />
      </mesh>

      <mesh position={[3.15, 3.2, (WORLD_SIZE + 4) / 2 + 0.03]} castShadow receiveShadow>
        <boxGeometry args={[0.22, 6.4, 0.24]} />
        <meshStandardMaterial color="#475569" metalness={0.15} roughness={0.5} />
      </mesh>

      <mesh position={[0, 6.35, (WORLD_SIZE + 4) / 2 + 0.03]} castShadow receiveShadow>
        <boxGeometry args={[6.5, 0.22, 0.24]} />
        <meshStandardMaterial color="#475569" metalness={0.15} roughness={0.5} />
      </mesh>

      {/* Entrance threshold */}
      <mesh position={[0, 0.03, (WORLD_SIZE + 4) / 2 - 0.2]} receiveShadow>
        <boxGeometry args={[6.2, 0.08, 1.2]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>

      {/* Side openings near the front so rotating camera still reveals the inside */}
      <mesh position={[-(WORLD_SIZE + 4) / 2, 7.6, 6.8]} receiveShadow>
        <boxGeometry args={[0.35, 4.0, 6.4]} />
        <meshStandardMaterial color="#e2e8f0" opacity={0.1} transparent />
      </mesh>

      <mesh position={[(WORLD_SIZE + 4) / 2, 7.6, 6.8]} receiveShadow>
        <boxGeometry args={[0.35, 4.0, 6.4]} />
        <meshStandardMaterial color="#e2e8f0" opacity={0.1} transparent />
      </mesh>
    </group>
  )
}

function FootprintFloor({ layout }) {
  const cells = Array.isArray(layout?.footprintCells) ? layout.footprintCells : []
  const activeCellSet = new Set(cells.map((cell) => String(cell)))
  const blockedCellSet = new Set((layout?.blockedCells || []).map((cell) => String(cell)))
  const tileSize = WORLD_SIZE / FOOTPRINT_GRID_SIZE

  return (
    <group>
      {Array.from({ length: FOOTPRINT_GRID_SIZE }).map((_, row) =>
        Array.from({ length: FOOTPRINT_GRID_SIZE }).map((__, col) => {
          const cellKey = `${row}:${col}`
          const isActive = activeCellSet.has(cellKey)
          const isBlocked = blockedCellSet.has(cellKey)
          const x = -WORLD_SIZE / 2 + col * tileSize + tileSize / 2
          const z = -WORLD_SIZE / 2 + row * tileSize + tileSize / 2

          return (
            <group key={cellKey} position={[x, isBlocked || isActive ? 0.06 : 0.01, z]}>
              <mesh receiveShadow>
                <boxGeometry
                  args={[tileSize * 0.94, isBlocked || isActive ? 0.12 : 0.02, tileSize * 0.94]}
                />
                <meshStandardMaterial
                  color={isBlocked ? '#0f172a' : isActive ? '#bfdbfe' : '#e5e7eb'}
                  transparent
                  opacity={isBlocked ? 1 : isActive ? 0.92 : 0.42}
                />
              </mesh>
              {isActive && !isBlocked ? (
                <mesh position={[0, 0.08, 0]} receiveShadow>
                  <boxGeometry args={[tileSize * 0.88, 0.02, tileSize * 0.88]} />
                  <meshStandardMaterial color="#60a5fa" transparent opacity={0.85} />
                </mesh>
              ) : null}
            </group>
          )
        })
      )}
    </group>
  )
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
      <mesh
        position={[x, y, z]}
        onClick={(event) => {
          event.stopPropagation()
          onSelect({ type: 'bin', clientKey: bin.clientKey })
        }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, 0.5, depth]} />
        <meshStandardMaterial
          color={colorByType.bin}
          emissive={isSelected ? '#f472b6' : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : 0}
          roughness={0.45}
        />
      </mesh>
    </PivotControls>
  )
}

function RackMesh({ rack, layout, selection, editable, onSelect, onMoveEntity }) {
  const width = getWorldSize(rack.width, layout.width, WORLD_SIZE)
  const depth = getWorldSize(rack.length, layout.length, WORLD_SIZE)
  const x = getWorldCenter(rack.coordinateX, width, layout.width, WORLD_SIZE)
  const z = getWorldCenter(rack.coordinateY, depth, layout.length, WORLD_SIZE)
  const levels = getRackLevels(rack)
  const rackHeight = 1.9 + levels * 0.7
  const isSelected = selection?.type === 'rack' && selection.clientKey === rack.clientKey

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
        const nextX = toCoordinateFromCenter(matrix.elements[12], width, layout.width, WORLD_SIZE)
        const nextY = toCoordinateFromCenter(matrix.elements[14], depth, layout.length, WORLD_SIZE)

        onMoveEntity('rack', rack.clientKey, Number(nextX.toFixed(2)), Number(nextY.toFixed(2)))
      }}
    >
      <group position={[x, 0, z]}>
        <mesh
          position={[0, rackHeight / 2, 0]}
          onClick={(event) => {
            event.stopPropagation()
            onSelect({ type: 'rack', clientKey: rack.clientKey })
          }}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width, rackHeight, depth]} />
          <meshStandardMaterial
            color={colorByType.rack}
            opacity={isSelected ? 0.35 : 0.2}
            transparent
            emissive={isSelected ? '#fdba74' : '#000000'}
            emissiveIntensity={isSelected ? 0.35 : 0}
            roughness={0.48}
          />
        </mesh>

        {Array.from({ length: levels }).map((_, levelIndex) => (
          <mesh
            key={`${rack.clientKey}-shelf-${levelIndex}`}
            position={[0, getShelfY(levelIndex, levels, rackHeight), 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.96, 0.08, depth * 0.92]} />
            <meshStandardMaterial color="#fef3c7" roughness={0.42} />
          </mesh>
        ))}

        {rack.bins.map((bin) => (
          <BinMesh
            key={bin.clientKey}
            bin={bin}
            rack={rack}
            rackWorldWidth={width}
            rackWorldDepth={depth}
            rackHeight={rackHeight}
            isSelected={selection?.type === 'bin' && selection.clientKey === bin.clientKey}
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

      <WarehouseShell />
      <FootprintFloor layout={layout} />

      {racks.map((rack) => (
        <RackMesh
          key={rack.clientKey}
          rack={rack}
          layout={layout}
          selection={selection}
          editable={editable}
          onSelect={onSelect}
          onMoveEntity={onMoveEntity}
        />
      ))}

      <Grid
        position={[0, 0, 0]}
        args={[WORLD_SIZE + 2, WORLD_SIZE + 2]}
        cellSize={1}
        cellThickness={0.7}
        sectionSize={3}
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
