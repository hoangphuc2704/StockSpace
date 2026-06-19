import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, PivotControls } from '@react-three/drei'
import Rack from './Rack'

export default function WarehouseCanvas({
  racks,
  setRacks,
  selectedRackId,
  onSelectRack,
  selectedBoxId,
  onSelectBox,
  bgColor = '#0f172a', // Props nhận màu nền từ ngoài truyền vào
}) {
  const handleDrag = (id, matrix) => {
    const x = matrix.elements[12]
    const z = matrix.elements[14]
    setRacks((prevRacks) => prevRacks.map((r) => (r.id === id ? { ...r, position: [x, 0, z] } : r)))
  }

  // Tự động tinh chỉnh màu sắc của đường lưới Grid dựa trên độ sáng/tối của nền nền
  const isLightBg = bgColor === '#f8fafc'
  const gridCellColor = isLightBg ? '#cbd5e1' : '#334155'
  const gridSectionColor = isLightBg ? '#94a3b8' : '#64748b'

  return (
    <Canvas camera={{ position: [6, 8, 10], fov: 45 }} className="h-full w-full">
      {/* 💥 ĐÂY LÀ ĐOẠN ĐỔI BACKGROUND XUNG QUANH */}
      <color attach="background" args={[bgColor]} />

      {/* Ánh sáng không gian */}
      <ambientLight intensity={isLightBg ? 0.8 : 0.6} />
      <directionalLight position={[10, 15, 10]} intensity={isLightBg ? 1.4 : 1.2} />
      <pointLight position={[-10, 8, -10]} intensity={0.5} />

      {/* Danh sách kệ kho */}
      {racks.map((rack) => {
        const isSelected = rack.id === selectedRackId

        return (
          <group key={rack.id} position={rack.position}>
            <PivotControls
              enabled={isSelected}
              activeAxes={[true, false, true]}
              depthTest={false}
              scale={isSelected ? 0.75 : 0}
              anchor={[0, 0, 0]}
              onTransform={(matrix) => handleDrag(rack.id, matrix)}
            >
              <group
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectRack(rack.id)
                }}
              >
                <Rack
                  levels={rack.levels}
                  rackWidth={rack.width}
                  isSelected={isSelected}
                  cargoList={rack.cargo || []}
                  selectedBoxId={selectedBoxId}
                  onSelectBox={onSelectBox}
                />
              </group>
            </PivotControls>
          </group>
        )
      })}

      {/* Mặt sàn lưới động */}
      <Grid
        position={[0, -0.01, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor={gridCellColor}
        sectionSize={2}
        sectionThickness={1}
        sectionColor={gridSectionColor}
        fadeDistance={25}
      />

      <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2 - 0.05} />
    </Canvas>
  )
}
