import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const InputField = forwardRef(({ label, error, className, ...props }, ref) => {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <input
        ref={ref}
        className={twMerge(
          'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-danger focus-visible:ring-danger',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
})

InputField.displayName = 'InputField'

export default InputField
