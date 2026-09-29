export const formatVND = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback
  const amount = Number(value)
  if (!Number.isFinite(amount)) return fallback
  return `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`
}

export const formatAmountInput = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
}

export const parseAmountInput = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits ? Number(digits) : ''
}
