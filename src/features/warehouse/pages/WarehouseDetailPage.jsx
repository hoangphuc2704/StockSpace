import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '@/components/atoms/Button'
import warehouseApi from '@/services/warehouse/warehouseApi'
import systemConfigApi from '@/services/systemConfigApi'
import tenantApi from '@/services/tenant/tenantApi'
import walletApi from '@/services/wallet/walletApi'
import { useSelector, useDispatch } from 'react-redux'
import { addBookedWarehouse } from '@/store/tenantBookingSlice'
import { toast } from 'react-hot-toast'

// Sub-components
import WarehouseHeader from '../components/WarehouseHeader'
import WarehouseGallery from '../components/WarehouseGallery'
import WarehouseInfo from '../components/WarehouseInfo'
import WarehouseBookingCard from '../components/WarehouseBookingCard'
import ConfirmDepositModal from '../components/ConfirmDepositModal'
import WarehouseLayoutShowcase from '../components/WarehouseLayoutShowcase'

const normalizeWarehouse = (warehouse) => ({
  id: warehouse.id,
  name: warehouse.name || 'Warehouse',
  location: warehouse.address || warehouse.location || 'Updating address',
  area: Number(warehouse.area ?? warehouse.capacity ?? 0),
  width: Number(warehouse.width ?? warehouse.warehouseWidth ?? 0),
  length: Number(warehouse.length ?? warehouse.warehouseLength ?? warehouse.height ?? 0),
  height: Number(warehouse.height ?? warehouse.warehouseHeight ?? 0),
  price: Number(warehouse.pricePerMonth ?? warehouse.price ?? 0),
  status: warehouse.status || 'UNKNOWN',
  rating: Number(warehouse.rating ?? 4.8),
  type: warehouse.warehouseType?.name || warehouse.typeName || warehouse.type || 'General',
  thumbnail: warehouse.coverImageUrl || warehouse.thumbnail || warehouse.imageUrls?.[0] || '',
  description: warehouse.description || '',
  isVerified: warehouse.isVerified ?? warehouse.verified ?? false,
  imageUrls: warehouse.imageUrls || [],
  ownerName: warehouse.ownerName || 'Warehouse Owner',
})

const createClientKey = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const ensureNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizePublicLayout = (payload = {}) => ({
  id: payload.id ?? null,
  width: Math.max(ensureNumber(payload.width, 100), 20),
  length: Math.max(ensureNumber(payload.length, 100), 20),
  height: Math.max(ensureNumber(payload.height, 100), 20),
  footprintCells: Array.isArray(payload.footprintCells) ? payload.footprintCells.map(String) : null,
  positions: Array.isArray(payload.positions) ? payload.positions.map(String) : [],
  racks: Array.isArray(payload.racks)
    ? payload.racks.map((rack) => ({
        clientKey: createClientKey('rack'),
        id: rack.id != null ? String(rack.id) : null,
        name: rack.name ?? 'Rack',
        code: rack.code != null ? String(rack.code) : '',
        coordinateX: ensureNumber(rack.coordinateX, 0),
        coordinateY: ensureNumber(rack.coordinateY, 0),
        positionZ: ensureNumber(rack.positionZ, 0),
        rotation: ensureNumber(rack.rotation, 0),
        width: Math.max(ensureNumber(rack.width, 18), 4),
        length: Math.max(ensureNumber(rack.length, 18), 4),
        height: Math.max(ensureNumber(rack.height, 18), 4),
        bins: Array.isArray(rack.bins)
          ? rack.bins.map((bin) => ({
              clientKey: createClientKey('bin'),
              id: bin.id != null ? String(bin.id) : null,
              name: bin.name ?? 'Bin',
              code: bin.code != null ? String(bin.code) : '',
              shelfLevel: Math.max(ensureNumber(bin.shelfLevel, 1), 1),
              coordinateX: ensureNumber(bin.coordinateX, 0),
              coordinateY: ensureNumber(bin.coordinateY, 0),
              positionZ: ensureNumber(bin.positionZ, 0),
              width: Math.max(ensureNumber(bin.width, 8), 4),
              length: Math.max(ensureNumber(bin.length, 8), 4),
              height: Math.max(ensureNumber(bin.height, 8), 4),
              maxWeight: ensureNumber(bin.maxWeight, 0),
              maxVolume: ensureNumber(bin.maxVolume, 0),
            }))
          : [],
      }))
    : [],
})

const buildGallery = (warehouse) => {
  return [
    ...new Set(
      [warehouse.thumbnail, ...(Array.isArray(warehouse.imageUrls) ? warehouse.imageUrls : [])]
        .filter((image) => typeof image === 'string' && image.trim())
        .map((image) => image.trim())
    ),
  ]
}

const WarehouseDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const bookedWarehouseIds = useSelector((state) => state.tenantBooking.bookedWarehouseIds)
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
  const [layout, setLayout] = useState(null)
  const [isLayoutLoading, setIsLayoutLoading] = useState(true)
  const [layoutUnavailable, setLayoutUnavailable] = useState(false)

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

    const fetchLayout = async () => {
      try {
        setIsLayoutLoading(true)
        setLayoutUnavailable(false)
        const response = await warehouseApi.getPublicWarehouseLayout(id)
        const payload = response?.data?.data || response?.data
        setLayout(normalizePublicLayout(payload || {}))
      } catch {
        setLayout(null)
        setLayoutUnavailable(true)
      } finally {
        setIsLayoutLoading(false)
      }
    }

    fetchWarehouse()
    fetchLayout()

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
  }, [gallery, warehouse, depositPercentage])

  const handleDepositClick = async () => {
    setIsCheckingWallet(true)
    try {
      const res = await walletApi.getWallet()
      const balance = res?.data?.data?.balance ?? res?.data?.balance ?? 0
      setWalletBalance(balance)
      setShowConfirmModal(true)
    } catch {
      toast.error('Failed to check wallet balance')
    } finally {
      setIsCheckingWallet(false)
    }
  }

  const handleConfirmDeposit = async () => {
    try {
      setIsBooking(true)
      await tenantApi.createBooking({
        warehouseId: warehouse.id,
        depositAmount: extendedData.deposit,
      })
      dispatch(addBookedWarehouse(warehouse.id))
      toast.success('Booking request sent successfully! Deposit deducted from wallet.')
      setShowConfirmModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send booking request')
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
          <p className="mb-6 text-slate-500">
            {error || 'This warehouse is unavailable right now.'}
          </p>
          <Button onClick={() => navigate('/warehouses')}>Back to Listings</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="pt-10 pb-20">
        <div className="sticky top-0 z-10 container mx-auto bg-white px-4 shadow-sm">
          <WarehouseHeader
            warehouseName={warehouse.name}
            isBookmarked={isBookmarked}
            onBookmarkToggle={() => setIsBookmarked(!isBookmarked)}
            compact
          />
        </div>

        <div className="container mx-auto px-4 pt-10">
          <WarehouseGallery images={extendedData.images} />

          <WarehouseLayoutShowcase
            layout={layout}
            warehouse={warehouse}
            isLoading={isLayoutLoading}
            isFallback={layoutUnavailable}
          />

          <div className="flex flex-col gap-12 lg:flex-row">
            <WarehouseInfo warehouse={warehouse} extendedData={extendedData} />

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
