import { Link, useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { useDispatch } from 'react-redux'
import Button from '@/components/atoms/Button'
import { logout } from '@/store/authSlice'
import { authApi } from '@/services/authApi'

const UnauthorizedPage = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const handleLogoutAndLogin = async () => {
    try {
      await authApi.logout()
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      dispatch(logout())
      localStorage.removeItem('token')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="h-20 w-20 rounded-full bg-danger/10 flex items-center justify-center text-danger">
            <ShieldAlert size={40} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-8">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/">
            <Button className="w-full">
              Back to Home
            </Button>
          </Link>
          <Button variant="outline" className="w-full" onClick={handleLogoutAndLogin}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Log in as different user
          </Button>
        </div>
      </div>
    </div>
  )
}

export default UnauthorizedPage
