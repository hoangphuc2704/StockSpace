import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Warehouse } from 'lucide-react'
import { HiX } from 'react-icons/hi'
import { useDispatch, useSelector } from 'react-redux'
import Loading from '../../../components/Loading'
import { registerUser, clearError } from '@/store/authSlice'
import LoginGoogle from './LoginGoogle'
import useEscapeKey from '@/hooks/useEscapeKey'
import { firstError, validateRegistrationForm } from '@/config/validation'
import { RegisterForm } from '@/form/AuthForms'

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  useEscapeKey(isOpen, onClose)

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
    else if (role === 'ROLE_INSPECTOR') navigate('/inspector/inspections')
    else navigate('/')
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    dispatch(clearError())
    setLocalError('')

    const validationError = firstError(
      validateRegistrationForm({ fullName, email, password, confirmPassword, phone, agreeTerms, role: `ROLE_${roleDefault}` })
    )
    if (validationError) {
      setLocalError(validationError)
      return
    }
    
    try {
      await dispatch(registerUser({
        fullName,
        email,
        password,
        phone: phone.trim() || null,
        role: `ROLE_${roleDefault}`
      })).unwrap()
      
      setSuccessMessage("Registered successfully. Please check your email and log in.")
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

              <RegisterForm
                embedded
                fullName={fullName}
                email={email}
                password={password}
                confirmPassword={confirmPassword}
                phone={phone}
                agreeTerms={agreeTerms}
                onFullNameChange={(event) => setFullName(event.target.value)}
                onEmailChange={(event) => setEmail(event.target.value)}
                onPasswordChange={(event) => setPassword(event.target.value)}
                onConfirmPasswordChange={(event) => setConfirmPassword(event.target.value)}
                onPhoneChange={(event) => setPhone(event.target.value)}
                onAgreeTermsChange={(event) => setAgreeTerms(event.target.checked)}
                onSubmit={handleRegister}
                isLoading={isLoading}
                showPassword={showPassword}
                showConfirmPassword={showConfirmPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                onToggleConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
                role={`ROLE_${roleDefault}`}
                termsLabel={
                  <>
                    I agree to the{' '}
                    <a href="#" className="font-bold text-primary">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="font-bold text-primary">
                      Privacy Policy
                    </a>
                    .
                  </>
                }
              />

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
                <LoginGoogle onLoginSuccess={({ role }) => navigateByRole(role)} role={`ROLE_${roleDefault}`} />
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
