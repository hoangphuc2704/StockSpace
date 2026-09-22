import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { CheckCircle, Clock3, XCircle, ArrowLeft, Loader2 } from 'lucide-react'
import PublicHeader from '../../../components/PublicHeader'
import walletApi from '../../../services/wallet/walletApi'
import { useLanguage } from '@/i18n/LanguageContext'

// The BE intentionally allows a successful PayOS webhook to move an EXPIRED
// transaction to SUCCESS, so EXPIRED is not terminal while this page is polling.
const TERMINAL_TRANSACTION_STATUSES = new Set(['SUCCESS', 'FAILED'])
const MAX_STATUS_CHECKS = 10
const STATUS_CHECK_DELAY = 1500

const formatVND = (value) =>
  value === undefined || value === null
    ? null
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)

const WalletCallback = () => {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const gatewayStatus = searchParams.get('status')?.toLowerCase() || 'fail'
  const paymentCode = searchParams.get('code') || searchParams.get('orderCode')
  const gatewayAmount = searchParams.get('amount')
  const canCheckStatus = gatewayStatus === 'success' && Boolean(paymentCode) && Boolean(localStorage.getItem('token'))
  const [transaction, setTransaction] = useState(null)
  const [checkingStatus, setCheckingStatus] = useState(canCheckStatus)

  useEffect(() => {
    if (gatewayStatus !== 'success' || !paymentCode || !localStorage.getItem('token')) {
      return undefined
    }

    let cancelled = false
    let timerId
    let attempts = 0

    const checkStatus = async () => {
      attempts += 1
      try {
        const response = await walletApi.getTransactionStatus(paymentCode)
        const nextTransaction = response?.data?.data

        if (cancelled) return
        setTransaction(nextTransaction || null)

        if (TERMINAL_TRANSACTION_STATUSES.has(nextTransaction?.status) || attempts >= MAX_STATUS_CHECKS) {
          setCheckingStatus(false)
          return
        }
      } catch {
        // A successful PayOS redirect can arrive just before the webhook creates
        // the final state. Continue polling and let the page show verification.
        if (cancelled || attempts >= MAX_STATUS_CHECKS) {
          setCheckingStatus(false)
          return
        }
      }

      if (!cancelled) timerId = window.setTimeout(checkStatus, STATUS_CHECK_DELAY)
    }

    checkStatus()
    return () => {
      cancelled = true
      window.clearTimeout(timerId)
    }
  }, [gatewayStatus, paymentCode])

  const resolvedStatus = useMemo(() => {
    if (gatewayStatus !== 'success') return gatewayStatus
    if (transaction?.status === 'SUCCESS') return 'success'
    if (transaction?.status === 'FAILED') return 'fail'
    return checkingStatus ? 'pending' : 'pending'
  }, [gatewayStatus, transaction?.status, checkingStatus])

  const handleGoBack = () => {
    if (user?.role === 'ROLE_OWNER') {
      navigate('/owner/wallet/withdraws')
    } else if (user?.role === 'ROLE_ADMIN') {
      navigate('/admin/wallet')
    } else {
      navigate('/tenant/wallet')
    }
  }

  const isSuccess = resolvedStatus === 'success'
  const isPending = resolvedStatus === 'pending'
  const isExpired = resolvedStatus === 'expired'
  const amount = formatVND(transaction?.amount ?? gatewayAmount)

  return (
    <div className="min-h-screen bg-[#faf7f4] font-sans text-stone-900">
      <PublicHeader />

      <main className="flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-xl">
          {isSuccess ? (
            <>
              <div className="mb-6 flex justify-center">
                <CheckCircle className="h-20 w-20 text-emerald-500" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-stone-900">{t('Payment successful!')}</h2>
              <p className="mb-6 text-stone-500">
                {t('You have successfully loaded')}{' '}
                <span className="font-bold text-emerald-600">{amount || t('your wallet')}</span>{' '}
                {t('into your wallet.')}
              </p>
            </>
          ) : isPending ? (
            <>
              <div className="mb-6 flex justify-center">
                <Clock3 className="h-20 w-20 text-amber-500" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-stone-900">{t('Payment is being verified')}</h2>
              <p className="mb-6 text-stone-500">
                {t('PayOS has returned successfully. We are waiting for the payment webhook to update your wallet.')}
              </p>
              {checkingStatus && (
                <Loader2 className="mx-auto mb-6 h-5 w-5 animate-spin text-amber-500" />
              )}
            </>
          ) : (
            <>
              <div className="mb-6 flex justify-center">
                <XCircle className="h-20 w-20 text-red-500" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-stone-900">
                {isExpired ? t('Payment link expired') : t('Payment failed')}
              </h2>
              <p className="mb-8 text-stone-500">
                {isExpired
                  ? t('This PayOS payment link has expired. Please create a new top-up request.')
                  : t('Your transaction has been canceled or an error has occurred. Please try again later.')}
              </p>
            </>
          )}

          {paymentCode && (
            <p className="mb-8 text-sm text-stone-400">
              {t('Transaction code:')} {paymentCode}
            </p>
          )}

          <button
            onClick={handleGoBack}
            className="inline-flex w-full items-center justify-center rounded-md bg-[#FF5A1F] px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#e04e19]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('Return to My Wallet')}
          </button>
        </div>
      </main>
    </div>
  )
}

export default WalletCallback
