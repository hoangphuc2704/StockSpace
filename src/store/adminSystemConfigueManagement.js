import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * BE APIs for System Config:
 * GET /api/admin/configs
 *   Response: ApiResponse<List<SystemConfigResponse>>
 *
 * PUT /api/admin/configs/{key}
 *   Body: UpdateSystemConfigRequest { configValue, description }
 *   Response: ApiResponse<SystemConfigResponse>
 *
 * SystemConfigResponse: { id, configKey, configValue, description, updatedAt }
 */

export const fetchSystemConfigs = createAsyncThunk(
  'adminSystemConfig/fetchSystemConfigs',
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminApi.getSystemConfigs()
      // res.data = ApiResponse<List<SystemConfigResponse>>
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const updateSystemConfig = createAsyncThunk(
  'adminSystemConfig/updateSystemConfig',
  async ({ key, configValue, description }, { rejectWithValue }) => {
    try {
      const res = await adminApi.updateSystemConfig(key, { configValue, description })
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

const adminSystemConfigSlice = createSlice({
  name: 'adminSystemConfig',
  initialState: {
    data: [],
    loading: false,
    error: null,

    // Action state (for updating)
    actionLoading: false,
    actionError: null,
  },
  reducers: {
    clearActionError: (state) => {
      state.actionError = null
    }
  },
  extraReducers: (builder) => {
    // ── fetchSystemConfigs ──
    builder
      .addCase(fetchSystemConfigs.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSystemConfigs.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload || []
      })
      .addCase(fetchSystemConfigs.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // ── updateSystemConfig ──
    builder
      .addCase(updateSystemConfig.pending, (state) => {
        state.actionLoading = true
        state.actionError = null
      })
      .addCase(updateSystemConfig.fulfilled, (state, action) => {
        state.actionLoading = false
        const updatedConfig = action.payload
        state.data = state.data.map(config => 
          config.configKey === updatedConfig.configKey ? updatedConfig : config
        )
      })
      .addCase(updateSystemConfig.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })
  }
})

export const { clearActionError } = adminSystemConfigSlice.actions
export default adminSystemConfigSlice.reducer
