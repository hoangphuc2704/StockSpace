import { CalendarDays, Loader2, Package, UserRound, Warehouse, MapPin, Map as MapIcon } from 'lucide-react'
import Badge from '@/components/atoms/Badge'
import Modal from '@/components/organisms/Modal'
import { useState, useEffect } from 'react'
import stockApi from '@/services/wms/stockApi'
import { useLanguage } from '@/i18n/LanguageContext'

const statusVariant = (status) => {
  if (status === 'APPROVED') return 'success'
  if (status === 'PENDING') return 'warning'
  return 'danger'
}

const ReceiptDetailModal = ({ isOpen, onClose, receipt, isLoading, type }) => {
  const { language, t } = useLanguage()
  const [batchDates, setBatchDates] = useState({})

  useEffect(() => {
    let active = true
    if (isOpen && type === 'OUTBOUND' && receipt?.items?.length && !receipt.pickList?.stops) {
      const fetchDates = async () => {
        try {
          const allStock = await stockApi.getAllStock(receipt.warehouseId)
          if (!active) return
          const dates = {}
          allStock.forEach(batch => {
            if (batch.id && batch.arrivalDate) {
              dates[batch.id] = batch.arrivalDate
            }
          })
          setBatchDates(dates)
        } catch (e) {
          console.error('Failed to fetch batch dates', e)
        }
      }
      fetchDates()
    }
    return () => {
      active = false
      setBatchDates({})
    }
  }, [isOpen, type, receipt])

  return (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={type === 'INBOUND' ? t('Inbound Receipt Details') : t('Outbound Receipt Details')}
    className="max-h-[90vh] max-w-4xl overflow-y-auto"
  >
    {isLoading ? (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    ) : receipt ? (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Warehouse className="h-3.5 w-3.5" /> {t('Warehouse')}
            </p>
            <p className="mt-1 font-bold text-slate-900">{receipt.warehouseName || '—'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <UserRound className="h-3.5 w-3.5" /> {t('Created by')}
            </p>
            <p className="mt-1 font-bold text-slate-900">{receipt.createdByFullName || '—'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" /> {t('Created date')}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {receipt.createdAt ? new Date(receipt.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">{t('Status')}</p>
            <div className="mt-1">
              <Badge variant={statusVariant(receipt.status)}>{receipt.status || '—'}</Badge>
            </div>
          </div>
        </div>

        <div>
          {type === 'OUTBOUND' ? (
            (() => {
              let stops = []
              if (receipt.pickList?.stops) {
                stops = receipt.pickList.stops
              } else if (receipt.items?.length) {
                // Reconstruct stops grouping by binId and sorting by pickSequence
                const stopsMap = new Map()
                receipt.items.forEach(item => {
                  const key = item.binId || 'unknown'
                  if (!stopsMap.has(key)) {
                    stopsMap.set(key, {
                      sequence: item.pickSequence || 999,
                      rackCode: item.rackName || item.rackCode || '?',
                      binCode: item.binName || item.binCode || '?',
                      shelfLevel: '?',
                      lines: []
                    })
                  }
                  stopsMap.get(key).lines.push({
                    skuCode: item.skuCode,
                    arrivalDate: item.stockBatchId ? batchDates[item.stockBatchId] : null,
                    quantity: item.quantity
                  })
                })
                stops = Array.from(stopsMap.values()).sort((a, b) => a.sequence - b.sequence)
              }

              return stops.length > 0 ? (
                <div className="space-y-6 pt-4">
                  <h4 className="flex items-center gap-2 font-bold text-slate-900 text-base">
                    <MapIcon className="h-5 w-5 text-emerald-600" /> {t('Suggested picking route (FIFO)')}
                  </h4>
                  <div className="relative border-l-2 border-emerald-100 ml-4 space-y-6">
                    {stops.map((stop, index) => (
                      <div key={index} className="relative pl-6">
                        <div className="absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 border-4 border-white text-sm font-bold text-emerald-600 shadow-sm">
                          {stop.sequence}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-rose-500" />
                              <span className="text-sm font-bold text-slate-800">
                                {t('Rack')} {stop.rackCode} — {t('Bin')} {stop.binCode}
                              </span>
                            </div>
                            {stop.shelfLevel !== '?' && (
                              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                {t('Level')} {stop.shelfLevel}
                              </span>
                            )}
                          </div>

                          <div className="overflow-x-auto rounded-lg border border-slate-100">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-xs text-slate-500">
                                <tr>
                                  <th className="px-3 py-2 font-medium">{t('Product (SKU)')}</th>
                                  <th className="px-3 py-2 font-medium">{t('Arrival date')}</th>
                                  <th className="px-3 py-2 text-right font-medium">{t('Pick Quantity')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {stop.lines?.map((line, lIndex) => (
                                  <tr key={lIndex}>
                                    <td className="px-3 py-2 font-mono font-medium text-slate-800">{line.skuCode}</td>
                                    <td className="px-3 py-2 text-slate-500">
                                      {line.arrivalDate ? new Date(line.arrivalDate).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold text-emerald-700">
                                      {line.quantity}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
                  {t('No picking stops generated.')}
                </div>
              )
            })()
          ) : (
            <>
              <div className="mb-3">
                <h4 className="flex items-center gap-2 font-bold text-slate-900">
                  <Package className="h-4 w-4 text-blue-600" /> {t('Item details')}
                </h4>
              </div>
              {receipt.items?.length ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-140 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">{t('SKU')}</th>
                        <th className="px-4 py-3">{t('Rack')}</th>
                        <th className="px-4 py-3">{t('Bin')}</th>
                        <th className="px-4 py-3 text-right">{t('Quantity')}</th>
                        <th className="px-4 py-3">{t('Note')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receipt.items.map((item, index) => (
                        <tr key={item.id || `${item.skuCode}-${index}`}>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-blue-700">
                            {item.skuCode || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.rackName || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{item.binName || '—'}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {Number(item.quantity || 0).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
                          </td>
                          <td className="max-w-52 px-4 py-3 text-slate-500">
                            <p className="truncate" title={item.note || ''}>
                              {item.note || '—'}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
                  {t('No item details are available.')}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    ) : (
      <div className="py-12 text-center text-sm text-slate-500">
        {t('Unable to load receipt details.')}
      </div>
    )}
  </Modal>
  )
}

export default ReceiptDetailModal
