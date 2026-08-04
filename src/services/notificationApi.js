import api from './apiConfig'

const notificationApi = {
  // Lấy danh sách thông báo của tôi (phân trang)
  getMyNotifications: ({ page, size } = {}) => {
    return api.get('/notifications', { params: { page, size } })
  },

  // Lấy số lượng thông báo chưa đọc
  getUnreadCount: () => {
    return api.get('/notifications/unread-count')
  },

  // Đánh dấu 1 thông báo đã đọc
  markAsRead: (notificationId) => {
    return api.patch(`/notifications/${notificationId}/read`)
  },

  // Đánh dấu tất cả thông báo đã đọc
  markAllAsRead: () => {
    return api.patch('/notifications/read-all')
  }
}

export default notificationApi
