import React, { useState } from 'react'
import { Wallet, X, Loader2 } from 'lucide-react'
import walletApi from '../../services/wallet/walletApi'

const WithdrawModal = ({ isOpen, onClose, onSuccess, currentBalance = 0 }) => {
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
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
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
      setError('Số tiền rút phải lớn hơn 0.')
      return
    }
    if (amountNum > currentBalance) {
      setError(`Số tiền rút không được vượt quá số dư khả dụng (${formatVND(currentBalance)}).`)
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
        setError(res?.data?.message || 'Yêu cầu rút tiền thất bại.')
      }
    } catch (err) {
      console.error('Lỗi khi rút tiền:', err)
      setError('Đã xảy ra lỗi, vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl duration-150">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Wallet className="h-5 w-5 text-blue-600" /> Tạo yêu cầu rút tiền
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
              Số tiền cần rút (VND)
            </label>
            <div className="relative">
              <input
                type="number"
                name="amount"
                required
                value={formData.amount}
                onChange={handleChange}
                placeholder="Ví dụ: 500000"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₫
              </span>
            </div>
            {formData.amount && !isNaN(Number(formData.amount)) && (
              <p className="mt-1 text-xs font-medium text-emerald-600">
                Thực nhận: {formatVND(Number(formData.amount))}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Số dư khả dụng: <span className="font-semibold text-blue-600">{formatVND(currentBalance)}</span>
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
              Tên Ngân Hàng
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
              Số Tài Khoản
            </label>
            <input
              type="text"
              name="bankAccountNumber"
              required
              value={formData.bankAccountNumber}
              onChange={handleChange}
              placeholder="Nhập số tài khoản ngân hàng"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
              Tên Chủ Tài Khoản
            </label>
            <input
              type="text"
              name="bankAccountHolder"
              required
              value={formData.bankAccountHolder}
              onChange={handleChange}
              placeholder="VIẾT HOA KHÔNG DẤU"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none uppercase"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || !formData.amount}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-700 disabled:bg-slate-300"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>Tạo yêu cầu rút tiền</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default WithdrawModal
