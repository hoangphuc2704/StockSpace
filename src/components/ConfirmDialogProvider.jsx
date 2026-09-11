/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import Modal from '@/components/organisms/Modal'
import Button from '@/components/atoms/Button'

const ConfirmDialogContext = createContext(null)

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolverRef = useRef(null)

  const confirm = useCallback((options) => {
    const normalized =
      typeof options === 'string'
        ? { message: options }
        : options || { message: 'Are you sure you want to continue?' }

    resolverRef.current?.(false)
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setDialog({
        title: normalized.title || 'Confirm action',
        message: normalized.message || 'Are you sure you want to continue?',
        confirmText: normalized.confirmText || 'Confirm',
        cancelText: normalized.cancelText || 'Cancel',
        type:
          normalized.type === 'danger' || normalized.danger === true
            ? 'danger'
            : 'normal',
      })
    })
  }, [])

  const finish = useCallback((result) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setDialog(null)
    resolve?.(result)
  }, [])

  const isDanger = dialog?.type === 'danger'
  const DialogIcon = isDanger ? AlertTriangle : Info

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <Modal
        isOpen={Boolean(dialog)}
        onClose={() => finish(false)}
        title={dialog?.title || 'Confirm action'}
        className="max-w-md"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isDanger ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
              }`}
            >
              <DialogIcon className="h-5 w-5" />
            </div>
            <p className="pt-1.5 text-sm leading-6 text-slate-600">{dialog?.message}</p>
          </div>

          <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => finish(false)}
            >
              {dialog?.cancelText}
            </Button>
            <Button
              type="button"
              variant={isDanger ? 'danger' : 'primary'}
              className="w-full sm:w-auto"
              onClick={() => finish(true)}
            >
              {dialog?.confirmText}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmDialogContext.Provider>
  )
}

export function useConfirmDialog() {
  const confirm = useContext(ConfirmDialogContext)
  if (!confirm) throw new Error('useConfirmDialog must be used inside ConfirmDialogProvider')
  return confirm
}
