import api from '../apiConfig'

const subscriptionApi = {
  purchasePackage: (data) => {
    return api.post('/tenant/subscriptions', data)
  },
  getMyActiveSubscription: () => {
    return api.get('/tenant/subscriptions/active')
  },
  previewSubscriptionChange: (packageId) => {
    return api.get('/tenant/subscriptions/preview-change', { params: { packageId } })
  },
}

export default subscriptionApi
