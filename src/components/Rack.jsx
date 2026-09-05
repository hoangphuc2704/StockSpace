import React, { useMemo } from 'react'
import { Text } from '@react-three/drei'
import {
  createWoodPalletTexture,
  createCardboardTexture,
} from './warehouse3dTextures'

export default function Rack({
  levels = 4,
  rackWidth = 3.0,
  rackDepth = 1.1,
  rackCode = 'RACK',
  isSelected = false,
  cargoList = [],
  selectedBoxId = '',
  onSelectBox,
}) {
  const levelHeight = 1.35
  const pillarSize = 0.09
  const totalHeight = levels * levelHeight + 0.35

  const pillarPositions = [
    [-rackWidth / 2, totalHeight / 2, -rackDepth / 2],
    [rackWidth / 2, totalHeight / 2, -rackDepth / 2],
    [-rackWidth / 2, totalHeight / 2, rackDepth / 2],
    [rackWidth / 2, totalHeight / 2, rackDepth / 2],
  ]

  const levelArray = Array.from({ length: levels }, (_, i) => i + 1)

  // 3 vị trí đặt hàng (slots) trên mỗi tầng
  const slotsPerLevel = 3
  const slotWidth = (rackWidth - 0.2) / slotsPerLevel
  const palletWidth = Math.min(slotWidth * 0.92, 0.92)
  const palletDepth = Math.min(rackDepth * 0.9, 0.95)

  // Bộ texture chia sẻ
  const textures = useMemo(() => {
    return {
      pallet: createWoodPalletTexture(),
      cardboard: createCardboardTexture(),
    }
  }, [])

  return (
    <group>
      {/* 1. KHUNG CHÂN TRỤ: CỘT XANH CÔNG NGHIỆP VỚI ỐP BẢO VỆ TRÒN VÀNG CHỐNG XE NÂNG */}
      {pillarPositions.map((pos, index) => (
        <group key={`pillar-${index}`}>
          {/* Cột trụ thẳng đứng màu xanh */}
          <mesh position={pos} castShadow receiveShadow>
            <boxGeometry args={[pillarSize, totalHeight, pillarSize]} />
            <meshStandardMaterial
              color={isSelected ? '#38bdf8' : '#1d4ed8'}
              roughness={0.35}
              metalness={0.7}
            />
          </mesh>
          {/* Bo chân bảo vệ hình trụ tròn màu vàng an toàn (Round Yellow Crash Guard) */}
          <mesh position={[pos[0], 0.22, pos[2]]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.45, 14]} />
            <meshStandardMaterial color="#facc15" roughness={0.35} metalness={0.2} />
          </mesh>
        </group>
      ))}

      {/* 2. CÁC TẦNG ĐỠ: DẦM CAM AN TOÀN + SÀN LƯỚI THÉP WIRE MESH + ĐÈN LED CHỈ THỊ */}
      {levelArray.map((level) => {
        const currentH = (level - 0.7) * levelHeight

        return (
          <group key={`level-${level}`}>
            {/* Dầm ngang trước (Front Beam - Safety Orange) */}
            <mesh position={[0, currentH, rackDepth / 2]} castShadow>
              <boxGeometry args={[rackWidth, 0.1, 0.05]} />
              <meshStandardMaterial color="#ea580c" roughness={0.4} metalness={0.55} />
            </mesh>

            {/* Dầm ngang sau (Rear Beam - Safety Orange) */}
            <mesh position={[0, currentH, -rackDepth / 2]} castShadow>
              <boxGeometry args={[rackWidth, 0.1, 0.05]} />
              <meshStandardMaterial color="#ea580c" roughness={0.4} metalness={0.55} />
            </mesh>

            {/* Lưới thép đỡ sàn (Wire Mesh Decking) */}
            <mesh position={[0, currentH + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[rackWidth - 0.08, rackDepth - 0.08]} />
              <meshStandardMaterial
                color="#64748b"
                wireframe
                roughness={0.3}
                metalness={0.7}
              />
            </mesh>

            {/* Đèn LED báo trạng thái trên dầm trước cho từng ô hàng (Slots) */}
            {Array.from({ length: slotsPerLevel }).map((_, slotIdx) => {
              const slotX = -rackWidth / 2 + (slotIdx + 0.5) * slotWidth
              // Kiểm tra xem ô này có hàng hay không
              const hasCargo = cargoList.some(
                (c) => c.level === level && (c.positionIdx % slotsPerLevel) === slotIdx
              )
              const ledColor = hasCargo ? '#ef4444' : '#10b981'

              return (
                <mesh
                  key={`led-${level}-${slotIdx}`}
                  position={[slotX, currentH, rackDepth / 2 + 0.028]}
                >
                  <boxGeometry args={[0.22, 0.04, 0.015]} />
                  <meshStandardMaterial
                    color={ledColor}
                    emissive={ledColor}
                    emissiveIntensity={0.85}
                    roughness={0.2}
                  />
                </mesh>
              )
            })}
          </group>
        )
      })}

      {/* Dầm nóc liên kết trên đỉnh cột */}
      <mesh position={[0, totalHeight - 0.05, rackDepth / 2]} castShadow>
        <boxGeometry args={[rackWidth, 0.08, 0.05]} />
        <meshStandardMaterial color="#ea580c" roughness={0.4} metalness={0.55} />
      </mesh>
      <mesh position={[0, totalHeight - 0.05, -rackDepth / 2]} castShadow>
        <boxGeometry args={[rackWidth, 0.08, 0.05]} />
        <meshStandardMaterial color="#ea580c" roughness={0.4} metalness={0.55} />
      </mesh>

      {/* 🌟 BIỂN BẢNG TÊN KỆ Ở ĐẦU KỆ HÀNG */}
      <group position={[0, totalHeight * 0.8, rackDepth / 2 + 0.08]}>
        <mesh>
          <boxGeometry args={[Math.min(rackWidth * 0.85, 2.0), 0.42, 0.03]} />
          <meshStandardMaterial
            color={isSelected ? '#0369a1' : '#0b1324'}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>
        <mesh position={[0, 0, 0.018]}>
          <planeGeometry args={[Math.min(rackWidth * 0.85, 2.0) * 0.96, 0.38]} />
          <meshBasicMaterial color={isSelected ? '#38bdf8' : '#0284c7'} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[Math.min(rackWidth * 0.85, 2.0) * 0.92, 0.34]} />
          <meshBasicMaterial color="#090d16" />
        </mesh>
        <Text
          position={[0, 0.03, 0.024]}
          fontSize={0.16}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {rackCode}
        </Text>
        <Text
          position={[0, -0.1, 0.024]}
          fontSize={0.075}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
        >
          HỆ THỐNG GIÁ KỆ PALLET
        </Text>
      </group>

      {/* 3. VẼ KIỆN HÀNG THỰC TẾ: PALLET GỖ + 4 THÙNG TẦNG 1 (2x2) + 1 THÙNG TẦNG 2 */}
      {cargoList.map((box) => {
        if (box.level > levels) return null

        const currentH = (box.level - 0.7) * levelHeight
        const slotIdx = box.positionIdx % slotsPerLevel
        const boxX = -rackWidth / 2 + (slotIdx + 0.5) * slotWidth
        const isBoxSelected = box.id === selectedBoxId

        // Kích thước các thùng carton
        const subBoxW = (palletWidth - 0.06) / 2
        const subBoxD = (palletDepth - 0.06) / 2
        const subBoxH = 0.38
        const topBoxH = 0.34
        const palletH = 0.12

        // Có phải hàng đặt trước / ưu tiên (màu cam)
        const isReserved = box.status === 'reserved' || box.color === '#f59e0b'

        return (
          <group
            key={box.id}
            position={[boxX, currentH + 0.02, 0]}
            onClick={(e) => {
              e.stopPropagation()
              onSelectBox?.(box.id)
            }}
          >
            {/* --- PALLET GỖ EURO TIÊU CHUẨN --- */}
            <group position={[0, 0, 0]}>
              {/* 3 Thanh trượt đế dưới */}
              {[-palletDepth * 0.38, 0, palletDepth * 0.38].map((pz, pzi) => (
                <mesh key={`plank-b-${pzi}`} position={[0, 0.015, pz]} castShadow receiveShadow>
                  <boxGeometry args={[palletWidth * 0.98, 0.025, 0.09]} />
                  <meshStandardMaterial map={textures.pallet} roughness={0.75} />
                </mesh>
              ))}

              {/* 9 Cục gù chân pallet */}
              {[-palletWidth * 0.38, 0, palletWidth * 0.38].map((px, pxi) =>
                [-palletDepth * 0.38, 0, palletDepth * 0.38].map((pz, pzi) => (
                  <mesh
                    key={`block-${pxi}-${pzi}`}
                    position={[px, 0.06, pz]}
                    castShadow
                  >
                    <boxGeometry args={[0.08, 0.07, 0.08]} />
                    <meshStandardMaterial map={textures.pallet} roughness={0.75} />
                  </mesh>
                ))
              )}

              {/* 5 Thanh nan ván mặt trên */}
              {[-palletDepth * 0.4, -palletDepth * 0.2, 0, palletDepth * 0.2, palletDepth * 0.4].map(
                (pz, pzi) => (
                  <mesh
                    key={`plank-t-${pzi}`}
                    position={[0, 0.11, pz]}
                    castShadow
                    receiveShadow
                  >
                    <boxGeometry args={[palletWidth * 0.98, 0.025, palletDepth * 0.18]} />
                    <meshStandardMaterial map={textures.pallet} roughness={0.75} />
                  </mesh>
                )
              )}
            </group>

            {/* --- CÁC THÙNG CARTON XẾP TRÊN PALLET --- */}
            <group position={[0, palletH, 0]}>
              {/* 4 Thùng carton tầng 1 (2x2) */}
              {[
                [-subBoxW / 2, -subBoxD / 2],
                [subBoxW / 2, -subBoxD / 2],
                [-subBoxW / 2, subBoxD / 2],
                [subBoxW / 2, subBoxD / 2],
              ].map(([sx, sz], sidx) => (
                <mesh
                  key={`sbox-${sidx}`}
                  position={[sx, subBoxH / 2, sz]}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[subBoxW * 0.94, subBoxH, subBoxD * 0.94]} />
                  <meshStandardMaterial
                    map={textures.cardboard}
                    roughness={0.8}
                    metalness={0.02}
                    emissive={isBoxSelected ? '#0284c7' : '#000000'}
                    emissiveIntensity={isBoxSelected ? 0.3 : 0}
                  />
                </mesh>
              ))}

              {/* Thùng tầng 2: Nếu là Reserved thì màu cam nổi bật, nếu bình thường là thùng master */}
              {isReserved ? (
                <mesh position={[0, subBoxH + topBoxH / 2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[palletWidth * 0.88, topBoxH, palletDepth * 0.88]} />
                  <meshStandardMaterial
                    color="#f59e0b"
                    emissive="#f59e0b"
                    emissiveIntensity={0.4}
                    roughness={0.5}
                  />
                </mesh>
              ) : (
                <mesh position={[0, subBoxH + topBoxH / 2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[palletWidth * 0.88, topBoxH, palletDepth * 0.88]} />
                  <meshStandardMaterial
                    map={textures.cardboard}
                    roughness={0.8}
                    metalness={0.02}
                    emissive={isBoxSelected ? '#0284c7' : '#000000'}
                    emissiveIntensity={isBoxSelected ? 0.3 : 0}
                  />
                </mesh>
              )}
            </group>
          </group>
        )
      })}
    </group>
  )
}
