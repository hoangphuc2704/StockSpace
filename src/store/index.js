import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice' // Import the auth reducer
import adminWarehouseReducer from './adminWarehouseSlice'
import adminTransactionReducer from './adminTransactionSlice'
import adminSettingsReducer from './adminSettingsSlice'
import adminUserReducer from './adminUserSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    adminWarehouse: adminWarehouseReducer,
    adminTransaction: adminTransactionReducer,
    adminSettings: adminSettingsReducer,
    adminUser: adminUserReducer,
  },
})
export default store
