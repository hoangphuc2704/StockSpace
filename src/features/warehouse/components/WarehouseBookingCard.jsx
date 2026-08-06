import { motion } from 'framer-motion'
import { Star, ShieldCheck } from 'lucide-react'
import Button from '@/components/atoms/Button'

const WarehouseBookingCard = ({
  warehouse,
  extendedData,
  durationMonths,
  onDurationChange,
  depositPercentage,
  hasBooked,
  isCheckingWallet,
  onDepositClick,
}) => {
  return (
    <aside className="w-full lg:w-[400px]">
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
                ${warehouse.price.toLocaleString()}
              </span>
              <span className="font-medium text-slate-500"> / mo</span>
            </div>
            <div className="text-right">
              <div className="text-warning flex items-center gap-1 font-bold">
                <Star size={14} className="fill-current" />
                <span>{warehouse.rating}</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                {extendedData.reviews} reviews
              </p>
            </div>
          </div>

          <div className="relative z-10 mb-8 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Start Date</label>
                <input
                  type="date"
                  className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Duration</label>
                <select
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={durationMonths}
                  onChange={(e) => onDurationChange(Number(e.target.value))}
                >
                  <option value={3}>3 months</option>
                  <option value={6}>6 months</option>
                  <option value={12}>12 months</option>
                  <option value={24}>24 months</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Required Area (m²)</label>
              <input
                type="number"
                defaultValue={warehouse.area}
                className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm"
              />
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
                <span className="font-semibold">${warehouse.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Security Deposit ({depositPercentage}%)</span>
                <span className="font-semibold">${extendedData.deposit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Service Fee</span>
                <span className="font-semibold">$99.00</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-900">
                <span>Total to Book</span>
                <span className="text-primary">
                  ${(warehouse.price + extendedData.deposit + 99).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <Button
            className="group shadow-primary/30 text-blackshadow-xl h-14 w-full rounded-2xl text-lg font-bold"
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
