import api from '../apiConfig'

const transferApi = {
  // Tạo yêu cầu chuyển kho
  createTransfer: (data) => {
    return api.post('/tenant/inventory/transfers', data)
  },

  // Xem danh sách yêu cầu chuyển kho (có phân trang và filter)
  // params có thể bao gồm: sourceWarehouseId, destinationWarehouseId, status, page, size
  getTransfers: (params) => {
    return api.get('/tenant/inventory/transfers', { params })
  },

  // Xem chi tiết yêu cầu chuyển kho
  getTransferDetail: (id) => {
    return api.get(`/tenant/inventory/transfers/${id}`)
  },

  // Approve Dispatch (Bên gửi xuất hàng)
  approveDispatch: (id) => {
    return api.patch(`/tenant/inventory/transfers/${id}/approve-dispatch`)
  },

  // Receive (Bên nhận nhập hàng vào Bin)
  receiveTransfer: (id, data) => {
    // data: { destinationAllocations: [ { itemId, destinationRackId, destinationBinId, quantity } ] }
    return api.post(`/tenant/inventory/transfers/${id}/receive`, data)
  },

  // Từ chối (Reject)
  rejectTransfer: (id, reason) => {
    return api.patch(`/tenant/inventory/transfers/${id}/reject`, { reason })
  },

  // Hủy (Cancel)
  cancelTransfer: (id, reason) => {
    return api.patch(`/tenant/inventory/transfers/${id}/cancel`, { reason })
  }
}

export default transferApi
