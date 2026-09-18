import { useState } from 'react'
import { FormShell } from '@/form/FormControls'
import { MinusCircle, X, Loader2, Building2 } from 'lucide-react'
import walletApi from '../../services/wallet/walletApi'
import useEscapeKey from '../../hooks/useEscapeKey'
import { positiveNumber } from '@/config/validation'
import { showApiErrorToast } from '@/config/apiError'
import { useLanguage } from '@/i18n/LanguageContext'

const WithdrawModal = ({ isOpen, onClose, onSuccess, currentBalance = 0 }) => {
  useEscapeKey(isOpen, onClose)
  const { t } = useLanguage()

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
    const amountError = positiveNumber(amountNum, t('Withdrawal amount must be greater than 0.'))
    if (amountError) {
      setError(amountError)
      return
    }
    if (amountNum > currentBalance) {
      setError(
        `${t('Withdrawal amount cannot exceed the available balance')} (${formatVND(currentBalance)}).`
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
        setError(showApiErrorToast(backendError, t('Withdrawal request failed.')))
      }
    } catch (err) {
      console.error('Error when withdrawing money:', err)
      setError(showApiErrorToast(err, t('Something went wrong. Please try again later.')))
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
                {t('Create Withdrawal Request')}
              </h3>
              <p className="text-[11px] text-slate-500">{t('Transfer wallet balance to your beneficiary bank account')}</p>
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
                {t('Withdrawal amount (VND)')}
              </label>
              <span className="text-[11px] text-slate-500">
                {t('Available:')}{' '}
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
                placeholder={t('e.g. 5000000')}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
              <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₫
              </span>
            </div>
            {formData.amount && !isNaN(Number(formData.amount)) && Number(formData.amount) > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
                <span>{t('Estimated withdrawal:')}</span>
                <span className="font-mono font-bold text-rose-600">
                  − {formatVND(Number(formData.amount))}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              {t('Beneficiary bank name')}
            </label>
            <input
              type="text"
              name="bankName"
              required
              value={formData.bankName}
              onChange={handleChange}
              placeholder={t('e.g. Vietcombank, MBBank, Techcombank...')}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              {t('Bank account number')}
            </label>
            <input
              type="text"
              name="bankAccountNumber"
              required
              value={formData.bankAccountNumber}
              onChange={handleChange}
              placeholder={t('Enter bank account number')}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-mono font-medium text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              {t('Bank account holder')}
            </label>
            <input
              type="text"
              name="bankAccountHolder"
              required
              value={formData.bankAccountHolder}
              onChange={handleChange}
              placeholder={t('UPPERCASE WITHOUT ACCENTS (E.G. NGUYEN VAN A)')}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-medium uppercase text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-100 flex items-start gap-2">
            <Building2 className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <p>
              {t('Withdrawal requests will be reviewed and processed by WMS accounting within 24 business hours. Funds will be transferred directly to the declared bank account.')}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !formData.amount || Number(formData.amount) <= 0}
              className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 transition-colors disabled:bg-slate-300"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  {t('Processing request...')}
                </>
              ) : (
                <>{t('Confirm withdrawal request')}</>
              )}
            </button>
          </div>
        </FormShell>
      </div>
    </div>
  )
}

export default WithdrawModal
