import axios from 'axios'
import { logout } from '@/store/authSlice'
import { login } from '@/store/authSlice'
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor will add the token to every request if it exists not localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') // You can also use a more secure storage mechanism
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Logic for refreshing token would go here
        // const newToken = await refreshToken()
        // store.dispatch(login({ user, token: newToken }))
        // return api(originalRequest)
      } catch (refreshError) {
        store.dispatch(logout())
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
