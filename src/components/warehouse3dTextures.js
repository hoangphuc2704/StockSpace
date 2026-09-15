// warehouse3dTextures.js - Bộ tạo Texture Công nghiệp Canvas chất lượng cao cho StockSpace 3D
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  RepeatWrapping,
  LinearFilter,
  SRGBColorSpace,
} from 'three'

/** Texture sàn bê tông mài bóng công nghiệp cao cấp cho mặt bằng kho. */
export function createWarehouseFloorTexture() {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 2048
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // 1. Nền bê tông mài bóng công nghiệp xám sẫm cao cấp (Polished Concrete)
  ctx.fillStyle = '#1e2530'
  ctx.fillRect(0, 0, 2048, 2048)

  // 2. Tạo đốm hạt bê tông (Concrete speckle noise)
  const imgData = ctx.getImageData(0, 0, 2048, 2048)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12
    data[i] = Math.min(255, Math.max(0, data[i] + noise))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise))
  }
  ctx.putImageData(imgData, 0, 0)

  // 3. Đường ron gạch sàn bê tông (Expansion joints)
  const tileSize = 256
  ctx.strokeStyle = '#141a24'
  ctx.lineWidth = 3
  for (let x = 0; x <= 2048; x += tileSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 2048)
    ctx.stroke()
  }
  for (let y = 0; y <= 2048; y += tileSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(2048, y)
    ctx.stroke()
  }

  // 4. Vạch kẻ an toàn màu vàng cho xe nâng & lối đi chính (Forklift Safety Lanes)
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 10

  // Chỉ giữ hai cạnh dọc của khung sàn, không vẽ cạnh ngang.
  ctx.beginPath()
  ctx.moveTo(60, 60)
  ctx.lineTo(60, 1988)
  ctx.moveTo(1988, 60)
  ctx.lineTo(1988, 1988)
  ctx.stroke()

  // Line dọc phân làn chạy liên tục từ đầu đến cuối mặt sàn.
  const rackLanes = [380, 780, 1260, 1660]
  rackLanes.forEach((x) => {
    ctx.beginPath()
    ctx.moveTo(x, 60)
    ctx.lineTo(x, 1988)
    ctx.stroke()
  })

  // Ký hiệu chữ an toàn trên sàn
  // ctx.fillStyle = '#fbbf24'
  // ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif'
  // ctx.textAlign = 'center'
  // ctx.fillText('⚠ FORKLIFT SPEED LIMIT: 5 KM/H • WEAR PPE AT ALL TIMES', 1024, 150)

  const texture = new CanvasTexture(canvas)
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.anisotropy = 8
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Texture gỗ thông tự nhiên cho Pallet Euro chuẩn (EPAL heat-treated)
 */
export function createWoodPalletTexture() {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Nền gỗ thông tự nhiên
  ctx.fillStyle = '#c29b68'
  ctx.fillRect(0, 0, 512, 512)

  // Vân gỗ (Wood grain streaks)
  ctx.strokeStyle = '#a27b4c'
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * 512
    ctx.lineWidth = 1 + Math.random() * 2.5
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(
      150,
      y + (Math.random() - 0.5) * 15,
      350,
      y + (Math.random() - 0.5) * 15,
      512,
      y
    )
    ctx.stroke()
  }

  // Các đường rãnh nan ván
  ctx.fillStyle = '#6b4e2e'
  for (let y = 100; y < 512; y += 105) {
    ctx.fillRect(0, y, 512, 3)
  }

  // Tem khắc mộc nhiệt EPAL
  ctx.strokeStyle = '#452f1b'
  ctx.lineWidth = 2
  ctx.strokeRect(30, 20, 90, 45)
  ctx.fillStyle = '#452f1b'
  ctx.font = 'bold 16px monospace'
  ctx.fillText('EPAL', 48, 48)

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Texture Thùng Carton (Cardboard Box) có tem vận chuyển, barcode, icon ly dễ vỡ và mũi tên hướng lên
 */
export function createCardboardTexture() {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Màu carton kraft sáng, gần với thùng giấy thực tế.
  ctx.fillStyle = '#6E260E'
  ctx.fillRect(0, 0, 512, 512)

  // Bụi hạt giấy carton vàng ấm
  // ctx.fillStyle = '#d1aa73'
  // for (let i = 0; i < 600; i++) {
  //   const x = Math.random() * 512
  //   const y = Math.random() * 512
  //   ctx.fillRect(x, y, 2, 2)
  // }

  // Dải băng dính niêm phong miệng thùng vàng hổ phách
  // ctx.fillStyle = 'rgba(224, 205, 166, 0.72)'
  // ctx.fillRect(0, 238, 512, 36)

  // Nhãn vận chuyển màu trắng dán trên thùng
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(280, 80, 195, 145)
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1.5
  ctx.strokeRect(280, 80, 195, 145)

  // Mã vạch (Barcode lines)
  ctx.fillStyle = '#0f172a'
  let bx = 295
  while (bx < 455) {
    const bw = Math.random() > 0.4 ? 3 : 1.5
    ctx.fillRect(bx, 100, bw, 46)
    bx += bw + (Math.random() > 0.5 ? 2.5 : 1.5)
  }

  // Ký tự nhãn WMS
  ctx.font = 'bold 9px monospace'
  ctx.fillText('*STOCKSPACE-WMS*', 295, 162)
  ctx.font = '8px sans-serif'
  ctx.fillText('FRAGILE / HANDLE WITH CARE', 295, 178)

  // Biểu tượng ly dễ vỡ màu đỏ nổi bật
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(312, 198, 6, 0, Math.PI)
  ctx.lineTo(312, 208)
  ctx.moveTo(307, 208)
  ctx.lineTo(317, 208)
  ctx.stroke()

  // 2 Mũi tên hướng lên ↑↑
  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 15px sans-serif'
  ctx.fillText('↑↑', 342, 206)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Biển bảng chỉ dẫn tên Dãy (Aisle Signboard) treo đầu kệ
 */
export function createAisleSignTexture(aisleName, subtitle = 'KHU LƯU KHO') {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#090d16'
  ctx.fillRect(0, 0, 512, 256)

  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 8
  ctx.strokeRect(8, 8, 496, 240)

  ctx.fillStyle = '#f8fafc'
  ctx.font = '900 82px "Arial Black", Impact, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(aisleName, 256, 115)

  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 24px sans-serif'
  ctx.fillText(subtitle.toUpperCase(), 256, 175)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '14px monospace'
  ctx.fillText('◄ RACK SYSTEM 01 - 04 ►', 256, 215)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Texture tấm panel kim loại công nghiệp cho tường ngoài & trong nhà kho
 */
export function createWallPanelTexture() {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Nền panel kim loại xám nhạt cao cấp (Industrial Off-white / Light Grey)
  ctx.fillStyle = '#d8dde6'
  ctx.fillRect(0, 0, 1024, 1024)

  // Đốm hạt vi mô kim loại
  const imgData = ctx.getImageData(0, 0, 1024, 1024)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8
    data[i] = Math.min(255, Math.max(0, data[i] + noise))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise))
  }
  ctx.putImageData(imgData, 0, 0)

  // Các đường rãnh ghép panel dọc (Vertical panel seams) mỗi 128px
  const seamSpacing = 128
  for (let x = 0; x <= 1024; x += seamSpacing) {
    // Rãnh tối
    ctx.strokeStyle = '#9ca3af'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 1024)
    ctx.stroke()

    // Rãnh highlight mép đối diện
    ctx.strokeStyle = '#f1f5f9'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + 2, 0)
    ctx.lineTo(x + 2, 1024)
    ctx.stroke()

    // Hàng đinh tán công nghiệp (Rivets)
    ctx.fillStyle = '#64748b'
    for (let y = 30; y < 1024; y += 80) {
      ctx.beginPath()
      ctx.arc(x - 8, y, 2.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + 10, y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Chân tường bê tông cốt thép (Concrete skirting plinth) cao ~15% ở đáy
  const plinthHeight = 140
  ctx.fillStyle = '#475569'
  ctx.fillRect(0, 1024 - plinthHeight, 1024, plinthHeight)

  // Vạch ngăn cách plinth và panel
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 1024 - plinthHeight - 6, 1024, 6)
  ctx.fillStyle = '#f59e0b'
  ctx.fillRect(0, 1024 - plinthHeight, 1024, 8) // Vạch sơn vàng bảo vệ chân tường

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(4, 2)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Texture tôn sóng kim loại công nghiệp cho Mái nhà (Corrugated Roof)
 */
export function createRoofCorrugatedTexture() {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Nền tôn sóng xám chì / xám bạc
  ctx.fillStyle = '#475569'
  ctx.fillRect(0, 0, 1024, 1024)

  // Vẽ các gân sóng tôn (Corrugation ridges) chạy xuôi theo chiều dốc mái
  const ridgeWidth = 32
  for (let y = 0; y < 1024; y += ridgeWidth) {
    const grad = ctx.createLinearGradient(0, y, 0, y + ridgeWidth)
    grad.addColorStop(0, '#334155') // Đáy rãnh tối
    grad.addColorStop(0.3, '#64748b') // Sườn sáng
    grad.addColorStop(0.5, '#94a3b8') // Đỉnh gờ tôn kim loại
    grad.addColorStop(0.7, '#64748b') // Sườn khuất
    grad.addColorStop(1, '#334155') // Đáy rãnh tối
    ctx.fillStyle = grad
    ctx.fillRect(0, y, 1024, ridgeWidth)
  }

  // Hàng đinh vít bắt tôn vào xà gồ ngang (Purlin screw rows)
  for (let x = 80; x < 1024; x += 256) {
    ctx.fillStyle = '#cbd5e1'
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    for (let y = 16; y < 1024; y += ridgeWidth) {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(3, 14)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Texture cửa cuốn công nghiệp cho xe nâng (Sectional Roll-up Door)
 */
export function createRollUpDoorTexture(doorLabel = 'BAY 01') {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Nền kim loại mạ kẽm cửa cuốn
  ctx.fillStyle = '#94a3b8'
  ctx.fillRect(0, 0, 512, 512)

  // Các nan cửa cuốn nằm ngang (Horizontal slats)
  const slatH = 20
  for (let y = 0; y < 512; y += slatH) {
    const grad = ctx.createLinearGradient(0, y, 0, y + slatH)
    grad.addColorStop(0, '#cbd5e1')
    grad.addColorStop(0.4, '#e2e8f0')
    grad.addColorStop(0.8, '#64748b')
    grad.addColorStop(1, '#334155')
    ctx.fillStyle = grad
    ctx.fillRect(0, y, 512, slatH - 2)

    // Khe nối nan cửa cuốn
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, y + slatH - 2, 512, 2)
  }

  // Ô kính lấy sáng an toàn ở tầm nhìn mắt người
  ctx.fillStyle = '#0f172a'
  for (let wx = 80; wx <= 360; wx += 100) {
    ctx.fillRect(wx - 2, 198, 74, 34)
    ctx.fillStyle = '#38bdf8'
    ctx.fillRect(wx, 200, 70, 30)
    // Vệt bóng kính
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.beginPath()
    ctx.moveTo(wx, 200)
    ctx.lineTo(wx + 30, 200)
    ctx.lineTo(wx + 10, 230)
    ctx.lineTo(wx, 230)
    ctx.fill()
    ctx.fillStyle = '#0f172a'
  }

  // Khung biển tên cửa cuốn ở giữa
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(90, 270, 332, 45)
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 3
  ctx.strokeRect(90, 270, 332, 45)

  ctx.fillStyle = '#fbbf24'
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(doorLabel, 256, 300)

  // Tay nắm mở cửa công nghiệp & ổ khóa
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(236, 420, 40, 8)
  ctx.fillRect(240, 428, 32, 20)

  // Vạch cảnh báo an toàn sọc vàng-đen ở chân cửa cuốn
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 480, 512, 32)
  ctx.clip()
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 480, 512, 32)
  ctx.fillStyle = '#f59e0b'
  for (let sx = -32; sx < 550; sx += 32) {
    ctx.beginPath()
    ctx.moveTo(sx, 480)
    ctx.lineTo(sx + 16, 480)
    ctx.lineTo(sx + 16 - 32, 512)
    ctx.lineTo(sx - 32, 512)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Biển hiệu lớn gắn mặt tiền nhà kho (StockSpace Hub Signboard)
 */
export function createBuildingSignTexture() {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Nền kim loại titan xám đen cao cấp
  ctx.fillStyle = '#0b1120'
  ctx.fillRect(0, 0, 1024, 256)

  // Viền phát quang công nghệ cao
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 8
  ctx.strokeRect(8, 8, 1008, 240)

  // Logo StockSpace biểu tượng kho 3D
  ctx.fillStyle = '#0284c7'
  ctx.fillRect(40, 40, 60, 60)
  ctx.fillStyle = '#38bdf8'
  ctx.fillRect(70, 70, 60, 60)

  // Tên thương hiệu chính
  ctx.fillStyle = '#f8fafc'
  ctx.font = '900 68px "Segoe UI", Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('STOCKSPACE', 160, 110)

  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif'
  ctx.fillText('SMART LOGISTICS HUB • DC-01', 160, 160)

  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 20px monospace'
  ctx.fillText('AUTOMATED 3D WAREHOUSE MANAGEMENT SYSTEM', 160, 200)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Biển báo an toàn PCCC & Lối thoát hiểm (Safety & Emergency Signs)
 */
export function createSafetySignTexture(type = 'EXIT') {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  if (type === 'EXIT') {
    ctx.fillStyle = '#15803d' // Xanh lá thoát hiểm
    ctx.fillRect(0, 0, 256, 128)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 4
    ctx.strokeRect(6, 6, 244, 116)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 44px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('EXIT ➔', 128, 75)
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('LỐI THOÁT HIỂM', 128, 105)
  } else if (type === 'FIRE') {
    ctx.fillStyle = '#b91c1c' // Đỏ PCCC
    ctx.fillRect(0, 0, 256, 128)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 4
    ctx.strokeRect(6, 6, 244, 116)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 36px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🚒 FIRE HOSE', 128, 68)
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('HỘP CHỮA CHÁY PCCC', 128, 100)
  } else {
    // PPE REQUIRED
    ctx.fillStyle = '#1d4ed8' // Xanh dương bảo hộ
    ctx.fillRect(0, 0, 256, 128)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 4
    ctx.strokeRect(6, 6, 244, 116)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 30px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('👷 PPE ZONE', 128, 65)
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText('BẮT BUỘC ĐỒ BẢO HỘ', 128, 98)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
