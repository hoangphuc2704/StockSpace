import React from 'react'

export default function Rack({
  levels = 3,
  rackWidth = 3.0,
  rackDepth = 1.0,
  isSelected = false,
  cargoList = [],
  selectedBoxId = '',
  onSelectBox,
}) {
  const levelHeight = 1.2
  const pillarSize = 0.1
  const totalHeight = levels * levelHeight + 0.2

  const pillarPositions = [
    [-rackWidth / 2, totalHeight / 2, -rackDepth / 2],
    [rackWidth / 2, totalHeight / 2, -rackDepth / 2],
    [-rackWidth / 2, totalHeight / 2, rackDepth / 2],
    [rackWidth / 2, totalHeight / 2, rackDepth / 2],
  ]

  const levelArray = Array.from({ length: levels }, (_, i) => i + 1)

  const boxW = 0.6
  const boxH = 0.5
  const boxD = 0.8

  return (
    <group>
      {/* 1. KHUNG CHÂN TRỤ */}
      {pillarPositions.map((pos, index) => (
        <mesh key={`pillar-${index}`} position={pos}>
          <boxGeometry args={[pillarSize, totalHeight, pillarSize]} />
          <meshStandardMaterial color={isSelected ? '#2563eb' : '#1565c0'} roughness={0.3} />
        </mesh>
      ))}

      {/* 2. CÁC TẦNG ĐỠ */}
      {levelArray.map((level) => {
        const currentH = level * levelHeight
        return (
          <group key={`level-${level}`}>
            <mesh position={[0, currentH, rackDepth / 2]}>
              <boxGeometry args={[rackWidth, 0.08, 0.04]} />
              <meshStandardMaterial color="#ff8f00" roughness={0.4} />
            </mesh>
            <mesh position={[0, currentH, -rackDepth / 2]}>
              <boxGeometry args={[rackWidth, 0.08, 0.04]} />
              <meshStandardMaterial color="#ff8f00" roughness={0.4} />
            </mesh>
            <mesh position={[0, currentH + 0.04, 0]}>
              <boxGeometry args={[rackWidth - 0.1, 0.02, rackDepth - 0.1]} />
              <meshStandardMaterial color="#cccccc" metalness={0.2} roughness={0.5} />
            </mesh>
          </group>
        )
      })}

      {/* 3. VẼ THÙNG HÀNG ĐỘNG */}
      {cargoList.map((box) => {
        if (box.level > levels) return null

        const currentH = box.level * levelHeight
        const maxBoxesCount = Math.floor((rackWidth - 0.2) / (boxW + 0.15))
        const totalBoxSpace = (maxBoxesCount - 1) * (boxW + 0.15)
        const startX = -totalBoxSpace / 2

        const boxX = startX + (box.positionIdx % Math.max(1, maxBoxesCount)) * (boxW + 0.15)
        const boxY = currentH + 0.04 + 0.01 + boxH / 2

        const isBoxSelected = box.id === selectedBoxId

        return (
          <mesh
            key={box.id}
            position={[boxX, boxY, 0]}
            onClick={(e) => {
              e.stopPropagation()
              onSelectBox(box.id)
            }}
          >
            <boxGeometry args={[boxW, boxH, boxD]} />
            <meshStandardMaterial
              color={box.color || '#c29b70'}
              roughness={0.7}
              metalness={0.1}
              emissive={isBoxSelected ? '#3b82f6' : '#000000'}
              emissiveIntensity={isBoxSelected ? 0.3 : 0}
            />
          </mesh>
        )
      })}
    </group>
  )
}
