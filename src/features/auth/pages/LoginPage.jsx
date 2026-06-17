import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDispatch } from 'react-redux'
import { FcGoogle } from 'react-icons/fc'
import { HiX, HiEye, HiEyeOff } from 'react-icons/hi' // Thêm icon đóng (cần cài react-icons)

import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import { login } from '@/store/authSlice'

// Tài khoản và mật khẩu demo cho từng role
const demoUsers = {
  ADMIN: { name: 'Admin User', role: 'ADMIN', email: 'admin@gmail.com', password: '1' },
  TENANT: { name: 'Tenant User', role: 'TENANT', email: 'tenant@gmail.com', password: '1' },
  OWNER: { name: 'Owner User', role: 'OWNER', email: 'owner@gmail.com', password: '1' },
  STAFF: { name: 'Staff User', role: 'STAFF', email: 'staff@gmail.com', password: '1' },
}

const LoginModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Nếu modal không mở, không render gì cả
  if (!isOpen) return null

  const handleLogin = (e) => {
    e.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      dispatch(login({ user: { name: 'Admin User', role: 'ADMIN' }, token: 'mock-jwt-token' }))
      setIsLoading(false)
      onClose() // Đóng modal sau khi đăng nhập thành công
      navigate('/admin/dashboard')
    }, 1500)
  }

  const handleDemoLogin = (role) => {
    setIsLoading(true)
    const userData = demoUsers[role]

    setTimeout(() => {
      dispatch(login({ user: userData, token: `mock-jwt-token-${role.toLowerCase()}` }))
      const redirectPath = {
        ADMIN: '/admin/dashboard',
        TENANT: '/tenant/dashboard',
        OWNER: '/owner/dashboard',
        STAFF: '/staff/dashboard',
      }
      setIsLoading(false)
      onClose() // Đóng modal
      navigate(redirectPath[role])
    }, 1000)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop (Lớp nền mờ phía sau) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose} // Click ra ngoài để đóng modal
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white p-8 shadow-xl"
        >
          {/* Nút Đóng (Close Button) */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <HiX className="h-5 w-5" />
          </button>

          {/* Logo & Header */}
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900">StockSpace</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          </div>

          {/* Form Đăng nhập */}
          <form onSubmit={handleLogin} className="space-y-4">
            <InputField label="Email " type="email" placeholder="name@gmail.com" required />

            <div className="space-y-1">
              <div className="relative">
                <InputField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
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

          {/* Đường phân cách */}
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

          {/* Google Login */}
          <div className="flex justify-center">
            <Button variant="outline" className="h-11 w-full rounded-lg text-sm font-medium">
              <FcGoogle className="mr-2 h-5 w-5" />
              Continue with Google
            </Button>
          </div>

          {/* Đăng ký tài khoản */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              onClick={onClose}
              className="text-primary font-bold hover:underline"
            >
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default LoginModal
