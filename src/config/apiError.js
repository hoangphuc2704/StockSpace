import { toast } from 'react-hot-toast'

const DEFAULT_API_ERROR = 'Something went wrong. Please try again.'

// Override message theo errorCode của BE tại một nơi duy nhất.
// Ví dụ: SUBSCRIPTION_REQUIRED: 'Vui lòng đăng ký gói dịch vụ trước.'
export const API_ERROR_MESSAGE_OVERRIDES = {
  WMS_IMPORT_FILE_INVALID:
    'The workbook is empty, damaged, contains a formula, or is not a supported .xlsx file.',
  WMS_IMPORT_SCHEMA_UNSUPPORTED:
    'This workbook schema or scope is no longer supported. Download a fresh workbook and try again.',
  WMS_IMPORT_LIMIT_EXCEEDED:
    'The workbook exceeds an upload, row, movement, or cell-size limit. Split it into smaller files.',
  WMS_IMPORT_JOB_NOT_FOUND: 'The import job does not exist or is not accessible from this account.',
  WMS_IMPORT_JOB_INVALID_STATUS:
    'The import job status does not allow this action. Reload its latest status.',
  WMS_IMPORT_ALREADY_APPLIED:
    'This job or identical workbook content was already applied and will not be retried.',
  WMS_IMPORT_STALE:
    'Warehouse, inventory, layout, or audit data changed. Download a fresh workbook and start again.',
  AUDIT_MOVEMENT_LOCKED:
    'Kho đang được kiểm kê mù. Hãy chờ Staff hoàn tất kiểm kê trước khi thay đổi hoặc xuất tồn kho.',
  // EMAIL_ALREADY_EXISTS: 'Email này đã được sử dụng.',
}

const toMessage = (value) => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) return value.map(toMessage).filter(Boolean).join(', ')
  if (value && typeof value === 'object') {
    return toMessage(value.message || value.error || value.detail || value.title)
  }
  return ''
}

/** Extract the message shape used by the different BE endpoints. */
export const getApiErrorMessage = (
  error,
  fallback = DEFAULT_API_ERROR,
  { message: overrideMessage, byCode = {}, byStatus = {} } = {}
) => {
  const payload = error?.response?.data
  const errorCode = payload?.errorCode || payload?.code
  const status = error?.response?.status
  const customMessage =
    overrideMessage ||
    byCode[errorCode] ||
    byStatus[status] ||
    error?.config?.toastMessage ||
    error?.config?.toastMessages?.[errorCode] ||
    API_ERROR_MESSAGE_OVERRIDES[errorCode]

  if (customMessage) return customMessage

  const message = toMessage(payload) || toMessage(payload?.errors) || toMessage(error?.message)

  return message || fallback
}

/** Show a backend error consistently from one place. */
export const showApiErrorToast = (error, fallback = DEFAULT_API_ERROR, options = {}) => {
  const customMessage =
    options.message ||
    options.byCode?.[error?.response?.data?.errorCode || error?.response?.data?.code] ||
    options.byStatus?.[error?.response?.status] ||
    error?.config?.toastMessage ||
    error?.config?.toastMessages?.[
      error?.response?.data?.errorCode || error?.response?.data?.code
    ] ||
    API_ERROR_MESSAGE_OVERRIDES[error?.response?.data?.errorCode || error?.response?.data?.code]
  const errorMessage = getApiErrorMessage(error, fallback, options)
  if (error?.__apiErrorToastShown && !customMessage) return errorMessage

  const responseCode = error?.response?.data?.errorCode || error?.response?.data?.code
  const toastId = responseCode
    ? `api-error-${responseCode}`
    : error?.__apiErrorToastId || `api-error-${errorMessage}`

  toast.error(errorMessage, { id: toastId })
  if (error && typeof error === 'object') error.__apiErrorToastId = toastId
  if (error && typeof error === 'object') error.__apiErrorToastShown = true
  return errorMessage
}

export { DEFAULT_API_ERROR }
