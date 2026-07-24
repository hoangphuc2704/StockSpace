import api from './apiConfig'

const subscriptionApi = {
  // Đăng ký mua gói dịch vụ
  subscribePackage: (packageId) => {
    return api.post('/tenant/subscriptions', { packageId })
  },
  
  // Xem thông tin gói dịch vụ đang hoạt động
  getActiveSubscription: () => {
    return api.get('/tenant/subscriptions/active')
  }
}

export default subscriptionApi
