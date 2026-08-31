/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import vietnameseTranslations from './vi.generated.json'
import additionalTranslations from './vi.additional.json'

const STORAGE_KEY = 'stockspace_language'
const SUPPORTED_LANGUAGES = ['en', 'vi']
const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt']

const manualTranslations = {
  Notifications: 'Thông báo',
  Home: 'Trang chủ',
  'Inventory Overview': 'Tổng quan tồn kho',
  'Monitor stock levels and warehouse inventory in real-time.': 'Giám sát mức tồn kho và hàng hóa trong kho theo thời gian thực.',
  'Total Products': 'Tổng số sản phẩm',
  'In Stock': 'Còn hàng',
  'Low Stock': 'Sắp hết hàng',
  'Search products by name or SKU...': 'Tìm kiếm sản phẩm theo tên hoặc SKU...',
  'Weight Utilization': 'Hiệu suất tải trọng',
  'Volume Utilization': 'Hiệu suất thể tích',
  'Product Details': 'Chi tiết sản phẩm',
  'Current Stock': 'Tồn kho hiện tại',
  'Stock Batches': 'Lô hàng tồn kho',
  'Location:': 'Vị trí:',
  'History': 'Lịch sử',
  'Batch Transaction History': 'Lịch sử giao dịch lô hàng',
  'Receipt ID': 'Mã phiếu',
  'Units': 'đơn vị',
  'Transaction code': 'Mã giao dịch',
  'Type & Method': 'Loại & Phương thức',
  'Amount': 'Số tiền',
  'Time': 'Thời gian',
  'Request ID': 'Mã yêu cầu',
  'Receiving Bank': 'Ngân hàng nhận',
  'Withdrawal Amount': 'Số tiền rút',
  'Note:': 'Ghi chú:',
  'Create Contract Draft': 'Tạo bản nháp hợp đồng',
  'Edit Contract Draft': 'Chỉnh sửa bản nháp hợp đồng',
  'Select a warehouse': 'Chọn kho bãi',
  'Tenant Email': 'Email người thuê',
  'Start Date': 'Ngày bắt đầu',
  'End Date': 'Ngày kết thúc',
  'Leased Width (m)': 'Chiều rộng thuê (m)',
  'Leased Length (m)': 'Chiều dài thuê (m)',
  'Leased Height (m)': 'Chiều cao thuê (m)',
  'Negotiated Rent (Optional)': 'Giá thuê thỏa thuận (Tùy chọn)',
  'Note': 'Ghi chú',
  'Photo of Paper Contract': 'Ảnh hợp đồng giấy',
  'Preview Terms': 'Xem trước điều khoản',
  'Create Draft': 'Tạo bản nháp',
  'Update Draft': 'Cập nhật bản nháp',
  'Contract preview': 'Xem trước hợp đồng',
  'Final monthly rent': 'Giá thuê hằng tháng',
  'Leased area': 'Diện tích thuê',
  'Layout area': 'Kích thước sơ đồ',
  'Review the values above, then create the draft. You will configure the contract layout in the next step.': 'Vui lòng xem lại các thông tin trên trước khi tạo bản nháp. Bạn sẽ cấu hình sơ đồ hợp đồng ở bước tiếp theo.',
  'New Draft': 'Tạo bản nháp mới',
  'Rent': 'Giá thuê',
  'Start:': 'Bắt đầu:',
  'End:': 'Kết thúc:',
  'ACTIVE': 'ĐANG HOẠT ĐỘNG',
  'DRAFT': 'BẢN NHÁP',
  'EXPIRED': 'HẾT HẠN',
  'REJECTED': 'TỪ CHỐI',
  'CHANGES_REQUESTED': 'YÊU CẦU THAY ĐỔI',
  'PENDING_TENANT_CONFIRM': 'CHỜ NGƯỜI THUÊ XÁC NHẬN',
  'Tenant': 'Người thuê',
  'Warehouse': 'Kho bãi',
  'Term': 'Thời hạn',
  'Status': 'Trạng thái',
  'Actions': 'Thao tác',
  'View Paper Contract': 'Xem bản hợp đồng giấy',
  'Configure Layout': 'Cấu hình sơ đồ kho',
  'View Layout': 'Xem sơ đồ kho',
  'Edit Draft': 'Chỉnh sửa bản nháp',
  'Submit to Tenant': 'Gửi cho người thuê',
  'Delete': 'Xóa',
  'Manage your warehouse rental agreements.': 'Quản lý các hợp đồng thuê kho của bạn.',
  'Spacing / clearance': 'Khoảng cách / khe hở',
  'Nearest Rack:': 'Rack gần nhất:',
  'Horizontal:': 'Ngang:',
  'Vertical:': 'Dọc:',
  'Edge distance:': 'Khoảng cách viền:',
  'No other Rack to measure yet.': 'Chưa có Rack nào khác để đo.',
  'Distance from Bin to Rack walls': 'Khoảng cách từ Bin đến thành Rack',
  'Left:': 'Trái:',
  'Right:': 'Phải:',
  'Front:': 'Trước:',
  'Back:': 'Sau:',
  'Nearest Bin:': 'Bin gần nhất:',
  'edge distance': 'khoảng cách viền',
  'Closest Rack pair:': 'Cặp Rack gần nhất:',
  'Add at least two Racks to see spacing.': 'Thêm ít nhất 2 Rack để xem khoảng cách.',
  'Drag the Rack or Bin body to move.': 'Kéo thân Rack hoặc Bin để di chuyển.',
  'Drag ◢ in the lower right corner to resize. Bin max 80% Rack.': 'Kéo ◢ ở góc dưới bên phải để đổi kích thước. Bin tối đa 80% Rack.',
  'width': 'Chiều rộng',
  'length': 'Chiều dài',
  'height': 'Chiều cao',
  'Width': 'Chiều rộng',
  'Length': 'Chiều dài',
  'Height': 'Chiều cao',
  'wide': 'Chiều rộng',
  'long': 'Chiều dài',
  'Wide': 'Chiều rộng',
  'Long': 'Chiều dài',
  'Inspections (optional)': 'Yêu cầu kiểm định (tùy chọn)',
  'No inspection requests.': 'Không có yêu cầu kiểm định nào.',
  'Listing workflow': 'Quy trình đăng kho',
  'Submit a warehouse for Admin approval first. After it is approved, choose a listing package and pay from My Warehouses to make it visible to tenants. Inspection is optional and does not affect this flow.': 'Vui lòng gửi yêu cầu duyệt kho cho Quản trị viên trước. Sau khi được duyệt, hãy chọn gói đăng tin và thanh toán tại mục Kho của tôi để kho hiển thị với người thuê. Việc kiểm định là tùy chọn và không ảnh hưởng đến quy trình này.',
  'Top Up via VNPay': 'Nạp tiền qua VNPay',
  'Enter the amount to deposit (VND)': 'Nhập số tiền cần nạp (VNĐ)',
  'For example: 2000000': 'Ví dụ: 2000000',
  'Connecting...': 'Đang kết nối...',
  'Pay now': 'Thanh toán ngay',
  Cancel: 'Hủy',
  'Unknown Warehouse': 'Kho không xác định',
  'Status:': 'Trạng thái:',
  'Category Mgt': 'Quản lý danh mục',
  'SKU Mgt': 'Quản lý SKU',
  Audits: 'Kiểm kê',
  Transfers: 'Chuyển kho',
  Subscription: 'Gói dịch vụ',
  'System Wallet': 'Ví hệ thống',
  'Listing Packages': 'Gói đăng tin',
  'Post Warehouse': 'Đăng kho',
  'Transaction history': 'Lịch sử giao dịch',
  'Storage infrastructure solution that integrates a smart digital system, completely solving storage and inventory control after signing a lease contract.': 'Giải pháp hạ tầng kho bãi tích hợp hệ thống số hóa thông minh, giải quyết triệt để bài toán lưu trữ và kiểm soát hàng hóa tồn kho sau khi ký kết hợp đồng thuê mướn.',
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
  'Payment update': 'Cập nhật thanh toán',
  'A payment update is available.': 'Có cập nhật mới về thanh toán.',
  'Booking update': 'Cập nhật đặt lịch',
  'A booking needs your attention.': 'Một yêu cầu đặt lịch cần bạn chú ý.',
  'Contract update': 'Cập nhật hợp đồng',
  'A contract has been updated.': 'Một hợp đồng đã được cập nhật.',
  'Rental update': 'Cập nhật thuê kho',
  'Your rental access has changed.': 'Quyền truy cập thuê kho của bạn đã thay đổi.',
  'Dispute update': 'Cập nhật tranh chấp',
  'A dispute has been updated.': 'Một tranh chấp đã được cập nhật.',
  'Warehouse update': 'Cập nhật kho',
  'A warehouse update is available.': 'Có cập nhật mới về kho.',
  'Inspection update': 'Cập nhật kiểm định',
  'An inspection needs your attention.': 'Một yêu cầu kiểm định cần bạn chú ý.',
  'Inventory audit': 'Kiểm kê tồn kho',
  'An inventory audit needs your attention.': 'Một yêu cầu kiểm kê cần bạn chú ý.',
  'Receipt update': 'Cập nhật phiếu nhập/xuất',
  'A warehouse receipt needs your attention.': 'Một phiếu nhập/xuất kho cần bạn chú ý.',
  'Transfer update': 'Cập nhật chuyển kho',
  'A stock transfer needs your attention.': 'Một yêu cầu chuyển kho cần bạn chú ý.',
  'New notification': 'Thông báo mới',
  'You have a new notification.': 'Bạn có một thông báo mới.',
  'last year': 'năm trước',
  'last month': 'tháng trước',
  'days ago': 'ngày trước',
  'hours ago': 'giờ trước',
  'minutes ago': 'phút trước',
  'A few seconds ago': 'Vài giây trước',
  Notice: 'Thông báo',
  'Mark them all': 'Đánh dấu tất cả đã đọc',
  'Loading notification...': 'Đang tải thông báo...',
  'There are no announcements yet': 'Chưa có thông báo nào',
  'When there are new announcements, they will appear here.': 'Khi có thông báo mới, chúng sẽ xuất hiện ở đây.',
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
    const root = document.body
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
