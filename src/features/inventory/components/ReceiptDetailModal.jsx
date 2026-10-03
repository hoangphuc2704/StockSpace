import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Hash,
  Loader2,
  Map as MapIcon,
  MapPin,
  Package,
  RefreshCw,
  UserRound,
  UserRoundCheck,
  Warehouse,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Badge from '@/components/atoms/Badge'
import Modal from '@/components/organisms/Modal'
import stockApi from '@/services/wms/stockApi'
import { useLanguage } from '@/i18n/LanguageContext'

const EMPTY_VALUE = '—'

const STATUS_META = {
  PENDING: { label: 'Pending Approval', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  IN_PROGRESS: { label: 'In progress', variant: 'primary' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
}

const APPLIED_RECEIPT_STATUSES = new Set(['APPROVED', 'IN_PROGRESS', 'COMPLETED'])

const formatDateTime = (value, language, dateOnly = false) => {
  if (!value) return EMPTY_VALUE

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE

  return date.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US',
    dateOnly
      ? { year: 'numeric', month: '2-digit', day: '2-digit' }
      : { dateStyle: 'medium', timeStyle: 'short' }
  )
}

const formatQuantity = (value, language) =>
  Number(value || 0).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')

const shortId = (value) => {
  if (!value) return EMPTY_VALUE
  const text = String(value)
  return text.length > 14 ? `${text.slice(0, 8)}…${text.slice(-4)}` : text
}

const formatPickingStrategy = (strategy) => {
  if (!strategy) return EMPTY_VALUE

  const knownLabels = {
    FIFO_SERPENTINE_XY_V1: 'FIFO',
    MANUAL_LOCATION_FIFO_V1: 'Manual location + FIFO',
  }
  return knownLabels[strategy] || String(strategy).replace(/_/g, ' ')
}

const DetailTile = ({ icon: Icon, label, value, valueClassName = 'text-slate-900' }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
    <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      {label}
    </p>
    <p className={`mt-1.5 break-words text-sm font-semibold ${valueClassName}`}>{value || EMPTY_VALUE}</p>
  </div>
)

const getStops = (receipt, batchDates) => {
  if (Array.isArray(receipt?.pickList?.stops) && receipt.pickList.stops.length > 0) {
    return receipt.pickList.stops
  }

  const stopsByLocation = new Map()
  ;(receipt?.items || []).forEach((item) => {
    const locationKey = item.binId || `${item.rackId || item.rackName || 'unknown'}:${item.binName || 'unknown'}`
    if (!stopsByLocation.has(locationKey)) {
      const sequence = item.pickSequence == null ? null : Number(item.pickSequence)
      stopsByLocation.set(locationKey, {
        // Do not invent a picking sequence when the backend does not provide one.
        sequence: Number.isFinite(sequence) && sequence > 0 ? sequence : null,
        rackCode: item.rackCode || item.rackName || EMPTY_VALUE,
        binCode: item.binCode || item.binName || EMPTY_VALUE,
        shelfLevel: item.shelfLevel,
        lines: [],
      })
    }

    stopsByLocation.get(locationKey).lines.push({
      stockBatchId: item.stockBatchId,
      skuCode: item.skuCode,
      skuName: item.skuName,
      arrivalDate: item.arrivalDate || batchDates[item.stockBatchId],
      quantity: item.quantity,
      note: item.note,
    })
  })

  return [...stopsByLocation.values()].sort((first, second) => {
    const firstSequence = Number(first.sequence)
    const secondSequence = Number(second.sequence)
    const firstHasSequence = Number.isFinite(firstSequence)
    const secondHasSequence = Number.isFinite(secondSequence)

    if (!firstHasSequence && !secondHasSequence) return 0
    if (!firstHasSequence) return 1
    if (!secondHasSequence) return -1
    return firstSequence - secondSequence
  })
}

const ReceiptDetailModal = ({ isOpen, onClose, receipt, isLoading, type }) => {
  const { language, t } = useLanguage()
  const [batchDates, setBatchDates] = useState({})
  const [stockSnapshot, setStockSnapshot] = useState([])
  const isOutbound = type === 'OUTBOUND'
  const statusKey = String(receipt?.status || '').toUpperCase()
  const movementApplied = APPLIED_RECEIPT_STATUSES.has(statusKey)

  useEffect(() => {
    let active = true

    if (isOpen && receipt?.warehouseId && receipt?.items?.length) {
      const fetchDates = async () => {
        try {
          const allStock = await stockApi.getAllStock(receipt.warehouseId)
          if (!active) return

          setStockSnapshot(allStock)
          const dates = {}
          allStock.forEach((batch) => {
            if (batch.id && batch.arrivalDate) dates[batch.id] = batch.arrivalDate
          })
          setBatchDates(dates)
        } catch (error) {
          console.error('Failed to fetch batch dates', error)
        }
      }

      fetchDates()
    } else {
      setStockSnapshot([])
    }

    return () => {
      active = false
      setBatchDates({})
      setStockSnapshot([])
    }
  }, [isOpen, receipt?.id, receipt?.warehouseId, receipt?.items?.length])

  const items = Array.isArray(receipt?.items) ? receipt.items : []
  const stops = useMemo(
    () => (isOutbound ? getStops(receipt, batchDates) : []),
    [isOutbound, receipt, batchDates]
  )
  const statusMeta = STATUS_META[statusKey] || { label: receipt?.status || 'Unknown', variant: 'outline' }
  const pickingStrategy = formatPickingStrategy(receipt?.pickList?.strategy)
  const stockByBatchId = useMemo(
    () => new Map(stockSnapshot.map((batch) => [String(batch.id), batch])),
    [stockSnapshot]
  )
  const getCurrentBatchQuantity = (batchId) => {
    if (!movementApplied || !batchId) return null
    const batch = stockByBatchId.get(String(batchId))
    if (!batch || batch.quantityMasked === true) return null
    const quantity = Number(batch.quantity)
    return Number.isFinite(quantity) ? quantity : null
  }
  const affectedCurrentQuantity = useMemo(() => {
    if (!movementApplied) return null

    const batchIds = [...new Set(items.map((item) => item.stockBatchId).filter(Boolean).map(String))]
    if (batchIds.length === 0) return null

    const quantities = batchIds.map((batchId) => getCurrentBatchQuantity(batchId))
    if (quantities.some((quantity) => quantity == null)) return null
    return quantities.reduce((total, quantity) => total + quantity, 0)
  }, [items, movementApplied, stockByBatchId])
  const totalQuantity = items.length > 0
    ? items.reduce((total, item) => total + (Number(item.quantity) || 0), 0)
    : stops.flatMap((stop) => stop.lines || []).reduce((total, line) => total + (Number(line.quantity) || 0), 0)
  const totalSkuCount = new Set(items.map((item) => item.skuId || item.skuCode).filter(Boolean)).size
  const totalStopsQuantity = stops.reduce(
    (total, stop) => total + (stop.lines || []).reduce((subtotal, line) => subtotal + (Number(line.quantity) || 0), 0),
    0
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isOutbound ? t('Outbound Receipt Details') : t('Inbound Receipt Details')}
      className="max-h-[92vh] max-w-5xl overflow-y-auto"
    >
      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : receipt ? (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isOutbound ? 'bg-orange-500/20 text-orange-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {isOutbound ? <ArrowUpFromLine className="h-5 w-5" /> : <ArrowDownToLine className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                    {isOutbound ? t('OUTBOUND') : t('INBOUND')}
                  </p>
                  <h3 className="mt-1 truncate text-xl font-bold">
                    {receipt.id ? `#${String(receipt.id).slice(0, 8).toUpperCase()}` : t('Receipt details')}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                    <Warehouse className="h-3.5 w-3.5" />
                    {receipt.warehouseName || EMPTY_VALUE}
                  </p>
                </div>
              </div>
              <Badge variant={statusMeta.variant} className="self-start border-white/20 bg-white/10 text-white">
                {t(statusMeta.label)}
              </Badge>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-400">{t('Total Qty')}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{formatQuantity(totalQuantity, language)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t('Product lines')}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{items.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t('Unique SKUs')}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{totalSkuCount || EMPTY_VALUE}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{isOutbound ? t('Picking stops') : t('Locations')}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{isOutbound ? stops.length : new Set(items.map((item) => item.binId || item.binName).filter(Boolean)).size}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailTile icon={Warehouse} label={t('Warehouse')} value={receipt.warehouseName} />
            <DetailTile icon={UserRound} label={t('Created by')} value={receipt.createdByFullName} />
            <DetailTile icon={Hash} label={t('Receipt ID')} value={receipt.id} valueClassName="font-mono text-xs text-slate-700" />
            {!isOutbound && <DetailTile icon={UserRound} label={t('Sender')} value={receipt.senderName} />}
            {isOutbound && <DetailTile icon={UserRoundCheck} label={t('Receiver')} value={receipt.receiverName} />}
            <DetailTile icon={CalendarDays} label={t('Created date')} value={formatDateTime(receipt.createdAt, language)} />
            <DetailTile icon={Clock3} label={t('Occurred at')} value={formatDateTime(receipt.occurredAt, language)} />
            <DetailTile icon={RefreshCw} label={t('Updated date')} value={formatDateTime(receipt.updatedAt, language)} />
          </section>

          {receipt.rejectReason && (
            <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs font-bold tracking-wide text-rose-700 uppercase">{t('Rejection reason')}</p>
              <p className="mt-1 text-sm text-rose-800">{receipt.rejectReason}</p>
            </section>
          )}

          <section className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{t('Stock movement')}</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${movementApplied ? (isOutbound ? 'text-rose-600' : 'text-emerald-600') : 'text-slate-400'}`}>
                {movementApplied
                  ? `${isOutbound ? '-' : '+'}${formatQuantity(totalQuantity, language)}`
                  : EMPTY_VALUE}
                <span className="ml-1 text-xs font-medium text-slate-500">{t('units')}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {movementApplied ? t('Applied to inventory') : t('Inventory changes after approval')}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{t('Current stock')}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {affectedCurrentQuantity == null ? EMPTY_VALUE : formatQuantity(affectedCurrentQuantity, language)}
                <span className="ml-1 text-xs font-medium text-slate-500">{t('units')}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">{t('Current quantity in affected batches')}</p>
            </div>
          </section>

          {isOutbound ? (
            <section className="space-y-4">
              <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <MapIcon className="h-5 w-5 text-emerald-600" />
                    {t('Picking route')}
                    {receipt.pickList?.strategy ? ` (${pickingStrategy})` : ''}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {stops.length} {t('Picking stops')} · {formatQuantity(totalStopsQuantity, language)} {t('units')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {receipt.pickList?.complete === true && (
                    <Badge variant="success">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {t('Complete')}
                    </Badge>
                  )}
                  {receipt.pickList?.complete === false && <Badge variant="warning">{t('Needs review')}</Badge>}
                </div>
              </div>

              {receipt.pickList?.warnings?.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">{t('Picking warnings')}</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                    {receipt.pickList.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
                  </ul>
                </div>
              )}

              {stops.length > 0 ? (
                <div className="space-y-3">
                  {stops.map((stop, index) => {
                    const stopQuantity = (stop.lines || []).reduce((total, line) => total + (Number(line.quantity) || 0), 0)
                    const displaySequence = stop.sequence != null ? stop.sequence : '—'
                    return (
                      <article key={`${stop.binId || stop.binCode || index}-${stop.sequence ?? index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${stop.sequence != null ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{displaySequence}</span>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate text-sm font-bold text-slate-900">
                                <MapPin className="h-4 w-4 shrink-0 text-rose-500" />
                                {t('Rack')} {stop.rackCode || EMPTY_VALUE} · {t('Bin')} {stop.binCode || EMPTY_VALUE}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {stop.shelfLevel != null && stop.shelfLevel !== '?' ? `${t('Level')} ${stop.shelfLevel} · ` : ''}
                                {stop.lines?.length || 0} {t('Product lines')}
                              </p>
                            </div>
                          </div>
                          <span className="self-start rounded-full bg-white px-3 py-1 text-xs font-bold tabular-nums text-emerald-700 ring-1 ring-emerald-100 sm:self-auto">
                            {formatQuantity(stopQuantity, language)} {t('units')}
                          </span>
                        </div>

                        <div className="table-scroll-container overflow-x-auto">
                          <table className="w-full min-w-[620px] text-left text-sm">
                            <thead className="bg-white text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                              <tr>
                                <th className="px-4 py-3">{t('Product (SKU)')}</th>
                                <th className="px-4 py-3">{t('Batch')}</th>
                                <th className="px-4 py-3">{t('Arrival date')}</th>
                                <th className="px-4 py-3 text-right">{t('Pick Quantity')}</th>
                                <th className="px-4 py-3 text-right">{t('Change')}</th>
                                <th className="px-4 py-3 text-right">{t('Current stock')}</th>
                                <th className="px-4 py-3">{t('Note')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(stop.lines || []).map((line, lineIndex) => (
                                <tr key={`${line.stockBatchId || line.skuCode || lineIndex}`} className="hover:bg-slate-50">
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-slate-800">{line.skuName || EMPTY_VALUE}</p>
                                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">{line.skuCode || EMPTY_VALUE}</p>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs text-slate-500" title={line.stockBatchId || ''}>{shortId(line.stockBatchId)}</td>
                                  <td className="px-4 py-3 text-slate-600">{formatDateTime(line.arrivalDate, language, true)}</td>
                                  <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700">{formatQuantity(line.quantity, language)}</td>
                                  <td className="px-4 py-3 text-right font-bold tabular-nums text-rose-600">
                                    {movementApplied ? `-${formatQuantity(line.quantity, language)}` : EMPTY_VALUE}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">
                                    {(() => {
                                      const currentQuantity = getCurrentBatchQuantity(line.stockBatchId)
                                      return currentQuantity == null ? EMPTY_VALUE : formatQuantity(currentQuantity, language)
                                    })()}
                                  </td>
                                  <td className="max-w-48 px-4 py-3 text-slate-500"><span className="block truncate" title={line.note || ''}>{line.note || EMPTY_VALUE}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">{t('No picking stops generated.')}</div>
              )}
            </section>
          ) : (
            <section className="space-y-3">
              <h4 className="flex items-center gap-2 border-b border-slate-200 pb-3 text-base font-bold text-slate-900">
                <Package className="h-5 w-5 text-blue-600" /> {t('Item details')}
              </h4>
              {items.length > 0 ? (
                <div className="table-scroll-container overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">{t('Product (SKU)')}</th>
                        <th className="px-4 py-3">{t('Rack')}</th>
                        <th className="px-4 py-3">{t('Bin')}</th>
                        <th className="px-4 py-3 text-right">{t('Quantity')}</th>
                        <th className="px-4 py-3 text-right">{t('Change')}</th>
                        <th className="px-4 py-3 text-right">{t('Current stock')}</th>
                        <th className="px-4 py-3">{t('Note')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, index) => (
                        <tr key={item.id || `${item.skuCode}-${index}`} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{item.skuName || EMPTY_VALUE}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-blue-700">{item.skuCode || EMPTY_VALUE}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.rackName || EMPTY_VALUE}</td>
                          <td className="px-4 py-3 text-slate-600">{item.binName || EMPTY_VALUE}</td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{formatQuantity(item.quantity, language)}</td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-600">
                            {movementApplied ? `+${formatQuantity(item.quantity, language)}` : EMPTY_VALUE}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">
                            {(() => {
                              const currentQuantity = getCurrentBatchQuantity(item.stockBatchId)
                              return currentQuantity == null ? EMPTY_VALUE : formatQuantity(currentQuantity, language)
                            })()}
                          </td>
                          <td className="max-w-56 px-4 py-3 text-slate-500"><span className="block truncate" title={item.note || ''}>{item.note || EMPTY_VALUE}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">{t('No item details are available.')}</div>
              )}
            </section>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-slate-500">{t('Unable to load receipt details.')}</div>
      )}
    </Modal>
  )
}

export default ReceiptDetailModal
