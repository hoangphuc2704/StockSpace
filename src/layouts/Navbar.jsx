import { Bell, User, Menu } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '@/store/authSlice'
import NotificationBell from '@/components/molecules/NotificationBell'

const Navbar = ({ toggleSidebar }) => {
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <button
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <NotificationBell />

        <div className="mx-2 h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-500 capitalize">
              {user?.role?.toLowerCase() || 'Guest'}
            </p>
          </div>

          <div className="group relative">
            <button className="hover:border-primary flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 transition-colors">
              <User className="h-5 w-5 text-slate-600" />
            </button>

            <div className="ring-opacity-5 invisible absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white p-1 opacity-0 shadow-lg ring-1 ring-black transition-all group-hover:visible group-hover:opacity-100">
              <button
                onClick={() => dispatch(logout())}
                className="text-danger hover:bg-danger/5 flex w-full items-center rounded-md px-3 py-2 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
