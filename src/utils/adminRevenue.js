const SUCCESS_STATUSES = new Set(['SUCCESS', 'APPROVED'])

const getYearAndMonth = (createdAt) => {
  const match = String(createdAt || '').match(/^(\d{4})-(\d{2})/)
  if (!match) return null

  return {
    year: Number(match[1]),
    month: Number(match[2]),
  }
}

/**
 * Admin stats BE currently aggregates LISTING_FEE and PACKAGE_PAYMENT.
 * Inspection requests are stored as successful COMMISSION transactions, so
 * merge those transactions into the same monthly revenue series on the FE.
 */
export const addInspectionFeesToRevenue = (revenuePayload, transactions = []) => {
  const basePayload = revenuePayload || {}

  // Newer BE versions already calculate revenue from the system wallet,
  // including inspection commissions. Do not add owner-side commission
  // transactions again in that case.
  if (Object.prototype.hasOwnProperty.call(basePayload, 'inspectionFeeRevenue')) {
    return basePayload
  }

  const year = Number(basePayload.year)
  const inspectionByMonth = new Map()

  transactions
    .filter(
      (transaction) =>
        transaction?.transactionType === 'COMMISSION' &&
        SUCCESS_STATUSES.has(transaction?.status)
    )
    .forEach((transaction) => {
      const date = getYearAndMonth(transaction.createdAt)
      if (!date || date.year !== year || date.month < 1 || date.month > 12) return

      const amount = Number(transaction.amount) || 0
      inspectionByMonth.set(
        date.month,
        (inspectionByMonth.get(date.month) || 0) + amount
      )
    })

  const inspectionFeeRevenue = [...inspectionByMonth.values()].reduce(
    (total, amount) => total + amount,
    0
  )
  const monthlyRevenue = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const baseMonth = (basePayload.monthlyRevenue || []).find(
      (item) => Number(item.month) === month
    )

    return {
      month,
      revenue: (Number(baseMonth?.revenue) || 0) + (inspectionByMonth.get(month) || 0),
    }
  })

  return {
    ...basePayload,
    totalRevenue: (Number(basePayload.totalRevenue) || 0) + inspectionFeeRevenue,
    inspectionFeeRevenue,
    monthlyRevenue,
  }
}
