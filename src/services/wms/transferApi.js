import api from '../apiConfig'

const idempotencyConfig = (idempotencyKey) =>
  idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}

export const createTransferIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

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
  allocateTransfer: (id, idempotencyKey) => {
    return api.patch(
      `/tenant/inventory/transfers/${id}/allocate`,
      null,
      idempotencyConfig(idempotencyKey)
    )
  },

  pickTransfer: (id, data, idempotencyKey) => {
    return api.post(
      `/tenant/inventory/transfers/${id}/pick`,
      data,
      idempotencyConfig(idempotencyKey)
    )
  },

  approveDispatch: (id, idempotencyKey) => {
    return api.patch(
      `/tenant/inventory/transfers/${id}/approve-dispatch`,
      null,
      idempotencyConfig(idempotencyKey)
    )
  },

  arriveTransfer: (id, idempotencyKey) => {
    return api.patch(
      `/tenant/inventory/transfers/${id}/arrive`,
      null,
      idempotencyConfig(idempotencyKey)
    )
  },

  // Receive (Bên nhận nhập hàng vào Bin)
  receiveTransfer: (id, data, idempotencyKey) => {
    // data: { allowPartial, destinationAllocations: [{ itemId, destinationRackId, destinationBinId, quantity, disposition }] }
    return api.post(
      `/tenant/inventory/transfers/${id}/receive`,
      data,
      idempotencyConfig(idempotencyKey)
    )
  },

  rejectReceipt: (id, reason, idempotencyKey) => {
    return api.patch(
      `/tenant/inventory/transfers/${id}/reject-receipt`,
      { reason },
      idempotencyConfig(idempotencyKey)
    )
  },

  closeShort: (id, reason, idempotencyKey) => {
    return api.patch(
      `/tenant/inventory/transfers/${id}/close-short`,
      { reason },
      idempotencyConfig(idempotencyKey)
    )
  },

  retryTransfer: (id, data, idempotencyKey) => {
    return api.post(
      `/tenant/inventory/transfers/${id}/retry`,
      data,
      idempotencyConfig(idempotencyKey)
    )
  },

  dispatchRetry: (id, idempotencyKey) => {
    return api.patch(
      `/tenant/inventory/transfers/${id}/retry/dispatch`,
      null,
      idempotencyConfig(idempotencyKey)
    )
  },

  requestReturn: (id, reason, idempotencyKey) => {
    return api.post(
      `/tenant/inventory/transfers/${id}/return/request`,
      { reason },
      idempotencyConfig(idempotencyKey)
    )
  },

  dispatchReturn: (id, idempotencyKey) => {
    return api.patch(
      `/tenant/inventory/transfers/${id}/return/dispatch`,
      null,
      idempotencyConfig(idempotencyKey)
    )
  },

  receiveReturn: (id, data, idempotencyKey) => {
    return api.post(
      `/tenant/inventory/transfers/${id}/return/receive`,
      data,
      idempotencyConfig(idempotencyKey)
    )
  },

  reconcileTransfer: (id, data, idempotencyKey) => {
    return api.post(
      `/tenant/inventory/transfers/${id}/reconcile`,
      data,
      idempotencyConfig(idempotencyKey)
    )
  },

  getTransferTimeline: (id) => {
    return api.get(`/tenant/inventory/transfers/${id}/timeline`)
  },

  // Từ chối (Reject)
  rejectTransfer: (id, reason) => {
    return api.patch(`/tenant/inventory/transfers/${id}/reject`, { reason })
  },

  // Hủy (Cancel)
  cancelTransfer: (id, reason) => {
    return api.patch(`/tenant/inventory/transfers/${id}/cancel`, { reason })
  },
}

export default transferApi
