export const formatVND = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback
  const amount = Number(value)
  if (!Number.isFinite(amount)) return fallback
  return `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`
}
