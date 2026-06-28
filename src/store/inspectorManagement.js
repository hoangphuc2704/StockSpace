import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import inspectorApi from '../services/inspector/inspectorApi'

/**
 * BE APIs for Inspector
 */

export const fetchAssignedInspections = createAsyncThunk(
  'inspectorManagement/fetchAssignedInspections',
  async ({ page = 0, size = 10 }, { rejectWithValue }) => {
    try {
      const res = await inspectorApi.getAssignedInspections({ page, size })
      return res.data.data // PagedResponse<InspectionReportResponse>
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const submitReport = createAsyncThunk(
  'inspectorManagement/submitReport',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await inspectorApi.submitReport(id, payload)
      return res.data.data // InspectionReportResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

const inspectorManagementSlice = createSlice({
  name: 'inspectorManagement',
  initialState: {
    inspections: [],
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
    loading: false,
    error: null,

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
    // --- fetchAssignedInspections ---
    builder
      .addCase(fetchAssignedInspections.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAssignedInspections.fulfilled, (state, action) => {
        state.loading = false
        const paged = action.payload
        state.inspections = paged?.content || []
        state.page = paged?.pageNumber ?? paged?.number ?? 0
        state.size = paged?.pageSize ?? paged?.size ?? 10
        state.totalPages = paged?.totalPages ?? 0
        state.totalElements = paged?.totalElements ?? 0
      })
      .addCase(fetchAssignedInspections.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // --- submitReport ---
    builder
      .addCase(submitReport.pending, (state) => {
        state.actionLoading = true
        state.actionError = null
      })
      .addCase(submitReport.fulfilled, (state, action) => {
        state.actionLoading = false
        const updated = action.payload
        state.inspections = state.inspections.map(i => i.id === updated.id ? updated : i)
      })
      .addCase(submitReport.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })
  }
})

export const { setPage, clearActionError } = inspectorManagementSlice.actions
export default inspectorManagementSlice.reducer
