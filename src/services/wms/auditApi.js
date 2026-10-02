import api from '../apiConfig'
import { cleanQueryParams, toApiDate } from '@/utils/wmsDateFilter'

const auditApi = {
  getAudits: (warehouseId, { page, size, fromDate, toDate } = {}) => {
    return api.get('/tenant/inventory/audits', {
      params: cleanQueryParams({
        ...(warehouseId ? { warehouseId } : {}),
        page,
        size,
        fromDate: toApiDate(fromDate),
        toDate: toApiDate(toDate),
      }),
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
    // This flow handles AUDIT_ITEM_DUPLICATE locally so it can focus the existing row.
    return api.post(`/tenant/inventory/audits/${id}/unexpected-items`, data, {
      skipErrorToast: true,
    })
  },
}

export default auditApi
