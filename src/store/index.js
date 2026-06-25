import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'

// ✅ [HEAD] Các reducers của admin
import adminWarehouseReducer from './adminWarehouseSlice'
import adminTransactionReducer from './adminTransactionSlice'
import adminSettingsReducer from './adminSettingsSlice'
import adminUserReducer from './adminUserSlice'
import adminDisputeReducer from './adminDisputeManagement'
import adminWithdrawalsReducer from './adminWithdrawals'
import adminPermissionReducer from './adminPermissionManagement'
import adminInspectionsReducer from './adminInspectionsManagement'

import uiReducer from './uiSlide'

const store = configureStore({
  reducer: {
    auth: authReducer,

    // ✅ [HEAD] Admin reducers
    adminWarehouse: adminWarehouseReducer,
    adminTransaction: adminTransactionReducer,
    adminSettings: adminSettingsReducer,
    adminUser: adminUserReducer,
    adminDispute: adminDisputeReducer,
    adminWithdrawals: adminWithdrawalsReducer,
    adminPermission: adminPermissionReducer,
    adminInspections: adminInspectionsReducer,

    ui: uiReducer,
  },
})

export default store