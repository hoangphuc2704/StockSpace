import api from './apiConfig'

const contractApi = {
  // Xem danh sách hợp đồng của mình (Owner / Tenant)
  getMyContracts: ({ page, size } = {}) => {
    return api.get('/contracts', { params: { page, size } })
  },

  // Xem chi tiết hợp đồng
  getContractById: (contractId) => {
    return api.get(`/contracts/${contractId}`)
  },

  // Xác nhận bàn giao kho (Cả Owner / Tenant)
  confirmHandover: (contractId) => {
    return api.patch(`/contracts/${contractId}/confirm-handover`)
  },

  // Owner nộp hợp đồng online
  submitOnlineContract: (contractId, data) => {
    return api.post(`/contracts/${contractId}/submit-online`, data)
  },

  // Tenant xác nhận kích hoạt hợp đồng
  tenantConfirmContract: (contractId) => {
    return api.post(`/contracts/${contractId}/tenant-confirm`, {})
  },

  // Tenant báo cáo thương lượng/deal không thành công (Tranh chấp)
  tenantReportFailed: (contractId, data) => {
    return api.post(`/contracts/${contractId}/tenant-report-failed`, data)
  },

  // Owner đề nghị hủy deal thương lượng
  ownerRequestCancel: (contractId, data) => {
    return api.post(`/contracts/${contractId}/owner-cancel`, data)
  },

  // Tenant phản hồi đề nghị hủy deal của Owner (Agree = true/false)
  tenantRespondCancel: (contractId, data) => {
    return api.post(`/contracts/${contractId}/tenant-respond-cancel`, data)
  }
}

export default contractApi
