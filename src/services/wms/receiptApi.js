import api from '../apiConfig'
import { cleanQueryParams, toApiDate } from '@/utils/wmsDateFilter'

const receiptApi = {
  // Lấy danh sách phiếu nhập/xuất kho (có phân trang)
  getReceipts: (
    warehouseId,
    { type, page, size, fromDate, toDate } = {}
  ) => {
    return api.get('/tenant/inventory/receipts', {
      params: cleanQueryParams({
        warehouseId,
        type,
        page,
        size,
        fromDate: toApiDate(fromDate),
        toDate: toApiDate(toDate),
      }),
    })
  },

  // Xem chi tiết phiếu
  getReceiptDetail: (id) => {
    return api.get(`/tenant/inventory/receipts/${id}`)
  },

  // Tạo phiếu nhập/xuất kho mới (trạng thái PENDING)
  createReceipt: (data) => {
    return api.post('/tenant/inventory/receipts', data)
  },

  // Duyệt phiếu nhập/xuất kho (Approve)
  approveReceipt: (id) => {
    return api.patch(`/tenant/inventory/receipts/${id}/approve`, null, {
      // The page-level catch renders the backend capacity message.
      skipErrorToast: true,
    })
  },

  // Từ chối phiếu nhập/xuất kho (Reject)
  rejectReceipt: (id, reason) => {
    return api.patch(`/tenant/inventory/receipts/${id}/reject`, { reason })
  },

  // Xuất file Excel/CSV danh sách phiếu nhập/xuất kho
  exportReceipts: (warehouseId, type, { fromDate, toDate } = {}) => {
    return api.get('/tenant/inventory/receipts/export', {
      params: cleanQueryParams({
        warehouseId,
        type,
        fromDate: toApiDate(fromDate),
        toDate: toApiDate(toDate),
      }),
      responseType: 'blob'
    })
  },

  // Xem trước danh sách pick list (OUTBOUND)
  getPickListSuggestions: (data) => {
    return api.post('/tenant/inventory/picking/suggestions', data)
  },

  // Tính toán lại pick list nếu bị lỗi stale
  replanPickList: (id) => {
    return api.post(`/tenant/inventory/receipts/${id}/picking/replan`)
  }
}

export default receiptApi
