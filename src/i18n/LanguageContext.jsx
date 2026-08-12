/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import vietnameseTranslations from './vi.generated.json'
import additionalTranslations from './vi.additional.json'

const STORAGE_KEY = 'stockspace_language'
const SUPPORTED_LANGUAGES = ['en', 'vi']
const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt']

const manualTranslations = {
  Notifications: 'Thông báo',
  'Mark all read': 'Đánh dấu tất cả đã đọc',
  Clear: 'Xóa',
  'No new notifications': 'Không có thông báo mới',
  'View All Activity': 'Xem toàn bộ hoạt động',
  'View older announcements': 'Xem thông báo cũ hơn',
  Waiting: 'Đang chờ',
  'Waiting...': 'Đang chờ...',
  Price: 'Bảng giá',
  'View Warehouses': 'Xem kho',
  Overview: 'Tổng quan',
  Users: 'Người dùng',
  'Warehouses Approval': 'Duyệt kho',
  Transactions: 'Giao dịch',
  'Warehouses Management': 'Quản lý kho',
  'Warehouse Types': 'Loại kho',
  Withdrawals: 'Yêu cầu rút tiền',
  Permission: 'Quyền hạn',
  Inspections: 'Kiểm định',
  'System Policies': 'Chính sách hệ thống',
  'System Config': 'Cấu hình hệ thống',
  'Package Subcription': 'Gói đăng ký',
  'WMS Inventory': 'Tồn kho WMS',
  'WMS Audits': 'Nhật ký WMS',
  Inventory: 'Tồn kho',
  Inbound: 'Nhập kho',
  Outbound: 'Xuất kho',
  'My Bookings': 'Kho đã đặt',
  'My Contracts': 'Hợp đồng của tôi',
  Dispute: 'Tranh chấp',
  Billing: 'Thanh toán',
  Wallet: 'Ví',
  Tasks: 'Nhiệm vụ',
  'My Inspections': 'Kiểm định của tôi',
  Logout: 'Đăng xuất',
  'Tenant Dashboard': 'Trang quản lý người thuê',
  'Owner Dashboard': 'Trang quản lý chủ kho',
  'Staff Dashboard': 'Trang quản lý nhân viên',
  'Inspector Dashboard': 'Trang quản lý kiểm định viên',
  'Admin Dashboard': 'Trang quản trị',
  Dashboard: 'Trang quản lý',
  'Warehouse Listings': 'Danh sách kho',
  'Warehouse List': 'Danh sách kho',
  'Warehouse Layout': 'Sơ đồ kho',
  'Goods in Bin': 'Hàng hóa trong ô chứa',
  Contracts: 'Hợp đồng',
  Staff: 'Nhân viên',
  Settings: 'Cài đặt',
  Financials: 'Tài chính',
  Deposits: 'Tiền nạp',
  Payments: 'Thanh toán',
  Analytics: 'Phân tích',
  'Platform Settings': 'Cài đặt nền tảng',
  Marketplace: 'Thị trường kho',
  'Staff & HR': 'Nhân sự',
  Employees: 'Nhân viên',
  Attendance: 'Chấm công',
  'Warehouse Ops': 'Vận hành kho',
  'My Warehouses': 'Kho của tôi',
  'Rental Requests': 'Yêu cầu thuê',
  Revenue: 'Doanh thu',
  'Assigned Tasks': 'Nhiệm vụ được giao',
  'Inventory Check': 'Kiểm kê',
  'Help Center': 'Trung tâm trợ giúp',
  View: 'Xem',
  'See details': 'Xem chi tiết',
  Page: 'Trang',
  Previous: 'Trước',
  Next: 'Tiếp',
  Owner: 'Chủ kho',
  Type: 'Loại',
  Location: 'Địa điểm',
  Submitted: 'Đã gửi',
  Approve: 'Duyệt',
  'Approve warehouse': 'Duyệt kho',
  Reject: 'Từ chối',
  Edit: 'Sửa',
  Filter: 'Lọc',
  Export: 'Xuất dữ liệu',
  Update: 'Cập nhật',
  Browse: 'Duyệt',
  Details: 'Chi tiết',
  Content: 'Nội dung',
  Total: 'Tổng cộng',
  Refresh: 'Làm mới',
  Use: 'Sử dụng',
  'Preview:': 'Xem trước:',
  Date: 'Ngày',
  Email: 'Email',
  Account: 'Tài khoản',
  Profile: 'Hồ sơ',
  Inactive: 'Không hoạt động',
  Completed: 'Hoàn thành',
  Pending: 'Đang chờ',
  'In Progress': 'Đang thực hiện',
  Items: 'Mặt hàng',
  items: 'mặt hàng',
  Product: 'Sản phẩm',
  Category: 'Danh mục',
  'System Inventory': 'Tồn kho hệ thống',
  'Total warehouses': 'Tổng số kho',
  Name: 'Tên',
  Zone: 'Khu vực',
  'Not provided': 'Chưa cung cấp',
  'No address available.': 'Chưa có địa chỉ.',
  'No additional description is available.': 'Chưa có mô tả bổ sung.',
  'You can enter in Vietnamese or English.': 'Bạn có thể nhập bằng tiếng Việt hoặc tiếng Anh.',
  'Translate to Vietnamese': 'Dịch sang tiếng Việt',
  'View English translation': 'Xem bản dịch tiếng Anh',
}

const translations = { ...vietnameseTranslations, ...additionalTranslations, ...manualTranslations }
const LanguageContext = createContext(null)

const normalize = (value) => value.replace(/\s+/g, ' ').trim()

const replaceKeepingWhitespace = (source, replacement) => {
  const leading = source.match(/^\s*/)?.[0] || ''
  const trailing = source.match(/\s*$/)?.[0] || ''
  return `${leading}${replacement}${trailing}`
}

const shouldSkip = (node) => {
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  return Boolean(element?.closest('[data-i18n-skip="true"]'))
}

const createDomTranslator = (root) => {
  const originalText = new WeakMap()
  const translatedText = new WeakMap()
  const originalAttributes = new WeakMap()
  const translatedAttributes = new WeakMap()
  let activeLanguage = 'en'
  let applying = false

  const translateTextNode = (node) => {
    if (!node.nodeValue || shouldSkip(node)) return
    const current = node.nodeValue
    if (activeLanguage === 'vi') {
      const normalized = normalize(current)
      const translation = translations[normalized]
      if (!translation) return
      originalText.set(node, current)
      const nextValue = replaceKeepingWhitespace(current, translation)
      translatedText.set(node, nextValue)
      if (current !== nextValue) node.nodeValue = nextValue
      return
    }

    const translated = translatedText.get(node)
    const original = originalText.get(node)
    if (original !== undefined && current === translated) node.nodeValue = original
  }

  const translateElementAttributes = (element) => {
    if (shouldSkip(element)) return
    for (const attribute of TRANSLATABLE_ATTRIBUTES) {
      if (!element.hasAttribute(attribute)) continue
      const current = element.getAttribute(attribute)
      if (!current) continue
      const originals = originalAttributes.get(element) || new Map()
      const translated = translatedAttributes.get(element) || new Map()

      if (activeLanguage === 'vi') {
        const translation = translations[normalize(current)]
        if (!translation) continue
        originals.set(attribute, current)
        translated.set(attribute, translation)
        originalAttributes.set(element, originals)
        translatedAttributes.set(element, translated)
        if (current !== translation) element.setAttribute(attribute, translation)
      } else if (current === translated.get(attribute) && originals.has(attribute)) {
        element.setAttribute(attribute, originals.get(attribute))
      }
    }
  }

  const translateTree = (target) => {
    if (shouldSkip(target)) return
    if (target.nodeType === Node.TEXT_NODE) {
      translateTextNode(target)
      return
    }
    if (target.nodeType !== Node.ELEMENT_NODE) return
    translateElementAttributes(target)
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node)
      else translateElementAttributes(node)
      node = walker.nextNode()
    }
  }

  const observer = new MutationObserver((mutations) => {
    if (applying) return
    applying = true
    observer.disconnect()
    for (const mutation of mutations) {
      if (mutation.type === 'childList') mutation.addedNodes.forEach(translateTree)
      else if (mutation.type === 'characterData') translateTextNode(mutation.target)
      else if (mutation.type === 'attributes') translateElementAttributes(mutation.target)
    }
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
    })
    applying = false
  })

  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: TRANSLATABLE_ATTRIBUTES,
  })

  return {
    setLanguage(language) {
      activeLanguage = language
      applying = true
      observer.disconnect()
      translateTree(root)
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATABLE_ATTRIBUTES,
      })
      applying = false
    },
    disconnect: () => observer.disconnect(),
  }
}

export const LanguageProvider = ({ children }) => {
  const translatorRef = useRef(null)
  const [language, setLanguageState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : 'en'
  })
  const initialLanguageRef = useRef(language)

  const setLanguage = useCallback((nextLanguage) => {
    if (SUPPORTED_LANGUAGES.includes(nextLanguage)) setLanguageState(nextLanguage)
  }, [])

  const t = useCallback(
    (englishText) => {
      if (language !== 'vi') return englishText
      return translations[normalize(englishText)] || englishText
    },
    [language]
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return undefined
    translatorRef.current = createDomTranslator(root)
    translatorRef.current.setLanguage(initialLanguageRef.current)
    return () => {
      translatorRef.current?.disconnect()
      translatorRef.current = null
    }
  }, [])

  useEffect(() => {
    translatorRef.current?.setLanguage(language)
  }, [language])

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider')
  return context
}
