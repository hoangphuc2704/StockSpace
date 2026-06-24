import api from './apiConfig'

export const authApi = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  },
  logout: async () => {
    const response = await api.post('/auth/logout')
    return response.data
  },
  logoutAll: async () => {
    const response = await api.post('/auth/logout-all')
    return response.data
  },
  getMe: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
  refresh: async () => {
    const response = await api.post('/auth/refresh')
    return response.data
  },
}
