import { cn } from '@/utils/cn'

const Avatar = ({ src, alt, fallback, size = 'md', className }) => {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  }

  return (
    <div className={cn(
      'relative flex shrink-0 overflow-hidden rounded-full bg-slate-100 border border-slate-200',
      sizes[size],
      className
    )}>
      {src ? (
        <img src={src} alt={alt} className="aspect-square h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-medium text-slate-500 uppercase">
          {fallback || alt?.charAt(0) || '?'}
        </div>
      )}
    </div>
  )
}

export default Avatar
