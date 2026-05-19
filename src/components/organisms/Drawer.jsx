import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { twMerge } from 'tailwind-merge'

const Drawer = ({ isOpen, onClose, title, children, className }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={twMerge(
              'fixed right-0 top-0 z-[60] h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200',
              className
            )}
          >
            <div className="flex items-center justify-between border-b p-4 h-16">
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-full p-2 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="h-[calc(100%-64px)] overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default Drawer
