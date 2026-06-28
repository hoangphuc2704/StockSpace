import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * BE APIs for Packages & Subscriptions
 */

export const fetchPackages = createAsyncThunk(
  'adminPackagesSubscription/fetchPackages',
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminApi.getPackages()
      return res.data.data // List<ServicePackageResponse>
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const createPackage = createAsyncThunk(
  'adminPackagesSubscription/createPackage',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await adminApi.createPackage(payload)
      return res.data.data // ServicePackageResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const updatePackage = createAsyncThunk(
  'adminPackagesSubscription/updatePackage',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await adminApi.updatePackage(id, payload)
      return res.data.data // ServicePackageResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const deletePackage = createAsyncThunk(
  'adminPackagesSubscription/deletePackage',
  async (id, { rejectWithValue }) => {
    try {
      await adminApi.deletePackage(id)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const fetchSubscriptions = createAsyncThunk(
  'adminPackagesSubscription/fetchSubscriptions',
  async ({ page = 0, size = 10 }, { rejectWithValue }) => {
    try {
      const res = await adminApi.getSubscriptions({ page, size })
      return res.data.data // Page<SubscriptionResponse>
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

const adminPackagesSubcriptionSlice = createSlice({
  name: 'adminPackagesSubscription',
  initialState: {
    // Packages
    packages: [],
    packagesLoading: false,
    packagesError: null,
    
    // Subscriptions
    subscriptions: [],
    subPage: 0,
    subSize: 10,
    subTotalPages: 0,
    subTotalElements: 0,
    subsLoading: false,
    subsError: null,

    // Actions
    actionLoading: false,
    actionError: null,
  },
  reducers: {
    setSubPage: (state, action) => {
      state.subPage = action.payload
    },
    clearActionError: (state) => {
      state.actionError = null
    }
  },
  extraReducers: (builder) => {
    // --- fetchPackages ---
    builder
      .addCase(fetchPackages.pending, (state) => {
        state.packagesLoading = true
        state.packagesError = null
      })
      .addCase(fetchPackages.fulfilled, (state, action) => {
        state.packagesLoading = false
        state.packages = action.payload || []
      })
      .addCase(fetchPackages.rejected, (state, action) => {
        state.packagesLoading = false
        state.packagesError = action.payload
      })

    // --- fetchSubscriptions ---
    builder
      .addCase(fetchSubscriptions.pending, (state) => {
        state.subsLoading = true
        state.subsError = null
      })
      .addCase(fetchSubscriptions.fulfilled, (state, action) => {
        state.subsLoading = false
        const paged = action.payload
        state.subscriptions = paged?.content || []
        state.subPage = paged?.pageable?.pageNumber ?? paged?.number ?? 0
        state.subSize = paged?.size ?? 10
        state.subTotalPages = paged?.totalPages ?? 0
        state.subTotalElements = paged?.totalElements ?? 0
      })
      .addCase(fetchSubscriptions.rejected, (state, action) => {
        state.subsLoading = false
        state.subsError = action.payload
      })

    // --- action processing ---
    builder
      // create
      .addCase(createPackage.pending, (state) => { state.actionLoading = true; state.actionError = null })
      .addCase(createPackage.fulfilled, (state, action) => {
        state.actionLoading = false
        state.packages.push(action.payload)
      })
      .addCase(createPackage.rejected, (state, action) => {
        state.actionLoading = false; state.actionError = action.payload
      })
      // update
      .addCase(updatePackage.pending, (state) => { state.actionLoading = true; state.actionError = null })
      .addCase(updatePackage.fulfilled, (state, action) => {
        state.actionLoading = false
        const updated = action.payload
        state.packages = state.packages.map(p => p.id === updated.id ? updated : p)
      })
      .addCase(updatePackage.rejected, (state, action) => {
        state.actionLoading = false; state.actionError = action.payload
      })
      // delete
      .addCase(deletePackage.pending, (state) => { state.actionLoading = true; state.actionError = null })
      .addCase(deletePackage.fulfilled, (state, action) => {
        state.actionLoading = false
        state.packages = state.packages.filter(p => p.id !== action.payload)
      })
      .addCase(deletePackage.rejected, (state, action) => {
        state.actionLoading = false; state.actionError = action.payload
      })
  }
})

export const { setSubPage, clearActionError } = adminPackagesSubcriptionSlice.actions
export default adminPackagesSubcriptionSlice.reducer
