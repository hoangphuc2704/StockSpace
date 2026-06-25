import axios from 'axios'

// ==================== Main Axios Instance ====================
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Gửi cookie (refreshToken) kèm mọi request
})

// ==================== Refresh Axios Instance (tránh infinite loop) ====================
const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// ==================== Queue mechanism cho refresh ====================
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// ==================== Request Interceptor ====================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ==================== Response Interceptor ====================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Chỉ xử lý 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Nếu request gốc là /auth/refresh hoặc /auth/login thì không retry
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/login')
      ) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Đang refresh → đưa vào queue chờ
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Gọi refresh bằng refreshApi (không có interceptor → tránh loop)
        const response = await refreshApi.post('/auth/refresh')

        if (response.data?.success && response.data?.data?.accessToken) {
          const newToken = response.data.data.accessToken

          // Cập nhật token mới
          localStorage.setItem('token', newToken)

          // Cập nhật user info nếu có
          const { fullName, role, userId, email } = response.data.data
          if (fullName && role) {
            localStorage.setItem(
              'user',
              JSON.stringify({ name: fullName, role, userId, email })
            )
          }

          // Process tất cả request đang chờ
          processQueue(null, newToken)

          // Retry request gốc với token mới
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } else {
          processQueue(new Error('Refresh failed'), null)
          // Token hết hạn hoàn toàn → clear state
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/'
          return Promise.reject(error)
        }
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Refresh token cũng hết hạn → logout
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
