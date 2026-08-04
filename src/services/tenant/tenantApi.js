import api from '../apiConfig'

const tenantApi = {
  createBooking: (data) => {
    return api.post('/tenant/bookings', data)
  },
  getMyBookings: ({ page, size } = {}) => {
    return api.get('/tenant/bookings', { params: { page, size } })
  },
  cancelBooking: (bookingId) => {
    return api.delete(`/tenant/bookings/${bookingId}`)
  },
}

export default tenantApi
