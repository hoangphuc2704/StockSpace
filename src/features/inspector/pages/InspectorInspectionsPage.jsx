import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
  User,
  Warehouse,
  X,
  XCircle,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import logoDaidien from '../../../assets/logoDaidien.png'
import Badge from '../../../components/atoms/Badge'
import Sidebar from '../../../components/SideBar'
import { closeMobileSidebar, toggleSidebar } from '../../../store/uiSlide'
import {
  clearActionError,
  fetchAssignedInspections,
  setPage,
  submitReport,
} from '../../../store/inspectorManagement'

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '---')

const shortId = (value) => (value ? `#${String(value).slice(0, 8).toUpperCase()}` : '---')

const getInspectionDate = (inspection) =>
  inspection?.inspectionDate ||
  inspection?.scheduledAt ||
  inspection?.appointmentDate ||
  inspection?.createdAt ||
  null

const getOwnerName = (inspection) =>
  inspection?.ownerName || inspection?.warehouseOwnerName || inspection?.createdByName || 'Chua cap nhat'

const getAddress = (inspection) =>
  inspection?.warehouseAddress || inspection?.address || inspection?.location || 'Chua co dia chi'

const getSummaryText = (inspection) =>
  inspection?.reportNotes ||
  inspection?.notes ||
  inspection?.description ||
  inspection?.inspectionNote ||
  'Chua co thong tin mo ta bo sung.'

const STATUS_CONFIG = {
  ALL: { label: 'Tat ca', variant: 'outline' },
  PENDING: { label: 'Cho kiem dinh', variant: 'warning' },
  IN_PROGRESS: { label: 'Dang xu ly', variant: 'primary' },
  PASSED: { label: 'Dat yeu cau', variant: 'success' },
  FAILED: { label: 'Khong dat', variant: 'danger' },
}

const CHECKLIST_ITEMS = [
  { key: 'fireSafety', label: 'He thong PCCC an toan' },
  { key: 'electrical', label: 'Dien va chieu sang van hanh tot' },
  { key: 'structure', label: 'Ket cau kho on dinh' },
  { key: 'cleanliness', label: 'Ve sinh va moi truong dat yeu cau' },
]

const StatCard = ({ title, value, hint, icon: Icon, tone = 'slate' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{hint}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone] || tones.slate}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

const InspectionDetailModal = ({ inspection, onClose, onOpenSubmit }) => {
  if (!inspection) return null

  const statusConfig = STATUS_CONFIG[inspection.status] || STATUS_CONFIG.ALL
  const canSubmit = inspection.status === 'PENDING' || inspection.status === 'IN_PROGRESS'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">{inspection.warehouseName}</h2>
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              </div>
              <p className="mt-2 font-mono text-xs text-slate-400">{shortId(inspection.id)}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.35fr_0.95fr]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Thong tin cong viec</h3>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Warehouse className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-500">Kho hang</p>
                    <p className="mt-1 font-semibold text-slate-900">{inspection.warehouseName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-500">Chu kho</p>
                    <p className="mt-1 font-semibold text-slate-900">{getOwnerName(inspection)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-500">Dia chi</p>
                    <p className="mt-1 font-semibold text-slate-900">{getAddress(inspection)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-500">Ngay hen / tao</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(getInspectionDate(inspection))}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-500">Cap nhat lan cuoi</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(inspection.updatedAt || inspection.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Mo ta va ghi chu hien co</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{getSummaryText(inspection)}</p>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Huong dan kiem duyet</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Xac nhan hien trang kho, doi chieu thong tin dang ky va ghi ro cac van de anh
                    huong den ket qua kiem dinh.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Hanh dong</h3>
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => {
                    onClose()
                    onOpenSubmit(inspection)
                  }}
                  disabled={!canSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  <FileText className="h-4 w-4" />
                  {canSubmit ? 'Lap bien ban kiem dinh' : 'Ho so da hoan tat'}
                </button>
                <p className="text-xs leading-5 text-slate-500">
                  Sau khi nop ket qua, ho so se duoc cap nhat ve trang thai dat hoac khong dat.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </motion.div>
    </div>
  )
}

const SubmitReportModal = ({ inspection, onClose }) => {
  const dispatch = useDispatch()
  const { actionLoading, actionError } = useSelector((state) => state.inspectorManagement)
  const [status, setStatus] = useState(inspection.status === 'FAILED' ? 'FAILED' : 'PASSED')
  const [notes, setNotes] = useState('')
  const [localError, setLocalError] = useState('')
  const [checklist, setChecklist] = useState({
    fireSafety: true,
    electrical: true,
    structure: true,
    cleanliness: true,
  })

  useEffect(() => {
    dispatch(clearActionError())
  }, [dispatch])

  const passedCount = Object.values(checklist).filter(Boolean).length

  const toggleChecklist = (key) => {
    setChecklist((current) => ({ ...current, [key]: !current[key] }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!notes.trim()) {
      setLocalError('Vui long nhap bien ban ket luan de luu ket qua kiem dinh.')
      return
    }

    if (status === 'PASSED' && passedCount !== CHECKLIST_ITEMS.length) {
      setLocalError('Trang thai DAT YEU CAU can tat ca hang muc checklist deu dat.')
      return
    }

    const result = await dispatch(
      submitReport({
        id: inspection.id,
        payload: {
          status,
          reportNotes: notes.trim(),
        },
      })
    )

    if (submitReport.fulfilled.match(result)) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Lap bien ban kiem duyet</h2>
              <p className="mt-1 text-sm text-slate-500">
                {inspection.warehouseName} · {shortId(inspection.id)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-800">
                  Ket luan ho so
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setStatus('PASSED')}
                    className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                      status === 'PASSED'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      Dat yeu cau
                    </div>
                    <p className="mt-2 text-xs leading-5">
                      Dung khi toan bo hang muc kiem tra deu dat va kho co the duoc thong qua.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('FAILED')}
                    className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                      status === 'FAILED'
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <XCircle className="h-4 w-4" />
                      Khong dat
                    </div>
                    <p className="mt-2 text-xs leading-5">
                      Dung khi co hang muc khong phu hop va can chu kho bo sung, chinh sua.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Bien ban / nhan xet chi tiet
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={7}
                  placeholder="Mo ta hien trang, thong tin doi chieu, cac diem dat va cac van de can khac phuc..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition-colors focus:border-blue-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Checklist kiem tra</h3>
                  <Badge variant="outline">{passedCount}/{CHECKLIST_ITEMS.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {CHECKLIST_ITEMS.map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={checklist[item.key]}
                        onChange={() => toggleChecklist(item.key)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300"
                      />
                      <span className="leading-5">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-slate-600">
                Neu chon <span className="font-semibold text-slate-900">Dat yeu cau</span>, he
                thong se yeu cau tat ca checklist deu dat. Neu khong, hay chon{' '}
                <span className="font-semibold text-slate-900">Khong dat</span> va ghi ro ly do.
              </div>
            </div>
          </div>

          {(localError || actionError) && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{localError || actionError}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Huy bo
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Luu ket qua kiem duyet
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

const InspectorInspectionsPage = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { inspections, loading, error, page, size, totalPages, totalElements } = useSelector(
    (state) => state.inspectorManagement
  )

  const [statusFilter, setStatusFilter] = useState('ALL')
  const [detailInspection, setDetailInspection] = useState(null)
  const [submitInspection, setSubmitInspection] = useState(null)

  useEffect(() => {
    dispatch(fetchAssignedInspections({ page, size }))
  }, [dispatch, page, size])

  const filteredInspections = useMemo(() => {
    if (statusFilter === 'ALL') return inspections
    return inspections.filter((inspection) => inspection.status === statusFilter)
  }, [inspections, statusFilter])

  const stats = useMemo(() => {
    const pending = inspections.filter((inspection) => inspection.status === 'PENDING').length
    const inProgress = inspections.filter((inspection) => inspection.status === 'IN_PROGRESS').length
    const passed = inspections.filter((inspection) => inspection.status === 'PASSED').length
    const failed = inspections.filter((inspection) => inspection.status === 'FAILED').length

    return { pending, inProgress, passed, failed }
  }, [inspections])

  const openSubmitModal = (inspection) => {
    setDetailInspection(null)
    setSubmitInspection(inspection)
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <HiBars3 className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-2">
            <div className="shrink-0 rounded-lg bg-white p-1.5">
              <img src={logoDaidien} alt="Logo" className="h-10 w-16 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-950">
              StockSpace Inspector
            </span>
          </div>
        </div>
      </header>

      <div className="md:hidden">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole="INSPECTOR" />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
            <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-7 text-white shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Inspection Workspace
                  </div>
                  <h1 className="mt-4 text-3xl font-bold tracking-tight">
                    Trang kiem duyet ho so kho bai
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Theo doi ho so duoc giao, xem nhanh thong tin kho va lap bien ban ket qua
                    kiem dinh ngay trong mot man hinh.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Tong ho so</p>
                    <p className="mt-2 text-2xl font-bold">{totalElements || inspections.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Cho xu ly</p>
                    <p className="mt-2 text-2xl font-bold">{stats.pending}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Dang lam</p>
                    <p className="mt-2 text-2xl font-bold">{stats.inProgress}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Hoan tat</p>
                    <p className="mt-2 text-2xl font-bold">{stats.passed + stats.failed}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <StatCard
                title="Cho kiem dinh"
                value={stats.pending}
                hint="Ho so moi can duoc xem xet ban dau."
                icon={ClipboardCheck}
                tone="blue"
              />
              <StatCard
                title="Dang xu ly"
                value={stats.inProgress}
                hint="Cac ho so dang trong qua trinh kiem dinh."
                icon={Clock3}
                tone="slate"
              />
              <StatCard
                title="Dat yeu cau"
                value={stats.passed}
                hint="Kho da du dieu kien thong qua."
                icon={CheckCircle2}
                tone="emerald"
              />
              <StatCard
                title="Khong dat"
                value={stats.failed}
                hint="Ho so can bo sung hoac khac phuc them."
                icon={XCircle}
                tone="rose"
              />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Danh sach ho so phan cong</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Chon mot ho so de xem chi tiet va lap bien ban kiem duyet.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    const active = statusFilter === key
                    return (
                      <button
                        key={key}
                        onClick={() => setStatusFilter(key)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                          active
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="mt-5 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-slate-500">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                    <p className="text-sm">Dang tai danh sach kiem dinh...</p>
                  </div>
                ) : filteredInspections.length === 0 ? (
                  <div className="px-6 py-20 text-center">
                    <p className="text-base font-semibold text-slate-900">
                      Khong co ho so phu hop voi bo loc hien tai.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Thu chuyen trang thai loc hoac cho them du lieu duoc phan cong.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide">
                            Ho so
                          </th>
                          <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide">
                            Kho bai
                          </th>
                          <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide">
                            Chu kho
                          </th>
                          <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide">
                            Lich / Tao
                          </th>
                          <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide">
                            Trang thai
                          </th>
                          <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide">
                            Hanh dong
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredInspections.map((inspection) => {
                          const statusConfig =
                            STATUS_CONFIG[inspection.status] || STATUS_CONFIG.ALL
                          const canSubmit =
                            inspection.status === 'PENDING' || inspection.status === 'IN_PROGRESS'

                          return (
                            <motion.tr
                              key={inspection.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="transition-colors hover:bg-slate-50"
                            >
                              <td className="px-5 py-4">
                                <p className="font-mono text-xs font-bold tracking-wide text-slate-500">
                                  {shortId(inspection.id)}
                                </p>
                                <p className="mt-2 text-sm text-slate-600">
                                  Cap nhat: {formatDate(inspection.updatedAt || inspection.createdAt)}
                                </p>
                              </td>
                              <td className="px-5 py-4">
                                <p className="font-semibold text-slate-900">
                                  {inspection.warehouseName}
                                </p>
                                <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
                                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  <span>{getAddress(inspection)}</span>
                                </p>
                              </td>
                              <td className="px-5 py-4">
                                <p className="font-medium text-slate-800">
                                  {getOwnerName(inspection)}
                                </p>
                              </td>
                              <td className="px-5 py-4 text-slate-600">
                                {formatDate(getInspectionDate(inspection))}
                              </td>
                              <td className="px-5 py-4">
                                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setDetailInspection(inspection)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Xem
                                  </button>
                                  <button
                                    onClick={() => openSubmitModal(inspection)}
                                    disabled={!canSubmit}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                  >
                                    <FileText className="h-4 w-4" />
                                    Bien ban
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    Trang {page + 1} / {totalPages} · {totalElements.toLocaleString()} ho so
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => dispatch(setPage(page - 1))}
                      disabled={page === 0 || loading}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-12 text-center text-sm font-semibold text-slate-700">
                      {page + 1}
                    </span>
                    <button
                      onClick={() => dispatch(setPage(page + 1))}
                      disabled={page >= totalPages - 1 || loading}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {detailInspection && (
          <InspectionDetailModal
            inspection={detailInspection}
            onClose={() => setDetailInspection(null)}
            onOpenSubmit={openSubmitModal}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {submitInspection && (
          <SubmitReportModal
            key={submitInspection.id}
            inspection={submitInspection}
            onClose={() => setSubmitInspection(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default InspectorInspectionsPage
