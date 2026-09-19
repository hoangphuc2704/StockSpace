import api from '../apiConfig'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const currentWmsDate = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

const envelopeError = (response) => {
  const error = new Error(response?.data?.message || 'The server rejected the request.')
  error.response = response
  return error
}

const unwrapEnvelope = (response) => {
  if (response?.data?.success !== true) throw envelopeError(response)
  return response.data.data
}

const uploadWorkbook = async (url, file) => {
  const form = new FormData()
  form.append('file', file)
  const response = await api.post(url, form, {
    skipErrorToast: true,
  })
  return unwrapEnvelope(response)
}

const decodeFilename = (contentDisposition, fallbackName) => {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const plain = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1]

  if (encoded) {
    try {
      return decodeURIComponent(encoded)
    } catch {
      return encoded
    }
  }
  return plain || fallbackName
}

const throwBlobEnvelopeIfNeeded = async (response) => {
  const contentType = String(response?.headers?.['content-type'] || '')
  if (!(response?.data instanceof Blob) || !contentType.includes('json')) return

  try {
    const payload = JSON.parse(await response.data.text())
    if (payload?.success === false) {
      throw envelopeError({ ...response, data: payload })
    }
  } catch (error) {
    if (error?.response) throw error
  }
}

const downloadXlsx = async (url, fallbackName) => {
  const response = await api.get(url, {
    responseType: 'blob',
    skipErrorToast: true,
    headers: { Accept: XLSX_MIME },
  })
  await throwBlobEnvelopeIfNeeded(response)

  const filename = decodeFilename(response.headers?.['content-disposition'], fallbackName)
  const href = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(href), 0)
  return filename
}

const dataContinuityApi = {
  getImportJob: async (jobId) =>
    unwrapEnvelope(await api.get(`/tenant/wms-data/imports/${jobId}`, { skipErrorToast: true })),

  downloadImportErrors: (jobId) =>
    downloadXlsx(
      `/tenant/wms-data/imports/${jobId}/errors.xlsx`,
      `wms-import-errors-${jobId}.xlsx`
    ),

  exportCatalog: () =>
    downloadXlsx('/tenant/wms-data/catalog/export', `stockspace-catalog-${currentWmsDate()}.xlsx`),
  validateCatalog: (file) => uploadWorkbook('/tenant/wms-data/catalog/imports/validate', file),
  applyCatalog: async (jobId) => {
    const result = unwrapEnvelope(
      await api.post(`/tenant/wms-data/catalog/imports/${jobId}/apply`, undefined, {
        skipErrorToast: true,
      })
    )
    const returnedJob = result?.job || result

    // The catalog backend currently builds its response before the shared
    // apply transaction marks the job APPLIED. Reload the committed job so
    // the dialog validates the final state instead of the stale response.
    if (returnedJob?.status !== 'APPLIED') {
      const appliedJob = await dataContinuityApi.getImportJob(jobId)
      return result?.job ? { ...result, job: appliedJob } : appliedJob
    }

    return result
  },

  exportInventorySnapshot: (warehouseId) =>
    downloadXlsx(
      `/tenant/wms-data/warehouses/${warehouseId}/inventory-snapshot/export`,
      `stockspace-inventory-snapshot-${currentWmsDate()}.xlsx`
    ),

  downloadOfflineMovementTemplate: (warehouseId) =>
    downloadXlsx(
      `/tenant/wms-data/warehouses/${warehouseId}/offline-movements/template`,
      `stockspace-offline-movements-${currentWmsDate()}.xlsx`
    ),
  validateOfflineMovements: (warehouseId, file) =>
    uploadWorkbook(
      `/tenant/wms-data/warehouses/${warehouseId}/offline-movements/imports/validate`,
      file
    ),
  applyOfflineMovements: async (jobId) =>
    unwrapEnvelope(
      await api.post(
        `/tenant/wms-data/warehouses/offline-movements/imports/${jobId}/apply`,
        undefined,
        { skipErrorToast: true }
      )
    ),

  downloadAuditCountSheet: (auditId) =>
    downloadXlsx(
      `/tenant/wms-data/inventory-audits/${auditId}/count-sheet`,
      `stockspace-audit-count-${currentWmsDate()}.xlsx`
    ),
  validateAuditCount: (auditId, file) =>
    uploadWorkbook(`/tenant/wms-data/inventory-audits/${auditId}/count-imports/validate`, file),
  applyAuditCount: async (jobId) =>
    unwrapEnvelope(
      await api.post(`/tenant/wms-data/inventory-audits/count-imports/${jobId}/apply`, undefined, {
        skipErrorToast: true,
      })
    ),
}

export { decodeFilename, downloadXlsx, unwrapEnvelope }
export default dataContinuityApi
