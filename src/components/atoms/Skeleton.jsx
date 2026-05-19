import { cn } from '@/utils/cn'

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-100', className)}
      {...props}
    />
  )
}

export default Skeleton
