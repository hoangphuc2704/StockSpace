/**
 * Shared WMS data-continuity contracts.
 *
 * The frontend is JavaScript-based, so these JSDoc types mirror the backend
 * DTOs without introducing a second TypeScript build path.
 */

export const WMS_IMPORT_TYPE = Object.freeze({
  SKU_CATALOG: 'SKU_CATALOG',
  OFFLINE_MOVEMENT: 'OFFLINE_MOVEMENT',
  AUDIT_RECONCILIATION: 'AUDIT_RECONCILIATION',
})

export const WMS_IMPORT_STATUS = Object.freeze({
  VALIDATED: 'VALIDATED',
  INVALID: 'INVALID',
  APPLIED: 'APPLIED',
  FAILED: 'FAILED',
})

/** @typedef {'SKU_CATALOG'|'OFFLINE_MOVEMENT'|'AUDIT_RECONCILIATION'} WmsImportType */
/** @typedef {'VALIDATED'|'INVALID'|'APPLIED'|'FAILED'} WmsImportJobStatus */

/**
 * @typedef {Object} WmsValidationError
 * @property {string} code
 * @property {string} message
 */

/**
 * @typedef {Object} WmsImportRowError
 * @property {string} sheetName
 * @property {number} rowNumber
 * @property {string|null} groupKey
 * @property {Record<string, unknown>} normalizedPayload
 * @property {WmsValidationError[]} validationErrors
 */

/**
 * @typedef {Object} WmsImportJob
 * @property {string} jobId
 * @property {WmsImportType} importType
 * @property {WmsImportJobStatus} status
 * @property {string} schemaVersion
 * @property {string} originalFilename
 * @property {string} fileSha256
 * @property {string} contentSha256
 * @property {Record<string, unknown>} contextMetadata
 * @property {string|null} warehouseId
 * @property {string|null} auditId
 * @property {number} totalRows
 * @property {number} validRows
 * @property {number} invalidRows
 * @property {string|null} failureMessage
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} appliedAt
 * @property {WmsImportRowError[]} errors
 */

/**
 * @typedef {Object} OfflineMovementApplyResult
 * @property {WmsImportJob} job
 * @property {{movementRef: string, sequenceNo: number, receiptId: string}[]} receipts
 */

/**
 * @typedef {Object} AuditReconciliationApplyResult
 * @property {WmsImportJob} job
 * @property {Record<string, unknown>} audit
 */
