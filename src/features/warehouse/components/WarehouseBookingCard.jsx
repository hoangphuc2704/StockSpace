import { motion } from 'framer-motion'
import { Star, ShieldCheck } from 'lucide-react'
import Button from '@/components/atoms/Button'

const WarehouseBookingCard = ({
  warehouse,
  extendedData,
  depositPercentage,
  hasBooked,
  isCheckingWallet,
  onDepositClick,
}) => {
  return (
    <aside className="w-full lg:w-100">
      <div className="sticky top-28 space-y-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/50"
        >
          <div className="bg-primary/5 absolute -mt-16 -mr-16 h-32 w-32 rounded-full" />

          <div className="relative z-10 mb-8 flex items-end justify-between">
            <div>
              <p className="mb-1 text-xs font-bold tracking-widest text-slate-400 uppercase">
                Rental Price
              </p>
              <span className="text-primary text-3xl font-black">
                {warehouse.price.toLocaleString()}VND
              </span>
              <span className="font-medium text-slate-500"> / mo</span>
            </div>
          </div>

          <div className="relative z-10 mb-8 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Required Area (m²)</label>{' '}
              <br></br>
              <span className="text-lg font-bold text-slate-900">
                {warehouse.area.toLocaleString()} m²
              </span>
            </div>
          </div>

          <div className="relative z-10 mb-8 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="mb-3 flex items-center gap-2 font-bold text-slate-900">
              <ShieldCheck size={18} className="text-success" />
              <h4 className="text-sm">Deposit Information</h4>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Monthly Rental</span>
                <span className="font-semibold">{warehouse.price.toLocaleString()}VND</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Security Deposit ({depositPercentage}%)</span>
                <span className="font-semibold">{extendedData.deposit.toLocaleString()} VND</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-900">
                <span>Total to Book (Deposit)</span>
                <span className="text-primary">
                  {extendedData.deposit.toLocaleString()} VND
                </span>
              </div>
            </div>
          </div>

          <Button
            className="group shadow-primary/30 text-white shadow-xl h-14 w-full rounded-2xl text-lg font-bold"
            disabled={isCheckingWallet || hasBooked}
            onClick={onDepositClick}
          >
            {hasBooked
              ? 'Request Submitted'
              : isCheckingWallet
                ? 'Checking Wallet...'
                : `Instant Deposit (${depositPercentage}%)`}
          </Button>
        </motion.div>
      </div>
    </aside>
  )
}

export default WarehouseBookingCard
