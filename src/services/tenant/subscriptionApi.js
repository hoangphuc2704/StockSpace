import api from '../apiConfig'

const subscriptionApi = {
  purchasePackage: (data) => {
    return api.post('/tenant/subscriptions', data)
  },
  getMyActiveSubscription: () => {
    return api.get('/tenant/subscriptions/active')
  },
}

export default subscriptionApi
