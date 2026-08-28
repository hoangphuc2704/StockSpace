import { toast } from 'react-hot-toast'

const DEFAULT_API_ERROR = 'Something went wrong. Please try again.'

// Override message theo errorCode của BE tại một nơi duy nhất.
// Ví dụ: SUBSCRIPTION_REQUIRED: 'Vui lòng đăng ký gói dịch vụ trước.'
export const API_ERROR_MESSAGE_OVERRIDES = {
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

  const message =
    toMessage(payload) ||
    toMessage(payload?.errors) ||
    toMessage(error?.message)

  return message || fallback
}

/** Show a backend error consistently from one place. */
export const showApiErrorToast = (error, fallback = DEFAULT_API_ERROR, options = {}) => {
  const customMessage =
    options.message ||
    options.byCode?.[error?.response?.data?.errorCode || error?.response?.data?.code] ||
    options.byStatus?.[error?.response?.status] ||
    error?.config?.toastMessage ||
    error?.config?.toastMessages?.[error?.response?.data?.errorCode || error?.response?.data?.code] ||
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
