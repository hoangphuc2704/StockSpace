import api from '../apiConfig'

const subscriptionApi = {
  purchasePackage: (data) => {
    return api.post('/tenant/subscriptions', data)
  },
  getMyActiveSubscription: (config = {}) => {
    return api.get('/tenant/subscriptions/active', config)
  },
  previewSubscriptionChange: (packageId) => {
    return api.get('/tenant/subscriptions/preview-change', { params: { packageId } })
  },
}

export default subscriptionApi
