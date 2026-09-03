import api from '../apiConfig'

const receiptApi = {
  // Lấy danh sách phiếu nhập/xuất kho (có phân trang)
  getReceipts: (warehouseId, { type, page, size } = {}) => {
    return api.get('/tenant/inventory/receipts', {
      params: { warehouseId, type, page, size }
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
    return api.patch(`/tenant/inventory/receipts/${id}/approve`)
  },

  // Từ chối phiếu nhập/xuất kho (Reject)
  rejectReceipt: (id, reason) => {
    return api.patch(`/tenant/inventory/receipts/${id}/reject`, { reason })
  },

  // Xuất file Excel/CSV danh sách phiếu nhập/xuất kho
  exportReceipts: (warehouseId, type) => {
    return api.get('/tenant/inventory/receipts/export', {
      params: { warehouseId, type },
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
