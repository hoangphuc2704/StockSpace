import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * BE APIs:
 *
 * GET /admin/inspections
 *   params: { status (InspectionStatus), page, size }
 *   response: ApiResponse<PagedResponse<InspectionReportResponse>>
 *
 * POST /admin/inspections/{id}/assign?inspectorId={UUID}
 *   response: ApiResponse<InspectionReportResponse>
 *
 * InspectionReportResponse:
 *   { id, status, checklistData, notes, images: List<String>, inspectedAt,
 *     warehouseId, warehouseName, warehouseAddress,
 *     inspectorId, inspectorName,
 *     ownerId, ownerName,
 *     createdAt, updatedAt }
 *
 * InspectionStatus enum: PENDING | IN_PROGRESS | PASSED | FAILED
 */

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchInspections = createAsyncThunk(
  'adminInspection/fetchInspections',
  async ({ page = 0, size = 10, status } = {}, { rejectWithValue }) => {
    try {
      const res = await adminApi.getInspections({ status: status || undefined, page, size })
      // res.data = ApiResponse { success, message, data: PagedResponse<InspectionReportResponse> }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const assignInspector = createAsyncThunk(
  'adminInspection/assignInspector',
  async ({ id, inspectorId }, { rejectWithValue }) => {
    try {
      const res = await adminApi.assignInspection(id, inspectorId)
      // res.data = ApiResponse { success, message, data: InspectionReportResponse }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const adminInspectionsSlice = createSlice({
  name: 'adminInspection',
  initialState: {
    // List
    data: [],          // content từ PagedResponse<InspectionReportResponse>
    loading: false,
    error: null,

    // Pagination (BE 0-indexed)
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
    last: false,

    // Filter gửi lên BE
    statusFilter: '',  // '' | 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED'

    // Assign action
    assignLoading: false,
    assignError: null,
  },
  reducers: {
    setPage: (state, action) => {
      state.page = action.payload
    },
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload
      state.page = 0   // reset về trang đầu khi đổi filter
    },
    clearAssignError: (state) => {
      state.assignError = null
    },
  },
  extraReducers: (builder) => {
    // ── fetchInspections ──
    builder
      .addCase(fetchInspections.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchInspections.fulfilled, (state, action) => {
        state.loading = false
        const paged = action.payload
        state.data = paged?.content || []
        state.page = paged?.page ?? 0
        state.size = paged?.size || 10
        state.totalPages = paged?.totalPages || 0
        state.totalElements = paged?.totalElements || 0
        state.last = paged?.last ?? false
      })
      .addCase(fetchInspections.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // ── assignInspector ──
    builder
      .addCase(assignInspector.pending, (state) => {
        state.assignLoading = true
        state.assignError = null
      })
      .addCase(assignInspector.fulfilled, (state, action) => {
        state.assignLoading = false
        const updated = action.payload
        // Cập nhật row trong list ngay (status chuyển IN_PROGRESS, inspectorId/Name được gán)
        state.data = state.data.map((item) => (item.id === updated.id ? updated : item))
      })
      .addCase(assignInspector.rejected, (state, action) => {
        state.assignLoading = false
        state.assignError = action.payload
      })
  },
})

export const { setPage, setStatusFilter, clearAssignError } = adminInspectionsSlice.actions
export default adminInspectionsSlice.reducer
