import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  ArrowUpRight,
  Clock,
  Package,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import subscriptionApi from '@/services/tenant/subscriptionApi'
import moment from 'moment'

const SubscriptionPage = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  
  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState(null)

  useEffect(() => {
    fetchActiveSubscription()
  }, [])

  const fetchActiveSubscription = async () => {
    setIsLoading(true)
    try {
      const res = await subscriptionApi.getMyActiveSubscription()
      setSubscription(res.data?.data)
    } catch (err) {
      console.error('Failed to load subscription:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole="TENANT" />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Subscription Details
                </h1>
                <p className="text-sm text-slate-500">
                  Manage your current plan and active subscription.
                </p>
              </div>
              <Button size="sm">Upgrade Plan</Button>
            </div>

            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : subscription ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Active Plan Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                          <Package className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Current Plan</p>
                          <h2 className="text-2xl font-bold text-slate-900">
                            {subscription.servicePackage?.name || 'Unknown Plan'}
                          </h2>
                        </div>
                      </div>
                    </div>
                    <Badge variant={subscription.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {subscription.status}
                    </Badge>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-500">Price</p>
                      <p className="font-bold text-slate-900">
                        {subscription.servicePackage?.price?.toLocaleString() || 0} VND
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Start Date</p>
                      <p className="font-bold text-slate-900">
                        {moment(subscription.startDate).format('MMM DD, YYYY')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">End Date</p>
                      <p className="font-bold text-slate-900">
                        {moment(subscription.endDate).format('MMM DD, YYYY')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Max Staff</p>
                      <p className="font-bold text-slate-900">
                        {subscription.servicePackage?.maxStaff === 0 ? 'Unlimited' : subscription.servicePackage?.maxStaff || '0'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="mb-4 font-bold text-slate-900">Plan Features</h3>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle className="h-5 w-5 text-success" /> Features: {subscription.servicePackage?.features || 'Basic'}
                      </li>
                      <li className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle className="h-5 w-5 text-success" /> Duration: {subscription.servicePackage?.durationDays || '0'} days
                      </li>
                    </ul>
                  </div>
                </motion.div>

                {/* Summary / Usage Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="mb-6 font-bold text-slate-900">Subscription Status</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                      <Clock className="h-6 w-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Days Remaining</p>
                      <p className="text-xl font-bold text-slate-900">
                        {Math.max(0, moment(subscription.endDate).diff(moment(), 'days'))} days
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-3">
                    <Button variant="outline" className="w-full justify-between">
                      Cancel Subscription
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <Wallet className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <h3 className="mb-2 text-lg font-bold text-slate-900">No Active Subscription</h3>
                <p className="mb-6 text-slate-500">
                  You currently do not have any active plan. Please upgrade to unlock all features.
                </p>
                <Button>View Pricing Plans</Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionPage
