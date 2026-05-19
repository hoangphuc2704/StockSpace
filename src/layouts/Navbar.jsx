import { Bell, User, Menu } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import NotificationBell from '@/components/molecules/NotificationBell'

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuthStore()

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-4 md:px-6 flex items-center justify-between">
      <button 
        onClick={toggleSidebar}
        className="md:hidden rounded-lg p-2 hover:bg-slate-100 text-slate-500"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <NotificationBell />

        <div className="h-8 w-px bg-slate-200 mx-2" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase() || 'Guest'}</p>
          </div>
          
          <div className="group relative">
            <button className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 hover:border-primary transition-colors">
              <User className="h-5 w-5 text-slate-600" />
            </button>
            
            <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 invisible group-hover:visible transition-all opacity-0 group-hover:opacity-100">
              <button
                onClick={logout}
                className="flex w-full items-center rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/5"
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
