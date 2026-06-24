import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../services/authApi'

export const loginThunk = createAsyncThunk('auth/login', async (credentials, { thunkAPI }) => {
  try {
    const data = await authApi.login(credentials)
    return data
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response.data) || 'Đăng nhập thất bại'
  }
})

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.loading = false
      state.error = null
    },
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.token = action.payload.token
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload // Lấy thông báo lỗi lưu vào state
      })
  },
})

export const { logout, updateUser } = authSlice.actions
export default authSlice.reducer
