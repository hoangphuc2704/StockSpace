import { formatVND } from './currency'

const toFiniteNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export const getWarehouseArea = (warehouse = {}) =>
  toFiniteNumber(warehouse.area ?? warehouse.capacity) ?? 0

export const getWarehousePricePerSquareMeter = (warehouse = {}) => {
  const rentalPrice = toFiniteNumber(
    warehouse.rentalPrice ?? warehouse.price ?? warehouse.pricePerMonth
  )

  if (rentalPrice == null) return null
  if (warehouse.rentalPricingType === 'NEGOTIATED') return null

  // The API stores the published value as entered by the owner:
  // FIXED_MONTHLY is the total monthly warehouse price, while
  // PER_SQUARE_METER_MONTHLY is the monthly price per m².
  return rentalPrice
}

export const isWarehousePricePerSquareMeter = (warehouse = {}) =>
  warehouse.rentalPricingType === 'PER_SQUARE_METER_MONTHLY'

export const getWarehousePriceUnit = (warehouse = {}) => {
  if (warehouse.rentalPricingType === 'NEGOTIATED') return ''
  return isWarehousePricePerSquareMeter(warehouse) ? '/m²/month' : '/month'
}

export const formatWarehousePricePerSquareMeter = (warehouse, fallback = 'Negotiated') =>
  formatVND(getWarehousePricePerSquareMeter(warehouse), fallback)

