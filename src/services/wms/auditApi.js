import api from '../apiConfig'

const auditApi = {
  getAudits: (warehouseId, { page, size } = {}) => {
    return api.get('/tenant/inventory/audits', {
      params: {
        ...(warehouseId ? { warehouseId } : {}),
        page,
        size,
      },
    })
  },

  createAudit: (data) => {
    return api.post('/tenant/inventory/audits', data)
  },

  getAuditDetail: (id) => {
    return api.get(`/tenant/inventory/audits/${id}`)
  },

  startAudit: (id) => {
    return api.post(`/tenant/inventory/audits/${id}/start`)
  },

  saveCounts: (id, data) => {
    return api.put(`/tenant/inventory/audits/${id}/counts`, data)
  },

  saveNotes: (id, data) => {
    return api.put(`/tenant/inventory/audits/${id}/notes`, data)
  },

  submitAudit: (id) => {
    return api.post(`/tenant/inventory/audits/${id}/submit`)
  },

  approveAudit: (id) => {
    return api.post(`/tenant/inventory/audits/${id}/approve`)
  },

  requestEdit: (id, data) => {
    return api.post(`/tenant/inventory/audits/${id}/request-edit`, data)
  },

  approveEdit: (id) => {
    return api.post(`/tenant/inventory/audits/${id}/approve-edit`)
  },

  cancelAudit: (id, data) => {
    return api.post(`/tenant/inventory/audits/${id}/cancel`, data)
  },

  recountAudit: (id, data) => {
    return api.post(`/tenant/inventory/audits/${id}/recount`, data)
  },

  addUnexpectedItem: (id, data) => {
    return api.post(`/tenant/inventory/audits/${id}/unexpected-items`, data)
  },
}

export default auditApi
