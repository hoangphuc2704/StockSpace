import api from './apiConfig'

export const normalizeNotification = (notification = {}) => {
  const read =
    typeof notification.read === 'boolean'
      ? notification.read
      : typeof notification.isRead === 'boolean'
        ? notification.isRead
        : false

  return {
    ...notification,
    type: String(notification.type || 'DEFAULT').toUpperCase(),
    read,
    isRead: read,
  }
}

const normalizeNotificationPage = (response) => {
  if (!response?.data) return response

  const page = response.data
  if (!Array.isArray(page.content)) return response

  return {
    ...response,
    data: {
      ...page,
      content: page.content.map(normalizeNotification),
    },
  }
}

const notificationApi = {
  // Lấy danh sách thông báo của tôi (phân trang)
  getMyNotifications: async ({ page, size } = {}) => {
    const response = await api.get('/notifications', { params: { page, size } })
    return normalizeNotificationPage(response.data)
  },

  // Lấy số lượng thông báo chưa đọc
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count')
    return response.data
  },

  // Đánh dấu 1 thông báo đã đọc
  markAsRead: async (notificationId) => {
    const response = await api.patch(`/notifications/${notificationId}/read`)
    return response.data
  },

  // Đánh dấu tất cả thông báo đã đọc
  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all')
    return response.data
  }
}

export default notificationApi
