// warehouse3dTextures.js - Bộ tạo Texture Công nghiệp Canvas chất lượng cao cho StockSpace 3D
import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, LinearFilter, SRGBColorSpace } from 'three'

/** Texture bê tông đơn sắc cho sàn kho 3D. */
export function createWarehouseFloorTexture() {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 2048
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Nền bê tông sáng để mô hình 3D dễ quan sát hơn
  ctx.fillStyle = '#dbe3e8'
  ctx.fillRect(0, 0, 2048, 2048)

  // Tạo đốm hạt bê tông (concrete speckle noise)
  const imgData = ctx.getImageData(0, 0, 2048, 2048)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 10
    data[i] = Math.min(255, Math.max(0, data[i] + noise))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise))
  }
  ctx.putImageData(imgData, 0, 0)

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

  // Màu carton theo nhận diện kho hàng
  ctx.fillStyle = '#a5822a'
  ctx.fillRect(0, 0, 512, 512)

  // Bụi hạt giấy carton vàng ấm
  ctx.fillStyle = '#b5943d'
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    ctx.fillRect(x, y, 2, 2)
  }

  // Dải băng dính niêm phong miệng thùng vàng hổ phách
  ctx.fillStyle = 'rgba(120, 86, 20, 0.72)'
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
