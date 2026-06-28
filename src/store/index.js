import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'

// ✅ [HEAD] Các reducers của admin
import adminWarehouseReducer from './adminWarehouseSlice'
import adminTransactionReducer from './adminTransactionSlice'
import adminSystemPolicysReducer from './adminSystemPolicysSlice'
import adminUserReducer from './adminUserSlice'
import adminDisputeReducer from './adminDisputeManagement'
import adminWithdrawalsReducer from './adminWithdrawals'
import adminPermissionReducer from './adminPermissionManagement'
import adminInspectionsReducer from './adminInspectionsManagement'
import adminWarehouseManageReducer from './adminWarehouseManagement'
import adminSystemPolicyReducer from './adminSystemPolicysSlice'
import adminPackagesSubcriptionReducer from './adminPackagesSubcription'
import inspectorManagementReducer from './inspectorManagement'

import uiReducer from './uiSlide'

const store = configureStore({
  reducer: {
    auth: authReducer,

    // ✅ [HEAD] Admin reducers
    adminWarehouse: adminWarehouseReducer,
    adminTransaction: adminTransactionReducer,
    adminSystemPolicysSlice: adminSystemPolicysReducer,
    adminUser: adminUserReducer,
    adminDispute: adminDisputeReducer,
    adminWithdrawals: adminWithdrawalsReducer,
    adminPermission: adminPermissionReducer,
    adminInspections: adminInspectionsReducer,
    adminWarehouseManage: adminWarehouseManageReducer,
    adminSystemPolicy: adminSystemPolicyReducer,
    adminPackagesSubcription: adminPackagesSubcriptionReducer,
    inspectorManagement: inspectorManagementReducer,

    ui: uiReducer,
  },
})

export default store