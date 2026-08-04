import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * BE response: ApiResponse<PagedResponse<WithdrawResponse>>
 * PagedResponse: { content, page, size, totalElements, totalPages, last }
 *
 * WithdrawResponse:
 *   { id, userId, amount, bankName, bankAccountNumber, bankAccountHolder,
 *     status, adminNotes, transactionId, createdAt, updatedAt }
 *
 * ApprovalStatus enum: PENDING | APPROVED | REJECTED
 *
 * approve: PATCH /admin/withdrawals/{id}/approve  body: { adminNotes? }
 * reject:  PATCH /admin/withdrawals/{id}/reject   body: { adminNotes }
 */

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchWithdrawals = createAsyncThunk(
  'adminWithdrawal/fetchWithdrawals',
  async ({ page = 0, size = 10, status } = {}, { rejectWithValue }) => {
    try {
      const res = await adminApi.getWithdrawals({ status: status || undefined, page, size })
      // res.data = ApiResponse { success, message, data: PagedResponse<WithdrawResponse> }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const approveWithdrawal = createAsyncThunk(
  'adminWithdrawal/approve',
  async ({ id, adminNotes = '' }, { rejectWithValue }) => {
    try {
      const res = await adminApi.approveWithdrawal(id, adminNotes)
      // res.data = ApiResponse { success, message, data: WithdrawResponse }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const rejectWithdrawal = createAsyncThunk(
  'adminWithdrawal/reject',
  async ({ id, adminNotes }, { rejectWithValue }) => {
    try {
      const res = await adminApi.rejectWithdrawal(id, adminNotes)
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const adminWithdrawalsSlice = createSlice({
  name: 'adminWithdrawal',
  initialState: {
    // List
    data: [],            // content từ PagedResponse<WithdrawResponse>
    loading: false,
    error: null,

    // Pagination — BE field tên "page" (0-indexed)
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
    last: false,

    // Filter (gửi lên BE)
    statusFilter: '',    // '' | 'PENDING' | 'APPROVED' | 'REJECTED'

    // Action state (approve / reject)
    actionLoading: false,
    actionError: null,
  },
  reducers: {
    setPage: (state, action) => {
      state.page = action.payload
    },
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload
      state.page = 0   // reset về trang đầu khi đổi filter
    },
    clearActionError: (state) => {
      state.actionError = null
    },
  },
  extraReducers: (builder) => {
    // ── fetchWithdrawals ──
    builder
      .addCase(fetchWithdrawals.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWithdrawals.fulfilled, (state, action) => {
        state.loading = false
        const paged = action.payload
        state.data = paged?.content || []
        state.page = paged?.page ?? 0
        state.size = paged?.size || 10
        state.totalPages = paged?.totalPages || 0
        state.totalElements = paged?.totalElements || 0
        state.last = paged?.last ?? false
      })
      .addCase(fetchWithdrawals.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // ── approve ──
    builder
      .addCase(approveWithdrawal.pending, (state) => {
        state.actionLoading = true
        state.actionError = null
      })
      .addCase(approveWithdrawal.fulfilled, (state, action) => {
        state.actionLoading = false
        const updated = action.payload
        // Cập nhật row ngay trong list
        state.data = state.data.map((w) => (w.id === updated.id ? updated : w))
      })
      .addCase(approveWithdrawal.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })

    // ── reject ──
    builder
      .addCase(rejectWithdrawal.pending, (state) => {
        state.actionLoading = true
        state.actionError = null
      })
      .addCase(rejectWithdrawal.fulfilled, (state, action) => {
        state.actionLoading = false
        const updated = action.payload
        state.data = state.data.map((w) => (w.id === updated.id ? updated : w))
      })
      .addCase(rejectWithdrawal.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })
  },
})

export const { setPage, setStatusFilter, clearActionError } = adminWithdrawalsSlice.actions
export default adminWithdrawalsSlice.reducer
