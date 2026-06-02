import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice' // Import the auth reducer

const store = configureStore({
  reducer: {
    auth: authReducer,
  },
})
export default store
