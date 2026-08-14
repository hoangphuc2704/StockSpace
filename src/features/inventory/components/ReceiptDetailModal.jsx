import { CalendarDays, Loader2, Package, UserRound, Warehouse } from 'lucide-react'
import Badge from '@/components/atoms/Badge'
import Modal from '@/components/organisms/Modal'

const statusVariant = (status) => {
  if (status === 'APPROVED') return 'success'
  if (status === 'PENDING') return 'warning'
  return 'danger'
}

const ReceiptDetailModal = ({ isOpen, onClose, receipt, isLoading, type }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={`${type === 'INBOUND' ? 'Inbound' : 'Outbound'} receipt details`}
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
              <Warehouse className="h-3.5 w-3.5" /> Warehouse
            </p>
            <p className="mt-1 font-bold text-slate-900">{receipt.warehouseName || '—'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <UserRound className="h-3.5 w-3.5" /> Created by
            </p>
            <p className="mt-1 font-bold text-slate-900">{receipt.createdByFullName || '—'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" /> Created date
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {receipt.createdAt ? new Date(receipt.createdAt).toLocaleString('en-US') : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Status</p>
            <div className="mt-1">
              <Badge variant={statusVariant(receipt.status)}>{receipt.status || '—'}</Badge>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 font-bold text-slate-900">
              <Package className="h-4 w-4 text-blue-600" /> Item details
            </h4>
            <span className="text-xs font-semibold text-slate-500">
              {receipt.items?.length || 0} item lines
            </span>
          </div>
          {receipt.items?.length ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-170 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Rack</th>
                    <th className="px-4 py-3">Bin</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipt.items.map((item, index) => (
                    <tr key={item.id || `${item.skuCode}-${index}`}>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-blue-700">
                        {item.skuCode || '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {item.skuName || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.rackName || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{item.binName || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {Number(item.quantity || 0).toLocaleString('en-US')}
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
              No item details are available.
            </div>
          )}
        </div>
      </div>
    ) : (
      <div className="py-12 text-center text-sm text-slate-500">
        Unable to load receipt details.
      </div>
    )}
  </Modal>
)

export default ReceiptDetailModal
