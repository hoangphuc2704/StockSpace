import api from '../apiConfig'
import { sumStockQuantity } from '@/utils/stockQuantity'
import { cleanQueryParams, toApiDate } from '@/utils/wmsDateFilter'

const fetchAllStock = async (warehouseId, size = 100, { fromDate, toDate } = {}) => {
  const getPage = (page) =>
    api.get('/tenant/inventory/stock', {
      params: cleanQueryParams({
        warehouseId,
        page,
        size,
        fromDate: toApiDate(fromDate),
        toDate: toApiDate(toDate),
      }),
    })

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

const stockApi = {
  // Xem toàn bộ tồn kho trong kho đang thuê
  getStock: (warehouseId, { page, size, fromDate, toDate } = {}) => {
    return api.get('/tenant/inventory/stock', {
      params: cleanQueryParams({
        warehouseId,
        page,
        size,
        fromDate: toApiDate(fromDate),
        toDate: toApiDate(toDate),
      }),
    })
  },

  // Xem tổng quan tồn kho theo product-level (warehouse-scoped)
  getStockOverview: (warehouseId, { page, size } = {}) => {
    return api.get('/tenant/inventory/stock/overview', {
      params: { warehouseId, page, size },
    })
  },

  // Tải toàn bộ tồn kho một lần để các màn hình có thể tổng hợp theo Rack/Bin.
  getAllStock: (warehouseId, { size = 100, fromDate, toDate } = {}) =>
    fetchAllStock(warehouseId, size, { fromDate, toDate }),

  /**
   * Xem các mặt hàng và số lượng đang nằm trong một Bin.
   *
   * BE chưa có endpoint lọc trực tiếp theo binId. Endpoint tồn kho theo kho trả
   * binId trong từng StockBatchResponse, vì vậy FE tải đủ các trang rồi lọc theo Bin.
   *
   * @returns {Promise<{content: Array, totalElements: number, totalQuantity: number|null, quantityMasked: boolean}>}
   */
  getStockByBin: async (warehouseId, binId, { size = 100 } = {}) => {
    if (!warehouseId || !binId) {
      throw new Error('warehouseId and binId are required to view inventory in a bin.')
    }

    const allBatches = await fetchAllStock(warehouseId, size)
    const normalizedBinId = String(binId)
    const content = allBatches.filter((batch) => String(batch.binId) === normalizedBinId)

    return {
      content,
      totalElements: content.length,
      quantityMasked: content.some((batch) => batch?.quantityMasked === true),
      totalQuantity: sumStockQuantity(content),
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
