import api from './apiConfig'

const notificationApi = {
  // Lấy danh sách thông báo của tôi (phân trang)
  getMyNotifications: async ({ page, size } = {}) => {
    const response = await api.get('/notifications', { params: { page, size } })
    return response.data
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
