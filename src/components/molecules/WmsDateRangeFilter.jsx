import { useState } from 'react'
import { CalendarDays, RotateCcw, Search } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
import { validateDateFilter } from '@/utils/wmsDateFilter'

const EMPTY_VALUE = { fromDate: '', toDate: '' }

const WmsDateRangeFilter = ({ value = EMPTY_VALUE, onApply, disabled = false, className = '' }) => {
  const { t } = useLanguage()
  const [draft, setDraft] = useState({
    fromDate: value.fromDate || '',
    toDate: value.toDate || '',
  })
  const [error, setError] = useState('')

  const handleApply = () => {
    const result = validateDateFilter(draft)
    if (!result.valid) {
      setError(t(result.message))
      return
    }

    setError('')
    onApply(result.value)
  }

  const handleClear = () => {
    setDraft(EMPTY_VALUE)
    setError('')
    onApply({ fromDate: undefined, toDate: undefined })
  }

  const hasDraftValue = Boolean(draft.fromDate || draft.toDate)

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            {t('Start Date')}
          </span>
          <input
            type="date"
            value={draft.fromDate}
            max={draft.toDate || undefined}
            disabled={disabled}
            onChange={(event) => {
              setDraft((current) => ({ ...current, fromDate: event.target.value }))
              setError('')
            }}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            {t('End Date')}
          </span>
          <input
            type="date"
            value={draft.toDate}
            min={draft.fromDate || undefined}
            disabled={disabled}
            onChange={(event) => {
              setDraft((current) => ({ ...current, toDate: event.target.value }))
              setError('')
            }}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </label>

        <button
          type="button"
          onClick={handleApply}
          disabled={disabled || !hasDraftValue}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Search className="h-3.5 w-3.5" />
          {t('Apply Filters')}
        </button>

        {(hasDraftValue || value.fromDate || value.toDate) && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('Clear filters')}
          </button>
        )}
      </div>

      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  )
}

export default WmsDateRangeFilter
