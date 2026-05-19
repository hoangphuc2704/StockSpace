import { motion } from 'framer-motion'
import { Construction } from 'lucide-react'

const PlaceholderPage = ({ title, description }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-6 h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"
      >
        <Construction size={40} />
      </motion.div>
      
      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-slate-900 mb-4"
      >
        {title}
      </motion.h1>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-slate-500 max-w-md"
      >
        {description || "This feature is currently under development. Stay tuned for updates!"}
      </motion.p>
    </div>
  )
}

export default PlaceholderPage
