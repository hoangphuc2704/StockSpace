import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search, Warehouse, Shield, BarChart, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/atoms/Button'

const LandingNavbar = () => {
  const { user, logout } = useAuthStore()
  return (
    <nav className="fixed top-0 z-[100] w-full border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 h-16 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Warehouse className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">StockSpace</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#solutions" className="hover:text-primary transition-colors">Solutions</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
          <a href="#about" className="hover:text-primary transition-colors">About</a>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to={`/${user.role.toLowerCase()}/dashboard`}>
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                  Dashboard
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout}
                className="text-slate-300 hover:text-white"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
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
    <section className="relative pt-32 pb-20 overflow-hidden bg-slate-900 text-white">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-sm font-medium text-primary ring-1 ring-inset ring-primary/20 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Empowering Modern Logistics
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            The Centralized <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              Warehouse Marketplace
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10">
            Connect with premium warehouse providers, manage inventory in real-time, and scale your business operations with our integrated WMS platform.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="max-w-3xl mx-auto mb-16"
        >
          <div className="relative flex items-center p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <Search className="absolute left-6 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by location, size, or warehouse type..."
              className="w-full bg-transparent pl-14 pr-4 py-4 text-lg focus:outline-none"
            />
            <Button size="lg" className="px-8 shrink-0">
              Search
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-slate-500">
            <span>Popular:</span>
            <a href="#" className="text-slate-300 hover:text-primary">Cold Storage</a>
            <a href="#" className="text-slate-300 hover:text-primary">E-commerce Fulfillment</a>
            <a href="#" className="text-slate-300 hover:text-primary">Last Mile Hubs</a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export { LandingNavbar, Hero }
