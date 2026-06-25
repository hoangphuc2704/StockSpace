// hamf này dùng để đóng mở sidebar khi người dùng click vào nút menu trên header. Nó sẽ được truyền xuống component HeaderDashboard và SideBar để quản lý trạng thái hiển thị của sidebar.
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  isSidebarExpanded: true,
  isMobileOpen: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Action xử lý việc đóng/mở Sidebar dựa trên kích thước màn hình
    toggleSidebar: (state) => {
      if (window.innerWidth < 768) {
        state.isMobileOpen = !state.isMobileOpen
      } else {
        state.isSidebarExpanded = !state.isSidebarExpanded
      }
    },
    // Action ép đóng mobile sidebar khi nhấn vào overlay hoặc chuyển trang
    closeMobileSidebar: (state) => {
      state.isMobileOpen = false
    },
  },
})

export const { toggleSidebar, closeMobileSidebar } = uiSlice.actions
export default uiSlice.reducer
