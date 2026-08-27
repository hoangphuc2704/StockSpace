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
  if (warehouse.rentalPricingType === 'PER_SQUARE_METER_MONTHLY') return rentalPrice

  const area = getWarehouseArea(warehouse)
  return area > 0 ? rentalPrice / area : rentalPrice
}

export const formatWarehousePricePerSquareMeter = (warehouse, fallback = 'Negotiated') =>
  formatVND(getWarehousePricePerSquareMeter(warehouse), fallback)

