// warehouse3dTextures.js - Bộ tạo Texture Công nghiệp Canvas chất lượng cao cho StockSpace 3D
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  RepeatWrapping,
  LinearFilter,
  SRGBColorSpace,
} from 'three'

/**
 * Texture sàn bê tông nhà kho công nghiệp mài bóng cao cấp
 * với các vạch kẻ phân làn xe nâng, phân khu Receiving & Shipping,
 * vạch cảnh báo an toàn hazard stripes và vạch đi bộ sang đường chuẩn theo my-react-app.
 */
export function createWarehouseFloorTexture() {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 2048
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // 1. Nền bê tông mài bóng công nghiệp xám sẫm cao cấp
  ctx.fillStyle = '#1e2430'
  ctx.fillRect(0, 0, 2048, 2048)

  // 2. Tạo đốm hạt bê tông mịn (concrete speckle noise)
  const imgData = ctx.getImageData(0, 0, 2048, 2048)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 14
    data[i] = Math.min(255, Math.max(0, data[i] + noise))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise))
  }
  ctx.putImageData(imgData, 0, 0)

  // 3. Đường ron giãn nở sàn bê tông (Expansion joints / 256px grid)
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

  // Hàm vẽ dải sọc chéo cảnh báo an toàn xe nâng (Hazard stripes - Yellow & Black)
  const drawHazardStripes = (x, y, w, h) => {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x, y, w, h)

    ctx.fillStyle = '#f59e0b'
    const stripeW = 24
    for (let sx = -h; sx < w + h; sx += stripeW * 2) {
      ctx.beginPath()
      ctx.moveTo(x + sx, y)
      ctx.lineTo(x + sx + stripeW, y)
      ctx.lineTo(x + sx + stripeW - h, y + h)
      ctx.lineTo(x + sx - h, y + h)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }

  // 4. Vạch kẻ sơn vàng an toàn phân làn xe nâng (Forklift warning lanes)
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 10

  // Lối đi dọc chính giữa các dãy kệ (Storage Area Y = 380 đến 1420)
  const rackLanes = [380, 780, 1260, 1660]
  rackLanes.forEach((x) => {
    ctx.beginPath()
    ctx.moveTo(x, 380)
    ctx.lineTo(x, 1420)
    ctx.stroke()
  })

  // Vạch giao lộ ngang (Cross aisles)
  ctx.beginPath()
  ctx.moveTo(100, 380)
  ctx.lineTo(1948, 380)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(100, 1420)
  ctx.lineTo(1948, 1420)
  ctx.stroke()

  // Vạch sọc cảnh báo ngã tư xe nâng
  drawHazardStripes(120, 365, 1808, 30)
  drawHazardStripes(120, 1405, 1808, 30)

  // 5. KHU VỰC NHẬP HÀNG (RECEIVING / INBOUND ZONE - DOCK 01)
  // Vị trí: Y = 1500 đến 1980, X = 160 đến 960
  ctx.save()
  ctx.strokeStyle = '#0284c7' // Xanh Inbound
  ctx.lineWidth = 8
  ctx.setLineDash([24, 12])
  ctx.strokeRect(160, 1500, 800, 460)
  ctx.setLineDash([])

  // Nền phân khu nhẹ
  ctx.fillStyle = 'rgba(2, 132, 199, 0.08)'
  ctx.fillRect(160, 1500, 800, 460)

  // Vạch đỗ pallet staging (Staging slots 3x2)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'
  ctx.lineWidth = 4
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const sx = 200 + col * 240
      const sy = 1540 + row * 190
      ctx.strokeRect(sx, sy, 200, 160)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.6)'
      ctx.font = 'bold 20px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`IN-${row + 1}0${col + 1}`, sx + 100, sy + 88)
    }
  }

  // Chữ phân khu Nhập hàng
  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('📥 RECEIVING & INBOUND STAGING • DOCK 01', 180, 1480)
  ctx.restore()

  // 6. KHU VỰC XUẤT HÀNG (SHIPPING / OUTBOUND ZONE - DOCK 02)
  // Vị trí: Y = 1500 đến 1980, X = 1080 đến 1880
  ctx.save()
  ctx.strokeStyle = '#ea580c' // Cam Outbound
  ctx.lineWidth = 8
  ctx.setLineDash([24, 12])
  ctx.strokeRect(1080, 1500, 800, 460)
  ctx.setLineDash([])

  // Nền phân khu nhẹ
  ctx.fillStyle = 'rgba(234, 88, 12, 0.08)'
  ctx.fillRect(1080, 1500, 800, 460)

  // Vạch đỗ pallet staging xuất hàng
  ctx.strokeStyle = 'rgba(251, 146, 60, 0.4)'
  ctx.lineWidth = 4
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const sx = 1120 + col * 240
      const sy = 1540 + row * 190
      ctx.strokeRect(sx, sy, 200, 160)
      ctx.fillStyle = 'rgba(251, 146, 60, 0.6)'
      ctx.font = 'bold 20px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`OUT-${row + 1}0${col + 1}`, sx + 100, sy + 88)
    }
  }

  // Chữ phân khu Xuất hàng
  ctx.fillStyle = '#fb923c'
  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('📤 SHIPPING & DISPATCH STAGING • DOCK 02', 1100, 1480)
  ctx.restore()

  // 7. VẠCH ĐI BỘ CHO NHÂN VIÊN (PEDESTRIAN ZEBRA CROSSING)
  const drawZebra = (x, y, w, h, isHoriz = true) => {
    ctx.save()
    ctx.fillStyle = '#f8fafc'
    if (isHoriz) {
      const barW = 32
      for (let bx = x; bx < x + w; bx += barW * 2) {
        ctx.fillRect(bx, y, barW, h)
      }
    } else {
      const barH = 32
      for (let by = y; by < y + h; by += barH * 2) {
        ctx.fillRect(x, by, w, barH)
      }
    }
    ctx.restore()
  }

  // Vạch sang đường cho người đi bộ lối cửa thoát hiểm giữa 2 dock
  drawZebra(980, 1450, 100, 520, false)
  // Vạch sang đường ngang phía sau kho
  drawZebra(100, 200, 1848, 50, true)

  // 8. Ký hiệu chữ an toàn trên sàn
  ctx.fillStyle = '#fbbf24'
  ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('⚠ FORKLIFT SPEED LIMIT: 5 KM/H • WEAR PPE AT ALL TIMES', 1024, 150)
  ctx.fillText('KEEP EMERGENCY AISLE CLEAR AT ALL TIMES', 1024, 2010)

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
export function createRollUpDoorTexture(doorLabel = 'BAY 01 • INBOUND DOCK') {
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

