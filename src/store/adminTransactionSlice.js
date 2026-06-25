import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * BE response: ApiResponse<PagedTransactionResponse>
 * PagedTransactionResponse: { content, totalElements, totalPages, number, size }
 * (TransactionService.getAllTransactions → sort by createdAt DESC)
 *
 * Query params: page (default 0), size (default 10)
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
    data: [],           // content từ PagedTransactionResponse
    loading: false,
    error: null,
    page: 0,            // BE dùng 0-indexed
    totalPages: 0,
    totalElements: 0,
    filters: {},
  },
  reducers: {
    setPage: (state, action) => {
      state.page = action.payload
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
        const pagedResponse = action.payload
        state.data = pagedResponse?.content || []
        state.totalPages = pagedResponse?.totalPages || 0
        state.totalElements = pagedResponse?.totalElements || 0
        state.page = pagedResponse?.number || 0
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { setPage } = adminTransactionSlice.actions
export default adminTransactionSlice.reducer
