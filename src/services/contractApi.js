import api from './apiConfig'

const contractApi = {
  getMyContracts: (params = {}) => api.get('/contracts', { params }),
  getById: (id) => api.get(`/contracts/${id}`),

  preview: (payload) => api.post('/owner/contracts/preview', payload),
  createDraft: (payload) => api.post('/owner/contracts', payload),
  updateDraft: (id, payload) => api.put(`/owner/contracts/${id}`, payload),
  submit: (id) => api.post(`/owner/contracts/${id}/submit`),
  deleteDraft: (id) => api.delete(`/owner/contracts/${id}`),
  getOwnerLayout: (id) => api.get(`/owner/contracts/${id}/layout`),
  saveOwnerLayout: (id, payload) => api.put(`/owner/contracts/${id}/layout`, payload),

  getTenantLayout: (id) => api.get(`/tenant/contracts/${id}/layout`),
  confirm: (id) => api.post(`/tenant/contracts/${id}/confirm`),
  requestChanges: (id, reason) =>
    api.post(`/tenant/contracts/${id}/request-changes`, { reason }),
  reject: (id, reason) => api.post(`/tenant/contracts/${id}/reject`, { reason }),
}

export default contractApi
