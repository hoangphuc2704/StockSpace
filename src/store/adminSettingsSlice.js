import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * BE response: ApiResponse<PagedResponse<SystemPolicyResponse>>
 * PagedResponse: { content, totalElements, totalPages, number, size }
 * SystemPolicyResponse: (từ common.dto)
 *
 * POST /api/admin/system-policies
 *   body: CreateSystemPolicyRequest (từ common.dto — xem BE để biết fields)
 *   Phiên bản mới sẽ tự động trở thành active, các bản cũ deactivate
 */

export const fetchSystemPolicies = createAsyncThunk(
  'adminSettings/fetchSystemPolicies',
  async (params, { rejectWithValue }) => {
    try {
      const res = await adminApi.getSystemPolicies(params)
      // BE wraps: { success, message, data: PagedResponse }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const createSystemPolicy = createAsyncThunk(
  'adminSettings/createSystemPolicy',
  async (data, { rejectWithValue }) => {
    try {
      const res = await adminApi.createSystemPolicy(data)
      // BE trả về SystemPolicyResponse mới
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

const adminSettingsSlice = createSlice({
  name: 'adminSettings',
  initialState: {
    data: [],           // content từ PagedResponse<SystemPolicyResponse>
    loading: false,
    creating: false,    // riêng để phân biệt trạng thái tạo mới
    error: null,
    page: 0,
    totalPages: 0,
    totalElements: 0,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSystemPolicies.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSystemPolicies.fulfilled, (state, action) => {
        state.loading = false
        const pagedResponse = action.payload
        state.data = pagedResponse?.content || []
        state.totalPages = pagedResponse?.totalPages || 0
        state.totalElements = pagedResponse?.totalElements || 0
        state.page = pagedResponse?.number || 0
      })
      .addCase(fetchSystemPolicies.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createSystemPolicy.pending, (state) => {
        state.creating = true
        state.error = null
      })
      .addCase(createSystemPolicy.fulfilled, (state, action) => {
        state.creating = false
        // Thêm policy mới vào đầu danh sách (vì BE sort desc)
        if (action.payload) state.data.unshift(action.payload)
      })
      .addCase(createSystemPolicy.rejected, (state, action) => {
        state.creating = false
        state.error = action.payload
      })
  },
})

export default adminSettingsSlice.reducer
