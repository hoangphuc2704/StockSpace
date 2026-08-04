import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * BE response: ApiResponse<PagedTransactionResponse>
 * PagedTransactionResponse:
 *   { content: TransactionResponse[], page, size, totalElements, totalPages, last }
 *
 * TransactionResponse:
 *   { id, amount, transactionType, paymentMethod, status,
 *     paymentCode, referenceId, bookingId, subscriptionId, createdAt }
 *
 * TransactionType enum: TOP_UP | WITHDRAWAL | DEPOSIT_PAYMENT | DEPOSIT_REFUND | PACKAGE_PAYMENT | COMMISSION
 * TransactionStatus enum: PENDING | SUCCESS | FAILED
 * PaymentMethod enum: BANK_TRANSFER | VNPAY | MOMO | WALLET
 */

export const fetchTransactions = createAsyncThunk(
  'adminTransaction/fetchTransactions',
  async (params, { rejectWithValue }) => {
    try {
      const res = await adminApi.getTransactions(params)
      // BE wraps: { success, message, data: PagedTransactionResponse }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

const adminTransactionSlice = createSlice({
  name: 'adminTransaction',
  initialState: {
    data: [],          // content từ PagedTransactionResponse
    loading: false,
    error: null,
    page: 0,           // BE dùng 0-indexed, field tên là "page"
    size: 10,
    totalPages: 0,
    totalElements: 0,
    last: false,
    filters: {
      transactionType: '',  // TOP_UP | WITHDRAWAL | DEPOSIT_PAYMENT | DEPOSIT_REFUND | PACKAGE_PAYMENT | COMMISSION
      status: '',           // PENDING | SUCCESS | FAILED
    },
  },
  reducers: {
    setPage: (state, action) => {
      state.page = action.payload
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
      state.page = 0 // reset về trang đầu khi đổi filter
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false
        const paged = action.payload
        state.data = paged?.content || []
        state.totalPages = paged?.totalPages || 0
        state.totalElements = paged?.totalElements || 0
        state.page = paged?.page ?? 0         // BE field: "page" (không phải "number")
        state.size = paged?.size || 10
        state.last = paged?.last ?? false
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { setPage, setFilters } = adminTransactionSlice.actions
export default adminTransactionSlice.reducer
