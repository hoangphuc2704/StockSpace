import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const Button = forwardRef(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary/90',
      secondary: 'bg-secondary text-white hover:bg-secondary/90',
      outline: 'border-2 border-primary text-primary hover:bg-primary/5',
      ghost: 'text-primary hover:bg-primary/5',
      danger: 'bg-danger text-white hover:bg-danger/90',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={twMerge(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : null}
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export default Button
