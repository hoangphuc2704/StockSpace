import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import inspectorApi from '../services/inspector/inspectorApi'

/**
 * BE APIs for Inspector
 */

const normalizeInspection = (item = {}) => {
  const rawChecklist = item.checklistData
  let checklistData = rawChecklist

  if (typeof rawChecklist === 'string') {
    try {
      checklistData = JSON.parse(rawChecklist)
    } catch {
      checklistData = rawChecklist
    }
  }

  return {
    ...item,
    id: item.id || '',
    status: item.status || 'PENDING',
    notes: item.notes || item.reportNotes || '',
    reportNotes: item.reportNotes || item.notes || '',
    checklistData,
    images: Array.isArray(item.images) ? item.images : [],
    inspectedAt: item.inspectedAt || null,
    warehouseId: item.warehouseId || null,
    warehouseName: item.warehouseName || '',
    warehouseAddress: item.warehouseAddress || '',
    inspectorId: item.inspectorId || null,
    inspectorName: item.inspectorName || '',
    ownerId: item.ownerId || null,
    ownerName: item.ownerName || '',
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  }
}

const normalizePagedResponse = (paged = {}) => ({
  ...paged,
  content: Array.isArray(paged?.content) ? paged.content.map(normalizeInspection) : [],
})

export const fetchAssignedInspections = createAsyncThunk(
  'inspectorManagement/fetchAssignedInspections',
  async ({ page = 0, size = 10 }, { rejectWithValue }) => {
    try {
      const res = await inspectorApi.getAssignedInspections({ page, size })
      return normalizePagedResponse(res.data.data) // PagedResponse<InspectionReportResponse>
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const submitReport = createAsyncThunk(
  'inspectorManagement/submitReport',
  async ({ id, payload }, { dispatch, getState, rejectWithValue }) => {
    try {
      const res = await inspectorApi.submitReport(id, payload)
      const updatedInspection = normalizeInspection(res.data.data)
      const { page, size } = getState().inspectorManagement
      dispatch(fetchAssignedInspections({ page, size }))
      return updatedInspection // InspectionReportResponse
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
        state.inspections = state.inspections.map((item) => (item.id === updated.id ? updated : item))
      })
      .addCase(submitReport.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })
  }
})

export const { setPage, clearActionError } = inspectorManagementSlice.actions
export default inspectorManagementSlice.reducer
