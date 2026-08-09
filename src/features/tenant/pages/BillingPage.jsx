import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  FileText,
  CreditCard,
  Clock,
  ChevronRight,
  AlertCircle,
  Package,
} from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import subscriptionApi from '../../../services/subscriptionApi'

const MOCK_TRANSACTIONS = [
  {
    id: 'INV-4421',
    desc: 'Monthly Rent - Industrial Park A',
    amount: '-$2,400.00',
    date: '2024-05-01',
    status: 'PAID',
  },
  {
    id: 'TX-1092',
    desc: 'Wallet Top-up',
    amount: '+$5,000.00',
    date: '2024-04-28',
    status: 'COMPLETED',
  },
  {
    id: 'INV-4402',
    desc: 'Extra Storage Service Fee',
    amount: '-$120.00',
    date: '2024-04-15',
    status: 'PAID',
  },
  {
    id: 'INV-4398',
    desc: 'Monthly Rent - Industrial Park A',
    amount: '-$2,400.00',
    date: '2024-04-01',
    status: 'PAID',
  },
]

const BillingPage = () => {
  const [activeSub, setActiveSub] = useState(null)
  const [isLoadingSub, setIsLoadingSub] = useState(true)

  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await subscriptionApi.getActiveSubscription()
        setActiveSub(res?.data?.data)
      } catch (err) {
        // user might not have a sub, ignore
      } finally {
        setIsLoadingSub(false)
      }
    }
    fetchSubscription()
  }, [])

  const columns = [
    {
      header: 'Description',
      render: (row) => (
        <div className="flex items-center gap-3 py-1">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${row.amount.startsWith('+') ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'}`}
          >
            {row.amount.startsWith('+') ? <ArrowDownRight size={16} /> : <FileText size={16} />}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">{row.desc}</span>
            <span className="text-xs text-slate-500">{row.id}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Date',
      accessor: 'date',
    },
    {
      header: 'Amount',
      render: (row) => (
        <span
          className={`font-bold ${row.amount.startsWith('+') ? 'text-success' : 'text-slate-900'}`}
        >
          {row.amount}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={row.status === 'PAID' || row.status === 'COMPLETED' ? 'success' : 'warning'}
          size="sm"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      render: () => (
        <button className="hover:text-primary p-1 text-slate-400 transition-colors">
          <Download size={18} />
        </button>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button
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
          <main className="mx-auto w-full max-w-400 space-y-8 p-6 md:p-8">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Billing & Payments</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage your wallet, invoices, and payment history.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Wallet Balance Card */}
                <div className="lg:col-span-1">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-xl"
                  >
                    <div className="bg-primary/20 absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full blur-3xl" />
                    <div className="relative z-10">
                      <div className="mb-8 flex items-center justify-between">
                        <div className="text-primary flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                          <Wallet size={20} />
                        </div>
                        <Badge variant="primary" className="bg-primary/20 text-primary border-none">
                          Active Wallet
                        </Badge>
                      </div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                        Available Balance
                      </p>
                      <p className="mt-2 text-4xl font-bold">$2,480.50</p>

                      <div className="mt-8 flex gap-3">
                        <Button className="flex-1">
                          <Plus size={18} className="mr-2" /> Top Up
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-white/20 text-white hover:bg-white/10"
                        >
                          Settings
                        </Button>
                      </div>
                    </div>
                  </motion.div>

                  <div className="bg-primary/5 border-primary/20 mt-6 flex items-start gap-3 rounded-2xl border p-4">
                    <AlertCircle size={20} className="text-primary shrink-0" />
                    <p className="text-xs leading-relaxed text-slate-600">
                      Ensure your wallet has sufficient funds for automatic renewal of your
                      services.
                    </p>
                  </div>

                  {/* Current Subscription Card */}
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                      <Package size={18} className="text-primary" />
                      Current Subscription
                    </h3>

                    {isLoadingSub ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 w-1/2 rounded bg-slate-200"></div>
                        <div className="h-4 w-3/4 rounded bg-slate-200"></div>
                      </div>
                    ) : activeSub ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">
                            {activeSub.servicePackage?.name}
                          </span>
                          <Badge variant="success" size="sm">
                            {activeSub.status}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-xs text-slate-500">
                          <p className="flex justify-between">
                            <span>Valid from:</span>
                            <span className="font-medium text-slate-900">
                              {activeSub.startDate}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span>Valid to:</span>
                            <span className="font-medium text-slate-900">{activeSub.endDate}</span>
                          </p>
                          <p className="flex justify-between">
                            <span>Price:</span>
                            <span className="font-medium text-slate-900">
                              {Number(activeSub.servicePackage?.price || 0).toLocaleString('vi-VN')}{' '}
                              VNĐ / {activeSub.servicePackage?.durationMonths} tháng
                            </span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <p className="mb-4 text-sm text-slate-500">
                          Bạn chưa đăng ký gói dịch vụ nào.
                        </p>
                        <Button
                          onClick={() => (window.location.href = '/packages')}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Xem Bảng Giá
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment History / Invoices */}
                <div className="space-y-6 lg:col-span-2">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 p-6">
                      <h3 className="font-bold text-slate-900">Recent Transactions</h3>
                      <Button variant="outline" size="sm">
                        View All
                      </Button>
                    </div>
                    <div className="p-0">
                      <DataTable
                        columns={columns}
                        data={MOCK_TRANSACTIONS}
                        className="rounded-none border-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="group hover:border-primary flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="group-hover:text-primary flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-colors">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Payment Methods</p>
                          <p className="text-xs text-slate-500">Manage bank accounts & cards</p>
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        className="group-hover:text-primary text-slate-300 transition-colors"
                      />
                    </div>

                    <div className="group hover:border-primary flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="group-hover:text-primary flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-colors">
                          <Download size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Tax Reports</p>
                          <p className="text-xs text-slate-500">Download annual statements</p>
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        className="group-hover:text-primary text-slate-300 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default BillingPage
