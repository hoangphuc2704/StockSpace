const VIETNAMESE_PATTERN =
  /[À-ỹ]|\b(vui\s*lòng|không|khong|đã|da|chưa|chua|phiếu|phieu|kho|hàng|hang|thông báo|thong bao|yêu cầu|yeu cau|thành công|thanh cong|từ chối|tu choi|duyệt|duyet|kiểm kê|kiem ke|nhân viên|nhan vien|hợp đồng|hop dong|được|duoc|lỗi|loi)\b/i

export const containsVietnamese = (value) =>
  typeof value === 'string' && VIETNAMESE_PATTERN.test(value)

/**
 * Keep the notification content supplied by the backend. Notifications are
 * created with the user's current language in the backend, so replacing
 * Vietnamese content with a generic English fallback hides the useful details
 * (for example, the warehouse name or the inspection result).
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
  CONTRACT_EXPIRY_REMINDER: {
    title: 'Contract expiring soon',
    message: 'A warehouse rental contract will expire soon.',
  },
  CONTRACT_EXPIRED: {
    title: 'Contract expired',
    message: 'A warehouse rental contract has expired and access may have changed.',
  },
  RENTAL: { title: 'Rental update', message: 'Your rental access has changed.' },
  DISPUTE: { title: 'Dispute update', message: 'A dispute has been updated.' },
  WAREHOUSE: { title: 'Warehouse update', message: 'A warehouse update is available.' },
  INSPECTION: { title: 'Inspection update', message: 'An inspection needs your attention.' },
  AUDIT: { title: 'Inventory audit', message: 'An inventory audit needs your attention.' },
  RECEIPT: { title: 'Receipt update', message: 'A warehouse receipt needs your attention.' },
  TRANSFER: { title: 'Transfer update', message: 'A stock transfer needs your attention.' },
  DEFAULT: { title: 'New notification', message: 'You have a new notification.' },
}

const NOTIFICATION_TITLE_TRANSLATIONS = {
  'New notification': { vi: 'Thông báo mới' },
  'Payment update': { vi: 'Cập nhật thanh toán' },
  'Booking update': { vi: 'Cập nhật đặt kho' },
  'Contract update': { vi: 'Cập nhật hợp đồng' },
  'Contract expiring soon': { vi: 'Hợp đồng sắp hết hạn' },
  'Contract expired': { vi: 'Hợp đồng đã hết hạn' },
  'Rental update': { vi: 'Cập nhật việc thuê kho' },
  'Dispute update': { vi: 'Cập nhật tranh chấp' },
  'Warehouse update': { vi: 'Cập nhật kho bãi' },
  'Inspection update': { vi: 'Cập nhật kiểm định' },
  'Inventory audit': { vi: 'Kiểm kê tồn kho' },
  'Receipt update': { vi: 'Cập nhật phiếu kho' },
  'Transfer update': { vi: 'Cập nhật chuyển kho' },
  'Warehouse inspection result': { vi: 'Kết quả kiểm định kho bãi' },
  'Kết quả kiểm định kho bãi': { en: 'Warehouse inspection result' },
  'Withdrawal request approved': { vi: 'Yêu cầu rút tiền được duyệt' },
  'Yêu cầu rút tiền được duyệt': { en: 'Withdrawal request approved' },
  'Withdrawal request rejected': { vi: 'Yêu cầu rút tiền bị từ chối' },
  'Yêu cầu rút tiền bị từ chối': { en: 'Withdrawal request rejected' },
  'Deposit successful': { vi: 'Nạp tiền thành công' },
  'Nạp tiền thành công': { en: 'Deposit successful' },
  'Rental contract renewal scheduled': { vi: 'Đã lên lịch gia hạn hợp đồng thuê' },
  'Đã lên lịch gia hạn hợp đồng thuê': { en: 'Rental contract renewal scheduled' },
  'Rental contract renewal activated': { vi: 'Gia hạn hợp đồng thuê đã được kích hoạt' },
  'Gia hạn hợp đồng thuê đã được kích hoạt': { en: 'Rental contract renewal activated' },
  'Rental contract confirmed': { vi: 'Hợp đồng thuê đã được xác nhận' },
  'Hợp đồng thuê đã được xác nhận': { en: 'Rental contract confirmed' },
  'Rental contract changes requested': { vi: 'Yêu cầu thay đổi hợp đồng thuê' },
  'Yêu cầu thay đổi hợp đồng thuê': { en: 'Rental contract changes requested' },
  'Rental contract rejected': { vi: 'Hợp đồng thuê bị từ chối' },
  'Hợp đồng thuê bị từ chối': { en: 'Rental contract rejected' },
  'Rental contract withdrawn': { vi: 'Hợp đồng thuê đã được thu hồi' },
  'Hợp đồng thuê đã được thu hồi': { en: 'Rental contract withdrawn' },
  'Warehouse published': { vi: 'Kho bãi đã được đăng tải' },
  'Kho bãi đã được đăng tải': { en: 'Warehouse published' },
  'Warehouse publication scheduled': { vi: 'Đã lên lịch đăng tải kho bãi' },
  'Đã lên lịch đăng tải kho bãi': { en: 'Warehouse publication scheduled' },
  'Warehouse listing approved': { vi: 'Bài đăng kho bãi đã được duyệt' },
  'Bài đăng kho bãi đã được duyệt': { en: 'Warehouse listing approved' },
  'Warehouse listing rejected': { vi: 'Bài đăng kho bãi bị từ chối' },
  'Bài đăng kho bãi không được duyệt': { en: 'Warehouse listing rejected' },
  'Warehouse listing awaiting review': { vi: 'Bài đăng kho bãi chờ duyệt' },
  'Bài đăng kho bãi chờ duyệt': { en: 'Warehouse listing awaiting review' },
  'Warehouse contract expiry reminder': { vi: 'Nhắc nhở hợp đồng thuê kho sắp hết hạn' },
  'Nhắc nhở hợp đồng thuê kho sắp hết hạn': { en: 'Warehouse contract expiry reminder' },
  'Rental contract expired': { vi: 'Hợp đồng thuê đã hết hạn' },
  'Hợp đồng thuê đã hết hạn': { en: 'Rental contract expired' },
  'Yêu cầu kiểm định kho mới': { en: 'New warehouse inspection request' },
  'Yêu cầu kiểm định mới': { en: 'New inspection request' },
  'Kết quả kiểm kê đã được nộp': { en: 'Audit result submitted' },
  'Yêu cầu chỉnh sửa kiểm kê': { en: 'Audit revision requested' },
  'Phiếu kiểm kê đã được mở chỉnh sửa': { en: 'Audit reopened for editing' },
  'Yêu cầu kiểm kê lại': { en: 'Recount requested' },
  'Phiếu kiểm kê đã được duyệt': { en: 'Audit approved' },
  'Bạn được giao nhận chuyển kho': { en: 'You have been assigned to receive a stock transfer' },
  'You have been assigned to receive a stock transfer': { vi: 'Bạn được giao nhận chuyển kho' },
  'Phiếu nhập kho đã được phê duyệt': { en: 'Inbound receipt approved' },
  'Inbound receipt approved': { vi: 'Phiếu nhập kho đã được phê duyệt' },
  'Phiếu xuất kho đã được phê duyệt': { en: 'Outbound receipt approved' },
  'Outbound receipt approved': { vi: 'Phiếu xuất kho đã được phê duyệt' },
  'Chuyến đã bị thu hồi về kho nguồn': { en: 'Transfer recalled to source warehouse' },
  'Chuyển đã bị thu hồi về kho nguồn': { en: 'Transfer recalled to source warehouse' },
  'Transfer recalled to source warehouse': { vi: 'Chuyến đã bị thu hồi về kho nguồn' },
}

const STATIC_NOTIFICATION_MESSAGE_TRANSLATIONS = {
  'A payment update is available.': 'Có cập nhật thanh toán mới.',
  'A booking needs your attention.': 'Bạn có một yêu cầu đặt kho cần xử lý.',
  'A contract has been updated.': 'Hợp đồng của bạn đã được cập nhật.',
  'A warehouse rental contract will expire soon.': 'Hợp đồng thuê kho sắp hết hạn.',
  'A warehouse rental contract has expired and access may have changed.': 'Hợp đồng thuê kho đã hết hạn và quyền truy cập có thể đã thay đổi.',
  'Your rental access has changed.': 'Quyền truy cập kho thuê của bạn đã thay đổi.',
  'A dispute has been updated.': 'Một tranh chấp đã được cập nhật.',
  'A warehouse update is available.': 'Có cập nhật mới về kho bãi.',
  'An inspection needs your attention.': 'Có một yêu cầu kiểm định cần bạn xử lý.',
  'An inventory audit needs your attention.': 'Có một phiếu kiểm kê cần bạn xử lý.',
  'A warehouse receipt needs your attention.': 'Có một phiếu kho cần bạn xử lý.',
  'A stock transfer needs your attention.': 'Có một yêu cầu chuyển kho cần bạn xử lý.',
  'You have a new notification.': 'Bạn có một thông báo mới.',
}

const NOTIFICATION_MESSAGE_RULES = {
  en: [
    [/^Kho bãi '(.+)' của bạn đã đạt kiểm định \(PASSED\) và được gắn nhãn xác minh thành công\.$/, 'Your warehouse "$1" passed inspection (PASSED) and has been successfully verified.'],
    [/^Yêu cầu kiểm định kho bãi '(.+)' của bạn đã bị từ chối \(FAILED\)\. Lý do: (.+)$/, 'Your warehouse inspection request for "$1" was rejected (FAILED). Reason: $2'],
    [/^Chủ kho vừa gửi yêu cầu kiểm định cho kho '(.+)'\. Vui lòng phân công thanh tra viên\.$/, 'The owner submitted a new inspection request for warehouse "$1". Please assign an inspector.'],
    [/^Bạn đã được phân công kiểm định kho bãi '(.+)'\. Vui lòng kiểm tra thông tin chi tiết\.$/, 'You have been assigned to inspect warehouse "$1". Please review the details.'],
    [/^Yêu cầu rút tiền (.+) VNĐ của bạn đã được duyệt thành công\.$/, 'Your withdrawal request for $1 VND was approved successfully.'],
    [/^Ví của bạn đã được nạp (.+) VND thành công qua cổng thanh toán (.+)\.$/, 'Your wallet was credited with $1 VND successfully through the $2 gateway.'],
    [/^Chúc mừng! Bài đăng kho bãi '(.+)' đã được duyệt\. Bạn có thể chọn ngày và gói đăng bài\.$/, 'Congratulations! Your warehouse listing "$1" was approved. You can choose a publication date and package.'],
    [/^Yêu cầu đăng kho bãi '(.+)' của bạn không được phê duyệt\. Lý do từ chối: (.+)\. Bạn có thể chỉnh sửa và gửi lại sau\.$/, 'Your warehouse listing request "$1" was rejected. Reason: $2. You can edit and submit it again later.'],
    [/^The rental contract renewal for warehouse (.+) is scheduled to start on (.+)\.$/, 'Lịch gia hạn hợp đồng thuê kho $1 sẽ bắt đầu vào ngày $2.'],
    [/^The rental contract renewal for warehouse (.+) is now active\.$/, 'Hợp đồng gia hạn thuê kho $1 hiện đã có hiệu lực.'],
    [/^The tenant confirmed the rental contract for warehouse (.+)\.$/, 'Người thuê đã xác nhận hợp đồng thuê kho $1.'],
    [/^The owner submitted a rental contract for warehouse (.+)\.$/, 'Chủ kho đã gửi hợp đồng thuê kho $1.'],
    [/^The owner withdrew the rental contract for warehouse (.+) for editing\.$/, 'Chủ kho đã thu hồi hợp đồng thuê kho $1 để chỉnh sửa.'],
    [/^The tenant requested changes to the rental contract for warehouse (.+)\. Reason: (.+)$/, 'Người thuê yêu cầu thay đổi hợp đồng thuê kho $1. Lý do: $2'],
    [/^The tenant rejected the rental contract for warehouse (.+)\. Reason: (.+)$/, 'Người thuê đã từ chối hợp đồng thuê kho $1. Lý do: $2'],
    [/^(Your|The) rental contract for (.+) expires on (.+)\.$/, (_, owner, warehouse, date) => owner === 'Your'
      ? `Hợp đồng thuê kho ${warehouse} của bạn sẽ hết hạn vào ngày ${date}.`
      : `Hợp đồng thuê kho ${warehouse} sẽ hết hạn vào ngày ${date}.`],
    [/^(Your|The) contract for (.+) has expired\.(.*)$/, (_, owner, warehouse, suffix) => owner === 'Your'
      ? `Hợp đồng của bạn tại kho ${warehouse} đã hết hạn.${suffix}`
      : `Hợp đồng tại kho ${warehouse} đã hết hạn.${suffix}`],
    [/^Warehouse (.+) is visible until (.+)\.$/, 'Kho $1 sẽ được hiển thị đến ngày $2.'],
    [/^Warehouse (.+) will be visible from (.+) until (.+)\.$/, 'Kho $1 sẽ được hiển thị từ ngày $2 đến ngày $3.'],
    [/^Phiếu kiểm kê kho (.+) đã sẵn sàng để đối soát\.$/, 'The inventory audit for warehouse "$1" is ready for review.'],
    [/^Phiếu kiểm kê kho (.+) cần được mở để chỉnh sửa: (.+)$/, 'The inventory audit for warehouse "$1" needs to be reopened for editing: $2'],
    [/^Phiếu kiểm kê kho (.+) cần được đếm lại: (.+)$/, 'The inventory audit for warehouse "$1" needs to be recounted: $2'],
    [/^Tồn kho kho (.+) đã được đối soát\.$/, 'Inventory for warehouse "$1" has been reconciled.'],
    [/^Chủ kho đã gửi bài đăng kho bãi '(.+)' để duyệt nội dung\.$/, 'The owner submitted warehouse "$1" for content approval.'],
    [/^Bạn được giao nhận yêu cầu chuyển kho từ kho '(.+)' đến kho '(.+)'\.$/, 'You have been assigned to receive a stock transfer request from warehouse "$1" to warehouse "$2".'],
    [/^yêu cầu chuyển kho từ kho '(.+)' đến kho '(.+)' đã bị thu hồi về kho nguồn\. Lý do: (.+)$/, 'The stock transfer request from warehouse "$1" to warehouse "$2" was recalled to the source warehouse. Reason: $3'],
    [/^Phiếu (nhập kho|xuất kho) tại kho (.+) đã được phê duyệt thành công\. Hàng hóa trong kho đã được cập nhật\.$/, (_, receiptType, warehouse) => `The ${receiptType === 'nhập kho' ? 'inbound' : 'outbound'} receipt at warehouse "${warehouse}" was approved successfully. Inventory has been updated.`],
  ],
  vi: [
    [/^Your warehouse "(.+)" passed inspection \(PASSED\) and has been successfully verified\.$/, 'Kho bãi "$1" của bạn đã đạt kiểm định (PASSED) và được xác minh thành công.'],
    [/^Your warehouse inspection request for "(.+)" was rejected \(FAILED\)\. Reason: (.+)$/, 'Yêu cầu kiểm định kho bãi "$1" của bạn đã bị từ chối (FAILED). Lý do: $2'],
    [/^The owner submitted a new inspection request for warehouse "(.+)"\. Please assign an inspector\.$/, 'Chủ kho vừa gửi yêu cầu kiểm định cho kho "$1". Vui lòng phân công thanh tra viên.'],
    [/^You have been assigned to inspect warehouse "(.+)"\. Please review the details\.$/, 'Bạn đã được phân công kiểm định kho bãi "$1". Vui lòng kiểm tra thông tin chi tiết.'],
    [/^Your withdrawal request for (.+) VND was approved successfully\.$/, 'Yêu cầu rút tiền $1 VND của bạn đã được duyệt thành công.'],
    [/^Your wallet was credited with (.+) VND successfully through the (.+) gateway\.$/, 'Ví của bạn đã được nạp $1 VND thành công qua cổng thanh toán $2.'],
    [/^Congratulations! Your warehouse listing "(.+)" was approved\. You can choose a publication date and package\.$/, 'Chúc mừng! Bài đăng kho bãi "$1" đã được duyệt. Bạn có thể chọn ngày và gói đăng bài.'],
    [/^Your warehouse listing request "(.+)" was rejected\. Reason: (.+)\. You can edit and submit it again later\.$/, 'Yêu cầu đăng kho bãi "$1" không được phê duyệt. Lý do từ chối: $2. Bạn có thể chỉnh sửa và gửi lại sau.'],
    [/^The rental contract renewal for warehouse (.+) is scheduled to start on (.+)\.$/, 'Lịch gia hạn hợp đồng thuê kho $1 sẽ bắt đầu vào ngày $2.'],
    [/^The rental contract renewal for warehouse (.+) is now active\.$/, 'Hợp đồng gia hạn thuê kho $1 hiện đã có hiệu lực.'],
    [/^The tenant confirmed the rental contract for warehouse (.+)\.$/, 'Người thuê đã xác nhận hợp đồng thuê kho $1.'],
    [/^The owner submitted a rental contract for warehouse (.+)\.$/, 'Chủ kho đã gửi hợp đồng thuê kho $1.'],
    [/^The owner withdrew the rental contract for warehouse (.+) for editing\.$/, 'Chủ kho đã thu hồi hợp đồng thuê kho $1 để chỉnh sửa.'],
    [/^The tenant requested changes to the rental contract for warehouse (.+)\. Reason: (.+)$/, 'Người thuê yêu cầu thay đổi hợp đồng thuê kho $1. Lý do: $2'],
    [/^The tenant rejected the rental contract for warehouse (.+)\. Reason: (.+)$/, 'Người thuê đã từ chối hợp đồng thuê kho $1. Lý do: $2'],
    [/^Hợp đồng thuê kho (.+) của bạn sẽ hết hạn vào ngày (.+)\.$/, 'Your rental contract for $1 expires on $2.'],
    [/^Hợp đồng thuê kho (.+) sẽ hết hạn vào ngày (.+)\.$/, 'The rental contract for $1 expires on $2.'],
    [/^Hợp đồng của bạn tại kho (.+) đã hết hạn\.(.*)$/, 'Your contract for $1 has expired.$2'],
    [/^Hợp đồng tại kho (.+) đã hết hạn\.(.*)$/, 'The contract for $1 has expired.$2'],
    [/^Kho (.+) sẽ được hiển thị đến ngày (.+)\.$/, 'Warehouse $1 is visible until $2.'],
    [/^Kho (.+) sẽ được hiển thị từ ngày (.+) đến ngày (.+)\.$/, 'Warehouse $1 will be visible from $2 until $3.'],
    [/^The inventory audit for warehouse "(.+)" is ready for review\.$/, 'Phiếu kiểm kê kho $1 đã sẵn sàng để đối soát.'],
    [/^The inventory audit for warehouse "(.+)" needs to be reopened for editing: (.+)$/, 'Phiếu kiểm kê kho $1 cần được mở để chỉnh sửa: $2'],
    [/^The inventory audit for warehouse "(.+)" needs to be recounted: (.+)$/, 'Phiếu kiểm kê kho $1 cần được đếm lại: $2'],
    [/^Inventory for warehouse "(.+)" has been reconciled\.$/, 'Tồn kho kho $1 đã được đối soát.'],
    [/^Owner submitted warehouse '(.+)' for content approval\.$/, 'Chủ kho đã gửi bài đăng kho bãi "$1" để duyệt nội dung.'],
    [/^You have been assigned to receive a stock transfer request from warehouse "(.+)" to warehouse "(.+)"\.$/, "Bạn được giao nhận yêu cầu chuyển kho từ kho '$1' đến kho '$2'."],
    [/^The stock transfer request from warehouse "(.+)" to warehouse "(.+)" was recalled to the source warehouse\. Reason: (.+)$/, "Yêu cầu chuyển kho từ kho '$1' đến kho '$2' đã bị thu hồi về kho nguồn. Lý do: $3"],
    [/^The (inbound|outbound) receipt at warehouse "(.+)" was approved successfully\. Inventory has been updated\.$/, (_, receiptType, warehouse) => `Phiếu ${receiptType === 'inbound' ? 'nhập kho' : 'xuất kho'} tại kho ${warehouse} đã được phê duyệt thành công. Hàng hóa trong kho đã được cập nhật.`],
  ],
}

const applyNotificationRule = (value, language) => {
  const rules = NOTIFICATION_MESSAGE_RULES[language === 'vi' ? 'vi' : 'en']
  for (const [pattern, replacement] of rules) {
    if (pattern.test(value)) {
      if (typeof replacement === 'function') return value.replace(pattern, replacement)
      return value.replace(pattern, replacement)
    }
  }
  return value
}

const localizeNotificationText = (value, language, isTitle = false) => {
  if (!value) return value
  const targetLanguage = language === 'vi' ? 'vi' : 'en'
  if (isTitle) {
    const titleTranslation = NOTIFICATION_TITLE_TRANSLATIONS[value]
    if (titleTranslation?.[targetLanguage]) return titleTranslation[targetLanguage]
    if (targetLanguage === 'vi' && titleTranslation?.vi) return titleTranslation.vi
    if (targetLanguage === 'en' && titleTranslation?.en) return titleTranslation.en
  }

  if (targetLanguage === 'vi' && STATIC_NOTIFICATION_MESSAGE_TRANSLATIONS[value]) {
    return STATIC_NOTIFICATION_MESSAGE_TRANSLATIONS[value]
  }
  return applyNotificationRule(value, targetLanguage)
}

export const getLocalizedNotification = (notification = {}, language = 'en') => {
  const type = String(notification.type || 'DEFAULT').toUpperCase()
  const fallback = NOTIFICATION_FALLBACKS[type] || NOTIFICATION_FALLBACKS.DEFAULT
  const title = typeof notification.title === 'string' ? notification.title.trim() : ''
  const message = typeof notification.message === 'string' ? notification.message.trim() : ''

  return {
    title: localizeNotificationText(title || fallback.title, language, true),
    message: localizeNotificationText(message || fallback.message, language),
  }
}

export const getEnglishNotification = (notification = {}) =>
  getLocalizedNotification(notification, 'en')
