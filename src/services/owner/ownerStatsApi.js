import api from '../apiConfig'

const ownerStatsApi = {
  // Lấy thống kê doanh thu theo tháng của Owner
  getRevenueSummary: (year) => {
    return api.get('/owner/stats/revenue', {
      params: year ? { year } : {}
    })
  },

  // Lấy thống kê tỷ lệ lấp đầy kho bãi của Owner
  getOccupancyRate: () => {
    return api.get('/owner/stats/occupancy')
  }
}

export default ownerStatsApi
