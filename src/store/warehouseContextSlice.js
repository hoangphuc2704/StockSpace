import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  selectedId: null,
  scope: null,
}

const warehouseContextSlice = createSlice({
  name: 'warehouseContext',
  initialState,
  reducers: {
    setActiveWarehouse: (state, action) => {
      const { warehouseId, scope } = action.payload || {}
      state.selectedId = warehouseId ? String(warehouseId) : null
      state.scope = scope || null
    },
    clearActiveWarehouse: (state, action) => {
      // A route can unmount after the next route has already registered its
      // warehouse. Only clear the context owned by the unmounted route.
      if (!action.payload || state.scope === action.payload) {
        state.selectedId = null
        state.scope = null
      }
    },
  },
})

export const { setActiveWarehouse, clearActiveWarehouse } = warehouseContextSlice.actions

export default warehouseContextSlice.reducer
