import api from './apiConfig'

/**
 * Dispute API Service
 *
 * Endpoints:
 *   POST /api/disputes         — Mở tranh chấp (multipart: request JSON + files ảnh bằng chứng)
 *   GET  /api/disputes/mine    — Danh sách dispute của user hiện tại (phân trang)
 */
const disputeApi = {
  /**
   * Mở tranh chấp hợp đồng.
   * BE nhận multipart/form-data:
   *   - @RequestPart("request") → JSON string { contractId, reason }
   *   - @RequestPart("files")   → List<MultipartFile> (optional)
   *
   * @param {{ contractId: string, reason: string }} data
   * @param {File[]} [files] — mảng file ảnh bằng chứng (tuỳ chọn)
   * @returns {Promise} ApiResponse<DisputeResponse>
   */
  createDispute: (data, files = []) => {
    const formData = new FormData()

    // BE đọc @RequestPart("request") là raw JSON string
    formData.append(
      'request',
      new Blob([JSON.stringify(data)], { type: 'application/json' })
    )

    // Append từng file ảnh bằng chứng
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('files', file)
      })
    }

    return api.post('/disputes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /**
   * Lấy danh sách tranh chấp của user đang đăng nhập.
   * @param {{ page?: number, size?: number }} params
   * @returns {Promise} ApiResponse<PagedResponse<DisputeResponse>>
   */
  getMyDisputes: ({ page = 0, size = 10 } = {}) => {
    return api.get('/disputes/mine', { params: { page, size } })
  },
}

export default disputeApi
