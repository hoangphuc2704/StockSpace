import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

const Spinner = ({ size = 'md', className, variant = 'primary' }) => {
  const sizes = {
    xs: 'h-3 w-3 border-2',
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4',
  }

  const variants = {
    primary: 'border-primary border-t-transparent',
    white: 'border-white border-t-transparent',
    slate: 'border-slate-200 border-t-slate-500',
  }

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={cn(
        'rounded-full',
        sizes[size],
        variants[variant],
        className
      )}
    />
  )
}

export default Spinner
