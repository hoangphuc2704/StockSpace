import api from '../apiConfig'

const stockApi = {
  // Xem toàn bộ tồn kho trong kho đang thuê
  getStock: (warehouseId, { page, size } = {}) => {
    return api.get('/tenant/inventory/stock', {
      params: { warehouseId, page, size }
    })
  },

  // Xem lịch sử biến động số lượng của một lô hàng cụ thể
  getStockTransactions: (batchId, { page, size } = {}) => {
    return api.get(`/tenant/inventory/stock/${batchId}/transactions`, {
      params: { page, size }
    })
  },

  // Xem tồn kho chi tiết theo SKU
  getStockBySku: (skuId) => {
    return api.get(`/tenant/inventory/stock/sku/${skuId}`)
  },

  // Tổng hợp tồn kho theo SKU
  getStockSummary: (skuId) => {
    return api.get('/tenant/inventory/stock/summary', {
      params: { skuId }
    })
  }
}

export default stockApi
