import api from './apiConfig'

const packageApi = {
  getPackages: ({ page, size, keyword, sortBy, sortDir } = {}) => {
    return api.get('/packages', {
      params: { page, size, keyword, sortBy, sortDir },
    })
  },

  getPackageById: (packageId) => {
    return api.get(`/packages/${packageId}`)
  },
}

export default packageApi
