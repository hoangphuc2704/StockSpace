import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * BE response: ApiResponse<PagedResponse<WarehouseResponse>>
 * PagedResponse: { content, totalElements, totalPages, number (page index), size }
 * WarehouseResponse: { id, name, address, area, status, isVerified, ownerId, ... }
 *
 * verifyWarehouse / rejectWarehouse:
 *   POST /api/admin/warehouses/{id}/verify  (no body)
 *   POST /api/admin/warehouses/{id}/reject  (no body)
 *   response: ApiResponse<WarehouseResponse>
 */

// Fetch all warehouses (phân trang + filter)
export const fetchWarehouses = createAsyncThunk(
  'adminWarehouse/fetchWarehouses',
  async (params, { rejectWithValue }) => {
    try {
      const res = await adminApi.getWarehouses(params)
      // BE wraps: { success, message, data: PagedResponse }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

// Duyệt kho — no body, chỉ cần id
export const verifyWarehouse = createAsyncThunk(
  'adminWarehouse/verifyWarehouse',
  async (id, { rejectWithValue }) => {
    try {
      const res = await adminApi.verifyWarehouse(id)
      return res.data.data // WarehouseResponse mới nhất
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

// Từ chối kho — no body, chỉ cần id
export const rejectWarehouse = createAsyncThunk(
  'adminWarehouse/rejectWarehouse',
  async (id, { rejectWithValue }) => {
    try {
      const res = await adminApi.rejectWarehouse(id)
      return res.data.data // WarehouseResponse mới nhất
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

const adminWarehouseSlice = createSlice({
  name: 'adminWarehouse',
  initialState: {
    data: [],           // content từ PagedResponse
    loading: false,
    error: null,
    page: 0,            // BE dùng 0-indexed page
    totalPages: 0,
    totalElements: 0,
    filters: {
      keyword: undefined,
      status: undefined,
      isVerified: undefined,
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWarehouses.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWarehouses.fulfilled, (state, action) => {
        state.loading = false
        const pagedResponse = action.payload
        state.data = pagedResponse?.content || []
        state.totalPages = pagedResponse?.totalPages || 0
        state.totalElements = pagedResponse?.totalElements || 0
        state.page = pagedResponse?.number || 0
      })
      .addCase(fetchWarehouses.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Khi verify/reject thành công → cập nhật warehouse trong danh sách với data mới từ BE
      .addCase(verifyWarehouse.fulfilled, (state, action) => {
        const updated = action.payload
        const idx = state.data.findIndex((w) => w.id === updated.id)
        if (idx !== -1) state.data[idx] = updated
      })
      .addCase(rejectWarehouse.fulfilled, (state, action) => {
        const updated = action.payload
        const idx = state.data.findIndex((w) => w.id === updated.id)
        if (idx !== -1) state.data[idx] = updated
      })
  },
})

export const { setFilters, setPage } = adminWarehouseSlice.actions
export default adminWarehouseSlice.reducer
