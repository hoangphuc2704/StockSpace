import api from '../apiConfig'

export const onwerwarehouseApi = {
  //cập nhật thông tin kho
  updateWarehouseInfo: (warehouseId, data) => {
    return api.put(`/owner/warehouses/${warehouseId}`, data)
  },

  //xóa kho
  deleteWarehouse: (warehouseId) => {
    return api.delete(`/owner/warehouses/${warehouseId}`)
  },

  //thay thế toàn bộ ảnh
  replaceAllWarehouseImages: (warehouseId, data) => {
    return api.put(`/owner/warehouses/${warehouseId}/images`, data)
  },

  //thêm ảnh mới
  addWarehouseImages: (warehouseId, data) => {
    return api.post(`/owner/warehouses/${warehouseId}/images`, data)
  },

  // get danh sách kho
  getOwnerWarehouses: ({ page, size, sortBy, sortDir } = {}) => {
    return api.get('/owner/warehouses', { params: { page, size, sortBy, sortDir } })
  },

  //tạo warehouse mới
  createWarehouse: (data) => {
    return api.post('/owner/warehouses', data)
  },

  //cập nhật trạng thái kho (active/inactive)
  updateWarehouseStatus: (warehouseId, status) => {
    return api.put(`/owner/warehouses/${warehouseId}/status`, { status })
  },
}
