/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
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
        danger: Boolean(normalized.danger),
      })
    })
  }, [])

  const finish = useCallback((result) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setDialog(null)
    resolve?.(result)
  }, [])

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
                dialog?.danger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="pt-1.5 text-sm leading-6 text-slate-600">{dialog?.message}</p>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => finish(false)}>
              {dialog?.cancelText}
            </Button>
            <Button
              type="button"
              variant={dialog?.danger ? 'danger' : 'primary'}
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
