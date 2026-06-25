import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminApi from '../services/admin/adminApi'

/**
 * BE APIs dùng trong trang này:
 *
 * PERMISSION:
 *   GET  /admin/permissions              → ApiResponse<List<PermissionResponse>>
 *   POST /admin/permissions              → ApiResponse<PermissionResponse>
 *     body: { name (required, max 100), description (max 255) }
 *   PermissionResponse: { id, name, description }
 *
 * ROLE:
 *   GET    /admin/roles                  → ApiResponse<List<RoleResponse>>
 *   POST   /admin/roles                  → ApiResponse<RoleResponse>
 *   PUT    /admin/roles/{id}             → ApiResponse<RoleResponse>
 *     body: { name (required, max 100), description (max 255) }
 *   DELETE /admin/roles/{id}             → ApiResponse<Void>
 *   RoleResponse: { id, name, description, permissions: Set<PermissionResponse> }
 *
 * ROLE-PERMISSION MAPPING:
 *   POST   /admin/roles/{id}/permissions         → ApiResponse<RoleResponse>
 *     body: { permissionId: UUID }
 *   DELETE /admin/roles/{id}/permissions/{permId} → ApiResponse<RoleResponse>
 */

// ─── Permissions ──────────────────────────────────────────────────────────────

export const fetchPermissions = createAsyncThunk(
  'adminPermission/fetchPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminApi.getPermissions()
      // res.data = ApiResponse { success, message, data: List<PermissionResponse> }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const createPermission = createAsyncThunk(
  'adminPermission/createPermission',
  async ({ name, description }, { rejectWithValue }) => {
    try {
      const res = await adminApi.createPermission({ name, description })
      return res.data.data  // PermissionResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

// ─── Roles ────────────────────────────────────────────────────────────────────

export const fetchRoles = createAsyncThunk(
  'adminPermission/fetchRoles',
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminApi.getRoles()
      // res.data = ApiResponse { success, message, data: List<RoleResponse> }
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const createRole = createAsyncThunk(
  'adminPermission/createRole',
  async ({ name, description }, { rejectWithValue }) => {
    try {
      const res = await adminApi.createRole({ name, description })
      return res.data.data  // RoleResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const updateRole = createAsyncThunk(
  'adminPermission/updateRole',
  async ({ id, name, description }, { rejectWithValue }) => {
    try {
      const res = await adminApi.updateRole(id, { name, description })
      return res.data.data  // RoleResponse
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const deleteRole = createAsyncThunk(
  'adminPermission/deleteRole',
  async (id, { rejectWithValue }) => {
    try {
      await adminApi.deleteRole(id)
      return id  // trả về id để xóa khỏi list
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

// ─── Role-Permission Mapping ───────────────────────────────────────────────────

export const assignPermissionToRole = createAsyncThunk(
  'adminPermission/assignPermissionToRole',
  async ({ roleId, permissionId }, { rejectWithValue }) => {
    try {
      const res = await adminApi.assignPermissionToRole(roleId, { permissionId })
      return res.data.data  // RoleResponse mới nhất
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

export const removePermissionFromRole = createAsyncThunk(
  'adminPermission/removePermissionFromRole',
  async ({ roleId, permId }, { rejectWithValue }) => {
    try {
      const res = await adminApi.removePermissionFromRole(roleId, permId)
      return res.data.data  // RoleResponse mới nhất
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const adminPermissionSlice = createSlice({
  name: 'adminPermission',
  initialState: {
    // Permissions list
    permissions: [],       // List<PermissionResponse>: { id, name, description }
    permLoading: false,
    permError: null,

    // Roles list
    roles: [],             // List<RoleResponse>: { id, name, description, permissions: Set<PermissionResponse> }
    roleLoading: false,
    roleError: null,

    // Shared action state (create/update/delete/assign)
    actionLoading: false,
    actionError: null,
  },
  reducers: {
    clearActionError: (state) => {
      state.actionError = null
    },
  },
  extraReducers: (builder) => {
    // ── fetchPermissions ──
    builder
      .addCase(fetchPermissions.pending, (state) => { state.permLoading = true; state.permError = null })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        state.permLoading = false
        state.permissions = action.payload || []
      })
      .addCase(fetchPermissions.rejected, (state, action) => {
        state.permLoading = false
        state.permError = action.payload
      })

    // ── createPermission ──
    builder
      .addCase(createPermission.pending, (state) => { state.actionLoading = true; state.actionError = null })
      .addCase(createPermission.fulfilled, (state, action) => {
        state.actionLoading = false
        state.permissions = [...state.permissions, action.payload]
      })
      .addCase(createPermission.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })

    // ── fetchRoles ──
    builder
      .addCase(fetchRoles.pending, (state) => { state.roleLoading = true; state.roleError = null })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.roleLoading = false
        state.roles = action.payload || []
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.roleLoading = false
        state.roleError = action.payload
      })

    // ── createRole ──
    builder
      .addCase(createRole.pending, (state) => { state.actionLoading = true; state.actionError = null })
      .addCase(createRole.fulfilled, (state, action) => {
        state.actionLoading = false
        state.roles = [...state.roles, action.payload]
      })
      .addCase(createRole.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })

    // ── updateRole ──
    builder
      .addCase(updateRole.pending, (state) => { state.actionLoading = true; state.actionError = null })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.actionLoading = false
        const updated = action.payload
        state.roles = state.roles.map((r) => (r.id === updated.id ? updated : r))
      })
      .addCase(updateRole.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })

    // ── deleteRole ──
    builder
      .addCase(deleteRole.pending, (state) => { state.actionLoading = true; state.actionError = null })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.actionLoading = false
        state.roles = state.roles.filter((r) => r.id !== action.payload)
      })
      .addCase(deleteRole.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })

    // ── assignPermissionToRole ──
    builder
      .addCase(assignPermissionToRole.pending, (state) => { state.actionLoading = true; state.actionError = null })
      .addCase(assignPermissionToRole.fulfilled, (state, action) => {
        state.actionLoading = false
        const updated = action.payload
        state.roles = state.roles.map((r) => (r.id === updated.id ? updated : r))
      })
      .addCase(assignPermissionToRole.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })

    // ── removePermissionFromRole ──
    builder
      .addCase(removePermissionFromRole.pending, (state) => { state.actionLoading = true; state.actionError = null })
      .addCase(removePermissionFromRole.fulfilled, (state, action) => {
        state.actionLoading = false
        const updated = action.payload
        state.roles = state.roles.map((r) => (r.id === updated.id ? updated : r))
      })
      .addCase(removePermissionFromRole.rejected, (state, action) => {
        state.actionLoading = false
        state.actionError = action.payload
      })
  },
})

export const { clearActionError } = adminPermissionSlice.actions
export default adminPermissionSlice.reducer
