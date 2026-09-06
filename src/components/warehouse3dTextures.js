// warehouse3dTextures.js - Bộ tạo Texture Công nghiệp Canvas chất lượng cao cho StockSpace 3D
import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, LinearFilter, SRGBColorSpace } from 'three'

/**
 * Texture sàn bê tông công nghiệp có vạch kẻ xe nâng màu vàng và vạch cảnh báo an toàn
 * Chuẩn màu sắc và layout theo my-react-app
 */
export function createWarehouseFloorTexture() {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 2048
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Nền bê tông công nghiệp xám sẫm (Slate dark concrete)
  ctx.fillStyle = '#1e2530'
  ctx.fillRect(0, 0, 2048, 2048)

  // Tạo đốm hạt bê tông (concrete speckle noise)
  const imgData = ctx.getImageData(0, 0, 2048, 2048)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16
    data[i] = Math.min(255, Math.max(0, data[i] + noise))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise))
  }
  ctx.putImageData(imgData, 0, 0)

  // Đường ron gạch sàn bê tông (Expansion joints / Grid)
  const tileSize = 256
  ctx.strokeStyle = '#151b24'
  ctx.lineWidth = 4
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

  // Vạch kẻ sơn vàng an toàn (Forklift warning lanes)
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 14

  // Lối đi dọc chính
  const mainLanes = [300, 750, 1300, 1750]
  mainLanes.forEach((x) => {
    ctx.beginPath()
    ctx.moveTo(x - 50, 60)
    ctx.lineTo(x - 50, 1988)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x + 50, 60)
    ctx.lineTo(x + 50, 1988)
    ctx.stroke()
  })

  // Vạch kẻ sọc chéo cảnh báo nguy hiểm (Hazard stripes - Yellow & Black)
  const drawHazardStripes = (x, y, w, h) => {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x, y, w, h)

    ctx.fillStyle = '#fbbf24'
    const stripeW = 28
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

  // Các dải cảnh báo an toàn ngã tư xe nâng
  drawHazardStripes(100, 80, 1848, 50)
  drawHazardStripes(100, 1918, 1848, 50)

  // Ký hiệu chữ cảnh báo "FORKLIFT ONLY / XE NÂNG"
  ctx.fillStyle = '#fbbf24'
  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('⚠ FORKLIFT LANE - SPEED LIMIT 5 KM/H', 1024, 60)
  ctx.fillText('CAUTION: PEDESTRIAN CROSSING', 1024, 2010)

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

  // Màu giấy carton vàng sáng công nghiệp (chuẩn như ảnh tham chiếu)
  ctx.fillStyle = '#f3ca7e'
  ctx.fillRect(0, 0, 512, 512)

  // Bụi hạt giấy carton vàng ấm
  ctx.fillStyle = '#dfb05f'
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    ctx.fillRect(x, y, 2, 2)
  }

  // Dải băng dính niêm phong miệng thùng vàng hổ phách
  ctx.fillStyle = 'rgba(217, 155, 64, 0.75)'
  ctx.fillRect(0, 238, 512, 36)

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
  ctx.fillText('FRAGILE / HÀNG DỄ VỠ', 295, 178)

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
