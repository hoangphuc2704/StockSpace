const VIETNAMESE_PATTERN =
  /[À-ỹ]|\b(vui\s*lòng|không|khong|đã|da|chưa|chua|phiếu|phieu|kho|hàng|hang|thông báo|thong bao|yêu cầu|yeu cau|thành công|thanh cong|từ chối|tu choi|duyệt|duyet|kiểm kê|kiem ke|nhân viên|nhan vien|hợp đồng|hop dong|được|duoc|lỗi|loi)\b/i

export const containsVietnamese = (value) =>
  typeof value === 'string' && VIETNAMESE_PATTERN.test(value)

/**
 * Backend responses currently contain Vietnamese messages. Keep already-English
 * messages, but use a short FE fallback whenever the API message is Vietnamese.
 */
export const getEnglishApiMessage = (error, fallback) => {
  const message = error?.response?.data?.message
  return typeof message === 'string' && message.trim() && !containsVietnamese(message)
    ? message
    : fallback
}

const NOTIFICATION_FALLBACKS = {
  PAYMENT: { title: 'Payment update', message: 'A payment update is available.' },
  BOOKING: { title: 'Booking update', message: 'A booking needs your attention.' },
  CONTRACT: { title: 'Contract update', message: 'A contract has been updated.' },
  RENTAL: { title: 'Rental update', message: 'Your rental access has changed.' },
  DISPUTE: { title: 'Dispute update', message: 'A dispute has been updated.' },
  WAREHOUSE: { title: 'Warehouse update', message: 'A warehouse update is available.' },
  INSPECTION: { title: 'Inspection update', message: 'An inspection needs your attention.' },
  AUDIT: { title: 'Inventory audit', message: 'An inventory audit needs your attention.' },
  RECEIPT: { title: 'Receipt update', message: 'A warehouse receipt needs your attention.' },
  DEFAULT: { title: 'New notification', message: 'You have a new notification.' },
}

export const getEnglishNotification = (notification = {}) => {
  const type = String(notification.type || 'DEFAULT').toUpperCase()
  const fallback = NOTIFICATION_FALLBACKS[type] || NOTIFICATION_FALLBACKS.DEFAULT
  const title = typeof notification.title === 'string' ? notification.title.trim() : ''
  const message = typeof notification.message === 'string' ? notification.message.trim() : ''

  return {
    title: title && !containsVietnamese(title) ? title : fallback.title,
    message: message && !containsVietnamese(message) ? message : fallback.message,
  }
}
