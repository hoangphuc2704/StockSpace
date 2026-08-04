import api from '../apiConfig'

const productApi = {
  // Lấy danh sách danh mục (categories)
  getCategories: () => {
    return api.get('/tenant/products/categories')
  },

  // Lấy danh sách UOM
  getUOMs: () => {
    return api.get('/tenant/products/uoms')
  },

  // Tạo danh mục mới
  createCategory: (data) => {
    return api.post('/tenant/products/categories', data)
  },

  // Xóa danh mục
  deleteCategory: (id) => {
    return api.delete(`/tenant/products/categories/${id}`)
  },

  // Lấy danh sách SKU sản phẩm (có phân trang)
  getSKUs: ({ page, size } = {}) => {
    return api.get('/tenant/products/skus', {
      params: { page, size }
    })
  },

  // Xem chi tiết SKU
  getSKUDetail: (id) => {
    return api.get(`/tenant/products/skus/${id}`)
  },

  // Tạo SKU mới
  createSKU: (data) => {
    return api.post('/tenant/products/skus', data)
  },

  // Cập nhật SKU
  updateSKU: (id, data) => {
    return api.put(`/tenant/products/skus/${id}`, data)
  },

  // Xóa SKU
  deleteSKU: (id) => {
    return api.delete(`/tenant/products/skus/${id}`)
  }
}

export default productApi
