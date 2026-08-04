import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import { motion } from 'framer-motion'
import { 
  Warehouse, MapPin, Calendar, 
  ArrowRight, Package, 
  ExternalLink, ShieldCheck, XCircle
} from 'lucide-react'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { Link } from 'react-router-dom'
import tenantApi from '@/services/tenant/tenantApi'

const MyBookingsPage = () => {
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
    if (!window.confirm('Are you sure you want to cancel this booking?')) return
    
    try {
      setIsCanceling(bookingId)
      await tenantApi.cancelBooking(bookingId)
      alert('Booking canceled successfully')
      fetchBookings()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking')
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your active rentals and track pending requests.</p>
        </div>
        <Link to="/warehouses">
          <Button>
            Browse New Warehouses <ArrowRight size={18} className="ml-2" />
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {/* Grid of Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
            >
              <div className="p-6 flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{booking.warehouseName}</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                      <MapPin size={14} /> {booking.warehouseAddress || 'No address provided'}
                    </p>
                  </div>
                  <Badge variant={booking.status === 'ACTIVE' ? 'success' : booking.status === 'PENDING' ? 'warning' : 'danger'}>
                    {booking.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Created At</p>
                    <p className="text-slate-700 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Deposit Amount</p>
                    <p className="text-primary font-bold text-lg">${booking.depositAmount?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="text-sm mt-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Owner</p>
                  <p className="text-slate-700 font-medium">{booking.ownerName}</p>
                </div>

                {booking.rejectReason && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mt-2 border border-red-100">
                    <span className="font-semibold">Reject Reason:</span> {booking.rejectReason}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                  {booking.status === 'PENDING' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
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
        <div className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center group hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
           <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-all mb-4">
             <Warehouse size={32} />
           </div>
           <h3 className="font-bold text-slate-900">Need more space?</h3>
           <p className="text-sm text-slate-500 mt-2 mb-6">Find and book your next warehouse in minutes.</p>
           <Link to="/warehouses">
             <Button variant="outline" className="group-hover:bg-primary group-hover:text-white transition-all">
               Start Searching
             </Button>
           </Link>
        </div>
      </div>

      {/* Helpful Banner */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center gap-6 relative overflow-hidden mt-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center text-primary shrink-0">
          <ShieldCheck size={32} />
        </div>
        <div className="flex-1 text-center md:text-left z-10">
          <h3 className="text-xl font-bold">Secure Rental Protection</h3>
          <p className="text-slate-400 mt-1 max-w-lg">
            All StockSpace bookings are protected by our rental guarantee. 
            We handle the contracts and security deposits so you can focus on your business.
          </p>
        </div>
        <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-slate-900 z-10">
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
