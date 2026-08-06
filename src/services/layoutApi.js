import api from './apiConfig'

const layoutApi = {
  //Tenant Layout API
  getTenantWarehouseLayout: (warehouseId) => {
    return api.get(`/warehouses/${warehouseId}/layout`)
  },

  saveTenantWarehouseLayout: (warehouseId, data) => {
    return api.put(`/tenant/warehouses/${warehouseId}/layout`, data)
  },

  //Owner Layout API
  getOwnerWarehouseLayout: (warehouseId) => {
    return api.get(`/owner/warehouses/${warehouseId}/layout`)
  },

  saveOwnerWarehouseLayout: (warehouseId, data) => {
    return api.put(`/owner/warehouses/${warehouseId}/layout`, data)
  },
}

export default layoutApi
