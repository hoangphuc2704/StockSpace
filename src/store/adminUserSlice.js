import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * BE response: ApiResponse<PagedResponse<UserResponse>>
 * UserResponse: { id, email, fullName, phone, isActive, roles: Set<RoleResponse>, createdAt, updatedAt }
 * RoleResponse: { id, name, description, permissions }
 *
 * Query params getUsers: { keyword, roleName, isActive, page, size, sortBy, sortDir }
 */

// ====================== THUNKS ======================

export const fetchUsers = createAsyncThunk(
  'adminUser/fetchUsers',
  async (params, { rejectWithValue }) => {
    try {
      const res = await adminApi.getUsers(params)
      return res.data.data // PagedResponse<UserResponse>
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const fetchUserById = createAsyncThunk(
  'adminUser/fetchUserById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await adminApi.getUserById(id)
      return res.data.data // UserResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const createUser = createAsyncThunk(
  'adminUser/createUser',
  async (data, { rejectWithValue }) => {
    // data: CreateUserRequest { email, password, fullName, phone, roleIds: UUID[] }
    try {
      const res = await adminApi.createUser(data)
      return res.data.data // UserResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const updateUser = createAsyncThunk(
  'adminUser/updateUser',
  async ({ id, data }, { rejectWithValue }) => {
    // data: UpdateUserRequest { fullName?, phone? }
    try {
      const res = await adminApi.updateUser(id, data)
      return res.data.data // UserResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const deleteUser = createAsyncThunk(
  'adminUser/deleteUser',
  async (id, { rejectWithValue }) => {
    try {
      await adminApi.deleteUser(id)
      return id // Trả về id để xóa khỏi state
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const activateUser = createAsyncThunk(
  'adminUser/activateUser',
  async (id, { rejectWithValue }) => {
    try {
      const res = await adminApi.activateUser(id)
      return res.data.data // UserResponse với isActive=true
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const deactivateUser = createAsyncThunk(
  'adminUser/deactivateUser',
  async (id, { rejectWithValue }) => {
    try {
      const res = await adminApi.deactivateUser(id)
      return res.data.data // UserResponse với isActive=false
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const resetUserPassword = createAsyncThunk(
  'adminUser/resetUserPassword',
  async ({ id, data }, { rejectWithValue }) => {
    // data: ResetPasswordRequest { newPassword, confirmPassword }
    try {
      await adminApi.resetUserPassword(id, data)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

// ====================== SLICE ======================

const adminUserSlice = createSlice({
  name: 'adminUser',
  initialState: {
    data: [],             // content từ PagedResponse<UserResponse>
    selectedUser: null,   // UserResponse của user đang xem/edit
    loading: false,
    actionLoading: false, // Loading riêng cho create/update/delete/activate
    error: null,
    page: 0,              // BE dùng 0-indexed
    totalPages: 0,
    totalElements: 0,
    filters: {
      keyword: undefined,
      roleName: undefined,
      isActive: undefined,
    },
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
      state.page = 0
    },
    setPage: (state, action) => {
      state.page = action.payload
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchUsers
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false
        const paged = action.payload
        state.data = paged?.content || []
        state.totalPages = paged?.totalPages || 0
        state.totalElements = paged?.totalElements || 0
        state.page = paged?.number || 0
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      // fetchUserById
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.selectedUser = action.payload
      })

      // createUser
      .addCase(createUser.pending, (state) => {
        state.actionLoading = true
        state.error = null
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.actionLoading = false
        // Thêm user mới vào đầu danh sách
        state.data.unshift(action.payload)
        state.totalElements += 1
      })
      .addCase(createUser.rejected, (state, action) => {
        state.actionLoading = false
        state.error = action.payload
      })

      // updateUser
      .addCase(updateUser.pending, (state) => {
        state.actionLoading = true
        state.error = null
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.actionLoading = false
        const updated = action.payload
        const idx = state.data.findIndex((u) => u.id === updated.id)
        if (idx !== -1) state.data[idx] = updated
        if (state.selectedUser?.id === updated.id) state.selectedUser = updated
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.actionLoading = false
        state.error = action.payload
      })

      // deleteUser
      .addCase(deleteUser.pending, (state) => {
        state.actionLoading = true
        state.error = null
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.actionLoading = false
        state.data = state.data.filter((u) => u.id !== action.payload)
        state.totalElements = Math.max(0, state.totalElements - 1)
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.actionLoading = false
        state.error = action.payload
      })

      // activateUser / deactivateUser — cập nhật isActive trong danh sách
      .addCase(activateUser.fulfilled, (state, action) => {
        const updated = action.payload
        const idx = state.data.findIndex((u) => u.id === updated.id)
        if (idx !== -1) state.data[idx] = updated
      })
      .addCase(deactivateUser.fulfilled, (state, action) => {
        const updated = action.payload
        const idx = state.data.findIndex((u) => u.id === updated.id)
        if (idx !== -1) state.data[idx] = updated
      })

      // resetUserPassword — không cần cập nhật state
  },
})

export const { setFilters, setPage, clearSelectedUser, clearError } = adminUserSlice.actions
export default adminUserSlice.reducer
