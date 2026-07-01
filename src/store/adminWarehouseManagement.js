import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * BE APIs:
 *
 * GET /admin/warehouses
 *   params: { keyword, status (WarehouseStatus), isVerified (Boolean), page, size, sortBy, sortDir }
 *   response: ApiResponse<PagedResponse<WarehouseResponse>>
 *
 * POST /admin/warehouses/{id}/verify  → ApiResponse<WarehouseResponse>
 * POST /admin/warehouses/{id}/reject  → ApiResponse<WarehouseResponse>
 *
 * WarehouseResponse:
 *   { id, name, address, description, capacity, pricePerMonth, status, isVerified,
 *     typeId, typeName,
 *     ownerId, ownerName, ownerPhone,
 *     coverImageUrl, imageUrls: List<String>,
 *     policyId, policyVersion,
 *     createdAt, updatedAt }
 *
 * WarehouseStatus enum: AVAILABLE | RENTED | PENDING_APPROVAL | INACTIVE
 */

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchWarehouses = createAsyncThunk(
  'adminWarehouseManage/fetchWarehouses',
  async ({ page = 0, size = 10, keyword, status, isVerified, sortBy = 'createdAt', sortDir = 'desc' } = {}, { rejectWithValue }) => {
    try {
      const res = await adminApi.getWarehouses({
        keyword: keyword || undefined,
        status: status || undefined,
        isVerified: isVerified !== '' && isVerified !== undefined ? isVerified : undefined,
        page,
        size,
        sortBy,
        sortDir,
      })
      // res.data = ApiResponse { success, message, data: PagedResponse<WarehouseResponse> }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const verifyWarehouse = createAsyncThunk(
  'adminWarehouseManage/verify',
  async (id, { rejectWithValue }) => {
    try {
      const res = await adminApi.verifyWarehouse(id)
      return res.data.data  // WarehouseResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const rejectWarehouse = createAsyncThunk(
  'adminWarehouseManage/reject',
  async (id, { rejectWithValue }) => {
    try {
      const res = await adminApi.rejectWarehouse(id)
      return res.data.data  // WarehouseResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const adminWarehouseManageSlice = createSlice({
  name: 'adminWarehouseManage',
  initialState: {
    // List
    data: [],            // PagedResponse<WarehouseResponse>.content
    loading: false,
    error: null,

    // Pagination (BE 0-indexed)
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
    last: false,

    // Filters gửi lên BE
    keyword: '',
    statusFilter: '',      // '' | 'AVAILABLE' | 'RENTED' | 'PENDING_APPROVAL' | 'INACTIVE'
    isVerifiedFilter: '',  // '' | true | false

    // Action (verify/reject)
    actionLoading: false,
    actionError: null,
  },
  reducers: {
    setPage: (state, action) => {
      state.page = action.payload
    },
    setKeyword: (state, action) => {
      state.keyword = action.payload
      state.page = 0
    },
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload
      state.page = 0
    },
    setIsVerifiedFilter: (state, action) => {
      state.isVerifiedFilter = action.payload
      state.page = 0
    },
    clearActionError: (state) => {
      state.actionError = null
    },
  },
  extraReducers: (builder) => {
    // ── fetchWarehouses ──
    builder
      .addCase(fetchWarehouses.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWarehouses.fulfilled, (state, action) => {
        state.loading = false
        const paged = action.payload
        state.data = paged?.content || []
        state.page = paged?.page ?? 0
        state.size = paged?.size || 10
        state.totalPages = paged?.totalPages || 0
        state.totalElements = paged?.totalElements || 0
        state.last = paged?.last ?? false
      })
      .addCase(fetchWarehouses.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // ── verifyWarehouse ──
    builder
      .addCase(verifyWarehouse.pending, (state) => {
        state.actionLoading = true
        state.actionError = null
      })
      .addCase(verifyWarehouse.fulfilled, (state, action) => {
        state.actionLoading = false
        const updated = action.payload
        state.data = state.data.map((w) => (w.id === updated.id ? updated : w))
      })
      .addCase(verifyWarehouse.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })

    // ── rejectWarehouse ──
    builder
      .addCase(rejectWarehouse.pending, (state) => {
        state.actionLoading = true
        state.actionError = null
      })
      .addCase(rejectWarehouse.fulfilled, (state, action) => {
        state.actionLoading = false
        const updated = action.payload
        state.data = state.data.map((w) => (w.id === updated.id ? updated : w))
      })
      .addCase(rejectWarehouse.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })
  },
})

export const {
  setPage,
  setKeyword,
  setStatusFilter,
  setIsVerifiedFilter,
  clearActionError,
} = adminWarehouseManageSlice.actions

export default adminWarehouseManageSlice.reducer
