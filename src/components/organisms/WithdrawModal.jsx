import { useState } from 'react'
import { FormShell } from '@/form/FormControls'
import { MinusCircle, X, Loader2, Building2 } from 'lucide-react'
import walletApi from '../../services/wallet/walletApi'
import useEscapeKey from '../../hooks/useEscapeKey'
import { positiveNumber } from '@/config/validation'
import { showApiErrorToast } from '@/config/apiError'

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
    const amountError = positiveNumber(amountNum, 'Số tiền rút phải lớn hơn 0.')
    if (amountError) {
      setError(amountError)
      return
    }
    if (amountNum > currentBalance) {
      setError(
        `Số tiền rút không được vượt quá số dư khả dụng (${formatVND(currentBalance)}).`
      )
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
        const backendError = { response: { data: res?.data } }
        setError(showApiErrorToast(backendError, 'Tạo yêu cầu rút tiền thất bại.'))
      }
    } catch (err) {
      console.error('Error when withdrawing money:', err)
      setError(showApiErrorToast(err, 'Đã xảy ra lỗi, vui lòng thử lại sau.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <MinusCircle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tạo Yêu Cầu Rút Tiền
              </h3>
              <p className="text-[11px] text-slate-500">Chuyển số dư ví về tài khoản ngân hàng thụ hưởng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <FormShell onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Số tiền cần rút (VND)
              </label>
              <span className="text-[11px] text-slate-500">
                Khả dụng:{' '}
                <span className="font-mono font-bold text-blue-600">{formatVND(currentBalance)}</span>
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                name="amount"
                required
                autoFocus
                min={10000}
                step={10000}
                value={formData.amount}
                onChange={handleChange}
                placeholder="Ví dụ: 5000000"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
              <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₫
              </span>
            </div>
            {formData.amount && !isNaN(Number(formData.amount)) && Number(formData.amount) > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
                <span>Số tiền rút dự kiến:</span>
                <span className="font-mono font-bold text-rose-600">
                  − {formatVND(Number(formData.amount))}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Tên ngân hàng thụ hưởng
            </label>
            <input
              type="text"
              name="bankName"
              required
              value={formData.bankName}
              onChange={handleChange}
              placeholder="Ví dụ: Vietcombank, MBBank, Techcombank..."
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Số tài khoản ngân hàng
            </label>
            <input
              type="text"
              name="bankAccountNumber"
              required
              value={formData.bankAccountNumber}
              onChange={handleChange}
              placeholder="Nhập số tài khoản ngân hàng"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-mono font-medium text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Tên chủ tài khoản
            </label>
            <input
              type="text"
              name="bankAccountHolder"
              required
              value={formData.bankAccountHolder}
              onChange={handleChange}
              placeholder="VIẾT HOA KHÔNG DẤU (VD: NGUYEN VAN A)"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-medium uppercase text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-100 flex items-start gap-2">
            <Building2 className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <p>
              Yêu cầu rút tiền sẽ được bộ phận kế toán WMS xử lý và đối soát trong vòng 24 giờ làm việc. Tiền sẽ được chuyển thẳng về tài khoản ngân hàng khai báo.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || !formData.amount || Number(formData.amount) <= 0}
              className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 transition-colors disabled:bg-slate-300"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Đang xử lý yêu cầu...
                </>
              ) : (
                <>Xác nhận tạo yêu cầu rút</>
              )}
            </button>
          </div>
        </FormShell>
      </div>
    </div>
  )
}

export default WithdrawModal
