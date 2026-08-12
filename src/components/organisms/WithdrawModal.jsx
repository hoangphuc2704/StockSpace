import React, { useState } from 'react'
import { Wallet, X, Loader2 } from 'lucide-react'
import walletApi from '../../services/wallet/walletApi'
import useEscapeKey from '../../hooks/useEscapeKey'

const WithdrawModal = ({ isOpen, onClose, onSuccess, currentBalance = 0 }) => {
  useEscapeKey(isOpen, onClose)

  const [formData, setFormData] = useState({
    amount: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountHolder: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const formatVND = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(value)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const amountNum = Number(formData.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Withdrawal amount must be greater than 0.")
      return
    }
    if (amountNum > currentBalance) {
      setError(`The withdrawal amount cannot exceed the available balance (${formatVND(currentBalance)}).`)
      return
    }

    try {
      setLoading(true)
      const res = await walletApi.requestWithdraw({
        amount: amountNum,
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber,
        bankAccountHolder: formData.bankAccountHolder,
      })

      if (res?.data?.success) {
        onSuccess && onSuccess()
        onClose()
      } else {
        setError(res?.data?.message || "Withdrawal request failed.")
      }
    } catch (err) {
      console.error("Error when withdrawing money:", err)
      setError("An error occurred, please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl duration-150">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Wallet className="h-5 w-5 text-blue-600" /> Create a withdrawal request
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
              Amount to withdraw (VND)
            </label>
            <div className="relative">
              <input
                type="number"
                name="amount"
                required
                value={formData.amount}
                onChange={handleChange}
                placeholder="For example: 500000"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₫
              </span>
            </div>
            {formData.amount && !isNaN(Number(formData.amount)) && (
              <p className="mt-1 text-xs font-medium text-emerald-600">
                Real receipt: {formatVND(Number(formData.amount))}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Available balance: <span className="font-semibold text-blue-600">{formatVND(currentBalance)}</span>
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
              Bank Name
            </label>
            <input
              type="text"
              name="bankName"
              required
              value={formData.bankName}
              onChange={handleChange}
              placeholder="VD: Vietcombank, TPBank..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
              Account Number
            </label>
            <input
              type="text"
              name="bankAccountNumber"
              required
              value={formData.bankAccountNumber}
              onChange={handleChange}
              placeholder="Enter the bank account number"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
              Account Holder Name
            </label>
            <input
              type="text"
              name="bankAccountHolder"
              required
              value={formData.bankAccountHolder}
              onChange={handleChange}
              placeholder="CAPITALS WITHOUT diacritics"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none uppercase"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.amount}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-700 disabled:bg-slate-300"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Create a withdrawal request</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default WithdrawModal
