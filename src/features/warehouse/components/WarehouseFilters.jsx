import { Check, ChevronDown, Filter, MapPin, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { formatAmountInput, parseAmountInput } from '@/utils/currency'

const EMPTY_FILTERS = {
  minRentalPrice: '',
  maxRentalPrice: '',
  minCapacity: '',
  maxCapacity: '',
  districtName: '',
  rentalPricingType: '',
  isVerified: '',
}

const PRICE_RANGE_MAX = 100_000_000
const AREA_RANGE_MAX = 100_000
const inputClass =
  'min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100'

const DISTRICT_OPTIONS = [
  ['Quận 1', 'District 1'],
  ['Quận 2', 'District 2'],
  ['Quận 3', 'District 3'],
  ['Quận 4', 'District 4'],
  ['Quận 5', 'District 5'],
  ['Quận 6', 'District 6'],
  ['Quận 7', 'District 7'],
  ['Quận 8', 'District 8'],
  ['Quận 9', 'District 9'],
  ['Quận 10', 'District 10'],
  ['Quận 11', 'District 11'],
  ['Quận 12', 'District 12'],
  ['Thành phố Thủ Đức', 'Thu Duc City'],
  ['Bình Tân', 'Binh Tan'],
  ['Bình Thạnh', 'Binh Thanh'],
  ['Gò Vấp', 'Go Vap'],
  ['Phú Nhuận', 'Phu Nhuan'],
  ['Tân Bình', 'Tan Binh'],
  ['Tân Phú', 'Tan Phu'],
  ['Hóc Môn', 'Hoc Mon'],
  ['Củ Chi', 'Cu Chi'],
  ['Bình Chánh', 'Binh Chanh'],
  ['Nhà Bè', 'Nha Be'],
  ['Cần Giờ', 'Can Gio'],
]

const toSliderValue = (value, maximum) => {
  const parsed = Number(parseAmountInput(value) || 0)
  return Math.min(maximum, Math.max(0, Number.isFinite(parsed) ? parsed : 0))
}

const formatSliderValue = (value, unit = '') => {
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M${unit}`
  if (value >= 1_000) return `${Math.round(value / 1_000)}k${unit}`
  return `${value.toLocaleString('en-US')}${unit}`
}

const ToolbarButton = ({ active, icon, label, summary, onClick, panel, wide = false, align = 'left' }) => (
  <div className="relative">
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${active ? 'border-blue-200 bg-blue-50 text-blue-800 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/60'}`}
    >
      {icon}
      <span>{label}</span>
      {summary && <span className="hidden max-w-28 truncate text-xs font-medium text-slate-400 sm:inline">{summary}</span>}
      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${active ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true" />
    </button>
    {active && panel && (
      <div
        className={`absolute top-full z-50 mt-2 w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:p-4 ${align === 'right' ? 'right-0' : 'left-0'} ${wide ? 'max-w-3xl' : 'max-w-md'}`}
      >
        {panel}
      </div>
    )}
  </div>
)

const RangeFilterPanel = ({
  title,
  minName,
  maxName,
  minValue,
  maxValue,
  maximum,
  step,
  unit = '',
  amount = false,
  onSliderChange,
  onInputChange,
}) => {
  const min = toSliderValue(minValue, maximum)
  const max = maxValue ? toSliderValue(maxValue, maximum) : maximum
  const displayMax = maxValue ? formatSliderValue(max, unit) : 'Any'

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">Use the slider or enter an exact value.</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          {unit || 'VND'}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex justify-between text-[11px] font-bold text-blue-700">
          <span>From {formatSliderValue(min, unit)}</span>
          <span>To {displayMax}</span>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            type="range"
            min="0"
            max={maximum}
            step={step}
            value={min}
            onChange={(event) => onSliderChange(minName, event.target.value, amount)}
            aria-label={`${title} minimum`}
            className="h-1.5 w-full cursor-pointer accent-blue-700"
          />
          <input
            type="range"
            min="0"
            max={maximum}
            step={step}
            value={max}
            onChange={(event) => onSliderChange(maxName, event.target.value, amount)}
            aria-label={`${title} maximum`}
            className="h-1.5 w-full cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold tracking-wide text-slate-500 uppercase">
            Minimum
          </span>
          <input
            type={amount ? 'text' : 'number'}
            inputMode={amount ? 'numeric' : undefined}
            min="0"
            name={minName}
            value={minValue}
            onChange={onInputChange}
            placeholder="0"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold tracking-wide text-slate-500 uppercase">
            Maximum
          </span>
          <input
            type={amount ? 'text' : 'number'}
            inputMode={amount ? 'numeric' : undefined}
            min="0"
            name={maxName}
            value={maxValue}
            onChange={onInputChange}
            placeholder="Any"
            className={inputClass}
          />
        </label>
      </div>
    </div>
  )
}

const LocationPanel = ({ filters, onInputChange }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-blue-600" aria-hidden="true" />
      <div>
        <h3 className="text-sm font-bold text-slate-900">Location</h3>
        <p className="mt-0.5 text-xs text-slate-500">Choose a district to narrow the results.</p>
      </div>
    </div>
    <label className="mt-4 block">
      <span className="mb-1 block text-[11px] font-bold tracking-wide text-slate-500 uppercase">
        District
      </span>
      <select
        name="districtName"
        value={filters.districtName}
        onChange={onInputChange}
        className={inputClass}
      >
        <option value="">All districts</option>
        {DISTRICT_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  </div>
)

const PricingPanel = ({ filters, onInputChange }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
    <h3 className="text-sm font-bold text-slate-900">Pricing model</h3>
    <p className="mt-0.5 text-xs text-slate-500">Choose how the rental price is calculated.</p>
    <select
      name="rentalPricingType"
      value={filters.rentalPricingType}
      onChange={onInputChange}
      className={`${inputClass} mt-4`}
    >
      <option value="">All pricing models</option>
      <option value="FIXED_MONTHLY">Fixed monthly</option>
      <option value="PER_SQUARE_METER_MONTHLY">Per m² / month</option>
      <option value="NEGOTIATED">Negotiated</option>
    </select>
  </div>
)

const WarehouseFilters = ({ value = EMPTY_FILTERS, onFilterChange }) => {
  const [activePanel, setActivePanel] = useState(null)
  const filters = { ...EMPTY_FILTERS, ...value }

  const updateFilter = (name, nextValue) => {
    onFilterChange({ ...filters, [name]: nextValue })
  }

  const handleInputChange = (event) => {
    const { name, value: nextValue } = event.target
    updateFilter(
      name,
      name === 'minRentalPrice' || name === 'maxRentalPrice'
        ? formatAmountInput(nextValue)
        : nextValue
    )
  }

  const handleSliderChange = (name, nextValue, amount = false) => {
    updateFilter(name, amount ? formatAmountInput(nextValue) : String(nextValue))
  }

  const togglePanel = (panel) => {
    setActivePanel((current) => (current === panel ? null : panel))
  }

  const handleClear = () => {
    onFilterChange({ ...EMPTY_FILTERS })
    setActivePanel(null)
  }

  const priceSummary = filters.minRentalPrice || filters.maxRentalPrice
    ? `${filters.minRentalPrice || '0'} – ${filters.maxRentalPrice || 'Any'}`
    : ''
  const areaSummary = filters.minCapacity || filters.maxCapacity
    ? `${filters.minCapacity || '0'} – ${filters.maxCapacity || 'Any'} m²`
    : ''
  const locationSummary = filters.districtName
    ? DISTRICT_OPTIONS.find(([value]) => value === filters.districtName)?.[1] || filters.districtName
    : ''
  const pricingSummary = {
    FIXED_MONTHLY: 'Fixed monthly',
    PER_SQUARE_METER_MONTHLY: 'Per m² / month',
    NEGOTIATED: 'Negotiated',
  }[filters.rentalPricingType]

  const renderPanel = () => {
    if (activePanel === 'price') {
      return (
        <RangeFilterPanel
          title="Rental price"
          minName="minRentalPrice"
          maxName="maxRentalPrice"
          minValue={filters.minRentalPrice}
          maxValue={filters.maxRentalPrice}
          maximum={PRICE_RANGE_MAX}
          step="100000"
          amount
          onSliderChange={handleSliderChange}
          onInputChange={handleInputChange}
        />
      )
    }
    if (activePanel === 'area') {
      return (
        <RangeFilterPanel
          title="Warehouse area"
          minName="minCapacity"
          maxName="maxCapacity"
          minValue={filters.minCapacity}
          maxValue={filters.maxCapacity}
          maximum={AREA_RANGE_MAX}
          step="100"
          unit=" m²"
          onSliderChange={handleSliderChange}
          onInputChange={handleInputChange}
        />
      )
    }
    if (activePanel === 'location') {
      return <LocationPanel filters={filters} onInputChange={handleInputChange} />
    }
    if (activePanel === 'pricing') {
      return <PricingPanel filters={filters} onInputChange={handleInputChange} />
    }
    return (
      <div className="grid gap-3 xl:grid-cols-2">
        <RangeFilterPanel
          title="Rental price"
          minName="minRentalPrice"
          maxName="maxRentalPrice"
          minValue={filters.minRentalPrice}
          maxValue={filters.maxRentalPrice}
          maximum={PRICE_RANGE_MAX}
          step="100000"
          amount
          onSliderChange={handleSliderChange}
          onInputChange={handleInputChange}
        />
        <RangeFilterPanel
          title="Warehouse area"
          minName="minCapacity"
          maxName="maxCapacity"
          minValue={filters.minCapacity}
          maxValue={filters.maxCapacity}
          maximum={AREA_RANGE_MAX}
          step="100"
          unit=" m²"
          onSliderChange={handleSliderChange}
          onInputChange={handleInputChange}
        />
        <LocationPanel filters={filters} onInputChange={handleInputChange} />
        <PricingPanel filters={filters} onInputChange={handleInputChange} />
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton
          active={activePanel === 'all'}
          icon={<Filter className="h-4 w-4" aria-hidden="true" />}
          label="Filters"
          onClick={() => togglePanel('all')}
          panel={activePanel === 'all' ? renderPanel() : null}
          wide
        />

        <button
          type="button"
          aria-pressed={filters.isVerified === 'true'}
          onClick={() => updateFilter('isVerified', filters.isVerified === 'true' ? '' : 'true')}
          className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none ${filters.isVerified === 'true' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/60'}`}
        >
          <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${filters.isVerified === 'true' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-slate-100 text-transparent'}`}>
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          Verified only
        </button>

        <ToolbarButton
          active={activePanel === 'pricing'}
          icon={<span className="text-sm font-bold">%</span>}
          label="Pricing model"
          summary={pricingSummary}
          onClick={() => togglePanel('pricing')}
          panel={activePanel === 'pricing' ? renderPanel() : null}
        />
        <ToolbarButton
          active={activePanel === 'price'}
          icon={<span className="text-sm font-bold">₫</span>}
          label="Rental price"
          summary={priceSummary}
          onClick={() => togglePanel('price')}
          panel={activePanel === 'price' ? renderPanel() : null}
        />
        <ToolbarButton
          active={activePanel === 'area'}
          icon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
          label="Area"
          summary={areaSummary}
          onClick={() => togglePanel('area')}
          panel={activePanel === 'area' ? renderPanel() : null}
        />
        <ToolbarButton
          active={activePanel === 'location'}
          icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
          label="Location"
          summary={locationSummary}
          onClick={() => togglePanel('location')}
          panel={activePanel === 'location' ? renderPanel() : null}
          align="right"
        />

        {Object.values(filters).some(Boolean) && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-auto min-h-10 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Clear all
          </button>
        )}
      </div>

    </div>
  )
}

export default WarehouseFilters
