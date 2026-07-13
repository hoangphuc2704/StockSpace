import axios from 'axios'
import api from './apiConfig'

const API_BASE_URL = import.meta.env.VITE_API_URL

// Instance không đính kèm Authorization token (gọi public)
const publicApi = axios.create({
  baseURL: API_BASE_URL,
})

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
}

export default systemConfigApi
