import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Warehouse, User, Mail, Lock, CheckCircle2 } from 'lucide-react'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'

const RegisterPage = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [role, setRole] = useState('TENANT')

  const handleRegister = (e) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      navigate('/login')
    }, 1500)
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Right Side: Illustration (Flipped for variety) */}
      <div className="hidden w-1/2 bg-primary md:block relative overflow-hidden">
        <div className="absolute inset-0 z-0">
           <div className="absolute top-0 right-0 w-1/2 h-full bg-white/10 -skew-x-12 translate-x-1/2" />
           <div className="absolute bottom-0 left-0 w-1/2 h-full bg-black/10 -skew-x-12 -translate-x-1/2" />
        </div>
        
        <div className="relative z-10 flex h-full flex-col justify-center p-16 text-white text-center">
          <div className="mx-auto max-w-sm">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-white flex items-center justify-center mb-8 shadow-2xl">
              <Warehouse className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-4xl font-bold mb-6">Choose your path</h2>
            <div className="space-y-4">
              {[
                'Access global warehouses',
                'Manage real-time inventory',
                'Automate staff operations',
                'Secure billing & payments'
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-left bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                  <span className="text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Left Side: Form */}
      <div className="flex w-full flex-col justify-center px-4 md:w-1/2 lg:px-24 xl:px-48">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-sm mx-auto md:mx-0"
        >
          <div className="mb-10 flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Warehouse className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">StockSpace</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Get Started</h1>
            <p className="mt-2 text-slate-500">Create your account to start managing space.</p>
          </div>

          {/* Role Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-lg mb-8">
            <button 
              onClick={() => setRole('TENANT')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${role === 'TENANT' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
            >
              I'm a Tenant
            </button>
            <button 
              onClick={() => setRole('OWNER')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${role === 'OWNER' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
            >
              I'm an Owner
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <InputField label="Full Name" placeholder="John Doe" required />
            <InputField label="Email Address" type="email" placeholder="name@company.com" required />
            <InputField label="Password" type="password" placeholder="••••••••" required />
            
            <div className="flex items-start gap-2 pt-2">
              <input type="checkbox" className="mt-1 rounded border-slate-300 text-primary focus:ring-primary" required />
              <p className="text-xs text-slate-500 leading-relaxed">
                I agree to the <a href="#" className="text-primary font-bold">Terms of Service</a> and <a href="#" className="text-primary font-bold">Privacy Policy</a>.
              </p>
            </div>

            <Button type="submit" className="w-full h-12" isLoading={isLoading}>
              Create Account
            </Button>
          </form>

          <p className="mt-10 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default RegisterPage
