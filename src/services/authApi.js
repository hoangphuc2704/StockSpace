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
  logout: async (accessToken) => {
    const response = await api.post('/auth/logout', null, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
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
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/me', profileData)
    return response.data
  },
  refresh: async () => {
    const response = await api.post('/auth/refresh')
    return response.data
  },
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  },
  resetPassword: async ({ email, token, newPassword }) => {
    const response = await api.post('/auth/reset-password', { email, token, newPassword })
    return response.data
  },
  googleLogin: async ({ code, role }) => {
    const response = await api.post('/auth/google', { code, role })
    return response.data
  },

  // Staff invitation (Public — không cần JWT)
  validateStaffInviteToken: async (token) => {
    const response = await api.get('/auth/staff/invite', { params: { token } })
    return response.data
  },
  acceptStaffInvitation: async (data) => {
    // data: { token, password, confirmPassword }
    const response = await api.post('/auth/staff/accept', data)
    return response.data
  },
}
