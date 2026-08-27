import api from '../apiConfig'

const onwerwarehouseApi = {
  getPublicWarehouses: ({ page, size, keyword, sortBy, sortDir, minRentalPrice, maxRentalPrice, minCapacity } = {}) => {
  getPublicWarehouses: ({ page, size, keyword, sortBy, sortDir, minRentalPrice, maxRentalPrice, minCapacity } = {}) => {
    return api.get('/warehouses', {
      params: { page, size, keyword, sortBy, sortDir, minRentalPrice, maxRentalPrice, minCapacity },
      params: { page, size, keyword, sortBy, sortDir, minRentalPrice, maxRentalPrice, minCapacity },
    })
  },

  // API lấy danh sách kho riêng cho Tenant & Staff (có cách ly dữ liệu)
  getMyWarehouses: () => {
    return api.get('/tenant/warehouses/my-warehouses')
  },

  getPublicWarehouseById: (warehouseId) => {
    return api.get(`/warehouses/${warehouseId}`)
  },

  getOwnerContact: (warehouseId) => {
    return api.get(`/warehouses/${warehouseId}/owner-contact`)
  },

  getPublicWarehouseLayout: (warehouseId, config = {}) => {
    return api.get(`/warehouses/${warehouseId}/layout`, { skipAuth: true, ...config })
  },

  // Layout của Owner
  getOwnerWarehouseLayout: (warehouseId) => {
    return api.get(`/owner/warehouses/${warehouseId}/layout`)
  },

  saveOwnerWarehouseLayout: (warehouseId, data) => {
    return api.put(`/owner/warehouses/${warehouseId}/layout`, data)
  },

  //cập nhật thông tin kho
  updateWarehouseInfo: (warehouseId, data) => {
    return api.put(`/owner/warehouses/${warehouseId}`, data)
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

  // Tạo warehouse mới (Hỗ trợ upload ảnh/file)
  createWarehouse: (data) => {
    return api.post('/owner/warehouses', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  getWarehouseTypesByOwner: () => {
    return api.get('/warehouses/types')
  },

  //cập nhật trạng thái kho (active/inactive)
  updateWarehouseStatus: (warehouseId, status) => {
    return api.patch(`/owner/warehouses/${warehouseId}/status`, null, { params: { status } })
  },
  
  // xem số điện thoại Owner
  getOwnerContact: (warehouseId) => {
    return api.get(`/warehouses/${warehouseId}/owner-contact`)
  },

  // Owner mua / gia hạn đăng bài
  purchasePublication: (warehouseId, payload) => {
    return api.post(`/owner/warehouses/${warehouseId}/publications`, payload)
  },
  
  getPublications: (warehouseId) => {
    return api.get(`/owner/warehouses/${warehouseId}/publications`)
  },

  // //yêu cầu kiểm định kho
  // requestInspection: ({ warehouseId } = {}) => {
  //   return api.post(`/owner/inspections`, { params: { warehouseId } })
  // },

  requestInspection: (warehouseId) => {
    // Tham số thứ 2 là body (để trống hoặc {}), tham số thứ 3 mới là config chứa params
    return api.post(`/owner/inspections`, {}, { params: { warehouseId } })
  },

  getOwnerInspections: ({ page = 0, size = 100 } = {}) => {
    return api.get('/owner/inspections', { params: { page, size } })
  },


}

export default onwerwarehouseApi
