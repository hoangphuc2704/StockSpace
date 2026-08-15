import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import PublicHeader from '../../../components/PublicHeader'

const WalletCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const status = searchParams.get('status')
  const amount = searchParams.get('amount')
  const code = searchParams.get('code')

  const handleGoBack = () => {
    if (user?.role === 'ROLE_OWNER') {
      navigate('/owner/wallet/withdraws')
    } else {
      navigate('/tenant/wallet')
    }
  }

  return (
    <div className="min-h-screen bg-[#faf7f4] font-sans text-stone-900">
      <PublicHeader />

      <main className="flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-xl">
          {status === 'success' ? (
            <>
              <div className="mb-6 flex justify-center">
                <CheckCircle className="h-20 w-20 text-emerald-500" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-stone-900">Payment successful!</h2>
              <p className="mb-6 text-stone-500">
                You have successfully loaded{' '}
                <span className="font-bold text-emerald-600">
                  {Number(amount || 0).toLocaleString('vi-VN')} VND
                </span>{' '}
                into your wallet.
              </p>
              {code && <p className="mb-8 text-sm text-stone-400">Transaction code: {code}</p>}
            </>
          ) : (
            <>
              <div className="mb-6 flex justify-center">
                <XCircle className="h-20 w-20 text-red-500" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-stone-900">Payment failed</h2>
              <p className="mb-8 text-stone-500">
                Your transaction has been canceled or an error has occurred. Please try again later.
              </p>
            </>
          )}

          <button
            onClick={handleGoBack}
            className="inline-flex w-full items-center justify-center rounded-md bg-[#FF5A1F] px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#e04e19]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to My Wallet
          </button>
        </div>
      </main>
    </div>
  )
}

export default WalletCallback
