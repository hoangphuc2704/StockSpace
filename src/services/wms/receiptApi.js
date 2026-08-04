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
  }
}

export default receiptApi
