import { motion } from 'framer-motion'
import Button from '@/components/atoms/Button'
import useEscapeKey from '@/hooks/useEscapeKey'

const ConfirmDepositModal = ({
  isOpen,
  onClose,
  walletBalance,
  depositAmount,
  depositPercentage,
  isBooking,
  onConfirm
}) => {
  useEscapeKey(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
      >
        <h3 className="mb-6 text-2xl font-bold text-slate-900 ">Confirm Deposit</h3>

        <div className="space-y-4 text-slate-600">
          <div className="flex justify-between border-b border-slate-100 pb-4">
            <span>Wallet Balance:</span>
            <span className="font-semibold text-slate-900">${walletBalance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-4">
            <span>Required Deposit ({depositPercentage}%):</span>
            <span className="font-semibold text-danger">-${depositAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="font-bold text-slate-900">Remaining Balance:</span>
            <span className={`font-bold ${walletBalance - depositAmount >= 0 ? 'text-success' : 'text-danger'}`}>
              ${(walletBalance - depositAmount).toLocaleString()}
            </span>
          </div>
        </div>

        {walletBalance - depositAmount < 0 && (
          <div className="mt-6 rounded-xl bg-danger/10 p-4 text-sm text-danger">
            Insufficient funds. Please top up your wallet before proceeding.
          </div>
        )}

        <div className="mt-8 flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isBooking}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 text-black"
            disabled={walletBalance - depositAmount < 0 || isBooking}
            onClick={onConfirm}
          >
            {isBooking ? 'Processing...' : 'Confirm & Pay'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export default ConfirmDepositModal
