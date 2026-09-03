import { Menu } from 'lucide-react'
import logoDaidien from '../assets/logoDaidien.png'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
// ✅ Đã kết nối trực tiếp action từ Redux store và sửa chính tả uiSlice
import { toggleSidebar } from '../store/uiSlide'
import NotificationDropdown from './NotificationDropdown'

const Header = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const displayRole = user?.role
    ? user.role.replace('ROLE_', '').charAt(0) +
      user.role.replace('ROLE_', '').slice(1).toLowerCase()
    : 'Owner'

  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-4">
        <button
          // ✅ Kích hoạt action toggle đóng/mở qua Redux phát ra từ Header cục bộ
          onClick={() => dispatch(toggleSidebar())}
          className="rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div
          className="flex cursor-pointer items-center gap-2"
          onClick={() => navigate('/')}
          role="link"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') navigate('/')
          }}
          aria-label="Back to landing page"
        >
          <div className="shrink-0 rounded-lg bg-white p-1.5">
            <img src={logoDaidien} alt="Logo" className="h-10 w-16 object-contain" />
          </div>
          <span className="font-display hidden text-xl font-bold tracking-tight text-slate-950 sm:inline-block">
            StockSpace {displayRole}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationDropdown />
      </div>
    </header>
  )
}

export default Header
