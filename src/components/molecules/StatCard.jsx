import { motion } from 'framer-motion'
import { twMerge } from 'tailwind-merge'

const StatCard = ({ title, value, icon: Icon, trend, trendValue, className }) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={twMerge(
        'rounded-xl border border-slate-200 bg-white p-6 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-primary/5 p-2 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <span className={twMerge(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            trend === 'up' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
          )}>
            {trend === 'up' ? '+' : '-'}{trendValue}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
      </div>
    </motion.div>
  )
}

export default StatCard
