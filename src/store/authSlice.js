import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// ✅ [HEAD] Dùng authApi service
import { authApi } from '@/services/authApi'

// ==================== Async Thunks ====================

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

export const logoutThunk = createAsyncThunk('auth/logoutThunk', async (_, { rejectWithValue }) => {
  try {
    await authApi.logout()
  } catch (err) {
    console.error('Logout API error:', err)
    // Vẫn clear state dù API fail
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
})

export const logoutAllThunk = createAsyncThunk(
  'auth/logoutAllThunk',
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logoutAll()
    } catch (err) {
      console.error('Logout all API error:', err)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
)

export const fetchCurrentUserThunk = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getMe()
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
        }
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

export const forgotPasswordThunk = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await authApi.forgotPassword(email)
      return response.message || 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn.'
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Gửi yêu cầu thất bại')
    }
  }
)

export const resetPasswordThunk = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, token, newPassword }, { rejectWithValue }) => {
    try {
      const response = await authApi.resetPassword({ email, token, newPassword })
      return response.message || 'Mật khẩu đã được đặt lại thành công.'
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Đặt lại mật khẩu thất bại')
    }
  }
)

export const googleLoginThunk = createAsyncThunk(
  'auth/googleLogin',
  async (code, { rejectWithValue }) => {
    try {
      const response = await authApi.googleLogin(code)
      if (response.success && response.data) {
        localStorage.setItem('token', response.data.accessToken)
        localStorage.setItem(
          'user',
          JSON.stringify({
            name: response.data.fullName,
            role: response.data.role,
            userId: response.data.userId,
            email: response.data.email,
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
const user = userStr ? JSON.parse(userStr) : null

const initialState = {
  user: user,
  token: token,
  isAuthenticated: !!token,
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
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      // ❌ [origin/owner] - Chỉ clear loading/error, không xóa localStorage
      // state.loading = false
      // state.error = null
    },

    // ✅ [HEAD] Dùng khi F5: cập nhật user info mới nhất từ server (getMe)
    setUser: (state, action) => {
      state.user = action.payload
      state.isAuthenticated = true
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
      // ==================== Login ====================
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        const { accessToken, role, fullName, userId, email } = action.payload
        state.user = { name: fullName, role, userId, email }
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
      })
      .addCase(logoutThunk.rejected, (state) => {
        // Vẫn clear state dù API fail
        state.user = null
        state.token = null
        state.isAuthenticated = false
      })

      // ==================== Logout All ====================
      .addCase(logoutAllThunk.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
      })
      .addCase(logoutAllThunk.rejected, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
      })

      // ==================== Fetch Current User ====================
      .addCase(fetchCurrentUserThunk.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchCurrentUserThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(fetchCurrentUserThunk.rejected, (state) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
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
        const { accessToken, role, fullName, userId, email } = action.payload
        state.user = { name: fullName, role, userId, email }
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
