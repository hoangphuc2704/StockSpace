import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Upload,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import Button from '@/components/atoms/Button'
import Modal from '@/components/organisms/Modal'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'
import { getApiErrorMessage } from '@/config/apiError'
import dataContinuityApi from '@/services/wms/dataContinuityApi'
import { WMS_IMPORT_STATUS } from '@/services/wms/wmsDataTypes'

const MAX_FILE_SIZE = 10 * 1024 * 1024

const STATUS_STYLE = {
  VALIDATED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  INVALID: 'border-amber-200 bg-amber-50 text-amber-800',
  APPLIED: 'border-blue-200 bg-blue-50 text-blue-800',
  FAILED: 'border-rose-200 bg-rose-50 text-rose-800',
}

const STATUS_LABEL = {
  VALIDATED: 'Valid - ready to apply',
  INVALID: 'Invalid workbook',
  APPLIED: 'Applied',
  FAILED: 'Apply failed',
}

const ERROR_GUIDANCE = {
  WMS_IMPORT_FILE_INVALID:
    'The file is empty, damaged, contains a formula, or is not the original .xlsx workbook.',
  WMS_IMPORT_SCHEMA_UNSUPPORTED:
    'The workbook schema, version, metadata, warehouse, or audit scope is unsupported. Download a fresh workbook.',
  WMS_IMPORT_LIMIT_EXCEEDED:
    'The workbook exceeds a backend limit (10 MiB, 10,000 rows, 1,000 movements, or a cell-size limit). Split it into smaller files.',
  UOM_NOT_FOUND:
    'A SKU references a unit of measure that is not active or visible for this tenant. Use a code from the latest UOM list or exported workbook, then validate a new workbook.',
  UOM_NOT_VISIBLE:
    'A SKU references a unit of measure that is not visible for this tenant. Use a code from the latest UOM list or exported workbook, then validate a new workbook.',
  WMS_IMPORT_JOB_NOT_FOUND:
    'This validation job no longer exists or is not accessible. Select the source workbook and validate again.',
  WMS_IMPORT_JOB_INVALID_STATUS:
    'The job status changed and no longer permits this action. Its latest status has been loaded.',
  WMS_IMPORT_APPLY_IN_PROGRESS:
    'Another Apply request is still processing this job. Its latest status has been loaded; wait before trying again.',
  WMS_IMPORT_ALREADY_APPLIED:
    'This job or identical workbook content was already applied. It will not be retried.',
  WMS_IMPORT_STALE:
    'Warehouse, stock, layout, or audit data changed. Download a fresh workbook and repeat validation.',
  UNSUPPORTED_MEDIA_TYPE:
    'The workbook was not sent as multipart/form-data. Reload the page and select the .xlsx file again.',
  SERVICE_UNAVAILABLE:
    'The import service or database is temporarily unavailable. No data was changed; please try again later.',
  SYSTEM_ERROR:
    'The backend could not process this workbook because of an unexpected server error. No data was changed.',
  FORBIDDEN:
    'Your account, contract, warehouse assignment, or permission does not allow this action.',
}

const WORKBOOK_DETAIL_ERROR_CODES = new Set([
  'WMS_IMPORT_FILE_INVALID',
  'WMS_IMPORT_SCHEMA_UNSUPPORTED',
  'WMS_IMPORT_LIMIT_EXCEEDED',
])

const getErrorCode = (error) => {
  const code = error?.response?.data?.code || error?.response?.data?.errorCode
  if (code) return code
  if (error?.response?.status === 403) return 'FORBIDDEN'
  // A bare 404 has no domain error code, so it is the import-job lookup
  // response. Preserve explicit backend codes such as UOM_NOT_FOUND above.
  if (error?.response?.status === 404) return 'WMS_IMPORT_JOB_NOT_FOUND'
  if (error?.response?.status === 413) return 'WMS_IMPORT_LIMIT_EXCEEDED'
  if (error?.response?.status === 415) return 'UNSUPPORTED_MEDIA_TYPE'
  if (error?.response?.status === 503) return 'SERVICE_UNAVAILABLE'
  return null
}

const getImportErrorMessage = (error, fallback) => {
  const code = getErrorCode(error)
  const backendMessage = error?.response?.data?.message

  // Workbook validation exceptions often include the exact missing sheet,
  // header, scope, or metadata value. Preserve that useful BE detail.
  if (
    typeof backendMessage === 'string' &&
    backendMessage.trim() &&
    WORKBOOK_DETAIL_ERROR_CODES.has(code)
  ) {
    return backendMessage.trim()
  }

  return ERROR_GUIDANCE[code] || getApiErrorMessage(error, fallback)
}

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('vi-VN')
}

const toJob = (result) => result?.job || result

const normalizeValidationErrors = (job) =>
  (job?.errors || []).flatMap((row) => {
    const errors = Array.isArray(row.validationErrors) ? row.validationErrors : []
    return errors.map((error, index) => ({
      key: `${row.sheetName}-${row.rowNumber}-${error.code}-${index}`,
      sheetName: row.sheetName,
      rowNumber: row.rowNumber,
      groupKey: row.groupKey,
      code: error.code,
      message: error.message,
    }))
  })

const WmsImportDialog = ({
  isOpen,
  onClose,
  title,
  description,
  importType,
  scopeKey,
  validateWorkbook,
  applyWorkbook,
  allowApply = true,
  applyUnavailableMessage,
  confirmation,
  onApplied,
  onStale,
}) => {
  const confirmDialog = useConfirmDialog()
  const [selectedFile, setSelectedFile] = useState(null)
  const [job, setJob] = useState(null)
  const [appliedResult, setAppliedResult] = useState(null)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(null)
  const [inputVersion, setInputVersion] = useState(0)
  const [applyLocked, setApplyLocked] = useState(false)
  const operationRef = useRef(false)
  const jobRevisionRef = useRef(0)
  const previousStorageKeyRef = useRef(null)
  const storageKey = `stockspace:wms-import:${importType}:${scopeKey || 'global'}`

  const clearJob = useCallback(() => {
    // Invalidate any in-flight restore/reload before clearing local state.
    // Otherwise a late GET response could put an old job back after a new
    // workbook has been selected.
    jobRevisionRef.current += 1
    sessionStorage.removeItem(storageKey)
    setJob(null)
    setAppliedResult(null)
    setApplyLocked(false)
  }, [storageKey])

  const jobMatchesScope = useCallback(
    (nextJob) => {
      if (!nextJob || nextJob.importType !== importType) return false
      if (importType === 'OFFLINE_MOVEMENT') {
        return String(nextJob.warehouseId || '') === String(scopeKey || '')
      }
      if (importType === 'AUDIT_RECONCILIATION') {
        return String(nextJob.auditId || '') === String(scopeKey || '')
      }
      return !nextJob.warehouseId && !nextJob.auditId
    },
    [importType, scopeKey]
  )

  const loadLatestJob = useCallback(
    async (jobId, { quiet = false, requireValidated = false } = {}) => {
      const requestRevision = jobRevisionRef.current
      try {
        if (!quiet) setBusy('loading')
        const nextJob = await dataContinuityApi.getImportJob(jobId)
        if (requestRevision !== jobRevisionRef.current) return null
        if (!jobMatchesScope(nextJob)) {
          sessionStorage.removeItem(storageKey)
          setJob(null)
          setAppliedResult(null)
          setApplyLocked(false)
          if (!quiet || requireValidated) {
            setNotice({ type: 'error', text: 'The saved import job does not match this screen.' })
          }
          return null
        }
        if (requireValidated && nextJob.status !== WMS_IMPORT_STATUS.VALIDATED) {
          sessionStorage.removeItem(storageKey)
          setJob(null)
          setAppliedResult(null)
          setApplyLocked(false)
          setNotice({
            type: 'error',
            text: 'The saved import job is no longer ready to apply. Validate the workbook again.',
          })
          return null
        }
        setJob(nextJob)
        return nextJob
      } catch (error) {
        if (requestRevision !== jobRevisionRef.current) return null
        const code = getErrorCode(error)
        const isNotFound = code === 'WMS_IMPORT_JOB_NOT_FOUND' || error?.response?.status === 404
        if (isNotFound && requestRevision === jobRevisionRef.current) {
          sessionStorage.removeItem(storageKey)
          setJob(null)
          setAppliedResult(null)
          setApplyLocked(false)
        }
        if (!quiet || requireValidated) {
          setNotice({
            type: 'error',
            text: getImportErrorMessage(error, 'Could not reload the import job.'),
          })
        }
        return null
      } finally {
        if (!quiet) setBusy('')
      }
    },
    [jobMatchesScope, storageKey]
  )

  useEffect(() => {
    const previousKey = previousStorageKeyRef.current
    if (previousKey && previousKey !== storageKey) sessionStorage.removeItem(previousKey)
    previousStorageKeyRef.current = storageKey
    jobRevisionRef.current += 1

    const savedJobId = sessionStorage.getItem(storageKey)
    let active = true
    queueMicrotask(() => {
      if (!active) return
      setSelectedFile(null)
      setJob(null)
      setAppliedResult(null)
      setNotice(null)
      setApplyLocked(false)
      setInputVersion((value) => value + 1)
      if (savedJobId) loadLatestJob(savedJobId, { quiet: true, requireValidated: true })
    })

    return () => {
      active = false
    }
  }, [loadLatestJob, storageKey])

  const validationErrors = useMemo(() => normalizeValidationErrors(job), [job])

  const selectFile = (event) => {
    const file = event.target.files?.[0] || null
    setNotice(null)
    setAppliedResult(null)
    clearJob()

    if (!file) {
      setSelectedFile(null)
      return
    }
    if (file.size === 0) {
      setSelectedFile(null)
      setInputVersion((value) => value + 1)
      setNotice({ type: 'error', text: 'The workbook is empty.' })
      return
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setSelectedFile(null)
      setInputVersion((value) => value + 1)
      setNotice({ type: 'error', text: 'Only the original .xlsx workbook is accepted.' })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null)
      setInputVersion((value) => value + 1)
      setNotice({ type: 'error', text: 'The workbook exceeds the 10 MiB upload limit.' })
      return
    }
    setSelectedFile(file)
  }

  const handleValidate = async () => {
    if (!selectedFile || operationRef.current) return
    const fileToValidate = selectedFile
    // A validation response must always replace the previous job. Clearing
    // before the request also prevents a failed validation from leaving an
    // old job eligible for Apply.
    clearJob()
    const validationRevision = jobRevisionRef.current
    operationRef.current = true
    setBusy('validating')
    setNotice(null)
    setAppliedResult(null)
    try {
      const nextJob = toJob(await validateWorkbook(fileToValidate))
      if (validationRevision !== jobRevisionRef.current) return
      if (!nextJob?.jobId) {
        throw new Error('The backend did not return a validation job ID.')
      }
      if (!jobMatchesScope(nextJob)) {
        throw new Error('The backend returned an import job for a different workflow or scope.')
      }
      setJob(nextJob)
      setApplyLocked(false)
      sessionStorage.setItem(storageKey, nextJob.jobId)
      if (nextJob.status === WMS_IMPORT_STATUS.VALIDATED) {
        toast.success('Workbook validation completed successfully.')
      } else if (nextJob.status === WMS_IMPORT_STATUS.INVALID) {
        setNotice({
          type: 'warning',
          text: 'Validation completed with data errors. Correct the source workbook and validate it as a new job.',
        })
      }
    } catch (error) {
      setNotice({
        type: 'error',
        text: getImportErrorMessage(error, 'Workbook validation failed.'),
      })
    } finally {
      operationRef.current = false
      setBusy('')
    }
  }

  const handleApplyFailure = async (error) => {
    const code = getErrorCode(error)
    const status = error?.response?.status
    const isNotFound = status === 404 || code === 'WMS_IMPORT_JOB_NOT_FOUND'

    if (code === 'WMS_IMPORT_STALE') {
      clearJob()
      setSelectedFile(null)
      setInputVersion((value) => value + 1)
      await onStale?.()
    } else if (isNotFound) {
      // A 404 means the job can no longer be used. This includes explicit
      // backend 404 domain codes: the user must create a fresh validation job.
      clearJob()
      setNotice({
        type: 'error',
        text: 'The validation job is no longer available (404). Select the workbook and validate it again.',
      })
      return
    } else if (status === 409) {
      // Conflicts can mean another tab is applying the job, or that the job
      // has already moved out of VALIDATED. Reload once and never retry Apply
      // blindly from the stale local state.
      const latestJob = job?.jobId
        ? await loadLatestJob(job.jobId, { quiet: true })
        : null
      if (!latestJob) {
        setNotice({
          type: 'error',
          text: 'The latest import job could not be loaded. Select the workbook and validate it again.',
        })
        return
      }
      if (latestJob?.status === WMS_IMPORT_STATUS.APPLIED) {
        setApplyLocked(true)
        sessionStorage.removeItem(storageKey)
        setNotice({
          type: 'success',
          text: 'The latest job status is APPLIED. No second Apply request was sent.',
        })
        await onApplied?.({ job: latestJob })
        return
      }
      if (latestJob?.status === WMS_IMPORT_STATUS.FAILED) {
        sessionStorage.removeItem(storageKey)
        setNotice({
          type: 'error',
          text: latestJob.failureMessage || 'The backend recorded this job as FAILED. Validate a new workbook.',
        })
        return
      }
      if (latestJob?.status === WMS_IMPORT_STATUS.INVALID) {
        sessionStorage.removeItem(storageKey)
        setNotice({
          type: 'error',
          text: 'The latest job is INVALID. Correct the workbook and validate it as a new job.',
        })
        return
      }
      setNotice({
        type: 'error',
        text:
          ERROR_GUIDANCE[code] ||
          'The server returned a conflict. The latest job status was loaded; wait before trying again.',
      })
      return
    } else if (status >= 500 && job?.jobId) {
      const latestJob = await loadLatestJob(job.jobId, { quiet: true })
      if (latestJob?.status === WMS_IMPORT_STATUS.APPLIED) {
        setApplyLocked(true)
        sessionStorage.removeItem(storageKey)
        setNotice({ type: 'success', text: 'The server confirms that this job was applied.' })
        await onApplied?.({ job: latestJob })
        return
      }
      if (latestJob?.status === WMS_IMPORT_STATUS.FAILED) {
        sessionStorage.removeItem(storageKey)
        setNotice({
          type: 'error',
          text:
            latestJob.failureMessage ||
            'The backend failed while applying this workbook. Validate a new workbook before retrying.',
        })
        return
      }
      if (latestJob?.status === WMS_IMPORT_STATUS.VALIDATED) {
        setNotice({
          type: 'error',
          text:
            'Apply was not completed. The backend still reports this job as VALIDATED, so no successful Apply was confirmed. Check the backend log before retrying.',
        })
        return
      }
    }

    setNotice({
      type: 'error',
      text: getImportErrorMessage(error, 'Could not apply the import job.'),
    })
  }

  const handleApply = async () => {
    if (
      !job ||
      job.status !== WMS_IMPORT_STATUS.VALIDATED ||
      !allowApply ||
      applyLocked ||
      operationRef.current
    ) {
      return
    }

    const confirmed = await confirmDialog({
      title: confirmation?.title || 'Apply validated workbook',
      message: confirmation?.message,
      confirmText: confirmation?.confirmText || 'Apply workbook',
    })
    if (!confirmed || operationRef.current) return

    operationRef.current = true
    setNotice(null)
    try {
      // Reload immediately before Apply. The backend only accepts a job that
      // still exists for this tenant and is still VALIDATED, so stale jobs
      // restored from sessionStorage never reach the Apply endpoint.
      const latestJob = await loadLatestJob(job.jobId)
      if (!latestJob) return
      if (latestJob.status !== WMS_IMPORT_STATUS.VALIDATED) {
        // Keep the latest result visible, but never persist a job that cannot
        // be applied. The next open must start with a new validation.
        sessionStorage.removeItem(storageKey)
        setNotice({
          type: 'error',
          text: 'This validation job is no longer ready to apply. Validate the workbook again.',
        })
        return
      }

      setBusy('applying')
      const result = await applyWorkbook(latestJob.jobId)
      const appliedJob = toJob(result)
      if (!jobMatchesScope(appliedJob) || appliedJob.status !== WMS_IMPORT_STATUS.APPLIED) {
        throw new Error('The backend did not confirm an APPLIED import job.')
      }
      setJob(appliedJob)
      setAppliedResult(result)
      // APPLIED jobs are terminal; only a fresh VALIDATED job may be
      // restored for a future Apply flow.
      sessionStorage.removeItem(storageKey)
      setSelectedFile(null)
      setInputVersion((value) => value + 1)
      setNotice({ type: 'success', text: 'The workbook was applied successfully.' })
      toast.success('Import applied successfully.')
      await onApplied?.(result)
    } catch (error) {
      await handleApplyFailure(error)
    } finally {
      operationRef.current = false
      setBusy('')
    }
  }

  const handleDownloadErrors = async () => {
    if (!job?.jobId || operationRef.current) return
    operationRef.current = true
    setBusy('downloading-errors')
    setNotice(null)
    try {
      await dataContinuityApi.downloadImportErrors(job.jobId)
    } catch (error) {
      const code = getErrorCode(error)
      if (code === 'WMS_IMPORT_JOB_INVALID_STATUS') {
        await loadLatestJob(job.jobId, { quiet: true })
      } else if (code === 'WMS_IMPORT_JOB_NOT_FOUND' || error?.response?.status === 404) {
        clearJob()
      }
      setNotice({
        type: 'error',
        text: getImportErrorMessage(error, 'Could not download the error workbook.'),
      })
    } finally {
      operationRef.current = false
      setBusy('')
    }
  }

  const handleClose = () => {
    if (busy) return
    onClose()
  }

  const receiptResults = Array.isArray(appliedResult?.receipts) ? appliedResult.receipts : []

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} className="max-w-5xl">
      <div className="max-h-[76vh] space-y-5 overflow-y-auto pr-1">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p>{description}</p>
          <p className="mt-1 text-xs text-blue-700">
            Validate only checks the workbook. Data changes happen only after a separate confirmed
            Apply.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <label
            className="block text-sm font-semibold text-slate-800"
            htmlFor={`${importType}-file`}
          >
            Source workbook (.xlsx, maximum 10 MiB)
          </label>
          <input
            key={inputVersion}
            id={`${importType}-file`}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={Boolean(busy)}
            onChange={selectFile}
            className="mt-2 block w-full rounded-md border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:font-semibold file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-60"
          />
          {selectedFile && (
            <div className="mt-3 flex min-w-0 items-center gap-2 text-sm text-slate-600">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="truncate font-medium text-slate-800">{selectedFile.name}</span>
              <span className="shrink-0">({formatBytes(selectedFile.size)})</span>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleValidate}
              disabled={!selectedFile || Boolean(busy)}
              isLoading={busy === 'validating'}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Validate workbook
            </Button>
            {job?.jobId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => loadLatestJob(job.jobId)}
                disabled={Boolean(busy)}
                isLoading={busy === 'loading'}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reload status
              </Button>
            )}
          </div>
        </div>

        {notice && (
          <div
            role="alert"
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : notice.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        {job && (
          <section className="space-y-4" aria-labelledby={`${importType}-result-heading`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 id={`${importType}-result-heading`} className="font-semibold text-slate-950">
                  Validation job
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {job.originalFilename} · schema {job.schemaVersion} · created{' '}
                  {formatDateTime(job.createdAt)}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[job.status] || 'border-slate-200 bg-slate-50 text-slate-700'}`}
              >
                {STATUS_LABEL[job.status] || job.status}
              </span>
            </div>

            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {[
                ['Total rows', job.totalRows],
                ['Valid rows', job.validRows],
                ['Invalid rows', job.invalidRows],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-r border-slate-200 px-3 py-3 last:border-r-0 sm:px-4"
                >
                  <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-950 tabular-nums">{value ?? 0}</p>
                </div>
              ))}
            </div>

            {job.failureMessage && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{job.failureMessage}</span>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                    <tr>
                      <th className="px-3 py-2.5">Sheet</th>
                      <th className="px-3 py-2.5 text-right">Row</th>
                      <th className="px-3 py-2.5">Group</th>
                      <th className="px-3 py-2.5">Error code</th>
                      <th className="px-3 py-2.5">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validationErrors.map((error) => (
                      <tr key={error.key} className="align-top">
                        <td className="px-3 py-2.5 font-medium">{error.sheetName}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{error.rowNumber}</td>
                        <td className="px-3 py-2.5">{error.groupKey || '-'}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-rose-700">
                          {error.code}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {Number(job.invalidRows) > Number(job.errors?.length || 0) && (
              <p className="text-sm text-amber-800">
                Only {job.errors?.length || 0} of {job.invalidRows} invalid rows are shown inline.
                Download the error workbook for the complete list.
              </p>
            )}

            {receiptResults.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-emerald-200">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-emerald-50 text-xs font-semibold text-emerald-900 uppercase">
                    <tr>
                      <th className="px-3 py-2.5">Sequence</th>
                      <th className="px-3 py-2.5">Movement reference</th>
                      <th className="px-3 py-2.5">Receipt ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100">
                    {receiptResults.map((receipt) => (
                      <tr key={`${receipt.sequenceNo}-${receipt.movementRef}`}>
                        <td className="px-3 py-2.5 tabular-nums">{receipt.sequenceNo}</td>
                        <td className="px-3 py-2.5 font-medium">{receipt.movementRef}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{receipt.receiptId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {[WMS_IMPORT_STATUS.INVALID, WMS_IMPORT_STATUS.FAILED].includes(job.status) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadErrors}
                    disabled={Boolean(busy)}
                    isLoading={busy === 'downloading-errors'}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download errors
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                {!allowApply && job.status === WMS_IMPORT_STATUS.VALIDATED && (
                  <p className="max-w-md text-xs text-slate-500">
                    {applyUnavailableMessage ||
                      'You may validate this workbook, but your account cannot apply it.'}
                  </p>
                )}
                {allowApply && (
                  <Button
                    type="button"
                    onClick={handleApply}
                    disabled={
                      job.status !== WMS_IMPORT_STATUS.VALIDATED || applyLocked || Boolean(busy)
                    }
                    isLoading={busy === 'applying'}
                    className="gap-2 bg-emerald-700 hover:bg-emerald-800"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Apply validated workbook
                  </Button>
                )}
                {job.status === WMS_IMPORT_STATUS.APPLIED && (
                  <p className="text-xs text-slate-500">
                    Applied at {formatDateTime(job.appliedAt)}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {!job && busy === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading saved import job...
          </div>
        )}
      </div>
    </Modal>
  )
}

export default WmsImportDialog
