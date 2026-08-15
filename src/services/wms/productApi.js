import api from '../apiConfig'

const fetchAllSkus = async (size = 100) => {
  const getPage = (page) => api.get('/tenant/products/skus', { params: { page, size } })
  const firstResponse = await getPage(0)
  const firstPage = firstResponse?.data?.data ?? firstResponse?.data ?? {}
  const totalPages = Math.max(Number(firstPage.totalPages) || 1, 1)
  const remainingResponses =
    totalPages > 1
      ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => getPage(index + 1)))
      : []

  return [firstResponse, ...remainingResponses].flatMap((response) => {
    const pageData = response?.data?.data ?? response?.data ?? {}
    return Array.isArray(pageData.content) ? pageData.content : []
  })
}

const productApi = {
  // Lấy danh sách danh mục (categories)
  getCategories: () => {
    return api.get('/tenant/products/categories')
  },

  // Lấy danh sách UOM
  getUOMs: ({ page = 0, size = 100 } = {}) => {
    return api.get('/tenant/products/uoms', { params: { page, size } })
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
  getSKUs: ({ page = 0, size = 10 } = {}) => {
    return api.get('/tenant/products/skus', {
      params: { page, size },
    })
  },

  // Tải đầy đủ SKU để tính tải trọng tồn kho chính xác trên mọi trang dữ liệu.
  getAllSKUs: ({ size = 100 } = {}) => fetchAllSkus(size),

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
  },
}

export default productApi
