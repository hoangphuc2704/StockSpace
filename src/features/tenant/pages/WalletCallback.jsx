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
      
      <main className="flex justify-center items-center py-20 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-stone-200 p-10 max-w-md w-full text-center">
          {status === 'success' ? (
            <>
              <div className="flex justify-center mb-6">
                <CheckCircle className="h-20 w-20 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-stone-900 mb-2">Payment successful!</h2>
              <p className="text-stone-500 mb-6">
                You have successfully loaded <span className="font-bold text-emerald-600">{Number(amount || 0).toLocaleString('vi-VN')} VND</span> into your wallet.
              </p>
              {code && (
                <p className="text-sm text-stone-400 mb-8">
                  Transaction code: {code}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <XCircle className="h-20 w-20 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-stone-900 mb-2">Payment failed</h2>
              <p className="text-stone-500 mb-8">
                Your transaction has been canceled or an error has occurred. Please try again later.
              </p>
            </>
          )}

          <button 
            onClick={handleGoBack}
            className="w-full inline-flex justify-center items-center rounded-md bg-[#FF5A1F] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#e04e19] hover:-translate-y-0.5"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to My Wallet
          </button>
        </div>
      </main>
    </div>
  )
}

export default WalletCallback
