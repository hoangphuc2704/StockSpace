import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '@/components/atoms/Button'
import warehouseApi from '@/services/warehouse/warehouseApi'
import systemConfigApi from '@/services/systemConfigApi'
import tenantApi from '@/services/tenant/tenantApi'
import walletApi from '@/services/wallet/walletApi'
import { useSelector, useDispatch } from 'react-redux'
import { addBookedWarehouse } from '@/store/tenantBookingSlice'

// Sub-components
import WarehouseHeader from '../components/WarehouseHeader'
import WarehouseGallery from '../components/WarehouseGallery'
import WarehouseInfo from '../components/WarehouseInfo'
import WarehouseBookingCard from '../components/WarehouseBookingCard'
import ConfirmDepositModal from '../components/ConfirmDepositModal'

const normalizeWarehouse = (warehouse) => ({
  id: warehouse.id,
  name: warehouse.name || 'Warehouse',
  location: warehouse.address || warehouse.location || 'Updating address',
  area: Number(warehouse.area ?? warehouse.capacity ?? 0),
  price: Number(warehouse.pricePerMonth ?? warehouse.price ?? 0),
  status: warehouse.status || 'UNKNOWN',
  rating: Number(warehouse.rating ?? 4.8),
  type: warehouse.warehouseType?.name || warehouse.typeName || warehouse.type || 'General',
  thumbnail: warehouse.coverImageUrl || warehouse.thumbnail || warehouse.imageUrls?.[0] || '',
  description: warehouse.description || 'Warehouse information is being updated.',
  isVerified: warehouse.isVerified ?? warehouse.verified ?? false,
  imageUrls: warehouse.imageUrls || [],
  ownerName: warehouse.ownerName || 'Warehouse Owner',
})

const buildGallery = (warehouse) => {
  const images = [
    warehouse.thumbnail,
    ...(Array.isArray(warehouse.imageUrls) ? warehouse.imageUrls : []),
  ].filter(Boolean)

  if (images.length === 0) {
    return [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1493946740644-2d8a1f1a6afd?auto=format&fit=crop&q=80&w=600',
    ]
  }

  while (images.length < 5) {
    images.push(images[images.length - 1])
  }

  return images.slice(0, 5)
}

const WarehouseDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const bookedWarehouseIds = useSelector(state => state.tenantBooking.bookedWarehouseIds)
  const hasBooked = bookedWarehouseIds.includes(id)
  
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [warehouse, setWarehouse] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [depositPercentage, setDepositPercentage] = useState(10)
  const [durationMonths, setDurationMonths] = useState(3)
  const [isBooking, setIsBooking] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [isCheckingWallet, setIsCheckingWallet] = useState(false)

  useEffect(() => {
    const fetchWarehouse = async () => {
      try {
        setIsLoading(true)
        setError('')

        const response = await warehouseApi.getPublicWarehouseById(id)
        const payload = response?.data?.data || response?.data
        const normalized = normalizeWarehouse(payload || {})

        if (!normalized.id) {
          setWarehouse(null)
          setError('Warehouse not found.')
          return
        }

        setWarehouse(normalized)
      } catch (err) {
        setWarehouse(null)
        setError(err.response?.data?.message || err.message || 'Unable to load warehouse.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchWarehouse()

    const fetchConfig = async () => {
      const percentage = await systemConfigApi.getDepositPercentage()
      setDepositPercentage(percentage)
    }
    fetchConfig()
  }, [id])

  const gallery = useMemo(() => buildGallery(warehouse || {}), [warehouse])

  const extendedData = useMemo(() => {
    if (!warehouse) return null

    return {
      deposit: (warehouse.price * depositPercentage) / 100,
      images: gallery,
      features: [
        `${warehouse.type} storage`,
        'Admin-approved listing',
        'Flexible warehouse operations',
        '24/7 monitoring support',
        'Loading and inbound handling',
        'Business-ready storage space',
      ],
      owner: {
        name: warehouse.ownerName,
        company: 'StockSpace Partner',
        rating: warehouse.rating,
        since: '2024',
        verified: warehouse.isVerified,
      },
      reviews: Math.max(12, Math.round(warehouse.rating * 20)),
    }
  }, [gallery, warehouse, depositPercentage, durationMonths])

  const handleDepositClick = async () => {
    setIsCheckingWallet(true)
    try {
      const res = await walletApi.getWallet()
      const balance = res?.data?.data?.balance ?? res?.data?.balance ?? 0
      setWalletBalance(balance)
      setShowConfirmModal(true)
    } catch (err) {
      alert('Failed to check wallet balance')
    } finally {
      setIsCheckingWallet(false)
    }
  }

  const handleConfirmDeposit = async () => {
    try {
      setIsBooking(true)
      await tenantApi.createBooking({
        warehouseId: warehouse.id,
        depositAmount: extendedData.deposit
      })
      dispatch(addBookedWarehouse(warehouse.id))
      alert('Booking request sent successfully! Deposit deducted from wallet.')
      setShowConfirmModal(false)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send booking request')
    } finally {
      setIsBooking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">Loading warehouse...</h2>
          <p className="text-slate-500">Please wait while we fetch the approved listing.</p>
        </div>
      </div>
    )
  }

  if (!warehouse || !extendedData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold">Warehouse not found</h2>
          <p className="mb-6 text-slate-500">{error || 'This warehouse is unavailable right now.'}</p>
          <Button onClick={() => navigate('/warehouses')}>Back to Listings</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="pb-20 pt-24">
        <div className="container mx-auto px-4">
          <WarehouseHeader 
            warehouseName={warehouse.name}
            isBookmarked={isBookmarked}
            onBookmarkToggle={() => setIsBookmarked(!isBookmarked)}
          />

          <WarehouseGallery images={extendedData.images} />

          <div className="flex flex-col gap-12 lg:flex-row">
            <WarehouseInfo 
              warehouse={warehouse} 
              extendedData={extendedData} 
            />

            <WarehouseBookingCard 
              warehouse={warehouse}
              extendedData={extendedData}
              durationMonths={durationMonths}
              onDurationChange={setDurationMonths}
              depositPercentage={depositPercentage}
              hasBooked={hasBooked}
              isCheckingWallet={isCheckingWallet}
              onDepositClick={handleDepositClick}
            />
          </div>
        </div>
      </main>

      <ConfirmDepositModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        walletBalance={walletBalance}
        depositAmount={extendedData.deposit}
        depositPercentage={depositPercentage}
        isBooking={isBooking}
        onConfirm={handleConfirmDeposit}
      />
    </div>
  )
}

export default WarehouseDetailPage
