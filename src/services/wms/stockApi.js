import api from '../apiConfig'

const stockApi = {
  // Xem toàn bộ tồn kho trong kho đang thuê
  getStock: (warehouseId, { page, size } = {}) => {
    return api.get('/tenant/inventory/stock', {
      params: { warehouseId, page, size },
    })
  },

  /**
   * Xem các mặt hàng và số lượng đang nằm trong một Bin.
   *
   * BE chưa có endpoint lọc trực tiếp theo binId. Endpoint tồn kho theo kho trả
   * binId trong từng StockBatchResponse, vì vậy FE tải đủ các trang rồi lọc theo Bin.
   *
   * @returns {Promise<{content: Array, totalElements: number, totalQuantity: number}>}
   */
  getStockByBin: async (warehouseId, binId, { size = 100 } = {}) => {
    if (!warehouseId || !binId) {
      throw new Error('warehouseId và binId là bắt buộc khi xem tồn kho trong Bin.')
    }

    const getPage = (page) =>
      api.get('/tenant/inventory/stock', {
        params: { warehouseId, page, size },
      })

    const firstResponse = await getPage(0)
    const firstPage = firstResponse?.data?.data ?? firstResponse?.data ?? {}
    const totalPages = Math.max(Number(firstPage.totalPages) || 1, 1)
    const remainingResponses =
      totalPages > 1
        ? await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) => getPage(index + 1))
          )
        : []

    const allBatches = [firstResponse, ...remainingResponses].flatMap((response) => {
      const pageData = response?.data?.data ?? response?.data ?? {}
      return Array.isArray(pageData.content) ? pageData.content : []
    })
    const normalizedBinId = String(binId)
    const content = allBatches.filter((batch) => String(batch.binId) === normalizedBinId)

    return {
      content,
      totalElements: content.length,
      totalQuantity: content.reduce(
        (total, batch) => total + (Number(batch.quantity) || 0),
        0
      ),
    }
  },

  // Xem lịch sử biến động số lượng của một lô hàng cụ thể
  getStockTransactions: (batchId, { page, size } = {}) => {
    return api.get(`/tenant/inventory/stock/${batchId}/transactions`, {
      params: { page, size },
    })
  },

  // Xem tồn kho chi tiết theo SKU
  getStockBySku: (skuId) => {
    return api.get(`/tenant/inventory/stock/sku/${skuId}`)
  },

  // Tổng hợp tồn kho theo SKU
  getStockSummary: (skuId) => {
    return api.get('/tenant/inventory/stock/summary', {
      params: { skuId },
    })
  },
}

export default stockApi
