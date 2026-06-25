import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * BE response: ApiResponse<PagedResponse<DisputeResponse>>
 * PagedResponse: { content, page, size, totalElements, totalPages, last }
 *
 * DisputeResponse:
 *   { id, status, reason, evidenceImages, adminNote,
 *     contractId, raisedById, raisedByName, handledById, handledByName, createdAt }
 *
 * status là String: "OPEN" | "RESOLVED"
 *
 * ResolveDisputeRequest: { adminNote (required), depositResolution (required) }
 *   depositResolution: "REFUND_TO_TENANT" | "FORFEIT_TO_OWNER" | "KEEP_IN_SYSTEM"
 */

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchDisputes = createAsyncThunk(
  'adminDispute/fetchDisputes',
  async ({ page = 0, size = 10, status } = {}, { rejectWithValue }) => {
    try {
      const res = await adminApi.getDisputes({ status: status || undefined, page, size })
      // res.data = ApiResponse { success, message, data: PagedResponse<DisputeResponse> }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const resolveDispute = createAsyncThunk(
  'adminDispute/resolveDispute',
  async ({ id, adminNote, depositResolution }, { rejectWithValue }) => {
    try {
      const res = await adminApi.resolveDispute(id, { adminNote, depositResolution })
      // res.data = ApiResponse { success, message, data: DisputeResponse }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const adminDisputeSlice = createSlice({
  name: 'adminDispute',
  initialState: {
    // List data
    data: [],            // content từ PagedResponse<DisputeResponse>
    loading: false,
    error: null,

    // Pagination — BE field tên "page" (0-indexed)
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
    last: false,

    // Filter (truyền lên BE)
    statusFilter: '',    // '' | 'OPEN' | 'RESOLVED'

    // Resolve action
    resolving: false,    // true khi đang gọi resolve API
    resolveError: null,
  },
  reducers: {
    setPage: (state, action) => {
      state.page = action.payload
    },
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload
      state.page = 0  // reset page khi đổi filter
    },
    clearResolveError: (state) => {
      state.resolveError = null
    },
  },
  extraReducers: (builder) => {
    // ── fetchDisputes ──
    builder
      .addCase(fetchDisputes.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDisputes.fulfilled, (state, action) => {
        state.loading = false
        const paged = action.payload
        state.data = paged?.content || []
        state.page = paged?.page ?? 0
        state.size = paged?.size || 10
        state.totalPages = paged?.totalPages || 0
        state.totalElements = paged?.totalElements || 0
        state.last = paged?.last ?? false
      })
      .addCase(fetchDisputes.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // ── resolveDispute ──
    builder
      .addCase(resolveDispute.pending, (state) => {
        state.resolving = true
        state.resolveError = null
      })
      .addCase(resolveDispute.fulfilled, (state, action) => {
        state.resolving = false
        const updated = action.payload
        // Cập nhật row ngay trong list mà không cần refetch
        state.data = state.data.map((d) => (d.id === updated.id ? updated : d))
      })
      .addCase(resolveDispute.rejected, (state, action) => {
        state.resolving = false
        state.resolveError = action.payload
      })
  },
})

export const { setPage, setStatusFilter, clearResolveError } = adminDisputeSlice.actions
export default adminDisputeSlice.reducer
