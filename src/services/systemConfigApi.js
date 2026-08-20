import axios from 'axios'
import { showApiErrorToast } from '@/config/apiError'

const API_BASE_URL = import.meta.env.VITE_API_URL

// Instance không đính kèm Authorization token (gọi public)
const publicApi = axios.create({
  baseURL: API_BASE_URL,
})

publicApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.config?.skipErrorToast) showApiErrorToast(error)
    return Promise.reject(error)
  }
)

const systemConfigApi = {
  getDepositPercentage: async () => {
    try {
      const response = await publicApi.get('/configs/deposit_percentage')
      return parseInt(response.data.data.configValue, 10)
    } catch (error) {
      console.error('Failed to fetch deposit percentage, falling back to 10%', error)
      return 10
    }
  },
  getActiveSystemPolicy: async () => {
    try {
      const response = await publicApi.get('/system-policies/active')
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch active system policy', error)
      return null
    }
  },
}

export default systemConfigApi
