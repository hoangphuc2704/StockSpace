import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice' // Import the auth reducer
import uiReducer from './uiSlide' // Import the UI reducer

const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
})
export default store
