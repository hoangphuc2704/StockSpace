import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// ✅ [HEAD] Dùng authApi service
import { authApi } from '@/services/authApi'

const AUTH_STATUS = {
  CHECKING: 'checking',
  AUTHENTICATED: 'authenticated',
  GUEST: 'guest',
}

const clearStoredSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

const toUserData = (data) => ({
  name: data.fullName,
  fullName: data.fullName,
  role: data.role,
  userId: data.userId,
  email: data.email,
  phone: data.phone,
  avatarUrl: data.avatarUrl,
  provider: data.provider,
  isActive: data.isActive,
  createdAt: data.createdAt,
  tenantId: data.tenantId || null,
})

const isAccessTokenExpired = (token) => {
  try {
    const parts = String(token || '').split('.')
    if (parts.length !== 3) return true

    const normalizedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      '='
    )
    const payload = JSON.parse(window.atob(paddedPayload))
    const expiresAt = Number(payload.exp) * 1000

    return !Number.isFinite(expiresAt) || expiresAt <= Date.now() + 30_000
  } catch {
    return true
  }
}

const refreshStoredAccessToken = async () => {
  const response = await authApi.refresh({ skipErrorToast: true })
  const authData = response?.data

  if (!response?.success || !authData?.accessToken) {
    const error = new Error(response?.message || 'Session refresh failed')
    error.code = 'INVALID_AUTH_RESPONSE'
    throw error
  }

  localStorage.setItem('token', authData.accessToken)
  return authData.accessToken
}

const fetchCurrentUserSilently = async () => {
  const response = await authApi.getMe({ skipErrorToast: true })

  if (!response?.success || !response?.data) {
    const error = new Error(response?.message || 'Failed to fetch user info')
    error.code = 'INVALID_AUTH_RESPONSE'
    throw error
  }

  const userData = toUserData(response.data)
  localStorage.setItem('user', JSON.stringify(userData))
  return userData
}

// ==================== Async Thunks ====================

export const initializeAuthThunk = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    let currentToken = localStorage.getItem('token')

    if (!currentToken) {
      clearStoredSession()
      return rejectWithValue({ clearSession: true })
    }

    try {
      if (isAccessTokenExpired(currentToken)) {
        currentToken = await refreshStoredAccessToken()
      }

      let userData
      try {
        userData = await fetchCurrentUserSilently()
      } catch (error) {
        // The current BE can report an invalid access token as 403. During
        // bootstrap only, rotate the token once before treating it as denied.
        if (error.response?.status !== 403) throw error
        currentToken = await refreshStoredAccessToken()
        userData = await fetchCurrentUserSilently()
      }

      return {
        user: userData,
        token: localStorage.getItem('token') || currentToken,
      }
    } catch (error) {
      const status = error.response?.status
      const clearSession =
        status === 401 ||
        status === 403 ||
        error.code === 'INVALID_AUTH_RESPONSE' ||
        isAccessTokenExpired(currentToken)

      if (clearSession) clearStoredSession()

      return rejectWithValue({
        clearSession,
        status,
        message: error.response?.data?.message || error.message || 'Session initialization failed',
      })
    }
  }
)

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials)
      if (response.success && response.data) {
        // Store token for apiConfig interceptor
        localStorage.setItem('token', response.data.accessToken)
        // Store user info for rehydration after page refresh
        localStorage.setItem(
          'user',
          JSON.stringify({
            name: response.data.fullName,
            role: response.data.role,
            userId: response.data.userId,
            email: response.data.email,
            tenantId: response.data.tenantId || null,
          })
        )
        return response.data
      }
      return rejectWithValue(response.message || 'Login failed')
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login failed')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authApi.register(userData)
      if (response.success) {
        return response.data
      }
      return rejectWithValue(response.message || 'Registration failed')
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed')
    }
  }
)

export const logoutThunk = createAsyncThunk('auth/logoutThunk', async (_, { dispatch }) => {
  // Clear the client session before waiting for the API so navigation never
  // leaves the user authenticated while the request is in flight.
  const accessToken = localStorage.getItem('token')
  dispatch(logout())

  try {
    await authApi.logout(accessToken)
  } catch (err) {
    console.error('Logout API error:', err)
    // Vẫn clear state dù API fail
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
})

export const logoutAllThunk = createAsyncThunk('auth/logoutAllThunk', async () => {
  try {
    await authApi.logoutAll()
  } catch (err) {
    console.error('Logout all API error:', err)
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
})

export const fetchCurrentUserThunk = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getMe()
      if (response.success && response.data) {
        const userData = toUserData(response.data)
        // Đồng bộ lại localStorage
        localStorage.setItem('user', JSON.stringify(userData))
        return userData
      }
      return rejectWithValue('Failed to fetch user info')
    } catch (err) {
      // Token hết hạn hoặc lỗi → xóa localStorage
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch user info')
    }
  }
)

export const updateProfileThunk = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await authApi.updateProfile(profileData)
      if (response.success && response.data) {
        const userData = {
          name: response.data.fullName,
          fullName: response.data.fullName,
          role: response.data.role,
          userId: response.data.userId,
          email: response.data.email,
          phone: response.data.phone,
          avatarUrl: response.data.avatarUrl,
          provider: response.data.provider,
          isActive: response.data.isActive,
          createdAt: response.data.createdAt,
          tenantId: response.data.tenantId || null,
        }
        localStorage.setItem('user', JSON.stringify(userData))
        return userData
      }
      return rejectWithValue(response.message || 'Failed to update profile')
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update profile')
    }
  }
)

export const forgotPasswordThunk = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await authApi.forgotPassword(email)
      return response.message || 'A password reset link has been sent to your email.'
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to send the request')
    }
  }
)

export const resetPasswordThunk = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, token, newPassword }, { rejectWithValue }) => {
    try {
      const response = await authApi.resetPassword({ email, token, newPassword })
      return response.message || 'Your password has been reset successfully.'
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to reset the password')
    }
  }
)

export const googleLoginThunk = createAsyncThunk(
  'auth/googleLogin',
  async ({ code, role }, { rejectWithValue }) => {
    try {
      const response = await authApi.googleLogin({ code, role })
      if (response.success && response.data) {
        localStorage.setItem('token', response.data.accessToken)
        localStorage.setItem(
          'user',
          JSON.stringify({
            name: response.data.fullName,
            role: response.data.role,
            userId: response.data.userId,
            email: response.data.email,
            tenantId: response.data.tenantId || null,
          })
        )
        return response.data
      }
      return rejectWithValue(response.message || 'Google login failed')
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Google login failed')
    }
  }
)

// ==================== Rehydrate from localStorage ====================
const token = localStorage.getItem('token')
const userStr = localStorage.getItem('user')
let user = null

if (token && userStr) {
  try {
    user = JSON.parse(userStr)
  } catch {
    localStorage.removeItem('user')
  }
} else if (!token && userStr) {
  localStorage.removeItem('user')
}

const initialState = {
  user: user,
  token: token,
  // A stored token is a session candidate, not proof of authentication.
  isAuthenticated: false,
  authStatus: token ? AUTH_STATUS.CHECKING : AUTH_STATUS.GUEST,
  isLoading: false,
  error: null,
  // Dùng cho forgot/reset password
  passwordResetMessage: null,
}

// ==================== Slice ====================
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // ✅ [HEAD] Sync logout fallback (dùng khi không cần gọi API)
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.authStatus = AUTH_STATUS.GUEST
      clearStoredSession()

      // ❌ [origin/owner] - Chỉ clear loading/error, không xóa localStorage
      // state.loading = false
      // state.error = null
    },

    // ✅ [HEAD] Dùng khi F5: cập nhật user info mới nhất từ server (getMe)
    setUser: (state, action) => {
      state.user = action.payload
      state.isAuthenticated = true
      state.authStatus = AUTH_STATUS.AUTHENTICATED
      // Cập nhật lại localStorage để đồng bộ
      localStorage.setItem('user', JSON.stringify(action.payload))
    },

    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },

    // ✅ [HEAD] Cập nhật token mới (dùng bởi refresh interceptor)
    updateToken: (state, action) => {
      state.token = action.payload
      localStorage.setItem('token', action.payload)
    },

    clearError: (state) => {
      state.error = null
    },

    clearPasswordResetMessage: (state) => {
      state.passwordResetMessage = null
    },
  },

  // ✅ [HEAD] extraReducers đầy đủ cho tất cả thunks
  extraReducers: (builder) => {
    builder
      // ==================== Session Bootstrap ====================
      .addCase(initializeAuthThunk.pending, (state) => {
        state.authStatus = AUTH_STATUS.CHECKING
        state.isAuthenticated = false
      })
      .addCase(initializeAuthThunk.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.authStatus = AUTH_STATUS.AUTHENTICATED
      })
      .addCase(initializeAuthThunk.rejected, (state, action) => {
        state.user = null
        state.isAuthenticated = false
        state.authStatus = AUTH_STATUS.GUEST
        state.token = action.payload?.clearSession ? null : localStorage.getItem('token')
      })

      // ==================== Login ====================
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.authStatus = AUTH_STATUS.AUTHENTICATED
        const { accessToken, role, fullName, userId, email, tenantId } = action.payload
        state.user = { name: fullName, role, userId, email, tenantId: tenantId || null }
        state.token = accessToken
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      // ==================== Register ====================
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      // ==================== Logout ====================
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.authStatus = AUTH_STATUS.GUEST
      })
      .addCase(logoutThunk.rejected, (state) => {
        // Vẫn clear state dù API fail
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.authStatus = AUTH_STATUS.GUEST
      })

      // ==================== Logout All ====================
      .addCase(logoutAllThunk.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.authStatus = AUTH_STATUS.GUEST
      })
      .addCase(logoutAllThunk.rejected, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.authStatus = AUTH_STATUS.GUEST
      })

      // ==================== Fetch Current User ====================
      .addCase(fetchCurrentUserThunk.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchCurrentUserThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.token = localStorage.getItem('token')
        state.isAuthenticated = true
        state.authStatus = AUTH_STATUS.AUTHENTICATED
      })
      .addCase(fetchCurrentUserThunk.rejected, (state) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.authStatus = AUTH_STATUS.GUEST
      })

      // ==================== Update Profile ====================
      .addCase(updateProfileThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      // ==================== Forgot Password ====================
      .addCase(forgotPasswordThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
        state.passwordResetMessage = null
      })
      .addCase(forgotPasswordThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.passwordResetMessage = action.payload
      })
      .addCase(forgotPasswordThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      // ==================== Reset Password ====================
      .addCase(resetPasswordThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
        state.passwordResetMessage = null
      })
      .addCase(resetPasswordThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.passwordResetMessage = action.payload
      })
      .addCase(resetPasswordThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      // ==================== Google Login ====================
      .addCase(googleLoginThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(googleLoginThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.authStatus = AUTH_STATUS.AUTHENTICATED
        const { accessToken, role, fullName, userId, email, tenantId } = action.payload
        state.user = { name: fullName, role, userId, email, tenantId: tenantId || null }
        state.token = accessToken
      })
      .addCase(googleLoginThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

    // ❌ [origin/owner] - extraReducers dùng loginThunk (không tồn tại trong HEAD)
    // builder
    //   .addCase(loginThunk.pending, (state) => {
    //     state.isLoading = true
    //     state.error = null
    //   })
    //   .addCase(loginThunk.fulfilled, (state, action) => {
    //     state.isLoading = false
    //     state.isAuthenticated = true
    //     state.user = action.payload.user
    //     state.token = action.payload.token
    //   })
    //   .addCase(loginThunk.rejected, (state, action) => {
    //     state.isLoading = false
    //     state.error = action.payload
    //   })
  },
})

// ✅ [HEAD] Export đầy đủ các actions
export const { logout, setUser, updateUser, updateToken, clearError, clearPasswordResetMessage } =
  authSlice.actions

// ❌ [origin/owner] - Chỉ export logout và updateUser
// export const { logout, updateUser } = authSlice.actions

export default authSlice.reducer
