import api from './apiConfig'

const layoutApi = {
  getTenantWarehouseLayout: (warehouseId) => {
    return api.get(`/tenant/warehouses/${warehouseId}/layout`)
  },

  saveTenantWarehouseLayout: (warehouseId, data) => {
    return api.put(`/tenant/warehouses/${warehouseId}/layout`, data)
  },

  getOwnerWarehouseLayout: (warehouseId) => {
    return api.get(`/owner/warehouses/${warehouseId}/layout`)
  },

  saveOwnerWarehouseLayout: (warehouseId, data) => {
    return api.put(`/owner/warehouses/${warehouseId}/layout`, data)
  },
}

export default layoutApi
