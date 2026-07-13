import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  bookedWarehouseIds: [],
}

const tenantBookingSlice = createSlice({
  name: 'tenantBooking',
  initialState,
  reducers: {
    addBookedWarehouse: (state, action) => {
      if (!state.bookedWarehouseIds.includes(action.payload)) {
        state.bookedWarehouseIds.push(action.payload)
      }
    },
    clearBookedWarehouses: (state) => {
      state.bookedWarehouseIds = []
    }
  }
})

export const { addBookedWarehouse, clearBookedWarehouses } = tenantBookingSlice.actions
export default tenantBookingSlice.reducer
