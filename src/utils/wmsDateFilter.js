const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const isValidIsoDate = (value) => {
  const match = ISO_DATE_PATTERN.exec(String(value || ''))
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * Keep WMS date-only values timezone-safe. Native date inputs already return
 * this format, so never convert them through the local timezone.
 */
export const toApiDate = (value) => {
  if (!value) return undefined
  const normalized = String(value).trim()
  return isValidIsoDate(normalized) ? normalized : undefined
}

export const cleanQueryParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const normalizeDateFilter = ({ fromDate, toDate } = {}) => ({
  fromDate: toApiDate(fromDate),
  toDate: toApiDate(toDate),
})

export const validateDateFilter = ({ fromDate, toDate } = {}) => {
  const normalized = normalizeDateFilter({ fromDate, toDate })

  if (
    (fromDate && !normalized.fromDate) ||
    (toDate && !normalized.toDate)
  ) {
    return {
      valid: false,
      message: 'Please enter valid dates.',
      value: normalized,
    }
  }

  if (normalized.fromDate && normalized.toDate && normalized.fromDate > normalized.toDate) {
    return {
      valid: false,
      message: 'Start date cannot be after end date.',
      value: normalized,
    }
  }

  return { valid: true, message: '', value: normalized }
}

