import api from '../apiConfig'

const onwerwarehouseApi = {
  getPublicWarehouses: ({ page, size, keyword, status, isVerified, sortBy, sortDir } = {}) => {
    return api.get('/warehouses', {
      params: { page, size, keyword, status, isVerified, sortBy, sortDir },
    })
  },

  getPublicWarehouseById: (warehouseId) => {
    return api.get(`/warehouses/${warehouseId}`)
  },

  getPublicWarehouseLayout: (warehouseId) => {
    return api.get(`/warehouses/${warehouseId}/layout`)
  },

  // Layout của Owner
  getOwnerWarehouseLayout: (warehouseId) => {
    return api.get(`/owner/warehouses/${warehouseId}/layout`)
  },

  saveOwnerWarehouseLayout: (warehouseId, data) => {
    return api.put(`/owner/warehouses/${warehouseId}/layout`, data)
  },

  // Layout riêng của Tenant
  getTenantWarehouseLayout: (warehouseId) => {
    return api.get(`/tenant/warehouses/${warehouseId}/layout`)
  },

  saveTenantWarehouseLayout: (warehouseId, data) => {
    return api.put(`/tenant/warehouses/${warehouseId}/layout`, data)
  },

  //cập nhật thông tin kho
  updateWarehouseInfo: (warehouseId, data) => {
    return api.put(`/owner/warehouses/${warehouseId}/layout`, data)
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
    return api.put(`/owner/warehouses/${warehouseId}/status`, { status })
  },

  // //yêu cầu kiểm định kho
  // requestInspection: ({ warehouseId } = {}) => {
  //   return api.post(`/owner/inspections`, { params: { warehouseId } })
  // },

  requestInspection: (warehouseId) => {
    // Tham số thứ 2 là body (để trống hoặc {}), tham số thứ 3 mới là config chứa params
    return api.post(`/owner/inspections`, {}, { params: { warehouseId } })
  },

  // --- API Xét duyệt Booking của Owner ---

  // Lấy danh sách yêu cầu thuê kho gửi đến (phân trang)
  getIncomingRequests: ({ page, size } = {}) => {
    return api.get('/owner/bookings', { params: { page, size } })
  },

  // Chấp nhận yêu cầu thuê
  approveBooking: (bookingId) => {
    return api.patch(`/owner/bookings/${bookingId}/approve`)
  },

  // Từ chối yêu cầu thuê
  rejectBooking: (bookingId, data) => {
    // data = { reason: "..." }
    return api.patch(`/owner/bookings/${bookingId}/reject`, data)
  },
}

export default onwerwarehouseApi
