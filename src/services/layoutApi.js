import api from './apiConfig'

const layoutApi = {
  // Tenant layout API: returns the tenant clone, or the owner's default layout
  // when a clone has not been created yet.
  getTenantWarehouseLayout: (warehouseId) => api.get(`/tenant/warehouses/${warehouseId}/layout`),

  saveTenantWarehouseLayout: (warehouseId, data) =>
    api.put(`/tenant/warehouses/${warehouseId}/layout`, data),
}

export default layoutApi
