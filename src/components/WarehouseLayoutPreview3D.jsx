import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls, PivotControls } from '@react-three/drei'

const WORLD_SIZE = 18

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

      <mesh position={[0, 4.8, -(WORLD_SIZE + 4) / 2]} receiveShadow>
        <boxGeometry args={[WORLD_SIZE + 6, 9.6, 0.35]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>

      <mesh position={[-(WORLD_SIZE + 4) / 2, 4.8, 0]} receiveShadow>
        <boxGeometry args={[0.35, 9.6, WORLD_SIZE + 6]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>

      <mesh position={[(WORLD_SIZE + 4) / 2, 4.8, 0]} receiveShadow>
        <boxGeometry args={[0.35, 9.6, WORLD_SIZE + 6]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>

      {/* Front wall split into segments so the entrance stays open */}
      <mesh position={[-6.2, 4.8, (WORLD_SIZE + 4) / 2]} receiveShadow>
        <boxGeometry args={[6.8, 9.6, 0.35]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>

      <mesh position={[6.2, 4.8, (WORLD_SIZE + 4) / 2]} receiveShadow>
        <boxGeometry args={[6.8, 9.6, 0.35]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>

      <mesh position={[0, 8.2, (WORLD_SIZE + 4) / 2]} receiveShadow>
        <boxGeometry args={[6.2, 2.8, 0.35]} />
        <meshStandardMaterial color="#dbe4ee" />
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
        <meshStandardMaterial color="#e2e8f0" opacity={0.96} transparent />
      </mesh>

      <mesh position={[(WORLD_SIZE + 4) / 2, 7.6, 6.8]} receiveShadow>
        <boxGeometry args={[0.35, 4.0, 6.4]} />
        <meshStandardMaterial color="#e2e8f0" opacity={0.96} transparent />
      </mesh>

      <mesh position={[0, 9.65, 0]} receiveShadow>
        <boxGeometry args={[WORLD_SIZE + 6, 0.25, WORLD_SIZE + 6]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {[-6, 0, 6].map((x) => (
        <group key={`light-row-${x}`} position={[x, 8.9, 0]}>
          <mesh>
            <boxGeometry args={[0.2, 0.2, WORLD_SIZE - 3]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.2} roughness={0.4} />
          </mesh>
          <pointLight position={[0, -0.2, 0]} intensity={0.35} distance={16} color="#fff7d6" />
        </group>
      ))}

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
  onSelect,
  onMoveEntity,
}) {
  const width = getWorldSize(bin.width, rack.width, rackWorldWidth)
  const depth = Math.max(rackWorldDepth * 0.72, 0.32)
  const x = getWorldCenter(bin.coordinateX, width, rack.width, rackWorldWidth)
  const level = getLevelFromCoordinate(rack, bin)
  const levels = getRackLevels(rack)
  const y = getShelfY(level - 1, levels, rackHeight) + 0.25

  return (
    <PivotControls
      visible={isSelected}
      enabled={isSelected}
      activeAxes={[true, true, false]}
      disableRotations
      disableScaling
      scale={0.5}
      depthTest={false}
      anchor={[0, 0, 0]}
      onDrag={(matrix) => {
        const nextX = toCoordinateFromCenter(matrix.elements[12], width, rack.width, rackWorldWidth)
        const normalizedY = clamp((matrix.elements[13] - 0.95) / Math.max(rackHeight - 1.2, 0.8), 0, 1)
        const nextLevel = clamp(Math.round(normalizedY * (levels - 1)) + 1, 1, levels)
        const nextY = getCoordinateYForLevel(rack, bin, nextLevel)

        onMoveEntity('bin', bin.clientKey, Number(nextX.toFixed(2)), Number(nextY.toFixed(2)))
      }}
    >
      <mesh
        position={[x, y, 0]}
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

function RackMesh({
  rack,
  zone,
  zoneWorldWidth,
  zoneWorldDepth,
  selection,
  onSelect,
  onMoveEntity,
}) {
  const width = getWorldSize(rack.width, zone.width, zoneWorldWidth)
  const depth = getWorldSize(rack.height, zone.height, zoneWorldDepth)
  const x = getWorldCenter(rack.coordinateX, width, zone.width, zoneWorldWidth)
  const z = getWorldCenter(rack.coordinateY, depth, zone.height, zoneWorldDepth)
  const levels = getRackLevels(rack)
  const rackHeight = 1.9 + levels * 0.7
  const isSelected = selection?.type === 'rack' && selection.clientKey === rack.clientKey

  return (
    <PivotControls
      visible={isSelected}
      enabled={isSelected}
      activeAxes={[true, false, true]}
      disableRotations
      disableScaling
      scale={0.72}
      depthTest={false}
      anchor={[0, 0, 0]}
      onDrag={(matrix) => {
        const nextX = toCoordinateFromCenter(matrix.elements[12], width, zone.width, zoneWorldWidth)
        const nextY = toCoordinateFromCenter(matrix.elements[14], depth, zone.height, zoneWorldDepth)

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
            opacity={0.2}
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
            onSelect={onSelect}
            onMoveEntity={onMoveEntity}
          />
        ))}
      </group>
    </PivotControls>
  )
}

function ZoneMesh({ zone, layout, selection, onSelect, onMoveEntity }) {
  const width = getWorldSize(zone.width, layout.width, WORLD_SIZE)
  const depth = getWorldSize(zone.height, layout.height, WORLD_SIZE)
  const x = getWorldCenter(zone.coordinateX, width, layout.width, WORLD_SIZE)
  const z = getWorldCenter(zone.coordinateY, depth, layout.height, WORLD_SIZE)
  const isSelected = selection?.type === 'zone' && selection.clientKey === zone.clientKey

  return (
    <PivotControls
      visible={isSelected}
      enabled={isSelected}
      activeAxes={[true, false, true]}
      disableRotations
      disableScaling
      scale={0.95}
      depthTest={false}
      anchor={[0, 0, 0]}
      onDrag={(matrix) => {
        const nextX = toCoordinateFromCenter(matrix.elements[12], width, layout.width, WORLD_SIZE)
        const nextY = toCoordinateFromCenter(matrix.elements[14], depth, layout.height, WORLD_SIZE)

        onMoveEntity('zone', zone.clientKey, Number(nextX.toFixed(2)), Number(nextY.toFixed(2)))
      }}
    >
      <group position={[x, 0, z]}>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(event) => {
            event.stopPropagation()
            onSelect({ type: 'zone', clientKey: zone.clientKey })
          }}
          receiveShadow
        >
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial
            color={colorByType.zone}
            opacity={isSelected ? 0.35 : 0.22}
            transparent
            emissive={isSelected ? '#6ee7b7' : '#000000'}
            emissiveIntensity={isSelected ? 0.35 : 0}
          />
        </mesh>

        <mesh position={[0, 0.01, 0]} receiveShadow>
          <boxGeometry args={[width, 0.02, depth]} />
          <meshStandardMaterial color="#d1fae5" />
        </mesh>

        {zone.racks.map((rack) => (
          <RackMesh
            key={rack.clientKey}
            rack={rack}
            zone={zone}
            zoneWorldWidth={width}
            zoneWorldDepth={depth}
            selection={selection}
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
  onSelect,
  onMoveEntity,
}) {
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

      {layout.zones.map((zone) => (
        <ZoneMesh
          key={zone.clientKey}
          zone={zone}
          layout={layout}
          selection={selection}
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
