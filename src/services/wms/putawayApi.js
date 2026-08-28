import api from '../apiConfig'

const putawayApi = {
  // Gợi ý xếp hàng (Put-away suggestions)
  getSuggestions: (data) => {
    // data: { warehouseId, context, items: [{ skuId, quantity }] }
    // context: 'INBOUND' | 'TRANSFER_RECEIVE'
    return api.post('/tenant/inventory/putaway/suggestions', data)
  }
}

export default putawayApi
