import { useGoogleLogin } from '@react-oauth/google'
import { FcGoogle } from 'react-icons/fc'
import { useDispatch, useSelector } from 'react-redux'

import Button from '@/components/atoms/Button'
import { clearError, googleLoginThunk } from '@/store/authSlice'

const LoginGoogle = ({ onLoginSuccess, className = '' }) => {
  const dispatch = useDispatch()
  const { isLoading } = useSelector((state) => state.auth)

  const handleGoogleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      dispatch(clearError())
      try {
        const result = await dispatch(googleLoginThunk(codeResponse.code)).unwrap()
        onLoginSuccess?.(result)
      } catch (err) {
        console.error('Google login failed:', err)
      }
    },
    onError: (error) => {
      console.error('Google OAuth error:', error)
    },
  })

  return (
    <Button
      variant="outline"
      className={`h-11 w-full rounded-lg text-sm font-medium ${className}`}
      onClick={() => handleGoogleLogin()}
      type="button"
      isLoading={isLoading}
    >
      <FcGoogle className="mr-2 h-5 w-5" />
      Continue with Google
    </Button>
  )
}

export default LoginGoogle
