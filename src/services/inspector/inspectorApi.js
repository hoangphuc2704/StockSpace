import api from '../apiConfig'

/**
 * Inspector API Service
 * baseURL đã có /api (từ VITE_API_URL)
 *
 * Tham số request/response map theo BE InspectorController
 * Ref: stockspace_be/inspection/controller/InspectorController.java
 */
const inspectorApi = {
  // =========================
  // INSPECTION MANAGEMENT (FOR INSPECTOR)
  // =========================

  /**
   * Xem danh sách yêu cầu kiểm định được gán (phân trang).
   * GET /api/inspector/inspections
   * params: page, size
   * response: ApiResponse<PagedResponse<InspectionReportResponse>>
   */
  getAssignedInspections: ({ page = 0, size = 10 } = {}) =>
    api.get('/inspector/inspections', { params: { page, size } }),

  /**
   * Inspector nộp kết quả kiểm định.
   * POST /api/inspector/inspections/{id}/report
   * body: SubmitInspectionRequest { status: 'PASSED' | 'FAILED', reportNotes: string }
   * response: ApiResponse<InspectionReportResponse>
   */
  submitReport: (id, data) =>
    api.post(`/inspector/inspections/${id}/report`, data),
}

export default inspectorApi
