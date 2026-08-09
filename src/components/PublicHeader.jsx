import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { logoutThunk } from '../store/authSlice'
import { Menu, X, ArrowRight } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import logoDaidien from '../assets/logoDaidien.png'
import LoginModal from '../features/auth/pages/LoginPage'
import RegisterModal from '../features/auth/pages/RegisterPage'
import NotificationDropdown from './NotificationDropdown'

const PublicHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)

  const { user, isAuthenticated } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const getDashboardInfo = (role) => {
    switch (role) {
      case 'ROLE_TENANT': return { url: '/tenant/dashboard', label: 'Tenant Dashboard' }
      case 'ROLE_OWNER': return { url: '/owner/dashboard', label: 'Owner Dashboard' }
      case 'ROLE_STAFF': return { url: '/staff/dashboard', label: 'Staff Dashboard' }
      case 'ROLE_INSPECTOR': return { url: '/inspector/inspections', label: 'Inspector Dashboard' }
      case 'ROLE_ADMIN': return { url: '/admin/dashboard', label: 'Admin Dashboard' }
      default: return { url: '/', label: 'Dashboard' }
    }
  }

  const switchToRegister = () => {
    setIsLoginOpen(false)
    setIsRegisterOpen(true)
  }

  const switchToLogin = () => {
    setIsRegisterOpen(false)
    setIsLoginOpen(true)
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoDaidien} alt="Logo" className="h-9 w-auto object-contain" />
            <span className="text-xl font-black tracking-tight text-stone-900 uppercase">
              <span className="text-[#0f084b]">Stock</span>{' '}
              <span className="text-[#FF5A1F]">Space</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {['Home', 'About', 'Services', 'Solutions', 'Contact'].map((item) => (
              <a
                key={item}
                href={location.pathname === '/' ? `#${item.toLowerCase()}` : `/#${item.toLowerCase()}`}
                className="text-sm font-medium text-stone-600 transition-colors hover:text-[#FF5A1F]"
              >
                {item}
              </a>
            ))}
            <Link
              to="/packages"
              className={`text-sm font-medium transition-colors hover:text-[#FF5A1F] ${location.pathname === '/packages' ? 'text-[#FF5A1F]' : 'text-stone-600'
                }`}
            >
              Price
            </Link>
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-5 py-2.5 text-xs font-bold text-stone-700 uppercase transition-all hover:bg-stone-50"
                >
                  Đăng nhập
                </button>

                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-5 py-2.5 text-xs font-bold text-stone-700 uppercase transition-all hover:bg-stone-50"
                >
                  Đăng ký
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <NotificationDropdown />
                <div className="group relative">
                  <button className="flex items-center gap-2 text-sm font-bold text-stone-700 hover:text-[#FF5A1F]">
                    <div className="h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span>{user?.name || 'User'}</span>
                  </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible z-50">
                  <div className="py-1">
                    <button
                      onClick={() => navigate('/profile')}
                      className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
                    >
                      Hồ sơ cá nhân
                    </button>
                    {user?.role && (
                      <button
                        onClick={() => navigate(getDashboardInfo(user.role).url)}
                        className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 font-medium text-[#FF5A1F]"
                      >
                        {getDashboardInfo(user.role).label}
                      </button>
                    )}
                    <button className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-100">
                      Cài đặt
                    </button>
                    <button
                      onClick={() => {
                        dispatch(logoutThunk())
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-stone-100"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}

            <div>
              <Link
                to="/warehouses"
                className="inline-flex items-center justify-center rounded-md bg-[#FF5A1F] px-5 py-2.5 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-[#e04e19]"
              >
                Xem Kho <ArrowRight size={14} className="ml-1" />
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-stone-600 hover:text-[#FF5A1F] md:hidden"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Auth Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={switchToRegister}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={switchToLogin}
      />
    </>
  )
}

export default PublicHeader
