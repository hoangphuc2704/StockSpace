import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react'
import { HiEye, HiEyeOff } from 'react-icons/hi'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import { resetPasswordThunk, clearError, clearPasswordResetMessage } from '@/store/authSlice'

const ResetPasswordPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { isLoading, error, passwordResetMessage } = useSelector((state) => state.auth)

  const tokenFromUrl = searchParams.get('token') || ''
  const emailFromUrl = searchParams.get('email') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const displayError = localError || error

  // Redirect to login 3 seconds after success
  useEffect(() => {
    if (passwordResetMessage) {
      const timer = setTimeout(() => {
        dispatch(clearPasswordResetMessage())
        navigate('/')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [passwordResetMessage, navigate, dispatch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError())
      dispatch(clearPasswordResetMessage())
    }
  }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(clearError())
    setLocalError('')

    if (newPassword.length < 6) {
      setLocalError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }
    if (!tokenFromUrl) {
      setLocalError('Invalid reset link. Please request a new one.')
      return
    }

    dispatch(resetPasswordThunk({
      email: emailFromUrl,
      token: tokenFromUrl,
      newPassword,
    }))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg"
      >
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Reset Password</h1>
              <p className="text-sm text-slate-500">Enter your new password</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {passwordResetMessage && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{passwordResetMessage}</p>
              <p className="mt-1 text-xs text-green-600">Redirecting to login in 3 seconds...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {displayError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {displayError}
          </div>
        )}

        {/* Form */}
        {!passwordResetMessage && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="relative">
              <InputField
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-[38px] right-3 text-slate-400 transition-colors hover:text-slate-600"
              >
                {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
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
                {showConfirmPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
              </button>
            </div>

            <Button type="submit" className="h-11 w-full bg-amber-700" isLoading={isLoading}>
              Reset Password
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link
            to="/"
            className="text-primary font-bold hover:underline"
          >
            Back to Login
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default ResetPasswordPage
