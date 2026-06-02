import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import { useDispatch } from 'react-redux'
import { FcGoogle } from 'react-icons/fc'
import { login } from '@/store/authSlice'

const LoginPage = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate login
    setTimeout(() => {
      dispatch(login({ user: { name: 'Admin User', role: 'ADMIN' }, token: 'mock-jwt-token' }))
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
      navigate(redirectPath[role])
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Side: Form */}
      <div className="flex w-full flex-col justify-center px-4 md:w-1/2 lg:px-24 xl:px-48">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mx-auto w-full max-w-sm md:mx-0"
        >
          <div className="mb-8 flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-900">StockSpace</span>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Welcome Back</h1>
            <p className="mt-2 text-sm text-slate-500">
              Please enter your details or use a demo account.
            </p>
          </div>

          {/* Demo Accounts Section */}

          <form onSubmit={handleLogin} className="space-y-4">
            <InputField
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              required
            />
            <div className="space-y-1">
              <InputField label="Password" type="password" placeholder="••••••••" required />
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  size="sm"
                  className="text-primary text-xs font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="h-11 w-full" isLoading={isLoading}>
              Sign In
            </Button>

            <div className="relative my-6">
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
              <Button variant="outline" className="h-12 w-full rounded-lg text-sm font-medium">
                <FcGoogle className="mr-2 h-5 w-5" />
                Continue with Google
              </Button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Side: Illustration/Hero */}
      <div className="relative hidden w-1/2 overflow-hidden bg-slate-900 md:block">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200"
            alt="Warehouse"
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-900/60 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-16 text-white">
          <div className="max-w-md">
            <h2 className="text-4xl leading-tight font-bold">
              Manage your <br />
              <span className="text-primary">logistics ecosystem</span> <br />
              in one place.
            </h2>
            <p className="mt-6 text-lg text-slate-400">
              Join 10,000+ businesses optimizing their supply chain with StockSpace.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-8 backdrop-blur-md">
            <p className="text-lg font-medium text-white/90 italic">
              "StockSpace has completely transformed how we handle our regional distribution. The
              WMS integration is flawless."
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-100" />
              <div>
                <p className="font-bold">Alex Rivera</p>
                <p className="text-sm text-slate-400">COO at LogiFlow</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
