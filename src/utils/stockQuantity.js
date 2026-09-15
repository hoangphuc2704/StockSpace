/**
 * Stock endpoints intentionally return numeric zeroes as placeholders while a
 * Staff blind-count audit is active. Keep the masking rule in one place so no
 * consumer accidentally renders or aggregates those placeholders.
 */
export const isStockQuantityMasked = (stock) => stock?.quantityMasked === true

export const formatStockQuantity = (value, quantityMasked, maskedLabel = 'Đang kiểm kê') => {
  if (quantityMasked) return maskedLabel
  if (value === null || value === undefined || value === '') return '—'

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue.toLocaleString('vi-VN') : '—'
}

export const sumStockQuantity = (rows, field = 'quantity') => {
  const list = Array.isArray(rows) ? rows : []
  if (list.some(isStockQuantityMasked)) return null

  return list.reduce((total, row) => {
    const value = Number(row?.[field])
    return total + (Number.isFinite(value) ? value : 0)
  }, 0)
}
