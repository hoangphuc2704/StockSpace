import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * System Policy DTOs:
 *
 * SystemPolicyResponse:
 *   { id, version, content, isActive, createdAt, updatedAt }
 *
 * GET /admin/system-policies
 *   params: { page, size }
 *   response: ApiResponse<PagedResponse<SystemPolicyResponse>>
 *
 * POST /admin/system-policies
 *   body: { version, content }
 *   response: ApiResponse<SystemPolicyResponse>
 */

export const fetchSystemPolicies = createAsyncThunk(
  'adminSystemPolicy/fetchSystemPolicies',
  async ({ page = 0, size = 10 } = {}, { rejectWithValue }) => {
    try {
      const res = await adminApi.getSystemPolicies({ page, size })
      // res.data = ApiResponse { success, message, data: PagedResponse<SystemPolicyResponse> }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const createSystemPolicy = createAsyncThunk(
  'adminSystemPolicy/createSystemPolicy',
  async ({ version, content }, { rejectWithValue }) => {
    try {
      const res = await adminApi.createSystemPolicy({ version, content })
      // res.data = ApiResponse { success, message, data: SystemPolicyResponse }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

const adminSystemPolicySlice = createSlice({
  name: 'adminSystemPolicy',
  initialState: {
    // List data
    data: [],
    loading: false,
    error: null,

    // Pagination
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
    last: false,

    // Action state
    actionLoading: false,
    actionError: null,
  },
  reducers: {
    setPage: (state, action) => {
      state.page = action.payload
    },
    clearActionError: (state) => {
      state.actionError = null
    }
  },
  extraReducers: (builder) => {
    // ── fetchSystemPolicies ──
    builder
      .addCase(fetchSystemPolicies.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSystemPolicies.fulfilled, (state, action) => {
        state.loading = false
        const paged = action.payload
        state.data = paged?.content || []
        state.page = paged?.page ?? 0
        state.size = paged?.size || 10
        state.totalPages = paged?.totalPages || 0
        state.totalElements = paged?.totalElements || 0
        state.last = paged?.last ?? false
      })
      .addCase(fetchSystemPolicies.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // ── createSystemPolicy ──
    builder
      .addCase(createSystemPolicy.pending, (state) => {
        state.actionLoading = true
        state.actionError = null
      })
      .addCase(createSystemPolicy.fulfilled, (state, action) => {
        state.actionLoading = false
        const newPolicy = action.payload
        // Chèn policy mới vào đầu mảng
        state.data = [newPolicy, ...state.data]
        // Cập nhật lại các item khác thành inactive nếu policy mới isActive = true (thường BE tự xử lý, nhưng cập nhật UI cho mượt)
        if (newPolicy.isActive) {
          state.data = state.data.map(p => p.id === newPolicy.id ? p : { ...p, isActive: false })
        }
        state.totalElements += 1
      })
      .addCase(createSystemPolicy.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })
  }
})

export const { setPage, clearActionError } = adminSystemPolicySlice.actions
export default adminSystemPolicySlice.reducer
