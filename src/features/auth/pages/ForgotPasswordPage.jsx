import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import { forgotPasswordThunk, clearError, clearPasswordResetMessage } from '@/store/authSlice'

const ForgotPasswordPage = () => {
  const dispatch = useDispatch()
  const { isLoading, error, passwordResetMessage } = useSelector((state) => state.auth)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(clearError())
    dispatch(clearPasswordResetMessage())
    dispatch(forgotPasswordThunk(email))
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
            onClick={() => {
              dispatch(clearError())
              dispatch(clearPasswordResetMessage())
            }}
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Forgot Password</h1>
              <p className="text-sm text-slate-500">We'll send you a reset link</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {passwordResetMessage && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{passwordResetMessage}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" className="h-11 w-full bg-amber-700" isLoading={isLoading}>
            Send Reset Link
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Remember your password?{' '}
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

export default ForgotPasswordPage
