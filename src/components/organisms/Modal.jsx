import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { twMerge } from 'tailwind-merge'
import useEscapeKey from '@/hooks/useEscapeKey'

const Modal = ({ isOpen, onClose, title, children, className }) => {
  useEscapeKey(isOpen, onClose)

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

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[60] flex min-h-[100dvh] items-center justify-center overflow-y-auto p-2 pointer-events-none sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={twMerge(
                'pointer-events-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]',
                className
              )}
            >
              <div className="flex shrink-0 items-center justify-between border-b p-4">
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <button
                  onClick={onClose}
                  className="rounded-full p-1 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default Modal
