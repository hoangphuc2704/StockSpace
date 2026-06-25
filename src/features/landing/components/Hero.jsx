import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search, Warehouse, Shield, BarChart, ChevronRight } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { logoutThunk } from '@/store/authSlice'
import Button from '@/components/atoms/Button'

const LandingNavbar = () => {
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()

  const getDashboardInfo = (role) => {
    switch (role) {
      case 'ROLE_TENANT': return { url: '/tenant/dashboard', label: 'Tenant Dashboard' }
      case 'ROLE_OWNER': return { url: '/owner/dashboard', label: 'Owner Dashboard' }
      case 'ROLE_STAFF': return { url: '/staff/dashboard', label: 'Staff Dashboard' }
      case 'ROLE_INSPECTOR': return { url: '/inspector/dashboard', label: 'Inspector Dashboard' }
      case 'ROLE_ADMIN': return { url: '/admin/dashboard', label: 'Admin Dashboard' }
      default: return { url: '/', label: 'Dashboard' }
    }
  }

  return (
    <nav className="fixed top-0 z-[100] w-full border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <Warehouse className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">StockSpace</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          <a href="#features" className="hover:text-primary transition-colors">
            Features
          </a>
          <a href="#solutions" className="hover:text-primary transition-colors">
            Solutions
          </a>
          <a href="#pricing" className="hover:text-primary transition-colors">
            Pricing
          </a>
          <a href="#about" className="hover:text-primary transition-colors">
            About
          </a>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to={getDashboardInfo(user.role).url}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {getDashboardInfo(user.role).label}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  dispatch(logoutThunk())
                }}
                className="text-slate-300 hover:text-white"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
              >
                Login
              </Link>
              <Link to="/register">
                <Button size="sm" className="hidden sm:inline-flex">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-slate-900 pt-32 pb-20 text-white">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="bg-primary/20 absolute -top-[20%] -left-[10%] h-[50%] w-[50%] rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[40%] w-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary ring-primary/20 mb-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-sm font-medium ring-1 ring-inset">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" />
            Empowering Modern Logistics
          </span>
          <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl">
            The Centralized <br />
            <span className="from-primary bg-gradient-to-r to-blue-400 bg-clip-text text-transparent">
              Warehouse Marketplace
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400 md:text-xl">
            Connect with premium warehouse providers, manage inventory in real-time, and scale your
            business operations with our integrated WMS platform.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mx-auto mb-16 max-w-3xl"
        >
          <div className="relative flex items-center rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm">
            <Search className="absolute left-6 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by location, size, or warehouse type..."
              className="w-full bg-transparent py-4 pr-4 pl-14 text-lg focus:outline-none"
            />
            <Button size="lg" className="shrink-0 px-8">
              Search
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-slate-500">
            <span>Popular:</span>
            <a href="#" className="hover:text-primary text-slate-300">
              Cold Storage
            </a>
            <a href="#" className="hover:text-primary text-slate-300">
              E-commerce Fulfillment
            </a>
            <a href="#" className="hover:text-primary text-slate-300">
              Last Mile Hubs
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export { LandingNavbar, Hero }
