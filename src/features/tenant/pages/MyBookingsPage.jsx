import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import { motion } from 'framer-motion'
import {
  Warehouse,
  MapPin,
  Calendar,
  ArrowRight,
  Package,
  ExternalLink,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { Link } from 'react-router-dom'
import tenantApi from '@/services/tenant/tenantApi'
import { toast } from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'

const MyBookingsPage = () => {
  const confirmDialog = useConfirmDialog()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [isCanceling, setIsCanceling] = useState(null)

  const fetchBookings = async () => {
    try {
      setIsLoading(true)
      setError('')
      const res = await tenantApi.getMyBookings({ page, size: 10 })
      setBookings(res.data?.data?.content || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch bookings')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [page])

  const handleCancelBooking = async (bookingId) => {
    const confirmed = await confirmDialog({
      title: 'Cancel booking',
      message: 'Are you sure you want to cancel this booking?',
      confirmText: 'Cancel booking',
      danger: true,
    })
    if (!confirmed) return

    try {
      setIsCanceling(bookingId)
      await tenantApi.cancelBooking(bookingId)
      toast.success('Booking canceled successfully')
      fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking')
    } finally {
      setIsCanceling(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />

      {/* MOBILE OVERLAY */}
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
          <main className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage your active rentals and track pending requests.
                </p>
              </div>
              <Link to="/warehouses">
                <Button>
                  Browse New Warehouses <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
                {error}
              </div>
            )}

            {/* Grid of Bookings */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {isLoading ? (
                <p className="text-slate-500">Loading bookings...</p>
              ) : bookings.length === 0 ? (
                <p className="text-slate-500 lg:col-span-2">You don't have any bookings yet.</p>
              ) : (
                bookings.map((booking, idx) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md"
                  >
                    <div className="flex-1 space-y-4 p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {booking.warehouseName}
                          </h3>
                          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                            <MapPin size={14} /> {booking.warehouseAddress || 'No address provided'}
                          </p>
                        </div>
                        <Badge
                          variant={
                            booking.status === 'ACTIVE'
                              ? 'success'
                              : booking.status === 'PENDING'
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {booking.status}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                            Created At
                          </p>
                          <p className="flex items-center gap-2 text-slate-700">
                            <Calendar size={14} className="text-slate-400" />
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                            Deposit Amount
                          </p>
                          <p className="text-primary text-lg font-bold">
                            ${booking.depositAmount?.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 text-sm">
                        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                          Owner
                        </p>
                        <p className="font-medium text-slate-700">{booking.ownerName}</p>
                      </div>

                      {booking.status === 'REJECTED' && (booking.reason || booking.rejectReason || booking.rejectionReason) && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 shadow-sm">
                          <div className="flex items-center gap-1.5 font-bold text-red-600 mb-1">
                            <XCircle className="h-4 w-4" />
                            <span>Lý do từ chối:</span>
                          </div>
                          <div className="pl-5.5 font-medium whitespace-pre-wrap">
                            {booking.reason || booking.rejectReason || booking.rejectionReason}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        {booking.status === 'PENDING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={isCanceling === booking.id}
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            <XCircle size={16} className="mr-2" />
                            {isCanceling === booking.id ? 'Canceling...' : 'Cancel Request'}
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/warehouses/${booking.warehouseId}`}>
                          <Button variant="outline" size="sm" className="h-9">
                            <ExternalLink size={16} className="mr-2" /> View Warehouse
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}

              {/* Add New Call to Action */}
              <div className="group hover:border-primary/40 hover:bg-primary/5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center transition-all">
                <div className="group-hover:text-primary group-hover:bg-primary/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all">
                  <Warehouse size={32} />
                </div>
                <h3 className="font-bold text-slate-900">Need more space?</h3>
                <p className="mt-2 mb-6 text-sm text-slate-500">
                  Find and book your next warehouse in minutes.
                </p>
                <Link to="/warehouses">
                  <Button
                    variant="outline"
                    className="group-hover:bg-primary transition-all group-hover:text-white"
                  >
                    Start Searching
                  </Button>
                </Link>
              </div>
            </div>

            {/* Helpful Banner */}
            <div className="relative mt-8 flex flex-col items-center gap-6 overflow-hidden rounded-2xl bg-slate-900 p-8 text-white md:flex-row">
              <div className="bg-primary/20 absolute top-0 right-0 -mt-32 -mr-32 h-64 w-64 rounded-full blur-3xl" />
              <div className="text-primary flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <ShieldCheck size={32} />
              </div>
              <div className="z-10 flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold">Secure Rental Protection</h3>
                <p className="mt-1 max-w-lg text-slate-400">
                  All StockSpace bookings are protected by our rental guarantee. We handle the
                  contracts and security deposits so you can focus on your business.
                </p>
              </div>
              <Button
                variant="outline"
                className="z-10 border-white/20 text-white hover:bg-white hover:text-slate-900"
              >
                View Legal Terms
              </Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default MyBookingsPage
