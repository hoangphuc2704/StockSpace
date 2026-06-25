import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { HiX, HiEye, HiEyeOff } from 'react-icons/hi'

import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import { loginUser, clearError } from '@/store/authSlice'
import LoginGoogle from './LoginGoogle'

// ĐÃ THÊM: prop onSwitchToRegister nhận từ cha
const LoginModal = ({ isOpen, onClose, onSwitchToRegister }) => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isLoading, error } = useSelector((state) => state.auth)
  const [showPassword, setShowPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const navigateByRole = (role) => {
    onClose()
    if (role === 'ROLE_ADMIN') {
      navigate('/admin/dashboard')
    } else if (role === 'ROLE_OWNER') {
      navigate('/owner/dashboard')
    } else if (role === 'ROLE_TENANT') {
      navigate('/')
    } else if (role === 'ROLE_STAFF') {
      navigate('/staff/dashboard')
    } else if (role === 'ROLE_INSPECTOR') {
      navigate('/inspector/dashboard')
    } else {
      navigate('/')
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    dispatch(clearError())

    try {
      const actionResult = await dispatch(loginUser({ email, password })).unwrap()
      const { role } = actionResult
      navigateByRole(role)
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white p-8 shadow-xl"
          >
            <button
              onClick={() => {
                dispatch(clearError())
                onClose()
              }}
              className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <HiX className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900">StockSpace</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <InputField
                label="Email"
                type="email"
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="space-y-1">
                <div className="relative">
                  <InputField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-9.5 right-3 text-slate-400 transition-colors hover:text-slate-600"
                  >
                    {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                  </button>
                </div>

                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    onClick={onClose}
                    className="text-primary text-xs font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button type="submit" className="h-11 w-full bg-amber-700" isLoading={isLoading}>
                Sign In
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 font-semibold tracking-widest text-slate-400">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <LoginGoogle onLoginSuccess={({ role }) => navigateByRole(role)} />
            </div>

            {/* ĐÃ SỬA: Chuyển Link sang nút bấm gọi event đóng login mở register */}
            <p className="mt-6 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  dispatch(clearError())
                  if (onSwitchToRegister) onSwitchToRegister()
                  else onClose()
                }}
                className="text-primary cursor-pointer border-none bg-transparent p-0 font-bold hover:underline"
              >
                Create an account
              </button>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default LoginModal
