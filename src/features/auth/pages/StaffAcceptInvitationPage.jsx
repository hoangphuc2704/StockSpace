import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authApi } from '@/services/authApi'
import { Loader2, CheckCircle, AlertCircle, Building2 } from 'lucide-react'
import Button from '@/components/atoms/Button'
import { firstError, validateStaffInvitationForm } from '@/config/validation'
import { StaffAcceptInvitationForm } from '@/form/AuthForms'

const StaffAcceptInvitationPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  // Token validation states
  const [tokenStatus, setTokenStatus] = useState('loading') // 'loading' | 'valid' | 'invalid'
  const [inviteInfo, setInviteInfo] = useState(null) // { email, fullName, tenantName }
  const [tokenError, setTokenError] = useState('')

  // Form states
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid')
      setTokenError("No token found in the path.")
      return
    }
    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const res = await authApi.validateStaffInviteToken(token)
      if (res.success && res.data?.valid) {
        setInviteInfo(res.data)
        setTokenStatus('valid')
      } else {
        setTokenStatus('invalid')
        setTokenError(res.data?.message || res.message || "Invitation is not valid.")
      }
    } catch (err) {
      setTokenStatus('invalid')
      setTokenError(err.response?.data?.message || "The invitation has expired or does not exist.")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const validationError = firstError(validateStaffInvitationForm({ token, password, confirmPassword }))
    if (validationError) {
      setFormError(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      await authApi.acceptStaffInvitation({ token, password, confirmPassword })
      setSubmitSuccess(true)
    } catch (err) {
      setFormError(err.response?.data?.message || "An error has occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ===================== RENDER =====================

  // Loading token validation
  if (tokenStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-400" />
          <p className="text-slate-300">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  // Invalid token
  if (tokenStatus === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Invitation</h1>
          <p className="text-slate-500 mb-6">{tokenError}</p>
          <p className="text-sm text-slate-400">
            Please contact the business to receive a new invitation.
          </p>
          <Button className="mt-6 w-full" onClick={() => navigate('/')}>
            Back to Home Page
          </Button>
        </div>
      </div>
    )
  }

  // Success
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Account Activated!</h1>
          <p className="text-slate-500 mb-2">
            Welcome <strong>{inviteInfo?.fullName}</strong> Join the team of <strong>{inviteInfo?.tenantName}</strong>!
          </p>
          <p className="text-sm text-slate-400 mb-8">
            You can log in with the email and password you just set up.
          </p>
          <Button className="w-full" onClick={() => navigate('/')}>
            Login Now
          </Button>
        </div>
      </div>
    )
  }

  // Valid token — show form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Confirmation of Participation</h1>
          <p className="text-slate-500 text-sm mt-2">
            You are invited to join our team{' '}
            <strong className="text-blue-600">{inviteInfo?.tenantName}</strong>
          </p>
        </div>

        {/* Staff info read-only */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Full name</span>
            <span className="font-medium text-slate-900">{inviteInfo?.fullName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Email</span>
            <span className="font-medium text-slate-900">{inviteInfo?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Organize</span>
            <span className="font-medium text-blue-600">{inviteInfo?.tenantName}</span>
          </div>
        </div>

        {/* Password form */}
        <StaffAcceptInvitationForm
          embedded
          token={token}
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={(event) => setPassword(event.target.value)}
          onConfirmPasswordChange={(event) => setConfirmPassword(event.target.value)}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          showPassword={showPassword}
          showConfirmPassword={showConfirmPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          onToggleConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
          submitText="Confirmation of Participation"
          extraContent={
            formError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )
          }
        />
        <p className="text-center text-xs text-slate-400">
          If you already have an account with this email, the old password will not change.
        </p>
      </div>
    </div>
  )
}

export default StaffAcceptInvitationPage
