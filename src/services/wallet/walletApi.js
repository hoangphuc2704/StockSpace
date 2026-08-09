import api from '../apiConfig'

const walletApi = {
  //xem thông tin và số dư vi
  getWallet: () => {
    return api.get('/wallet')
  },

  //lịch sử các yêu cầu rút tiền của minh
  getWithdrawHistory: ({ page = 0, size = 10 } = {}) => {
    return api.get('/wallet/withdrawals', { params: { page, size } })
  },

  //xem các giao dịch trng ví
  getWalletTransactions: ({ page, size, sortBy, sortDir } = {}) => {
    return api.get('/wallet/transactions', { params: { page, size } })
  },

  //xử lý IPN từ VNPay
  handleVnpayIPN: () => {
    return api.get('/auth/vnpay-ipn')
  },

  // đón nhận chuyển hướng của người dùng về BE
  handleVnpayReturn: () => {
    return api.get('/auth/vnpay-callback')
  },

  //gửi yêu cầu rút tiền về ngân hàng
  requestWithdraw: (data) => {
    return api.post('/wallet/withdraw', data)
  },

  //tạo yêu cầu nạp tiền vào ví
  requestDeposit: (data) => {
    return api.post('/wallet/top-up', data)
  },

  //từ chối yêu cầu rút tiền
  rejectWithdrawRequest: (withdrawId) => {
    return api.patch(`/wallet/withdraws/${withdrawId}/reject`)
  },

  //chấp nhận yêu cầu rút tiền
  approveWithdrawRequest: (withdrawId) => {
    return api.patch(`/wallet/withdraws/${withdrawId}/approve`)
  },

  //lấy danh sách các yêu cầu rút tiền của tất cả người dùng
  getAllWithdrawRequests: ({ page, size, sortBy, sortDir } = {}) => {
    return api.get('/wallet/withdraws/all', { params: { status, page, size } })
  },

  //kiểm tra trạng thái giao dịch
  getTransactionStatus: (paymentCode) => {
    return api.get(`/wallet/transactions/${paymentCode}/status`)
  },
}

export default walletApi
