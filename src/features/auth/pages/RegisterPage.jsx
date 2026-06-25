import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Warehouse } from 'lucide-react'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import { HiX, HiEye, HiEyeOff } from 'react-icons/hi'
import { useDispatch, useSelector } from 'react-redux'
import Loading from '../../../components/Loading'
import { registerUser, clearError } from '@/store/authSlice'
import LoginGoogle from './LoginGoogle'

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isLoading, error: reduxError } = useSelector((state) => state.auth)
  const [roleDefault, setroleDefault] = useState('TENANT')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [localError, setLocalError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const error = localError || reduxError

  const navigateByRole = (role) => {
    onClose()
    if (role === 'ROLE_ADMIN') navigate('/admin/dashboard')
    else if (role === 'ROLE_OWNER') navigate('/owner/dashboard')
    else if (role === 'ROLE_TENANT') navigate('/')
    else if (role === 'ROLE_STAFF') navigate('/staff/dashboard')
    else if (role === 'ROLE_INSPECTOR') navigate('/inspector/dashboard')
    else navigate('/')
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    dispatch(clearError())
    setLocalError('')

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }
    if (!agreeTerms) {
      setLocalError('You must agree to the Terms of Service')
      return
    }
    
    try {
      await dispatch(registerUser({
        fullName,
        email,
        password,
        phone,
        role: `ROLE_${roleDefault}`
      })).unwrap()
      
      setSuccessMessage('Đăng ký thành công. Vui lòng kiểm tra email và đăng nhập.')
      setTimeout(() => {
        setSuccessMessage('')
        onClose()
        if (onSwitchToLogin) {
          onSwitchToLogin()
        } else {
          navigate('/login')
        }
      }, 2000)
    } catch (err) {
      console.error('Registration failed:', err)
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {isLoading && <Loading fullScreen={true} />}

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
            style={{
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            <style>{`
              .relative::-webkit-scrollbar {
                display: none !important;
              }
            `}</style>

            <button
              onClick={() => {
                dispatch(clearError())
                onClose()
              }}
              className="absolute top-4 right-4 text-slate-400 transition-colors hover:text-slate-600"
            >
              <HiX className="h-6 w-6" />
            </button>

            <div
              className={
                isLoading ? 'pointer-events-none opacity-40 transition-opacity' : 'opacity-100'
              }
            >
              <div className="mb-6 flex items-center gap-2">
                <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-xl">
                  <Warehouse className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-slate-900">StockSpace</span>
              </div>

              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Get Started</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Create your account to start managing space.
                </p>
              </div>

              {/* Role Toggle */}
              <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setroleDefault('TENANT')}
                  className={`flex-1 rounded-md py-2 text-sm font-bold transition-all ${roleDefault === 'TENANT' ? 'text-primary bg-white shadow-sm' : 'text-slate-500'}`}
                >
                  I'm a Tenant
                </button>
                <button
                  type="button"
                  onClick={() => setroleDefault('OWNER')}
                  className={`flex-1 rounded-md py-2 text-sm font-bold transition-all ${roleDefault === 'OWNER' ? 'text-primary bg-white shadow-sm' : 'text-slate-500'}`}
                >
                  I'm an Owner
                </button>
              </div>

              {successMessage && (
                <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <InputField 
                  label="Full Name" 
                  placeholder="John Doe" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                />
                <InputField
                  label="Email Address"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                {/* Password */}
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
                    className="absolute top-[38px] right-3 text-slate-400 transition-colors hover:text-slate-600"
                  >
                    {showPassword ? (
                      <HiEyeOff className="h-5 w-5" />
                    ) : (
                      <HiEye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="relative">
                  <InputField
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-[38px] right-3 text-slate-400 transition-colors hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <HiEyeOff className="h-5 w-5" />
                    ) : (
                      <HiEye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <InputField 
                  label="Phone Number" 
                  type="tel" 
                  placeholder="1234567890" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required 
                />

                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    className="text-primary focus:ring-primary mt-1 rounded border-slate-300"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                  />
                  <p className="text-xs leading-relaxed text-slate-500">
                    I agree to the{' '}
                    <a href="#" className="text-primary font-bold">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-primary font-bold">
                      Privacy Policy
                    </a>
                    .
                  </p>
                </div>

                <Button type="submit" className="h-12 w-full bg-amber-500" isLoading={isLoading}>
                  Create Account
                </Button>
              </form>

              {/* Google OAuth Divider */}
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

              {/* KHU VỰC CHUYỂN ĐỔI: Nhấn Log in để chuyển lại Modal Login */}
              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    dispatch(clearError())
                    if (onSwitchToLogin) onSwitchToLogin()
                    else onClose()
                  }}
                  className="text-primary cursor-pointer border-none bg-transparent p-0 font-bold hover:underline"
                >
                  Log in
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default RegisterModal
