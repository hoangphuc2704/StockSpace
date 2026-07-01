import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

export const fetchWarehouseTypes = createAsyncThunk(
  'adminWarehouseType/fetchWarehouseTypes',
  async ({ keyword, page = 0, size = 10, sortBy = 'createdAt', sortDir = 'desc' }, { rejectWithValue }) => {
    try {
      const res = await adminApi.getWarehouseTypes({ keyword, page, size, sortBy, sortDir })
      return res.data.data // ApiResponse<PagedWarehouseTypeResponse> => PagedResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const createWarehouseType = createAsyncThunk(
  'adminWarehouseType/createWarehouseType',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await adminApi.createWarehouseType(payload)
      return res.data.data // WarehouseTypeResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const updateWarehouseType = createAsyncThunk(
  'adminWarehouseType/updateWarehouseType',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await adminApi.updateWarehouseType(id, payload)
      return res.data.data // WarehouseTypeResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const deleteWarehouseType = createAsyncThunk(
  'adminWarehouseType/deleteWarehouseType',
  async (id, { rejectWithValue }) => {
    try {
      await adminApi.deleteWarehouseType(id)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

const adminWarehouseTypeSlice = createSlice({
  name: 'adminWarehouseType',
  initialState: {
    data: [],
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
    loading: false,
    error: null,
    
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
    // --- fetchWarehouseTypes ---
    builder
      .addCase(fetchWarehouseTypes.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWarehouseTypes.fulfilled, (state, action) => {
        state.loading = false
        const paged = action.payload
        state.data = paged?.content || []
        state.page = paged?.pageNumber ?? paged?.number ?? 0
        state.size = paged?.pageSize ?? paged?.size ?? 10
        state.totalPages = paged?.totalPages ?? 0
        state.totalElements = paged?.totalElements ?? 0
      })
      .addCase(fetchWarehouseTypes.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // --- Action Processing ---
    builder
      .addCase(createWarehouseType.pending, (state) => { state.actionLoading = true; state.actionError = null })
      .addCase(createWarehouseType.fulfilled, (state, action) => {
        state.actionLoading = false
        state.data.unshift(action.payload)
      })
      .addCase(createWarehouseType.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })
      
      .addCase(updateWarehouseType.pending, (state) => { state.actionLoading = true; state.actionError = null })
      .addCase(updateWarehouseType.fulfilled, (state, action) => {
        state.actionLoading = false
        const updated = action.payload
        state.data = state.data.map(item => item.id === updated.id ? updated : item)
      })
      .addCase(updateWarehouseType.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })

      .addCase(deleteWarehouseType.pending, (state) => { state.actionLoading = true; state.actionError = null })
      .addCase(deleteWarehouseType.fulfilled, (state, action) => {
        state.actionLoading = false
        state.data = state.data.filter(item => item.id !== action.payload)
      })
      .addCase(deleteWarehouseType.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })
  }
})

export const { setPage, clearActionError } = adminWarehouseTypeSlice.actions
export default adminWarehouseTypeSlice.reducer
