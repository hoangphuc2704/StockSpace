import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const Badge = ({ children, variant = 'primary', className, ...props }) => {
  const variants = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    outline: 'border-slate-200 text-slate-600',
  }

  return (
    <span
      className={twMerge(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export default Badge
